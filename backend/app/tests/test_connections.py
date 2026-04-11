"""Tests for the /connections endpoints (CRUD, tier gating, blocking)."""

from contextlib import asynccontextmanager
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
    password: str, *, is_superuser: bool = False, tier: str = "free"
) -> tuple[str, UUID]:
    email = utils.random_email()
    async with session_context() as session:
        user = await utils.create_db_user(
            email,
            password_helper.hash(password),
            session,
            is_superuser=is_superuser,
        )
        if tier != "free":
            user.subscription_tier = tier
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


async def _set_user_fields(user_id: UUID, **values) -> None:
    async with session_context() as session:
        user = await session.get(models.User, user_id)
        assert user is not None
        for field, value in values.items():
            setattr(user, field, value)
        await session.commit()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


async def test_create_connection_request() -> None:
    """POST /connections/ creates a pending connection for starter+ users."""
    await _ensure_db_ready()
    async with _client() as client:
        email_a, uid_a = await _create_user("conn-a-pass", tier="starter")
        email_b, uid_b = await _create_user("conn-b-pass")
        headers = await _auth_headers(client, email_a, "conn-a-pass")

        response = await client.post(
            "/api/v1/connections/",
            json={"addressee_id": str(uid_b), "message": "Let's connect!"},
            headers=headers,
        )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending"
    assert body["message"] == "Let's connect!"
    assert body["requester"]["user_id"] == str(uid_a)
    assert body["requester"]["is_superuser"] is False
    assert body["addressee"]["user_id"] == str(uid_b)
    assert body["addressee"]["is_superuser"] is False


async def test_free_tier_cannot_create_connection() -> None:
    """Free-tier users get 403 when trying to send a connection request."""
    await _ensure_db_ready()
    async with _client() as client:
        email_f, uid_f = await _create_user("conn-free-pass", tier="free")
        email_t, uid_t = await _create_user("conn-target-pass")
        headers = await _auth_headers(client, email_f, "conn-free-pass")

        response = await client.post(
            "/api/v1/connections/",
            json={"addressee_id": str(uid_t)},
            headers=headers,
        )

    assert response.status_code == 403


async def test_free_tier_can_create_connection_to_superuser() -> None:
    """Free-tier users can request a connection when the target is a superuser."""
    await _ensure_db_ready()
    async with _client() as client:
        email_f, uid_f = await _create_user("conn-free-super-pass", tier="free")
        email_s, uid_s = await _create_user(
            "conn-super-target-pass",
            is_superuser=True,
        )
        headers = await _auth_headers(client, email_f, "conn-free-super-pass")

        response = await client.post(
            "/api/v1/connections/",
            json={"addressee_id": str(uid_s)},
            headers=headers,
        )

    assert response.status_code == 201
    body = response.json()
    assert body["requester"]["user_id"] == str(uid_f)
    assert body["addressee"]["user_id"] == str(uid_s)
    assert body["addressee"]["is_superuser"] is True


async def test_cannot_connect_to_self() -> None:
    """A user cannot send a connection request to themselves."""
    await _ensure_db_ready()
    async with _client() as client:
        email_s, uid_s = await _create_user("conn-self-pass", tier="starter")
        headers = await _auth_headers(client, email_s, "conn-self-pass")

        response = await client.post(
            "/api/v1/connections/",
            json={"addressee_id": str(uid_s)},
            headers=headers,
        )

    assert response.status_code == 400


async def test_duplicate_connection_returns_409() -> None:
    """Sending a duplicate connection request returns 409 conflict."""
    await _ensure_db_ready()
    async with _client() as client:
        email_a, uid_a = await _create_user("conn-dup-a-pass", tier="starter")
        email_b, uid_b = await _create_user("conn-dup-b-pass")
        headers = await _auth_headers(client, email_a, "conn-dup-a-pass")

        first = await client.post(
            "/api/v1/connections/",
            json={"addressee_id": str(uid_b)},
            headers=headers,
        )
        second = await client.post(
            "/api/v1/connections/",
            json={"addressee_id": str(uid_b)},
            headers=headers,
        )

    assert first.status_code == 201
    assert second.status_code == 409


async def test_list_connections_with_status_filter() -> None:
    """GET /connections/?status=pending returns only pending connections."""
    await _ensure_db_ready()
    async with _client() as client:
        email_a, uid_a = await _create_user("conn-list-a-pass", tier="starter")
        email_b, uid_b = await _create_user("conn-list-b-pass")
        headers_a = await _auth_headers(client, email_a, "conn-list-a-pass")

        await client.post(
            "/api/v1/connections/",
            json={"addressee_id": str(uid_b)},
            headers=headers_a,
        )

        response = await client.get(
            "/api/v1/connections/", params={"status": "pending"}, headers=headers_a
        )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    for item in body["items"]:
        assert item["status"] == "pending"


async def test_connection_list_exposes_superuser_metadata() -> None:
    """GET /connections/ includes superuser flags in participant summaries."""
    await _ensure_db_ready()
    async with _client() as client:
        email_a, uid_a = await _create_user("conn-meta-a-pass", tier="starter")
        email_s, uid_s = await _create_user(
            "conn-meta-super-pass",
            is_superuser=True,
        )
        headers_a = await _auth_headers(client, email_a, "conn-meta-a-pass")

        create_resp = await client.post(
            "/api/v1/connections/",
            json={"addressee_id": str(uid_s)},
            headers=headers_a,
        )
        assert create_resp.status_code == 201

        response = await client.get(
            "/api/v1/connections/",
            params={"status": "pending", "page": 1, "page_size": 100},
            headers=headers_a,
        )

    assert response.status_code == 200
    body = response.json()
    matching = next(
        item for item in body["items"] if item["addressee"]["user_id"] == str(uid_s)
    )
    assert matching["requester"]["user_id"] == str(uid_a)
    assert matching["requester"]["is_superuser"] is False
    assert matching["addressee"]["is_superuser"] is True


async def test_accept_connection() -> None:
    """PATCH /connections/{id}/accept — only the addressee can accept."""
    await _ensure_db_ready()
    async with _client() as client:
        email_a, uid_a = await _create_user("conn-acc-a-pass", tier="starter")
        email_b, uid_b = await _create_user("conn-acc-b-pass", tier="starter")
        headers_a = await _auth_headers(client, email_a, "conn-acc-a-pass")
        headers_b = await _auth_headers(client, email_b, "conn-acc-b-pass")

        create_resp = await client.post(
            "/api/v1/connections/",
            json={"addressee_id": str(uid_b)},
            headers=headers_a,
        )
        conn_id = create_resp.json()["id"]

        # Requester cannot accept their own request
        wrong_accept = await client.patch(
            f"/api/v1/connections/{conn_id}/accept", headers=headers_a
        )
        assert wrong_accept.status_code == 403

        # Addressee can accept
        accept_resp = await client.patch(
            f"/api/v1/connections/{conn_id}/accept", headers=headers_b
        )

    assert accept_resp.status_code == 200
    assert accept_resp.json()["status"] == "accepted"


async def test_decline_connection() -> None:
    """PATCH /connections/{id}/decline — only the addressee can decline."""
    await _ensure_db_ready()
    async with _client() as client:
        email_a, uid_a = await _create_user("conn-dec-a-pass", tier="starter")
        email_b, uid_b = await _create_user("conn-dec-b-pass", tier="starter")
        headers_a = await _auth_headers(client, email_a, "conn-dec-a-pass")
        headers_b = await _auth_headers(client, email_b, "conn-dec-b-pass")

        create_resp = await client.post(
            "/api/v1/connections/",
            json={"addressee_id": str(uid_b)},
            headers=headers_a,
        )
        conn_id = create_resp.json()["id"]

        # Requester cannot decline their own request
        wrong_decline = await client.patch(
            f"/api/v1/connections/{conn_id}/decline", headers=headers_a
        )
        assert wrong_decline.status_code == 403

        # Addressee can decline
        decline_resp = await client.patch(
            f"/api/v1/connections/{conn_id}/decline", headers=headers_b
        )

    assert decline_resp.status_code == 200
    assert decline_resp.json()["status"] == "declined"


async def test_remove_connection() -> None:
    """DELETE /connections/{id} — either party can remove an accepted connection."""
    await _ensure_db_ready()
    async with _client() as client:
        email_a, uid_a = await _create_user("conn-rm-a-pass", tier="starter")
        email_b, uid_b = await _create_user("conn-rm-b-pass", tier="starter")
        headers_a = await _auth_headers(client, email_a, "conn-rm-a-pass")
        headers_b = await _auth_headers(client, email_b, "conn-rm-b-pass")

        create_resp = await client.post(
            "/api/v1/connections/",
            json={"addressee_id": str(uid_b)},
            headers=headers_a,
        )
        conn_id = create_resp.json()["id"]

        # Accept first
        await client.patch(f"/api/v1/connections/{conn_id}/accept", headers=headers_b)

        # Either party can remove
        delete_resp = await client.delete(
            f"/api/v1/connections/{conn_id}", headers=headers_a
        )

    assert delete_resp.status_code == 204


async def test_block_connection() -> None:
    """POST /connections/{id}/block sets the connection to blocked status."""
    await _ensure_db_ready()
    async with _client() as client:
        email_a, uid_a = await _create_user("conn-blk-a-pass", tier="starter")
        email_b, uid_b = await _create_user("conn-blk-b-pass", tier="starter")
        headers_a = await _auth_headers(client, email_a, "conn-blk-a-pass")
        headers_b = await _auth_headers(client, email_b, "conn-blk-b-pass")

        create_resp = await client.post(
            "/api/v1/connections/",
            json={"addressee_id": str(uid_b)},
            headers=headers_a,
        )
        conn_id = create_resp.json()["id"]

        block_resp = await client.post(
            f"/api/v1/connections/{conn_id}/block", headers=headers_b
        )

    assert block_resp.status_code == 200
    assert block_resp.json()["status"] == "blocked"
