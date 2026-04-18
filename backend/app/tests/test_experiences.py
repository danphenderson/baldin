from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from httpx import AsyncClient

from app import schemas
from app.api.routes import experiences as experience_routes
from app.conftest import create_user, login_and_get_headers

pytestmark = pytest.mark.asyncio(loop_scope="module")


async def _register_user(password: str) -> str:
    email, _ = await create_user(password)
    return email


async def _auth_headers(
    client: AsyncClient,
    email: str,
    password: str,
) -> dict[str, str]:
    return await login_and_get_headers(client, email, password)


async def _create_experience(
    client: AsyncClient,
    headers: dict[str, str],
    *,
    title: str,
    company: str,
    description: str,
    days_offset: int,
) -> dict:
    start = datetime(2022, 1, 1, tzinfo=timezone.utc) + timedelta(days=days_offset)
    end = start + timedelta(days=120)
    response = await client.post(
        "/api/v1/experiences/",
        headers=headers,
        json={
            "title": title,
            "company": company,
            "description": description,
            "location": "Remote",
            "projects": ["API hardening", "Test coverage"],
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


async def test_experience_crud_enforces_authentication_and_ownership(
    client: AsyncClient,
) -> None:
    owner_email = await _register_user("experience-owner-pass")
    other_email = await _register_user("experience-other-pass")
    owner_headers = await _auth_headers(client, owner_email, "experience-owner-pass")
    other_headers = await _auth_headers(client, other_email, "experience-other-pass")

    create_response = await client.post(
        "/api/v1/experiences/",
        json={
            "title": "Senior Backend Engineer",
            "company": "Baldin",
            "description": "Built API integrations",
            "location": "SF",
            "projects": "Ingestion,Testing",
            "start_date": "2023-01-01T00:00:00+00:00",
            "end_date": "2023-06-01T00:00:00+00:00",
        },
    )
    assert create_response.status_code == 401

    create_response = await client.post(
        "/api/v1/experiences/",
        headers=owner_headers,
        json={
            "title": "Senior Backend Engineer",
            "company": "Baldin",
            "description": "Built API integrations",
            "location": "SF",
            "projects": "Ingestion,Testing",
            "start_date": "2023-01-01T00:00:00+00:00",
            "end_date": "2023-06-01T00:00:00+00:00",
        },
    )
    assert create_response.status_code == 201, create_response.text
    created = create_response.json()
    assert created["projects"] == ["Ingestion", "Testing"]

    get_response = await client.get(
        f"/api/v1/experiences/{created['id']}",
        headers=owner_headers,
    )
    assert get_response.status_code == 200
    assert get_response.json()["title"] == "Senior Backend Engineer"

    forbidden_get = await client.get(
        f"/api/v1/experiences/{created['id']}",
        headers=other_headers,
    )
    assert forbidden_get.status_code == 403

    patch_response = await client.patch(
        f"/api/v1/experiences/{created['id']}",
        headers=owner_headers,
        json={
            "description": "Led backend API hardening",
            "projects": ["Coverage", "Ownership checks"],
        },
    )
    assert patch_response.status_code == 200, patch_response.text
    patched = patch_response.json()
    assert patched["description"] == "Led backend API hardening"
    assert patched["projects"] == ["Coverage", "Ownership checks"]

    forbidden_patch = await client.patch(
        f"/api/v1/experiences/{created['id']}",
        headers=other_headers,
        json={"title": "Hijacked"},
    )
    assert forbidden_patch.status_code == 403

    delete_response = await client.delete(
        f"/api/v1/experiences/{created['id']}",
        headers=owner_headers,
    )
    assert delete_response.status_code == 204
    assert delete_response.text == ""

    missing_response = await client.get(
        f"/api/v1/experiences/{created['id']}",
        headers=owner_headers,
    )
    assert missing_response.status_code == 404


async def test_list_experiences_paginates_without_leaking_other_users_rows(
    client: AsyncClient,
) -> None:
    owner_email = await _register_user("experience-page-owner")
    other_email = await _register_user("experience-page-other")
    owner_headers = await _auth_headers(client, owner_email, "experience-page-owner")
    other_headers = await _auth_headers(client, other_email, "experience-page-other")

    owner_ids = {
        (
            await _create_experience(
                client,
                owner_headers,
                title=f"Owner Role {idx}",
                company="Baldin",
                description=f"Owner description {idx}",
                days_offset=idx,
            )
        )["id"]
        for idx in range(3)
    }
    other_experience = await _create_experience(
        client,
        other_headers,
        title="Other User Role",
        company="Elsewhere",
        description="Should not appear",
        days_offset=10,
    )

    page_one = await client.get(
        "/api/v1/experiences/",
        headers=owner_headers,
        params={"page": 1, "page_size": 2},
    )
    page_two = await client.get(
        "/api/v1/experiences/",
        headers=owner_headers,
        params={"page": 2, "page_size": 2},
    )

    assert page_one.status_code == 200, page_one.text
    assert page_two.status_code == 200, page_two.text

    page_one_body = page_one.json()
    page_two_body = page_two.json()
    page_one_ids = {item["id"] for item in page_one_body["items"]}
    page_two_ids = {item["id"] for item in page_two_body["items"]}

    assert page_one_body["total"] == 3
    assert page_two_body["total"] == 3
    assert page_one_body["page"] == 1
    assert page_two_body["page"] == 2
    assert page_one_body["page_size"] == 2
    assert page_two_body["page_size"] == 2
    assert len(page_one_ids) == 2
    assert len(page_two_ids) == 1
    assert page_one_ids.isdisjoint(page_two_ids)
    assert page_one_ids | page_two_ids == owner_ids
    assert other_experience["id"] not in page_one_ids | page_two_ids


async def test_extract_user_experiences_delegates_to_shared_extraction_helper(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, object] = {}

    async def fake_extract_and_create_records(**kwargs):
        captured.update(kwargs)
        now = datetime.now(timezone.utc)
        return [
            schemas.ExperienceRead(
                id=uuid4(),
                created_at=now,
                updated_at=now,
                title="Staff Engineer",
                company="Baldin",
                description="Built resilient APIs",
                location="Remote",
                projects=["Extraction"],
                start_date=now - timedelta(days=30),
                end_date=now,
            )
        ]

    monkeypatch.setattr(
        experience_routes,
        "extract_and_create_records",
        fake_extract_and_create_records,
    )

    email = await _register_user("experience-extract-pass")
    headers = await _auth_headers(client, email, "experience-extract-pass")

    response = await client.post(
        "/api/v1/experiences/extract",
        headers=headers,
        json={"mode": "entire_document", "text": "Worked at Baldin building APIs"},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert len(body) == 1
    assert body[0]["title"] == "Staff Engineer"
    assert captured["extractor_name"] == "experiences"
    assert captured["extractor_description"] == "Experience data extractor"
    assert (
        captured["extractor_instruction"]
        == "Extract experiences JSON data from a given context"
    )
    assert captured["json_schema"] == schemas.ExperienceCreate.model_json_schema()
    assert isinstance(captured["payload"], schemas.ExtractorRun)
    assert captured["payload"].text == "Worked at Baldin building APIs"
    assert captured["user"] is not None
    assert captured["db"] is not None
