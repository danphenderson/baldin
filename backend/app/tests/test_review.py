"""
Tests for the Human Review Queue (Phase 3 — Approval Gates).

Covers auth enforcement, listing pending items, approve/reject for
crawler runs, extraction events, and leads, and batch operations.
"""

from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, patch
from uuid import UUID, uuid4

import pytest
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient

from app import models, schemas
from app.core import conf
from app.core.db import async_engine, drop_and_create_db_and_tables, session_context
from app.main import app
from app.tests import utils

pytestmark = pytest.mark.asyncio(loop_scope="module")

password_helper = PasswordHelper()
_db_ready = False


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


@asynccontextmanager
async def _client():
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url=str(conf.settings.BACKEND_CORS_ORIGINS[-1]),
    ) as client:
        yield client


async def _ensure_db_ready():
    global _db_ready
    if _db_ready:
        return
    await async_engine.dispose()
    await drop_and_create_db_and_tables()
    app.state.bootstrap_completed = True
    _db_ready = True


async def _create_user(
    password: str, *, is_superuser: bool = False
) -> tuple[str, UUID]:
    email = utils.random_email()
    async with session_context() as session:
        user = await utils.create_db_user(
            email,
            password_helper.hash(password),
            session,
            is_superuser=is_superuser,
        )
        await session.commit()
    return email, user.id


async def _auth_headers(
    client: AsyncClient, email: str, password: str
) -> dict[str, str]:
    response = await client.post(
        "/auth/jwt/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# 1. Empty review queue
# ---------------------------------------------------------------------------


async def test_review_items_empty():
    """GET /review/items returns empty list when nothing is pending."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("super-review-empty", is_superuser=True)
        headers = await _auth_headers(client, email, "super-review-empty")
        resp = await client.get("/review/items", headers=headers)
        assert resp.status_code == 200
        assert resp.json() == []


# ---------------------------------------------------------------------------
# 2. Auth enforcement
# ---------------------------------------------------------------------------


async def test_review_requires_superuser():
    """Non-superuser gets 403 on review endpoints."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("regular-review")
        headers = await _auth_headers(client, email, "regular-review")
        resp = await client.get("/review/items", headers=headers)
        assert resp.status_code == 403


async def test_review_requires_auth():
    """Unauthenticated gets 401 on review endpoints."""
    await _ensure_db_ready()
    async with _client() as client:
        resp = await client.get("/review/items")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# 3. Approve crawler run
# ---------------------------------------------------------------------------


async def test_approve_crawler_run():
    """Approve a pending_review crawler run → status becomes pending."""
    await _ensure_db_ready()
    async with _client() as client:
        email, user_id = await _create_user("super-approve-run", is_superuser=True)
        headers = await _auth_headers(client, email, "super-approve-run")

        # Create pipeline & run directly in DB
        async with session_context() as db:
            pipeline = models.CrawlerPipeline(
                name="Approve test pipeline",
                source="linkedin",
                query_definition={"keywords": ["test"]},
                requires_approval=True,
                created_by_user_id=user_id,
            )
            db.add(pipeline)
            await db.flush()

            run = models.CrawlerRun(
                crawler_pipeline_id=pipeline.id,
                trigger_type="scheduled",
                status="pending_review",
            )
            db.add(run)
            await db.commit()
            run_id = run.id

        # Verify it appears in the queue
        resp = await client.get("/review/items", headers=headers)
        assert resp.status_code == 200
        items = resp.json()
        run_items = [i for i in items if i["item_id"] == str(run_id)]
        assert len(run_items) == 1

        # Approve (mock background execution to avoid actually running the crawler)
        with patch(
            "app.api.deps.execute_crawler_run_background",
            new_callable=AsyncMock,
        ):
            resp = await client.post(
                f"/review/items/crawler_run/{run_id}/approve", headers=headers
            )
            assert resp.status_code == 200

        # Verify status changed
        async with session_context() as db:
            updated_run = await db.get(models.CrawlerRun, run_id)
            assert updated_run.status == "pending"


# ---------------------------------------------------------------------------
# 4. Reject crawler run
# ---------------------------------------------------------------------------


async def test_reject_crawler_run():
    """Reject a pending_review crawler run → status becomes cancelled."""
    await _ensure_db_ready()
    async with _client() as client:
        email, user_id = await _create_user("super-reject-run", is_superuser=True)
        headers = await _auth_headers(client, email, "super-reject-run")

        async with session_context() as db:
            pipeline = models.CrawlerPipeline(
                name="Reject test pipeline",
                source="linkedin",
                query_definition={"keywords": ["test"]},
                requires_approval=True,
                created_by_user_id=user_id,
            )
            db.add(pipeline)
            await db.flush()

            run = models.CrawlerRun(
                crawler_pipeline_id=pipeline.id,
                trigger_type="scheduled",
                status="pending_review",
            )
            db.add(run)
            await db.commit()
            run_id = run.id

        resp = await client.post(
            f"/review/items/crawler_run/{run_id}/reject", headers=headers
        )
        assert resp.status_code == 200

        async with session_context() as db:
            updated_run = await db.get(models.CrawlerRun, run_id)
            assert updated_run.status == "cancelled"
            assert updated_run.error_summary == "Rejected during human review"


# ---------------------------------------------------------------------------
# 5. Approve extraction event
# ---------------------------------------------------------------------------


async def test_approve_extraction_event():
    """Approve a pending_review extraction event → status becomes success."""
    await _ensure_db_ready()
    async with _client() as client:
        email, user_id = await _create_user("super-approve-event", is_superuser=True)
        headers = await _auth_headers(client, email, "super-approve-event")

        async with session_context() as db:
            pipeline = models.OrchestrationPipeline(
                name="Extraction approval pipeline",
                user_id=user_id,
            )
            db.add(pipeline)
            await db.flush()

            event = models.OrchestrationEvent(
                status="pending_review",
                message="Extraction complete, held for review",
                pipeline_id=pipeline.id,
            )
            db.add(event)
            await db.commit()
            event_id = event.id

        resp = await client.post(
            f"/review/items/extraction_event/{event_id}/approve", headers=headers
        )
        assert resp.status_code == 200

        async with session_context() as db:
            updated_event = await db.get(models.OrchestrationEvent, event_id)
            assert updated_event.status == "success"


# ---------------------------------------------------------------------------
# 6. Approve lead
# ---------------------------------------------------------------------------


async def test_approve_lead():
    """Approve a pending_review lead → review_status becomes approved."""
    await _ensure_db_ready()
    from app import utils as app_utils

    async with _client() as client:
        email, _ = await _create_user("super-approve-lead", is_superuser=True)
        headers = await _auth_headers(client, email, "super-approve-lead")

        async with session_context() as db:
            url = f"https://example.com/job/{utils.random_lower_string(12)}"
            lead = models.Lead(
                url=url,
                canonical_url=app_utils.canonicalize_lead_url(url),
                title="Review Test Lead",
                review_status="pending_review",
            )
            db.add(lead)
            await db.commit()
            lead_id = lead.id

        resp = await client.post(
            f"/review/items/lead/{lead_id}/approve", headers=headers
        )
        assert resp.status_code == 200

        async with session_context() as db:
            updated_lead = await db.get(models.Lead, lead_id)
            assert updated_lead.review_status == "approved"


# ---------------------------------------------------------------------------
# 7. Batch review
# ---------------------------------------------------------------------------


async def test_batch_review():
    """Batch approve one item and reject another."""
    await _ensure_db_ready()
    from app import utils as app_utils

    async with _client() as client:
        email, user_id = await _create_user("super-batch", is_superuser=True)
        headers = await _auth_headers(client, email, "super-batch")

        async with session_context() as db:
            # Create a lead to approve
            url1 = f"https://example.com/job/{utils.random_lower_string(12)}"
            lead1 = models.Lead(
                url=url1,
                canonical_url=app_utils.canonicalize_lead_url(url1),
                title="Batch Lead 1",
                review_status="pending_review",
            )
            db.add(lead1)

            # Create a lead to reject
            url2 = f"https://example.com/job/{utils.random_lower_string(12)}"
            lead2 = models.Lead(
                url=url2,
                canonical_url=app_utils.canonicalize_lead_url(url2),
                title="Batch Lead 2",
                review_status="pending_review",
            )
            db.add(lead2)
            await db.commit()
            lead1_id = lead1.id
            lead2_id = lead2.id

        resp = await client.post(
            "/review/items/batch",
            json={
                "items": [
                    {
                        "item_type": "lead",
                        "item_id": str(lead1_id),
                        "action": "approve",
                    },
                    {
                        "item_type": "lead",
                        "item_id": str(lead2_id),
                        "action": "reject",
                    },
                ]
            },
            headers=headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["processed"] == 2
        assert body["errors"] == []

        async with session_context() as db:
            updated_lead1 = await db.get(models.Lead, lead1_id)
            assert updated_lead1.review_status == "approved"

            updated_lead2 = await db.get(models.Lead, lead2_id)
            assert updated_lead2.review_status == "rejected"
