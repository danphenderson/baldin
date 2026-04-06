from contextlib import asynccontextmanager

import pytest
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient

from app.core import conf
from app.core.db import async_engine, drop_and_create_db_and_tables, session_context
from app.main import app
from app.tests import utils

pytestmark = pytest.mark.asyncio(loop_scope="module")

password_helper = PasswordHelper()

USER_SEED_PATHS = (
    "/certificate/seed",
    "/contacts/seed",
    "/cover_letters/seed",
    "/education/seed",
    "/experiences/seed",
    "/leads/seed",
    "/resumes/seed",
    "/skills/seed",
)


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
        json={"email": email, "password": password},
    )
    assert response.status_code in {200, 201}
    return email


async def _auth_headers(
    client: AsyncClient,
    email: str,
    password: str,
) -> dict[str, str]:
    response = await client.post(
        "/auth/jwt/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def _create_superuser(email: str, password: str) -> None:
    async with session_context() as session:
        await utils.create_db_user(
            email,
            password_helper.hash(password),
            session,
            is_superuser=True,
        )


async def _assert_seed_acceptance(
    client: AsyncClient,
    headers: dict[str, str],
    path: str,
) -> None:
    response = await client.post(path, headers=headers)

    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "pending"
    assert body["poll_url"] == f"/data_orchestration/events/{body['event_id']}"

    event_response = await client.get(body["poll_url"], headers=headers)

    assert event_response.status_code == 202
    event_body = event_response.json()
    assert event_body["id"] == body["event_id"]
    assert event_body["pipeline_id"] == body["pipeline_id"]
    assert event_body["status"] in {"pending", "running", "success"}


@pytest.mark.parametrize("path", USER_SEED_PATHS)
async def test_seed_routes_return_accepted_polling_payload(path: str) -> None:
    async with _client() as client:
        password = "SeedRoutePass1"
        email = await _register_user(client, password)
        headers = await _auth_headers(client, email, password)

        await _assert_seed_acceptance(client, headers, path)


async def test_superuser_seed_route_returns_accepted_polling_payload() -> None:
    async with _client() as client:
        password = "SuperSeedPass1"
        email = utils.random_email()
        await _create_superuser(email, password)
        headers = await _auth_headers(client, email, password)

        await _assert_seed_acceptance(client, headers, "/users/seed")
