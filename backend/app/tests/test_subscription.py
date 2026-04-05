"""Tests for subscription tier gating and placement lifecycle transitions."""

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


async def _create_user(password: str, *, tier: str = "free") -> tuple[str, UUID]:
    email = utils.random_email()
    async with session_context() as session:
        user = await utils.create_db_user(
            email,
            password_helper.hash(password),
            session,
        )
        if tier != "free":
            user.subscription_tier = tier
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


async def _set_user_fields(user_id: UUID, **values) -> None:
    async with session_context() as session:
        user = await session.get(models.User, user_id)
        assert user is not None
        for field, value in values.items():
            setattr(user, field, value)
        await session.commit()


# ---------------------------------------------------------------------------
# Tier gating tests
# ---------------------------------------------------------------------------


async def test_tier_gating_free_blocked() -> None:
    """Free-tier users cannot access starter+ features (connections)."""
    await _ensure_db_ready()
    async with _client() as client:
        email_f, uid_f = await _create_user("sub-free-pass", tier="free")
        email_t, uid_t = await _create_user("sub-target-pass")
        headers = await _auth_headers(client, email_f, "sub-free-pass")

        response = await client.post(
            "/connections/",
            json={"addressee_id": str(uid_t)},
            headers=headers,
        )

    assert response.status_code == 403
    assert "subscription" in response.json()["detail"].lower()


async def test_tier_gating_starter_passes() -> None:
    """Starter-tier users can access starter+ features."""
    await _ensure_db_ready()
    async with _client() as client:
        email_s, uid_s = await _create_user("sub-starter-pass", tier="starter")
        email_t, uid_t = await _create_user("sub-start-target")
        headers = await _auth_headers(client, email_s, "sub-starter-pass")

        response = await client.post(
            "/connections/",
            json={"addressee_id": str(uid_t)},
            headers=headers,
        )

    assert response.status_code == 201


async def test_expired_subscription_treated_as_free() -> None:
    """A starter user with expired subscription gets 403 on tier-gated endpoints."""
    await _ensure_db_ready()
    async with _client() as client:
        email_e, uid_e = await _create_user("sub-expired-pass", tier="starter")
        # Set subscription to expired (past date)
        await _set_user_fields(
            uid_e,
            subscription_expires_at=datetime.utcnow() - timedelta(days=1),
        )
        email_t, uid_t = await _create_user("sub-exp-target")
        headers = await _auth_headers(client, email_e, "sub-expired-pass")

        response = await client.post(
            "/connections/",
            json={"addressee_id": str(uid_t)},
            headers=headers,
        )

    assert response.status_code == 403
    assert "expired" in response.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Placement lifecycle tests
# ---------------------------------------------------------------------------


async def test_placement_active_to_graduated() -> None:
    """PATCH /users/me/placement — active → graduated is valid."""
    await _ensure_db_ready()
    async with _client() as client:
        email, uid = await _create_user("sub-place-ag-pass")
        headers = await _auth_headers(client, email, "sub-place-ag-pass")

        response = await client.patch(
            "/users/me/placement",
            json={"placement_status": "graduated"},
            headers=headers,
        )

    assert response.status_code == 200
    assert response.json()["placement_status"] == "graduated"


async def test_placement_graduated_to_alumni() -> None:
    """PATCH /users/me/placement — graduated → alumni is valid."""
    await _ensure_db_ready()
    async with _client() as client:
        email, uid = await _create_user("sub-place-ga-pass")
        await _set_user_fields(uid, placement_status="graduated")
        headers = await _auth_headers(client, email, "sub-place-ga-pass")

        response = await client.patch(
            "/users/me/placement",
            json={"placement_status": "alumni"},
            headers=headers,
        )

    assert response.status_code == 200
    assert response.json()["placement_status"] == "alumni"


async def test_placement_invalid_transition_returns_400() -> None:
    """PATCH /users/me/placement — active → alumni is invalid."""
    await _ensure_db_ready()
    async with _client() as client:
        email, uid = await _create_user("sub-place-bad-pass")
        headers = await _auth_headers(client, email, "sub-place-bad-pass")

        response = await client.patch(
            "/users/me/placement",
            json={"placement_status": "alumni"},
            headers=headers,
        )

    assert response.status_code == 400


async def test_require_active_placement_blocks_graduated() -> None:
    """The require_active_placement guard blocks graduated/alumni users.

    We test this indirectly: there are currently no routes explicitly using
    require_active_placement in a way we can hit through public endpoints without
    modifying implementation files, so we test the dependency directly.
    """
    await _ensure_db_ready()

    from fastapi import HTTPException

    from app.api.deps import require_active_placement

    guard_fn = require_active_placement()

    # Create a graduated user
    _, uid = await _create_user("sub-guard-pass")
    await _set_user_fields(uid, placement_status="graduated")

    async with session_context() as session:
        user = await session.get(models.User, uid)

    with pytest.raises(HTTPException) as exc_info:
        await guard_fn(user=user)
    assert exc_info.value.status_code == 403
    assert "active" in exc_info.value.detail.lower()
