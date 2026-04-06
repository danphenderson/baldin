"""Tests for the /activity-feed endpoints (feed, summary)."""

from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from uuid import UUID

import pytest
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient

from app import models
from app.core import conf
from app.core.db import async_engine, drop_and_create_db_and_tables, session_context
from app.main import app
from app.tests import utils

pytestmark = pytest.mark.asyncio(loop_scope="module")

password_helper = PasswordHelper()
_db_ready = False


@asynccontextmanager
async def _client() -> AsyncClient:
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url=str(conf.settings.BACKEND_CORS_ORIGINS[-1]),
    ) as client:
        yield client


async def _ensure_db_ready() -> None:
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


def _action_payload(**overrides) -> dict:
    base = {
        "title": "Feed test task",
        "kind": "follow_up",
        "priority": "medium",
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


async def test_activity_feed_empty() -> None:
    """New user with no data gets an empty feed."""
    await _ensure_db_ready()
    async with _client() as client:
        email, uid = await _create_user("feed-empty-pass")
        headers = await _auth_headers(client, email, "feed-empty-pass")

        response = await client.get("/activity-feed/", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["items"] == []
    assert body["total"] == 0


async def test_activity_feed_returns_action_completions() -> None:
    """Completing an ActionItem surfaces an 'action_completed' event in the feed."""
    await _ensure_db_ready()
    async with _client() as client:
        email, uid = await _create_user("feed-action-pass")
        headers = await _auth_headers(client, email, "feed-action-pass")

        # Create and complete an action item
        create_resp = await client.post(
            "/action-items/",
            json=_action_payload(title="Completable task"),
            headers=headers,
        )
        assert create_resp.status_code == 201
        item_id = create_resp.json()["id"]

        await client.patch(
            f"/action-items/{item_id}",
            json={"status": "completed"},
            headers=headers,
        )

        response = await client.get("/activity-feed/", headers=headers)

    assert response.status_code == 200
    body = response.json()
    completed_events = [
        item for item in body["items"] if item["type"] == "action_completed"
    ]
    assert len(completed_events) >= 1
    assert any(e["title"] == "Completable task" for e in completed_events)


async def test_activity_feed_pagination() -> None:
    """Feed respects page and page_size parameters."""
    await _ensure_db_ready()
    async with _client() as client:
        email, uid = await _create_user("feed-page-pass")
        headers = await _auth_headers(client, email, "feed-page-pass")

        # Create and complete several action items to generate feed events
        for i in range(7):
            create_resp = await client.post(
                "/action-items/",
                json=_action_payload(title=f"Paginated task {i}"),
                headers=headers,
            )
            assert create_resp.status_code == 201
            item_id = create_resp.json()["id"]
            await client.patch(
                f"/action-items/{item_id}",
                json={"status": "completed"},
                headers=headers,
            )

        page1 = await client.get(
            "/activity-feed/",
            params={"page": 1, "page_size": 5},
            headers=headers,
        )
        page2 = await client.get(
            "/activity-feed/",
            params={"page": 2, "page_size": 5},
            headers=headers,
        )

    assert page1.status_code == 200
    assert page2.status_code == 200
    body1 = page1.json()
    body2 = page2.json()
    assert len(body1["items"]) == 5
    assert body1["total"] >= 7
    assert len(body2["items"]) >= 2  # remaining items on page 2


async def test_activity_feed_since_filter() -> None:
    """Feed 'since' param excludes action items completed before that date."""
    await _ensure_db_ready()
    async with _client() as client:
        email, uid = await _create_user("feed-since-pass")
        headers = await _auth_headers(client, email, "feed-since-pass")

        # Create and complete an action item now
        create_resp = await client.post(
            "/action-items/",
            json=_action_payload(title="Recent task"),
            headers=headers,
        )
        assert create_resp.status_code == 201
        item_id = create_resp.json()["id"]
        await client.patch(
            f"/action-items/{item_id}",
            json={"status": "completed"},
            headers=headers,
        )

        # Query with 'since' set to 1 hour ago — should include the item
        since = (datetime.utcnow() - timedelta(hours=1)).isoformat()
        response = await client.get(
            "/activity-feed/",
            params={"since": since},
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    completed = [i for i in body["items"] if i["type"] == "action_completed"]
    assert len(completed) >= 1

    # Query with 'since' far in the future — should exclude everything
    async with _client() as client:
        headers = await _auth_headers(client, email, "feed-since-pass")
        future_since = (datetime.utcnow() + timedelta(days=30)).isoformat()
        response_empty = await client.get(
            "/activity-feed/",
            params={"since": future_since},
            headers=headers,
        )

    assert response_empty.status_code == 200
    assert response_empty.json()["total"] == 0


async def test_activity_feed_user_isolation() -> None:
    """User B sees an empty feed even when user A has activity."""
    await _ensure_db_ready()
    async with _client() as client:
        email_a, uid_a = await _create_user("feed-iso-a-pass")
        email_b, uid_b = await _create_user("feed-iso-b-pass")
        headers_a = await _auth_headers(client, email_a, "feed-iso-a-pass")
        headers_b = await _auth_headers(client, email_b, "feed-iso-b-pass")

        # User A creates and completes an action item
        create_resp = await client.post(
            "/action-items/",
            json=_action_payload(title="A's task"),
            headers=headers_a,
        )
        assert create_resp.status_code == 201
        item_id = create_resp.json()["id"]
        await client.patch(
            f"/action-items/{item_id}",
            json={"status": "completed"},
            headers=headers_a,
        )

        # User B should see no events
        response = await client.get("/activity-feed/", headers=headers_b)

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 0
    assert body["items"] == []


async def test_summary_endpoint() -> None:
    """GET /activity-feed/summary returns expected CommandCenterSummary fields."""
    await _ensure_db_ready()
    async with _client() as client:
        email, uid = await _create_user("feed-summary-pass")
        headers = await _auth_headers(client, email, "feed-summary-pass")

        # Create some action items to be counted
        for i in range(2):
            await client.post(
                "/action-items/",
                json=_action_payload(title=f"Summary task {i}"),
                headers=headers,
            )

        response = await client.get("/activity-feed/summary", headers=headers)

    assert response.status_code == 200
    body = response.json()
    # Verify all expected fields are present
    assert "lead_count" in body
    assert "unapplied_lead_count" in body
    assert "application_count" in body
    assert "active_application_count" in body
    assert "status_breakdown" in body
    assert "pending_action_items" in body
    assert "overdue_action_items" in body
    assert "action_items_due_today" in body
    assert "pending_connections" in body
    assert "unread_messages" in body
    assert "profile_completion" in body
    assert "documents_count" in body
    assert "draft_documents_count" in body
    # Action item counts should reflect creation
    assert body["pending_action_items"] >= 2


async def test_summary_empty_user() -> None:
    """GET /activity-feed/summary for a new user returns all zeros."""
    await _ensure_db_ready()
    async with _client() as client:
        email, uid = await _create_user("feed-summary-empty-pass")
        headers = await _auth_headers(client, email, "feed-summary-empty-pass")

        response = await client.get("/activity-feed/summary", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["lead_count"] == 0
    assert body["unapplied_lead_count"] == 0
    assert body["application_count"] == 0
    assert body["active_application_count"] == 0
    assert body["status_breakdown"] == {}
    assert body["pending_action_items"] == 0
    assert body["overdue_action_items"] == 0
    assert body["action_items_due_today"] == 0
    assert body["pending_connections"] == 0
    assert body["unread_messages"] == 0
    assert body["profile_completion"] == 0
    assert body["documents_count"] == 0
    assert body["draft_documents_count"] == 0
