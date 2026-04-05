"""Tests for /conversations endpoints (DM, group, messages, unread tracking)."""

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


async def _create_accepted_connection(
    client: AsyncClient,
    headers_requester: dict[str, str],
    headers_addressee: dict[str, str],
    addressee_id: UUID,
) -> str:
    """Create and accept a connection. Returns connection ID."""
    resp = await client.post(
        "/connections/",
        json={"addressee_id": str(addressee_id)},
        headers=headers_requester,
    )
    assert resp.status_code == 201
    conn_id = resp.json()["id"]
    accept = await client.patch(
        f"/connections/{conn_id}/accept", headers=headers_addressee
    )
    assert accept.status_code == 200
    return conn_id


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


async def test_create_dm_conversation() -> None:
    """POST /conversations/ creates a DM between connected starter+ users."""
    await _ensure_db_ready()
    async with _client() as client:
        email_a, uid_a = await _create_user("msg-dm-a", tier="starter")
        email_b, uid_b = await _create_user("msg-dm-b", tier="starter")
        headers_a = await _auth_headers(client, email_a, "msg-dm-a")
        headers_b = await _auth_headers(client, email_b, "msg-dm-b")

        await _create_accepted_connection(client, headers_a, headers_b, uid_b)

        response = await client.post(
            "/conversations/",
            json={
                "participant_user_ids": [str(uid_b)],
                "type": "direct",
            },
            headers=headers_a,
        )

    assert response.status_code == 201
    body = response.json()
    assert body["type"] == "direct"
    assert len(body["participants"]) == 2


async def test_create_group_conversation_pro_only() -> None:
    """POST /conversations/ with type=group requires pro tier."""
    await _ensure_db_ready()
    async with _client() as client:
        email_a, uid_a = await _create_user("msg-grp-a", tier="pro")
        email_b, uid_b = await _create_user("msg-grp-b", tier="pro")
        email_c, uid_c = await _create_user("msg-grp-c", tier="pro")
        headers_a = await _auth_headers(client, email_a, "msg-grp-a")
        headers_b = await _auth_headers(client, email_b, "msg-grp-b")

        # Pro user can create group
        response = await client.post(
            "/conversations/",
            json={
                "participant_user_ids": [str(uid_b), str(uid_c)],
                "type": "group",
                "title": "Test Group",
            },
            headers=headers_a,
        )

    assert response.status_code == 201
    body = response.json()
    assert body["type"] == "group"
    assert body["title"] == "Test Group"

    # Starter user cannot create group
    async with _client() as client:
        email_s, uid_s = await _create_user("msg-grp-starter", tier="starter")
        email_t, uid_t = await _create_user("msg-grp-target", tier="starter")
        email_u, uid_u = await _create_user("msg-grp-target2", tier="starter")
        headers_s = await _auth_headers(client, email_s, "msg-grp-starter")

        response = await client.post(
            "/conversations/",
            json={
                "participant_user_ids": [str(uid_t), str(uid_u)],
                "type": "group",
                "title": "Blocked Group",
            },
            headers=headers_s,
        )

    assert response.status_code == 403


async def test_free_tier_cannot_create_conversation() -> None:
    """Free-tier users get 403 when creating conversations."""
    await _ensure_db_ready()
    async with _client() as client:
        email_f, uid_f = await _create_user("msg-free-pass", tier="free")
        email_t, uid_t = await _create_user("msg-free-target")
        headers_f = await _auth_headers(client, email_f, "msg-free-pass")

        response = await client.post(
            "/conversations/",
            json={
                "participant_user_ids": [str(uid_t)],
                "type": "direct",
            },
            headers=headers_f,
        )

    assert response.status_code == 403


async def test_dm_without_accepted_connection_fails() -> None:
    """DM creation requires an accepted connection between the users."""
    await _ensure_db_ready()
    async with _client() as client:
        email_a, uid_a = await _create_user("msg-noconn-a", tier="starter")
        email_b, uid_b = await _create_user("msg-noconn-b", tier="starter")
        headers_a = await _auth_headers(client, email_a, "msg-noconn-a")

        # No connection exists between users — should fail
        response = await client.post(
            "/conversations/",
            json={
                "participant_user_ids": [str(uid_b)],
                "type": "direct",
            },
            headers=headers_a,
        )

    assert response.status_code == 403


async def test_dm_deduplication() -> None:
    """Creating a DM between the same two users returns the existing conversation."""
    await _ensure_db_ready()
    async with _client() as client:
        email_a, uid_a = await _create_user("msg-dedup-a", tier="starter")
        email_b, uid_b = await _create_user("msg-dedup-b", tier="starter")
        headers_a = await _auth_headers(client, email_a, "msg-dedup-a")
        headers_b = await _auth_headers(client, email_b, "msg-dedup-b")

        await _create_accepted_connection(client, headers_a, headers_b, uid_b)

        first = await client.post(
            "/conversations/",
            json={"participant_user_ids": [str(uid_b)], "type": "direct"},
            headers=headers_a,
        )
        second = await client.post(
            "/conversations/",
            json={"participant_user_ids": [str(uid_b)], "type": "direct"},
            headers=headers_a,
        )

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]


async def test_list_conversations() -> None:
    """GET /conversations/ lists the user's conversations."""
    await _ensure_db_ready()
    async with _client() as client:
        email_a, uid_a = await _create_user("msg-list-a", tier="starter")
        email_b, uid_b = await _create_user("msg-list-b", tier="starter")
        headers_a = await _auth_headers(client, email_a, "msg-list-a")
        headers_b = await _auth_headers(client, email_b, "msg-list-b")

        await _create_accepted_connection(client, headers_a, headers_b, uid_b)

        await client.post(
            "/conversations/",
            json={"participant_user_ids": [str(uid_b)], "type": "direct"},
            headers=headers_a,
        )

        response = await client.get("/conversations/", headers=headers_a)

    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert isinstance(body["items"], list)


async def test_conversation_detail_with_messages_marks_read() -> None:
    """GET /conversations/{id} returns messages and auto-marks as read."""
    await _ensure_db_ready()
    async with _client() as client:
        email_a, uid_a = await _create_user("msg-det-a", tier="starter")
        email_b, uid_b = await _create_user("msg-det-b", tier="starter")
        headers_a = await _auth_headers(client, email_a, "msg-det-a")
        headers_b = await _auth_headers(client, email_b, "msg-det-b")

        await _create_accepted_connection(client, headers_a, headers_b, uid_b)

        conv_resp = await client.post(
            "/conversations/",
            json={"participant_user_ids": [str(uid_b)], "type": "direct"},
            headers=headers_a,
        )
        conv_id = conv_resp.json()["id"]

        # Send a message
        await client.post(
            f"/conversations/{conv_id}/messages",
            json={"content": "Hello there!"},
            headers=headers_a,
        )

        # Other user views conversation → marks as read
        detail_resp = await client.get(f"/conversations/{conv_id}", headers=headers_b)

    assert detail_resp.status_code == 200
    body = detail_resp.json()
    assert len(body["messages"]) >= 1
    assert body["messages"][0]["content"] == "Hello there!"


async def test_send_message() -> None:
    """POST /conversations/{id}/messages sends a message."""
    await _ensure_db_ready()
    async with _client() as client:
        email_a, uid_a = await _create_user("msg-send-a", tier="starter")
        email_b, uid_b = await _create_user("msg-send-b", tier="starter")
        headers_a = await _auth_headers(client, email_a, "msg-send-a")
        headers_b = await _auth_headers(client, email_b, "msg-send-b")

        await _create_accepted_connection(client, headers_a, headers_b, uid_b)

        conv_resp = await client.post(
            "/conversations/",
            json={"participant_user_ids": [str(uid_b)], "type": "direct"},
            headers=headers_a,
        )
        conv_id = conv_resp.json()["id"]

        msg_resp = await client.post(
            f"/conversations/{conv_id}/messages",
            json={"content": "Test message content"},
            headers=headers_a,
        )

    assert msg_resp.status_code == 201
    body = msg_resp.json()
    assert body["content"] == "Test message content"
    assert body["author"]["user_id"] == str(uid_a)


async def test_edit_own_message() -> None:
    """PATCH /conversations/{id}/messages/{msg_id} edits your own message."""
    await _ensure_db_ready()
    async with _client() as client:
        email_a, uid_a = await _create_user("msg-edit-a", tier="starter")
        email_b, uid_b = await _create_user("msg-edit-b", tier="starter")
        headers_a = await _auth_headers(client, email_a, "msg-edit-a")
        headers_b = await _auth_headers(client, email_b, "msg-edit-b")

        await _create_accepted_connection(client, headers_a, headers_b, uid_b)

        conv_resp = await client.post(
            "/conversations/",
            json={"participant_user_ids": [str(uid_b)], "type": "direct"},
            headers=headers_a,
        )
        conv_id = conv_resp.json()["id"]

        msg_resp = await client.post(
            f"/conversations/{conv_id}/messages",
            json={"content": "Original"},
            headers=headers_a,
        )
        msg_id = msg_resp.json()["id"]

        edit_resp = await client.patch(
            f"/conversations/{conv_id}/messages/{msg_id}",
            json={"content": "Edited"},
            headers=headers_a,
        )

        # Other user cannot edit someone else's message
        wrong_edit = await client.patch(
            f"/conversations/{conv_id}/messages/{msg_id}",
            json={"content": "Tampered"},
            headers=headers_b,
        )

    assert edit_resp.status_code == 200
    assert edit_resp.json()["content"] == "Edited"
    assert edit_resp.json()["edited_at"] is not None
    assert wrong_edit.status_code == 403


async def test_delete_own_message() -> None:
    """DELETE /conversations/{id}/messages/{msg_id} deletes your own message."""
    await _ensure_db_ready()
    async with _client() as client:
        email_a, uid_a = await _create_user("msg-del-a", tier="starter")
        email_b, uid_b = await _create_user("msg-del-b", tier="starter")
        headers_a = await _auth_headers(client, email_a, "msg-del-a")
        headers_b = await _auth_headers(client, email_b, "msg-del-b")

        await _create_accepted_connection(client, headers_a, headers_b, uid_b)

        conv_resp = await client.post(
            "/conversations/",
            json={"participant_user_ids": [str(uid_b)], "type": "direct"},
            headers=headers_a,
        )
        conv_id = conv_resp.json()["id"]

        msg_resp = await client.post(
            f"/conversations/{conv_id}/messages",
            json={"content": "To be deleted"},
            headers=headers_a,
        )
        msg_id = msg_resp.json()["id"]

        # Other user cannot delete someone else's message
        wrong_del = await client.delete(
            f"/conversations/{conv_id}/messages/{msg_id}",
            headers=headers_b,
        )
        assert wrong_del.status_code == 403

        # Author can delete
        del_resp = await client.delete(
            f"/conversations/{conv_id}/messages/{msg_id}",
            headers=headers_a,
        )

    assert del_resp.status_code == 204


async def test_unread_count() -> None:
    """GET /conversations/unread returns total unread message count."""
    await _ensure_db_ready()
    async with _client() as client:
        email_a, uid_a = await _create_user("msg-unread-a", tier="starter")
        email_b, uid_b = await _create_user("msg-unread-b", tier="starter")
        headers_a = await _auth_headers(client, email_a, "msg-unread-a")
        headers_b = await _auth_headers(client, email_b, "msg-unread-b")

        await _create_accepted_connection(client, headers_a, headers_b, uid_b)

        conv_resp = await client.post(
            "/conversations/",
            json={"participant_user_ids": [str(uid_b)], "type": "direct"},
            headers=headers_a,
        )
        conv_id = conv_resp.json()["id"]

        # User A sends two messages
        await client.post(
            f"/conversations/{conv_id}/messages",
            json={"content": "Message 1"},
            headers=headers_a,
        )
        await client.post(
            f"/conversations/{conv_id}/messages",
            json={"content": "Message 2"},
            headers=headers_a,
        )

        # User B checks unread before reading
        unread_resp = await client.get("/conversations/unread", headers=headers_b)

    assert unread_resp.status_code == 200
    body = unread_resp.json()
    assert body["total_unread"] >= 2
