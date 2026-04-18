"""Tests for placement lifecycle transitions and active-placement gating."""

from uuid import UUID

import pytest

from app import models
from app.conftest import (
    async_client_ctx as _client,
)
from app.conftest import (
    create_user as _create_user,
)
from app.conftest import (
    login_and_get_headers as _auth_headers,
)
from app.core.db import session_context

pytestmark = [
    pytest.mark.asyncio(loop_scope="module"),
    pytest.mark.usefixtures("fresh_db"),
]


async def _set_user_fields(user_id: UUID, **values) -> None:
    async with session_context() as session:
        user = await session.get(models.User, user_id)
        assert user is not None
        for field, value in values.items():
            setattr(user, field, value)
        await session.commit()


# ---------------------------------------------------------------------------
# Placement lifecycle tests
# ---------------------------------------------------------------------------


async def test_placement_active_to_graduated() -> None:
    """PATCH /users/me/placement — active → graduated is valid."""
    async with _client() as client:
        email, uid = await _create_user("sub-place-ag-pass")
        headers = await _auth_headers(client, email, "sub-place-ag-pass")

        response = await client.patch(
            "/api/v1/users/me/placement",
            json={"placement_status": "graduated"},
            headers=headers,
        )

    assert response.status_code == 200
    assert response.json()["placement_status"] == "graduated"


async def test_placement_graduated_to_alumni() -> None:
    """PATCH /users/me/placement — graduated → alumni is valid."""
    async with _client() as client:
        email, uid = await _create_user("sub-place-ga-pass")
        await _set_user_fields(uid, placement_status="graduated")
        headers = await _auth_headers(client, email, "sub-place-ga-pass")

        response = await client.patch(
            "/api/v1/users/me/placement",
            json={"placement_status": "alumni"},
            headers=headers,
        )

    assert response.status_code == 200
    assert response.json()["placement_status"] == "alumni"


async def test_placement_invalid_transition_returns_400() -> None:
    """PATCH /users/me/placement — active → alumni is invalid."""
    async with _client() as client:
        email, uid = await _create_user("sub-place-bad-pass")
        headers = await _auth_headers(client, email, "sub-place-bad-pass")

        response = await client.patch(
            "/api/v1/users/me/placement",
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
