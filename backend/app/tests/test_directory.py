"""Tests for the /directory/ endpoints (user discovery, search, public profile)."""

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
from app.tests import utils

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
# Tests
# ---------------------------------------------------------------------------


async def test_directory_returns_paginated_results() -> None:
    """GET /directory/ returns a paginated list of discoverable users."""
    async with _client() as client:
        email_a, uid_a = await _create_user("dir-a-pass")
        email_b, uid_b = await _create_user("dir-b-pass")
        await _set_user_fields(uid_a, first_name="Alice", is_discoverable=True)
        await _set_user_fields(uid_b, first_name="Bob", is_discoverable=True)
        headers = await _auth_headers(client, email_a, "dir-a-pass")

        response = await client.get(
            "/api/v1/directory/", params={"request_count": True}, headers=headers
        )

    assert response.status_code == 200
    body = response.json()
    assert "items" in body
    assert "total" in body
    assert body["total"] >= 2
    assert isinstance(body["items"], list)
    assert all("is_superuser" in item for item in body["items"])


async def test_directory_rejects_page_sizes_over_max() -> None:
    """GET /directory/ rejects shared pagination requests above the global cap."""
    async with _client() as client:
        email_viewer, _ = await _create_user("dir-limit-viewer-pass")
        headers = await _auth_headers(client, email_viewer, "dir-limit-viewer-pass")

        response = await client.get(
            "/api/v1/directory/",
            params={"page_size": 101},
            headers=headers,
        )

    assert response.status_code == 422
    body = response.json()
    assert any(
        error["loc"] == ["query", "page_size"]
        and "less than or equal to 100" in error["msg"]
        for error in body["detail"]
    )


async def test_directory_filters_by_placement_status() -> None:
    """GET /directory/?placement_status=graduated returns only graduated users."""
    async with _client() as client:
        email_g, uid_g = await _create_user("dir-grad-pass")
        await _set_user_fields(
            uid_g,
            first_name="Grad",
            placement_status="graduated",
            is_discoverable=True,
        )
        email_v, _ = await _create_user("dir-viewer-pass")
        headers = await _auth_headers(client, email_v, "dir-viewer-pass")

        response = await client.get(
            "/api/v1/directory/",
            params={"placement_status": "graduated", "request_count": True},
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    for item in body["items"]:
        assert item["placement_status"] == "graduated"


async def test_directory_search_by_query() -> None:
    """GET /directory/?q=<name> returns users matching the search query."""
    async with _client() as client:
        unique = utils.random_lower_string(10)
        email_s, uid_s = await _create_user("dir-search-pass")
        await _set_user_fields(
            uid_s,
            first_name=f"Searchable{unique}",
            is_discoverable=True,
        )
        email_q, _ = await _create_user("dir-q-pass")
        headers = await _auth_headers(client, email_q, "dir-q-pass")

        response = await client.get(
            "/api/v1/directory/",
            params={"q": f"Searchable{unique}", "request_count": True},
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    names = [item["display_name"] for item in body["items"]]
    assert any(f"Searchable{unique}" in n for n in names)


async def test_directory_public_profile() -> None:
    """GET /directory/{user_id} returns a public profile view."""
    async with _client() as client:
        email_p, uid_p = await _create_user("dir-profile-pass")
        await _set_user_fields(
            uid_p,
            first_name="Profile",
            last_name="User",
            headline="Software Engineer",
            bio="I write code",
            is_discoverable=True,
        )
        email_v, _ = await _create_user("dir-prof-view-pass")
        headers = await _auth_headers(client, email_v, "dir-prof-view-pass")

        response = await client.get(f"/api/v1/directory/{uid_p}", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["display_name"] == "Profile User"
    assert body["is_superuser"] is False
    assert body["headline"] == "Software Engineer"
    assert body["bio"] == "I write code"


async def test_superusers_are_discoverable_by_default() -> None:
    """New superusers stay visible by default while normal users start hidden."""
    async with _client() as client:
        unique = utils.random_lower_string(10)
        email_hidden, uid_hidden = await _create_user("dir-default-hidden-pass")
        email_super, uid_super = await _create_user(
            "dir-default-super-pass",
            is_superuser=True,
        )
        await _set_user_fields(uid_hidden, first_name=f"Guide{unique}")
        await _set_user_fields(uid_super, first_name=f"Guide{unique}")
        email_viewer, _ = await _create_user("dir-default-view-pass")
        headers = await _auth_headers(client, email_viewer, "dir-default-view-pass")

        response = await client.get(
            "/api/v1/directory/",
            params={"q": f"Guide{unique}", "request_count": True},
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["user_id"] == str(uid_super)
    assert body["items"][0]["is_superuser"] is True


async def test_directory_can_filter_superusers_only() -> None:
    """GET /directory/?superusers_only=true returns only superusers and tags profiles."""
    async with _client() as client:
        unique = utils.random_lower_string(10)
        email_super, uid_super = await _create_user(
            "dir-filter-super-pass",
            is_superuser=True,
        )
        email_peer, uid_peer = await _create_user("dir-filter-peer-pass")
        await _set_user_fields(uid_super, first_name=f"Scout{unique}")
        await _set_user_fields(
            uid_peer,
            first_name=f"Scout{unique}",
            is_discoverable=True,
        )
        email_viewer, _ = await _create_user("dir-filter-view-pass")
        headers = await _auth_headers(client, email_viewer, "dir-filter-view-pass")

        list_response = await client.get(
            "/api/v1/directory/",
            params={
                "q": f"Scout{unique}",
                "superusers_only": True,
                "request_count": True,
            },
            headers=headers,
        )
        profile_response = await client.get(
            f"/api/v1/directory/{uid_super}", headers=headers
        )

    assert list_response.status_code == 200
    body = list_response.json()
    assert body["total"] == 1
    assert body["items"][0]["user_id"] == str(uid_super)
    assert body["items"][0]["is_superuser"] is True

    assert profile_response.status_code == 200
    assert profile_response.json()["is_superuser"] is True


async def test_non_discoverable_users_excluded() -> None:
    """Users with is_discoverable=False should not appear in directory results."""
    async with _client() as client:
        unique = utils.random_lower_string(12)
        email_h, uid_h = await _create_user("dir-hidden-pass")
        await _set_user_fields(
            uid_h,
            first_name=f"Hidden{unique}",
            is_discoverable=False,
        )
        email_v, _ = await _create_user("dir-hidden-view-pass")
        headers = await _auth_headers(client, email_v, "dir-hidden-view-pass")

        # Should not appear in directory listing
        list_response = await client.get(
            "/api/v1/directory/",
            params={"q": f"Hidden{unique}", "request_count": True},
            headers=headers,
        )
        # Direct profile should return 403
        profile_response = await client.get(
            f"/api/v1/directory/{uid_h}", headers=headers
        )

    assert list_response.status_code == 200
    assert list_response.json()["total"] == 0

    assert profile_response.status_code == 403
