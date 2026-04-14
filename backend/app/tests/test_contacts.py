from __future__ import annotations

from uuid import UUID

import pytest
from httpx import AsyncClient

from app import models
from app.api.routes import contacts as contacts_route
from app.conftest import create_user
from app.core.db import session_context

pytestmark = pytest.mark.asyncio(loop_scope="module")


def _contact_payload(**overrides) -> dict:
    payload = {
        "first_name": "Ada",
        "last_name": "Lovelace",
        "phone_number": "555-0100",
        "email": "ada@example.com",
        "time_zone": "UTC",
        "notes": "Met at a systems meetup.",
    }
    payload.update(overrides)
    return payload


async def _create_other_user_headers(
    client: AsyncClient, password: str = "OtherPass1!"
) -> tuple[str, dict[str, str]]:
    email, _ = await create_user(password)
    headers = await _auth_headers(client, email, password)
    return email, headers


async def _auth_headers(
    client: AsyncClient,
    email: str,
    password: str,
) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/jwt/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def test_contacts_crud_round_trip(
    client: AsyncClient,
    registered_user: tuple[str, UUID, str],
) -> None:
    email, _, password = registered_user
    auth_headers = await _auth_headers(client, email, password)

    create_response = await client.post(
        "/api/v1/contacts/",
        json=_contact_payload(),
        headers=auth_headers,
    )

    assert create_response.status_code == 201, create_response.text
    created = create_response.json()
    contact_id = created["id"]
    assert created["first_name"] == "Ada"
    assert created["email"] == "ada@example.com"

    get_response = await client.get(
        f"/api/v1/contacts/{contact_id}",
        headers=auth_headers,
    )
    assert get_response.status_code == 200, get_response.text
    assert get_response.json()["id"] == contact_id

    update_response = await client.patch(
        f"/api/v1/contacts/{contact_id}",
        json={"notes": "Follow up next quarter.", "time_zone": "America/New_York"},
        headers=auth_headers,
    )
    assert update_response.status_code == 200, update_response.text
    updated = update_response.json()
    assert updated["notes"] == "Follow up next quarter."
    assert updated["time_zone"] == "America/New_York"

    delete_response = await client.delete(
        f"/api/v1/contacts/{contact_id}",
        headers=auth_headers,
    )
    assert delete_response.status_code == 204, delete_response.text
    assert delete_response.content == b""

    missing_response = await client.get(
        f"/api/v1/contacts/{contact_id}",
        headers=auth_headers,
    )
    assert missing_response.status_code == 404, missing_response.text


async def test_contacts_list_paginates_and_isolates_users(
    client: AsyncClient,
    registered_user: tuple[str, UUID, str],
) -> None:
    email, user_id, password = registered_user
    auth_headers = await _auth_headers(client, email, password)
    _, other_headers = await _create_other_user_headers(client)

    async with session_context() as session:
        session.add_all(
            [
                models.Contact(
                    first_name=f"Owner{i}",
                    last_name="User",
                    email=f"owner-{i}@example.com",
                    phone_number=f"555-100{i}",
                    time_zone="UTC",
                    notes=f"owner note {i}",
                    user_id=user_id,
                )
                for i in range(3)
            ]
        )
        await session.commit()

    other_create = await client.post(
        "/api/v1/contacts/",
        json=_contact_payload(
            first_name="Other",
            email="other-user@example.com",
        ),
        headers=other_headers,
    )
    assert other_create.status_code == 201, other_create.text

    page_one = await client.get(
        "/api/v1/contacts/",
        params={"page": 1, "page_size": 2},
        headers=auth_headers,
    )
    page_two = await client.get(
        "/api/v1/contacts/",
        params={"page": 2, "page_size": 2},
        headers=auth_headers,
    )

    assert page_one.status_code == 200, page_one.text
    assert page_two.status_code == 200, page_two.text

    first_body = page_one.json()
    second_body = page_two.json()
    assert first_body["total"] == 3
    assert second_body["total"] == 3
    assert first_body["page"] == 1
    assert second_body["page"] == 2
    assert len(first_body["items"]) == 2
    assert len(second_body["items"]) == 1

    seen_ids = {item["id"] for item in first_body["items"]} | {
        item["id"] for item in second_body["items"]
    }
    assert len(seen_ids) == 3
    assert all(item["email"].startswith("owner-") for item in first_body["items"])
    assert all(item["email"].startswith("owner-") for item in second_body["items"])


async def test_contacts_user_isolation_blocks_access_to_other_users_records(
    client: AsyncClient,
    registered_user: tuple[str, UUID, str],
) -> None:
    email, owner_id, password = registered_user
    auth_headers = await _auth_headers(client, email, password)
    _, other_headers = await _create_other_user_headers(client, password="ViewerPass1!")

    async with session_context() as session:
        contact = models.Contact(
            first_name="Private",
            last_name="Owner",
            email="private.owner@example.com",
            phone_number="555-2200",
            time_zone="UTC",
            notes="Owner only",
            user_id=owner_id,
        )
        session.add(contact)
        await session.commit()
        await session.refresh(contact)
        contact_id = str(contact.id)

    own_response = await client.get(
        f"/api/v1/contacts/{contact_id}",
        headers=auth_headers,
    )
    assert own_response.status_code == 200, own_response.text

    for method, kwargs in (
        (client.get, {}),
        (client.patch, {"json": {"notes": "Unauthorized edit"}}),
        (client.delete, {}),
    ):
        response = await method(
            f"/api/v1/contacts/{contact_id}",
            headers=other_headers,
            **kwargs,
        )
        assert response.status_code == 403, response.text


async def test_contacts_extract_delegates_to_helper(
    client: AsyncClient,
    registered_user: tuple[str, UUID, str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    email, user_id, password = registered_user
    auth_headers = await _auth_headers(client, email, password)
    captured: dict[str, object] = {}

    async def fake_extract_and_create_records(**kwargs):
        captured.update(kwargs)
        return [
            {
                "id": "4fa18826-e2f8-4f4b-b1f4-0ec5cc4a6d3b",
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
                "first_name": "Grace",
                "last_name": "Hopper",
                "phone_number": "555-0001",
                "email": "grace@example.com",
                "time_zone": "UTC",
                "notes": "Extracted record",
                "user_id": str(user_id),
            }
        ]

    monkeypatch.setattr(
        contacts_route,
        "extract_and_create_records",
        fake_extract_and_create_records,
    )

    response = await client.post(
        "/api/v1/contacts/extract",
        json={"mode": "entire_document", "text": "Grace Hopper | grace@example.com"},
        headers=auth_headers,
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body[0]["first_name"] == "Grace"
    assert body[0]["email"] == "grace@example.com"
    assert captured["extractor_name"] == "contacts"
    assert captured["extractor_description"] == "Contact data extractor"
    assert captured["payload"].text == "Grace Hopper | grace@example.com"
    assert captured["user"].id == user_id
