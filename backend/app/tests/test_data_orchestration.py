from contextlib import asynccontextmanager

import pytest
from httpx import ASGITransport, AsyncClient

from app.core import conf
from app.main import app
from app.tests import utils


@asynccontextmanager
async def _client() -> AsyncClient:
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
        json={"email": email, "password": password},
    )
    assert response.status_code in {200, 201}
    return email


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
) -> dict:
    response = await client.post(
        "/data_orchestration/events",
        json={
            "message": message,
            "payload": {"source": "test"},
            "environment": "PYTEST",
            "status": "pending",
            "pipeline_id": pipeline_id,
        },
        headers=headers,
    )
    assert response.status_code == 202
    return response.json()


@pytest.mark.asyncio
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


@pytest.mark.asyncio
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


@pytest.mark.asyncio
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


@pytest.mark.asyncio
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
    returned_ids = {item["id"] for item in response.json()}
    assert owner_event["id"] in returned_ids
    assert other_event["id"] not in returned_ids


@pytest.mark.asyncio
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


@pytest.mark.asyncio
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
