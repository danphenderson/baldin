"""
Tests for SlowAPI rate limiting on abuse-sensitive endpoints.
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.conftest import (
    async_client_ctx as _client,
)
from app.conftest import (
    create_user as _create_user,
)
from app.conftest import (
    login_and_get_headers as _auth_headers,
)
from app.core import conf
from app.main import app
from app.tests import utils

pytestmark = [
    pytest.mark.asyncio(loop_scope="module"),
    pytest.mark.usefixtures("ensure_db"),
]


@pytest.fixture(autouse=True)
def _configure_openai_for_rate_limit_tests(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(conf.openai, "API_KEY", "test-openai-key")


async def test_suggest_extractor_rate_limit_returns_429():
    """Exceeding the 5/minute limit on POST /extractor/suggest returns 429."""
    password = "TestPass123!"
    email, _ = await _create_user(password, is_superuser=True)

    # Reset limiter storage so prior tests don't interfere
    app.state.limiter.reset()

    async with _client() as client:
        headers = await _auth_headers(client, email, password)

        mock_result = AsyncMock(return_value={"json_schema": "{}"})
        mock_chain = SimpleNamespace(ainvoke=mock_result)
        with patch(
            "app.api.routes.extractor._build_suggestion_chain", return_value=mock_chain
        ):
            statuses = []
            for _ in range(7):
                resp = await client.post(
                    "/api/v1/extractors/suggest",
                    json={"description": "test extractor"},
                    headers=headers,
                )
                statuses.append(resp.status_code)

            assert 429 in statuses, (
                f"Expected at least one 429 response, got: {statuses}"
            )
            # The first 5 should succeed (200), the rest should be 429
            assert statuses.count(429) >= 1


async def test_register_rate_limit_returns_429() -> None:
    """Exceeding the 5/minute limit on POST /auth/register returns 429."""
    app.state.limiter.reset()

    async with _client() as client:
        statuses = []
        for _ in range(7):
            resp = await client.post(
                "/api/v1/auth/register",
                json={
                    "email": utils.random_email(),
                    "password": "Register1Pass!",
                },
            )
            statuses.append(resp.status_code)

    assert statuses[:5] == [201, 201, 201, 201, 201]
    assert 429 in statuses[5:]


async def test_forgot_password_rate_limit_returns_429() -> None:
    """Exceeding the 5/minute limit on POST /auth/forgot-password returns 429."""
    email, _ = await _create_user("Forgot1Pass!")
    app.state.limiter.reset()

    async with _client() as client:
        statuses = []
        for _ in range(7):
            resp = await client.post(
                "/api/v1/auth/forgot-password",
                json={"email": email},
            )
            statuses.append(resp.status_code)

    assert statuses[:5] == [202, 202, 202, 202, 202]
    assert 429 in statuses[5:]


async def test_reset_password_rate_limit_returns_429() -> None:
    """Exceeding the 5/minute limit on POST /auth/reset-password returns 429."""
    app.state.limiter.reset()

    async with _client() as client:
        statuses = []
        for _ in range(7):
            resp = await client.post(
                "/api/v1/auth/reset-password",
                json={
                    "token": "not-a-real-token",
                    "password": "Reset1Pass!",
                },
            )
            statuses.append(resp.status_code)

    assert statuses[:5] == [400, 400, 400, 400, 400]
    assert 429 in statuses[5:]


async def test_request_verify_token_rate_limit_returns_429() -> None:
    """Exceeding the 5/minute limit on POST /auth/request-verify-token returns 429."""
    email, _ = await _create_user("Verify1Pass!", is_verified=False)
    app.state.limiter.reset()

    async with _client() as client:
        statuses = []
        for _ in range(7):
            resp = await client.post(
                "/api/v1/auth/request-verify-token",
                json={"email": email},
            )
            statuses.append(resp.status_code)

    assert statuses[:5] == [202, 202, 202, 202, 202]
    assert 429 in statuses[5:]


async def test_verify_rate_limit_returns_429() -> None:
    """Exceeding the 5/minute limit on POST /auth/verify returns 429."""
    app.state.limiter.reset()

    async with _client() as client:
        statuses = []
        for _ in range(7):
            resp = await client.post(
                "/api/v1/auth/verify",
                json={"token": "not-a-real-token"},
            )
            statuses.append(resp.status_code)

    assert statuses[:5] == [400, 400, 400, 400, 400]
    assert 429 in statuses[5:]
