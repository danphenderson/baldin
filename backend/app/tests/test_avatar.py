"""Tests for the user avatar upload and serve endpoints."""

from uuid import uuid4

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
from app.core.document_storage import find_avatar_file, remove_avatar_files

pytestmark = [
    pytest.mark.asyncio(loop_scope="module"),
    pytest.mark.usefixtures("ensure_db"),
]

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

_TINY_GIF = (
    b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!"
    b"\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00"
    b"\x00\x02\x02D\x01\x00;"
)

_TINY_WEBP = (
    b"RIFF$\x00\x00\x00WEBPVP8 \x18\x00\x00\x00"
    b"\x30\x01\x00\x9d\x01*\x01\x00\x01\x00\x01@&%\xa4\x00\x03p\x00\xfe\xfb\xfdP\x00"
)


# ── Tests ────────────────────────────────────────────────────────────────


async def test_upload_avatar_png():
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
        assert resp.headers["x-content-type-options"] == "nosniff"
        assert len(resp.content) == len(_TINY_PNG)

        # Cleanup
        remove_avatar_files(user_id)


async def test_serve_avatar_not_found():
    async with _client() as client:
        # Random user ID with no avatar
        resp = await client.get(f"/api/v1/users/{uuid4()}/avatar")
        assert resp.status_code == 404


async def test_upload_avatar_replaces_previous():
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


@pytest.mark.parametrize(
    ("filename", "file_bytes", "content_type", "expected_suffix"),
    [
        ("avatar.gif", _TINY_GIF, "image/gif", ".gif"),
        ("avatar.webp", _TINY_WEBP, "image/webp", ".webp"),
    ],
)
async def test_upload_avatar_accepts_supported_image_signatures(
    filename: str,
    file_bytes: bytes,
    content_type: str,
    expected_suffix: str,
):
    async with _client() as client:
        email, user_id = await _create_user("testpw-supported")
        headers = await _auth_headers(client, email, "testpw-supported")

        resp = await client.post(
            "/api/v1/users/me/avatar",
            headers=headers,
            files={"file": (filename, file_bytes, content_type)},
        )
        assert resp.status_code == 200, resp.text
        avatar = find_avatar_file(user_id)
        assert avatar is not None
        assert avatar.suffix == expected_suffix
        remove_avatar_files(user_id)


async def test_upload_avatar_rejects_content_type_signature_mismatch():
    async with _client() as client:
        email, _ = await _create_user("testpw-mismatch")
        headers = await _auth_headers(client, email, "testpw-mismatch")

        resp = await client.post(
            "/api/v1/users/me/avatar",
            headers=headers,
            files={"file": ("avatar.jpg", _TINY_PNG, "image/jpeg")},
        )

        assert resp.status_code == 400
        assert "declared image type" in resp.json()["detail"]


async def test_upload_avatar_too_large():
    async with _client() as client:
        email, _ = await _create_user("testpw5")
        headers = await _auth_headers(client, email, "testpw5")

        # Use a valid PNG signature so the request reaches the size guard.
        large_file = _TINY_PNG[:8] + b"\x00" * (2 * 1024 * 1024 + 1)
        resp = await client.post(
            "/api/v1/users/me/avatar",
            headers=headers,
            files={"file": ("big.png", large_file, "image/png")},
        )
        assert resp.status_code == 400
        assert "limit" in resp.json()["detail"].lower()


async def test_upload_avatar_requires_auth():
    async with _client() as client:
        resp = await client.post(
            "/api/v1/users/me/avatar",
            files={"file": ("avatar.png", _TINY_PNG, "image/png")},
        )
        assert resp.status_code == 401
