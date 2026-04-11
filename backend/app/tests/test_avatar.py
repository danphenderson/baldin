"""Tests for the user avatar upload and serve endpoints."""

from contextlib import asynccontextmanager
from uuid import UUID, uuid4

import pytest
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient

from app.core import conf
from app.core.db import async_engine, drop_and_create_db_and_tables, session_context
from app.core.document_storage import find_avatar_file, remove_avatar_files
from app.main import app
from app.tests import utils

pytestmark = pytest.mark.asyncio(loop_scope="module")

password_helper = PasswordHelper()
_db_ready = False

# A minimal valid 1x1 PNG image (67 bytes)
_TINY_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    b"\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00"
    b"\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00"
    b"\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
)

# A minimal valid JPEG header (enough for content-type validation)
_TINY_JPEG = bytes(
    [
        0xFF,
        0xD8,
        0xFF,
        0xE0,
        0x00,
        0x10,
        0x4A,
        0x46,
        0x49,
        0x46,
        0x00,
        0x01,
        0x01,
        0x00,
        0x00,
        0x01,
        0x00,
        0x01,
        0x00,
        0x00,
        0xFF,
        0xD9,
    ]
)


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


async def _create_user(password: str) -> tuple[str, UUID]:
    email = utils.random_email()
    async with session_context() as session:
        user = await utils.create_db_user(
            email,
            password_helper.hash(password),
            session,
        )
        await session.commit()
    return email, user.id


async def _auth_headers(
    client: AsyncClient, email: str, password: str
) -> dict[str, str]:
    resp = await client.post(
        "/api/v1/auth/jwt/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


# ── Tests ────────────────────────────────────────────────────────────────


async def test_upload_avatar_png():
    await _ensure_db_ready()
    async with _client() as client:
        email, user_id = await _create_user("testpw")
        headers = await _auth_headers(client, email, "testpw")

        resp = await client.post(
            "/api/v1/users/me/avatar",
            headers=headers,
            files={"file": ("avatar.png", _TINY_PNG, "image/png")},
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["avatar_uri"] is not None
        assert "avatar" in data["avatar_uri"]

        # Verify file exists on disk
        avatar = find_avatar_file(user_id)
        assert avatar is not None
        assert avatar.suffix == ".png"

        # Cleanup
        remove_avatar_files(user_id)


async def test_serve_avatar():
    await _ensure_db_ready()
    async with _client() as client:
        email, user_id = await _create_user("testpw2")
        headers = await _auth_headers(client, email, "testpw2")

        # Upload first
        resp = await client.post(
            "/api/v1/users/me/avatar",
            headers=headers,
            files={"file": ("avatar.png", _TINY_PNG, "image/png")},
        )
        assert resp.status_code == 200

        # Serve endpoint (public, no auth required)
        resp = await client.get(f"/api/v1/users/{user_id}/avatar")
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("image/")
        assert len(resp.content) == len(_TINY_PNG)

        # Cleanup
        remove_avatar_files(user_id)


async def test_serve_avatar_not_found():
    await _ensure_db_ready()
    async with _client() as client:
        # Random user ID with no avatar
        resp = await client.get(f"/api/v1/users/{uuid4()}/avatar")
        assert resp.status_code == 404


async def test_upload_avatar_replaces_previous():
    await _ensure_db_ready()
    async with _client() as client:
        email, user_id = await _create_user("testpw3")
        headers = await _auth_headers(client, email, "testpw3")

        # Upload PNG first
        resp = await client.post(
            "/api/v1/users/me/avatar",
            headers=headers,
            files={"file": ("avatar.png", _TINY_PNG, "image/png")},
        )
        assert resp.status_code == 200
        first_uri = resp.json()["avatar_uri"]

        # Upload JPEG to replace
        resp = await client.post(
            "/api/v1/users/me/avatar",
            headers=headers,
            files={"file": ("avatar.jpg", _TINY_JPEG, "image/jpeg")},
        )
        assert resp.status_code == 200
        second_uri = resp.json()["avatar_uri"]
        assert second_uri != first_uri

        # Old PNG should be gone
        avatar = find_avatar_file(user_id)
        assert avatar is not None
        assert avatar.suffix == ".jpg"

        # Cleanup
        remove_avatar_files(user_id)


async def test_upload_avatar_unsupported_type():
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("testpw4")
        headers = await _auth_headers(client, email, "testpw4")

        resp = await client.post(
            "/api/v1/users/me/avatar",
            headers=headers,
            files={"file": ("avatar.bmp", b"fake", "image/bmp")},
        )
        assert resp.status_code == 400
        assert "Unsupported" in resp.json()["detail"]


async def test_upload_avatar_too_large():
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("testpw5")
        headers = await _auth_headers(client, email, "testpw5")

        # Create a file larger than 2 MB
        large_file = b"\x00" * (2 * 1024 * 1024 + 1)
        resp = await client.post(
            "/api/v1/users/me/avatar",
            headers=headers,
            files={"file": ("big.png", large_file, "image/png")},
        )
        assert resp.status_code == 400
        assert "limit" in resp.json()["detail"].lower()


async def test_upload_avatar_requires_auth():
    await _ensure_db_ready()
    async with _client() as client:
        resp = await client.post(
            "/api/v1/users/me/avatar",
            files={"file": ("avatar.png", _TINY_PNG, "image/png")},
        )
        assert resp.status_code == 401
