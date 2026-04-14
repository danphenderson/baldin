from __future__ import annotations

from uuid import UUID

import pytest
from httpx import AsyncClient

from app import models
from app.api.routes import certificate as certificate_route
from app.conftest import create_user
from app.core.db import session_context

pytestmark = pytest.mark.asyncio(loop_scope="module")


def _certificate_payload(**overrides) -> dict:
    payload = {
        "title": "AWS Certified Developer",
        "issuer": "Amazon",
        "issued_date": "2024-01-15T00:00:00Z",
        "expiration_date": "2027-01-15T00:00:00Z",
    }
    payload.update(overrides)
    return payload


async def _create_other_user_headers(
    client: AsyncClient, password: str = "OtherCertPass1!"
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


async def test_certificates_crud_round_trip(
    client: AsyncClient,
    registered_user: tuple[str, UUID, str],
) -> None:
    email, _, password = registered_user
    auth_headers = await _auth_headers(client, email, password)

    create_response = await client.post(
        "/api/v1/certificates/",
        json=_certificate_payload(),
        headers=auth_headers,
    )
    assert create_response.status_code == 201, create_response.text
    created = create_response.json()
    certificate_id = created["id"]
    assert created["title"] == "AWS Certified Developer"
    assert created["issuer"] == "Amazon"

    get_response = await client.get(
        f"/api/v1/certificates/{certificate_id}",
        headers=auth_headers,
    )
    assert get_response.status_code == 200, get_response.text
    assert get_response.json()["id"] == certificate_id

    update_response = await client.patch(
        f"/api/v1/certificates/{certificate_id}",
        json={"issuer": "AWS", "title": "AWS Certified DevOps Engineer"},
        headers=auth_headers,
    )
    assert update_response.status_code == 200, update_response.text
    updated = update_response.json()
    assert updated["issuer"] == "AWS"
    assert updated["title"] == "AWS Certified DevOps Engineer"

    delete_response = await client.delete(
        f"/api/v1/certificates/{certificate_id}",
        headers=auth_headers,
    )
    assert delete_response.status_code == 200, delete_response.text
    assert delete_response.json()["id"] == certificate_id

    missing_response = await client.get(
        f"/api/v1/certificates/{certificate_id}",
        headers=auth_headers,
    )
    assert missing_response.status_code == 404, missing_response.text


async def test_certificates_list_paginates_and_isolates_users(
    client: AsyncClient,
    registered_user: tuple[str, UUID, str],
) -> None:
    email, user_id, password = registered_user
    auth_headers = await _auth_headers(client, email, password)
    _, other_headers = await _create_other_user_headers(client)

    async with session_context() as session:
        session.add_all(
            [
                models.Certificate(
                    title=f"Owner Cert {i}",
                    issuer="Issuer",
                    user_id=user_id,
                )
                for i in range(3)
            ]
        )
        await session.commit()

    other_create = await client.post(
        "/api/v1/certificates/",
        json=_certificate_payload(title="Other User Cert"),
        headers=other_headers,
    )
    assert other_create.status_code == 201, other_create.text

    page_one = await client.get(
        "/api/v1/certificates/",
        params={"page": 1, "page_size": 2},
        headers=auth_headers,
    )
    page_two = await client.get(
        "/api/v1/certificates/",
        params={"page": 2, "page_size": 2},
        headers=auth_headers,
    )

    assert page_one.status_code == 200, page_one.text
    assert page_two.status_code == 200, page_two.text

    first_body = page_one.json()
    second_body = page_two.json()
    assert first_body["total"] == 3
    assert second_body["total"] == 3
    assert len(first_body["items"]) == 2
    assert len(second_body["items"]) == 1
    assert {item["id"] for item in first_body["items"]}.isdisjoint(
        {item["id"] for item in second_body["items"]}
    )
    assert all(item["title"].startswith("Owner Cert") for item in first_body["items"])
    assert all(item["title"].startswith("Owner Cert") for item in second_body["items"])


async def test_certificates_user_isolation_blocks_access_to_other_users_records(
    client: AsyncClient,
    registered_user: tuple[str, UUID, str],
) -> None:
    email, owner_id, password = registered_user
    auth_headers = await _auth_headers(client, email, password)
    _, other_headers = await _create_other_user_headers(
        client, password="ViewerCertPass1!"
    )

    async with session_context() as session:
        certificate = models.Certificate(
            title="Private Certificate",
            issuer="Restricted Issuer",
            user_id=owner_id,
        )
        session.add(certificate)
        await session.commit()
        await session.refresh(certificate)
        certificate_id = str(certificate.id)

    own_response = await client.get(
        f"/api/v1/certificates/{certificate_id}",
        headers=auth_headers,
    )
    assert own_response.status_code == 200, own_response.text

    for method, kwargs in (
        (client.get, {}),
        (client.patch, {"json": {"issuer": "Unauthorized edit"}}),
        (client.delete, {}),
    ):
        response = await method(
            f"/api/v1/certificates/{certificate_id}",
            headers=other_headers,
            **kwargs,
        )
        assert response.status_code == 403, response.text


async def test_certificates_extract_delegates_to_helper(
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
                "id": "0eb18e5f-f6ee-49fd-a892-5a40c0d86f2e",
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
                "title": "Security+",
                "issuer": "CompTIA",
                "issued_date": "2025-02-01T00:00:00Z",
                "expiration_date": "2028-02-01T00:00:00Z",
                "user_id": str(user_id),
            }
        ]

    monkeypatch.setattr(
        certificate_route,
        "extract_and_create_records",
        fake_extract_and_create_records,
    )

    response = await client.post(
        "/api/v1/certificates/extract",
        json={"mode": "entire_document", "text": "Security+ issued by CompTIA"},
        headers=auth_headers,
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body[0]["title"] == "Security+"
    assert body[0]["issuer"] == "CompTIA"
    assert captured["extractor_name"] == "certificates"
    assert captured["extractor_description"] == "Certificate data extractor"
    assert captured["payload"].text == "Security+ issued by CompTIA"
    assert captured["user"].id == user_id
