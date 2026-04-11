"""
Tests for SlowAPI rate limiting on abuse-sensitive endpoints.
"""

from contextlib import asynccontextmanager
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import UUID

import pytest
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient

from app.core import conf
from app.core.db import async_engine, drop_and_create_db_and_tables, session_context
from app.main import app
from app.tests import utils

pytestmark = pytest.mark.asyncio(loop_scope="module")

password_helper = PasswordHelper()
_db_ready = False


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
        "/api/v1/auth/jwt/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def test_suggest_extractor_rate_limit_returns_429():
    """Exceeding the 5/minute limit on POST /extractor/suggest returns 429."""
    await _ensure_db_ready()
    password = "TestPass123!"
    email, _ = await _create_user(password, is_superuser=True)

    # Reset limiter storage so prior tests don't interfere
    app.state.limiter.reset()

    async with _client() as client:
        headers = await _auth_headers(client, email, password)

        mock_result = AsyncMock(return_value={"json_schema": "{}", "instruction": ""})
        mock_chain = SimpleNamespace(ainvoke=mock_result)
        with patch("app.api.routes.extractor.suggestion_chain", mock_chain):
            statuses = []
            for _ in range(7):
                resp = await client.post(
                    "/api/v1/extractor/suggest",
                    json={"description": "test extractor"},
                    headers=headers,
                )
                statuses.append(resp.status_code)

            assert 429 in statuses, (
                f"Expected at least one 429 response, got: {statuses}"
            )
            # The first 5 should succeed (200), the rest should be 429
            assert statuses.count(429) >= 1
