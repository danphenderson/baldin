from contextlib import asynccontextmanager

import pytest
from httpx import ASGITransport, AsyncClient

from app.core import conf
from app.core.db import async_engine, drop_and_create_db_and_tables
from app.main import app
from app.tests import utils

pytestmark = pytest.mark.asyncio(loop_scope="module")


def _valid_password(seed: str) -> str:
    normalized = "".join(ch for ch in seed if ch.isalnum()) or "testuser"
    return f"{normalized}Aa1!"


@asynccontextmanager
async def _client() -> AsyncClient:
    await async_engine.dispose()
    await drop_and_create_db_and_tables()
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url=str(conf.settings.BACKEND_CORS_ORIGINS[-1]),
    ) as client:
        yield client


async def _register_user(client: AsyncClient, password: str) -> str:
    email = utils.random_email()
    response = await client.post(
        "/auth/register",
        json={"email": email, "password": _valid_password(password)},
    )
    assert response.status_code in {200, 201}
    return email


async def _auth_headers(
    client: AsyncClient, email: str, password: str
) -> dict[str, str]:
    response = await client.post(
        "/auth/jwt/login",
        data={"username": email, "password": _valid_password(password)},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def _create_pipeline(
    client: AsyncClient,
    headers: dict[str, str],
    name: str,
) -> dict:
    response = await client.post(
        "/data_orchestration/pipelines",
        json={
            "name": name,
            "description": "Test pipeline",
            "definition": {"step": "test"},
        },
        headers=headers,
    )
    assert response.status_code == 200
    return response.json()


async def _create_event(
    client: AsyncClient,
    headers: dict[str, str],
    pipeline_id: str,
    message: str,
    status: str = "pending",
) -> dict:
    response = await client.post(
        "/data_orchestration/events",
        json={
            "message": message,
            "payload": {"source": "test"},
            "environment": "PYTEST",
            "status": status,
            "pipeline_id": pipeline_id,
        },
        headers=headers,
    )
    assert response.status_code == 202
    return response.json()


@pytest.mark.asyncio(loop_scope="module")
async def test_read_orch_pipelines_only_returns_current_users_records() -> None:
    async with _client() as client:
        owner_email = await _register_user(client, "owner-pass")
        other_email = await _register_user(client, "other-pass")
        owner_headers = await _auth_headers(client, owner_email, "owner-pass")
        other_headers = await _auth_headers(client, other_email, "other-pass")

        owner_pipeline = await _create_pipeline(
            client, owner_headers, f"owner-{utils.random_lower_string(8)}"
        )
        other_pipeline = await _create_pipeline(
            client, other_headers, f"other-{utils.random_lower_string(8)}"
        )

        response = await client.get(
            "/data_orchestration/pipelines", headers=owner_headers
        )

    assert response.status_code == 200
    returned_ids = {item["id"] for item in response.json()}
    assert owner_pipeline["id"] in returned_ids
    assert other_pipeline["id"] not in returned_ids


@pytest.mark.asyncio(loop_scope="module")
async def test_created_pipeline_is_owned_by_current_user() -> None:
    async with _client() as client:
        owner_email = await _register_user(client, "owner-pass")
        other_email = await _register_user(client, "other-pass")
        owner_headers = await _auth_headers(client, owner_email, "owner-pass")
        other_headers = await _auth_headers(client, other_email, "other-pass")

        pipeline = await _create_pipeline(
            client, owner_headers, f"owned-{utils.random_lower_string(8)}"
        )

        owner_response = await client.get(
            f"/data_orchestration/pipelines/{pipeline['id']}", headers=owner_headers
        )
        other_response = await client.get(
            f"/data_orchestration/pipelines/{pipeline['id']}", headers=other_headers
        )

    assert owner_response.status_code == 200
    assert other_response.status_code == 403


@pytest.mark.asyncio(loop_scope="module")
async def test_create_pipeline_rejects_duplicate_name_for_same_user() -> None:
    async with _client() as client:
        email = await _register_user(client, "dup-pass")
        headers = await _auth_headers(client, email, "dup-pass")
        name = f"duplicate-{utils.random_lower_string(8)}"

        first_response = await client.post(
            "/data_orchestration/pipelines",
            json={
                "name": name,
                "description": "First pipeline",
                "definition": {"step": "first"},
            },
            headers=headers,
        )
        second_response = await client.post(
            "/data_orchestration/pipelines",
            json={
                "name": name,
                "description": "Duplicate pipeline",
                "definition": {"step": "second"},
            },
            headers=headers,
        )

    assert first_response.status_code == 200
    assert second_response.status_code == 409
    assert "already exists" in second_response.json()["detail"].lower()


@pytest.mark.asyncio(loop_scope="module")
async def test_update_orch_pipeline_requires_ownership() -> None:
    async with _client() as client:
        owner_email = await _register_user(client, "owner-pass")
        other_email = await _register_user(client, "other-pass")
        owner_headers = await _auth_headers(client, owner_email, "owner-pass")
        other_headers = await _auth_headers(client, other_email, "other-pass")

        pipeline = await _create_pipeline(
            client, owner_headers, f"pipeline-{utils.random_lower_string(8)}"
        )

        response = await client.put(
            f"/data_orchestration/pipelines/{pipeline['id']}",
            json={"name": "hijacked", "description": "updated", "definition": {}},
            headers=other_headers,
        )

    assert response.status_code == 403


@pytest.mark.asyncio(loop_scope="module")
async def test_read_orch_events_only_returns_current_users_records() -> None:
    async with _client() as client:
        owner_email = await _register_user(client, "owner-pass")
        other_email = await _register_user(client, "other-pass")
        owner_headers = await _auth_headers(client, owner_email, "owner-pass")
        other_headers = await _auth_headers(client, other_email, "other-pass")

        owner_pipeline = await _create_pipeline(
            client, owner_headers, f"owner-{utils.random_lower_string(8)}"
        )
        other_pipeline = await _create_pipeline(
            client, other_headers, f"other-{utils.random_lower_string(8)}"
        )
        owner_event = await _create_event(
            client,
            owner_headers,
            owner_pipeline["id"],
            "owner event",
        )
        other_event = await _create_event(
            client,
            other_headers,
            other_pipeline["id"],
            "other event",
        )

        response = await client.get("/data_orchestration/events", headers=owner_headers)

    assert response.status_code == 200
    returned_ids = {item["id"] for item in response.json()["items"]}
    assert owner_event["id"] in returned_ids
    assert other_event["id"] not in returned_ids


@pytest.mark.asyncio(loop_scope="module")
async def test_create_orch_event_requires_pipeline_ownership() -> None:
    async with _client() as client:
        owner_email = await _register_user(client, "owner-pass")
        other_email = await _register_user(client, "other-pass")
        owner_headers = await _auth_headers(client, owner_email, "owner-pass")
        other_headers = await _auth_headers(client, other_email, "other-pass")

        pipeline = await _create_pipeline(
            client, owner_headers, f"owner-{utils.random_lower_string(8)}"
        )

        response = await client.post(
            "/data_orchestration/events",
            json={
                "message": "unauthorized event",
                "payload": {"source": "test"},
                "environment": "PYTEST",
                "status": "pending",
                "pipeline_id": pipeline["id"],
            },
            headers=other_headers,
        )

    assert response.status_code == 403


@pytest.mark.asyncio(loop_scope="module")
async def test_read_orch_event_requires_ownership() -> None:
    async with _client() as client:
        owner_email = await _register_user(client, "owner-pass")
        other_email = await _register_user(client, "other-pass")
        owner_headers = await _auth_headers(client, owner_email, "owner-pass")
        other_headers = await _auth_headers(client, other_email, "other-pass")

        pipeline = await _create_pipeline(
            client, owner_headers, f"owner-{utils.random_lower_string(8)}"
        )
        event = await _create_event(
            client,
            owner_headers,
            pipeline["id"],
            "private event",
        )

        response = await client.get(
            f"/data_orchestration/events/{event['id']}", headers=other_headers
        )

    assert response.status_code == 403


# ---------------------------------------------------------------------------
# WF-03  Run mutability and ownership
# ---------------------------------------------------------------------------


@pytest.mark.asyncio(loop_scope="module")
async def test_update_event_cannot_reassign_pipeline_id() -> None:
    """pipeline_id must be ignored on event updates."""
    async with _client() as client:
        email = await _register_user(client, "mut-pass")
        headers = await _auth_headers(client, email, "mut-pass")

        pipe_a = await _create_pipeline(
            client, headers, f"pipe-a-{utils.random_lower_string(8)}"
        )
        pipe_b = await _create_pipeline(
            client, headers, f"pipe-b-{utils.random_lower_string(8)}"
        )
        event = await _create_event(client, headers, pipe_a["id"], "stays on pipe_a")

        response = await client.put(
            f"/data_orchestration/events/{event['id']}",
            json={"pipeline_id": pipe_b["id"]},
            headers=headers,
        )

    assert response.status_code == 202
    # pipeline_id must still point at the original workflow
    assert response.json()["pipeline_id"] == pipe_a["id"]


@pytest.mark.asyncio(loop_scope="module")
async def test_update_event_requires_ownership() -> None:
    """Only the pipeline owner can update an event."""
    async with _client() as client:
        owner_email = await _register_user(client, "owner-pass")
        other_email = await _register_user(client, "other-pass")
        owner_headers = await _auth_headers(client, owner_email, "owner-pass")
        other_headers = await _auth_headers(client, other_email, "other-pass")

        pipeline = await _create_pipeline(
            client, owner_headers, f"owner-{utils.random_lower_string(8)}"
        )
        event = await _create_event(
            client, owner_headers, pipeline["id"], "owner event"
        )

        response = await client.put(
            f"/data_orchestration/events/{event['id']}",
            json={"status": "success"},
            headers=other_headers,
        )

    assert response.status_code == 403


# ---------------------------------------------------------------------------
# WF-04  Sorted, filterable, paginated run history
# ---------------------------------------------------------------------------


@pytest.mark.asyncio(loop_scope="module")
async def test_read_events_returns_paginated_response() -> None:
    async with _client() as client:
        email = await _register_user(client, "page-pass")
        headers = await _auth_headers(client, email, "page-pass")

        pipeline = await _create_pipeline(
            client, headers, f"paged-{utils.random_lower_string(8)}"
        )
        for i in range(5):
            await _create_event(client, headers, pipeline["id"], f"event-{i}")

        response = await client.get(
            "/data_orchestration/events",
            params={"page": 1, "page_size": 3},
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 5
    assert len(body["items"]) == 3
    assert body["page"] == 1
    assert body["page_size"] == 3


@pytest.mark.asyncio(loop_scope="module")
async def test_read_events_sorted_newest_first() -> None:
    async with _client() as client:
        email = await _register_user(client, "sort-pass")
        headers = await _auth_headers(client, email, "sort-pass")

        pipeline = await _create_pipeline(
            client, headers, f"sorted-{utils.random_lower_string(8)}"
        )
        first = await _create_event(client, headers, pipeline["id"], "first")
        second = await _create_event(client, headers, pipeline["id"], "second")

        response = await client.get(
            "/data_orchestration/events",
            params={"page_size": 100},
            headers=headers,
        )

    body = response.json()
    ids = [e["id"] for e in body["items"]]
    assert ids.index(second["id"]) < ids.index(first["id"])


@pytest.mark.asyncio(loop_scope="module")
async def test_read_events_filter_by_status() -> None:
    async with _client() as client:
        email = await _register_user(client, "filt-pass")
        headers = await _auth_headers(client, email, "filt-pass")

        pipeline = await _create_pipeline(
            client, headers, f"filt-{utils.random_lower_string(8)}"
        )
        await _create_event(client, headers, pipeline["id"], "ok-run", status="success")
        await _create_event(
            client, headers, pipeline["id"], "bad-run", status="failure"
        )

        response = await client.get(
            "/data_orchestration/events",
            params={"status": "failure", "page_size": 100},
            headers=headers,
        )

    body = response.json()
    statuses = {e["status"] for e in body["items"]}
    assert statuses == {"failure"}
    assert body["total"] >= 1


@pytest.mark.asyncio(loop_scope="module")
async def test_read_events_filter_by_pipeline_id() -> None:
    async with _client() as client:
        email = await _register_user(client, "pfilt-pass")
        headers = await _auth_headers(client, email, "pfilt-pass")

        pipe_a = await _create_pipeline(
            client, headers, f"pipe-a-{utils.random_lower_string(8)}"
        )
        pipe_b = await _create_pipeline(
            client, headers, f"pipe-b-{utils.random_lower_string(8)}"
        )
        await _create_event(client, headers, pipe_a["id"], "run-a")
        await _create_event(client, headers, pipe_b["id"], "run-b")

        response = await client.get(
            "/data_orchestration/events",
            params={"pipeline_id": pipe_a["id"], "page_size": 100},
            headers=headers,
        )

    body = response.json()
    pipeline_ids = {e["pipeline_id"] for e in body["items"]}
    assert pipeline_ids == {pipe_a["id"]}


# ---------------------------------------------------------------------------
# WF-05  Workflow delete semantics
# ---------------------------------------------------------------------------


@pytest.mark.asyncio(loop_scope="module")
async def test_delete_pipeline_blocked_when_runs_exist() -> None:
    async with _client() as client:
        email = await _register_user(client, "del-pass")
        headers = await _auth_headers(client, email, "del-pass")

        pipeline = await _create_pipeline(
            client, headers, f"del-{utils.random_lower_string(8)}"
        )
        await _create_event(client, headers, pipeline["id"], "blocking run")

        response = await client.delete(
            f"/data_orchestration/pipelines/{pipeline['id']}",
            headers=headers,
        )

    assert response.status_code == 409
    assert "existing run" in response.json()["detail"].lower()


@pytest.mark.asyncio(loop_scope="module")
async def test_delete_pipeline_succeeds_when_no_runs() -> None:
    async with _client() as client:
        email = await _register_user(client, "del2-pass")
        headers = await _auth_headers(client, email, "del2-pass")

        pipeline = await _create_pipeline(
            client, headers, f"empty-{utils.random_lower_string(8)}"
        )

        response = await client.delete(
            f"/data_orchestration/pipelines/{pipeline['id']}",
            headers=headers,
        )

    assert response.status_code == 204


# ---------------------------------------------------------------------------
# WF-06  Workflow summary contract fields
# ---------------------------------------------------------------------------


@pytest.mark.asyncio(loop_scope="module")
async def test_pipeline_read_includes_summary_fields() -> None:
    async with _client() as client:
        email = await _register_user(client, "sum-pass")
        headers = await _auth_headers(client, email, "sum-pass")

        pipeline = await _create_pipeline(
            client, headers, f"summary-{utils.random_lower_string(8)}"
        )
        await _create_event(client, headers, pipeline["id"], "ok", status="success")
        await _create_event(client, headers, pipeline["id"], "bad", status="failure")

        response = await client.get(
            f"/data_orchestration/pipelines/{pipeline['id']}",
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["run_count"] == 2
    assert body["failure_count"] == 1
    assert body["last_run_status"] is not None
    assert body["last_run_at"] is not None


@pytest.mark.asyncio(loop_scope="module")
async def test_pipeline_list_includes_summary_fields() -> None:
    async with _client() as client:
        email = await _register_user(client, "sumlist-pass")
        headers = await _auth_headers(client, email, "sumlist-pass")

        pipeline = await _create_pipeline(
            client, headers, f"sumlist-{utils.random_lower_string(8)}"
        )
        await _create_event(client, headers, pipeline["id"], "run1", status="pending")

        response = await client.get(
            "/data_orchestration/pipelines",
            headers=headers,
        )

    assert response.status_code == 200
    items = response.json()
    target = next(p for p in items if p["id"] == pipeline["id"])
    assert target["run_count"] == 1
    assert target["failure_count"] == 0
    assert target["last_run_status"] == "pending"
    assert target["last_run_at"] is not None
