from contextlib import asynccontextmanager

import pytest
from httpx import ASGITransport, AsyncClient

from app.admin import ADMIN_SESSION_COOKIE
from app.conftest import create_user as _create_user
from app.core import conf
from app.main import app

pytestmark = [
    pytest.mark.asyncio(loop_scope="module"),
    pytest.mark.usefixtures("fresh_db"),
]


@asynccontextmanager
async def _client() -> AsyncClient:
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url=str(conf.settings.BACKEND_CORS_ORIGINS[-1]),
        follow_redirects=False,
    ) as client:
        yield client


async def _login_admin(client: AsyncClient, email: str, password: str):
    return await client.post(
        "/admin/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )


async def test_admin_redirects_anonymous_users_to_login() -> None:
    async with _client() as client:
        response = await client.get("/admin/")

    assert response.status_code == 303
    assert "/admin/login" in response.headers["location"]


async def test_admin_login_page_uses_email_focused_copy() -> None:
    async with _client() as client:
        response = await client.get("/admin/login")

    assert response.status_code == 200
    assert "Admin sign in" in response.text
    assert "Email" in response.text
    assert "Remember me" not in response.text


async def test_admin_allows_bootstrapped_style_superuser_login() -> None:
    email, _ = await _create_user("admin-pass", is_superuser=True)

    async with _client() as client:
        login_response = await _login_admin(client, email, "admin-pass")
        index_response = await client.get("/admin/")

    assert login_response.status_code == 303
    assert login_response.headers["location"].endswith("/admin/")
    assert ADMIN_SESSION_COOKIE in client.cookies
    assert index_response.status_code == 200
    assert "<title>Baldin Admin</title>" in index_response.text


async def test_admin_rejects_non_superusers() -> None:
    email, _ = await _create_user("user-pass", is_superuser=False)

    async with _client() as client:
        login_response = await _login_admin(client, email, "user-pass")
        protected_response = await client.get("/admin/")

    assert login_response.status_code == 400
    assert "Invalid admin email or password." in login_response.text
    assert ADMIN_SESSION_COOKIE not in client.cookies
    assert protected_response.status_code == 303
    assert "/admin/login" in protected_response.headers["location"]


async def test_admin_logout_clears_session() -> None:
    email, _ = await _create_user("logout-pass", is_superuser=True)

    async with _client() as client:
        login_response = await _login_admin(client, email, "logout-pass")
        logout_response = await client.get("/admin/logout")
        protected_response = await client.get("/admin/")

    assert login_response.status_code == 303
    assert logout_response.status_code == 303
    assert protected_response.status_code == 303
    assert "/admin/login" in protected_response.headers["location"]


async def test_admin_user_view_is_read_only() -> None:
    email, user_id = await _create_user("readonly-pass", is_superuser=True)

    async with _client() as client:
        login_response = await _login_admin(client, email, "readonly-pass")
        create_response = await client.get("/admin/user/create")
        edit_response = await client.get(f"/admin/user/edit/{user_id}")

    assert login_response.status_code == 303
    assert create_response.status_code == 403
    assert edit_response.status_code == 403


async def test_admin_user_api_exposes_only_curated_fields() -> None:
    email, _ = await _create_user("curated-pass", is_superuser=True)

    async with _client() as client:
        login_response = await _login_admin(client, email, "curated-pass")
        response = await client.get("/admin/api/user")

    assert login_response.status_code == 303
    assert response.status_code == 200

    first_item = response.json()["items"][0]
    assert "hashed_password" not in first_item
    assert "phone_number" not in first_item
    assert "address_line_1" not in first_item
    assert "applications" not in first_item
    assert "contacts" not in first_item
    assert "skills" not in first_item
