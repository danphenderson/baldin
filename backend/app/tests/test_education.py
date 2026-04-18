from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from httpx import AsyncClient

from app import schemas
from app.api.routes import education as education_routes
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


async def _create_education(
    client: AsyncClient,
    headers: dict[str, str],
    *,
    university: str,
    degree: str,
    grade_point: str,
    days_offset: int,
) -> dict:
    start = datetime(2018, 9, 1, tzinfo=timezone.utc) + timedelta(days=days_offset)
    end = start + timedelta(days=365)
    response = await client.post(
        "/api/v1/education/",
        headers=headers,
        json={
            "university": university,
            "degree": degree,
            "grade_point": grade_point,
            "activities": ["Robotics", "Hackathon"],
            "achievements": ["Dean's List", "Capstone"],
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


async def test_education_crud_enforces_authentication_and_ownership(
    client: AsyncClient,
) -> None:
    owner_email = await _register_user("education-owner-pass")
    other_email = await _register_user("education-other-pass")
    owner_headers = await _auth_headers(client, owner_email, "education-owner-pass")
    other_headers = await _auth_headers(client, other_email, "education-other-pass")

    create_response = await client.post(
        "/api/v1/education/",
        json={
            "university": "Example University",
            "degree": "BS Computer Science",
            "grade_point": "3.9",
            "activities": "Robotics,Hackathon",
            "achievements": "Dean's List,Capstone",
            "start_date": "2019-09-01T00:00:00+00:00",
            "end_date": "2023-06-01T00:00:00+00:00",
        },
    )
    assert create_response.status_code == 401

    create_response = await client.post(
        "/api/v1/education/",
        headers=owner_headers,
        json={
            "university": "Example University",
            "degree": "BS Computer Science",
            "grade_point": "3.9",
            "activities": "Robotics,Hackathon",
            "achievements": "Dean's List,Capstone",
            "start_date": "2019-09-01T00:00:00+00:00",
            "end_date": "2023-06-01T00:00:00+00:00",
        },
    )
    assert create_response.status_code == 201, create_response.text
    created = create_response.json()
    assert created["activities"] == ["Robotics", "Hackathon"]
    assert created["achievements"] == ["Dean's List", "Capstone"]

    get_response = await client.get(
        f"/api/v1/education/{created['id']}",
        headers=owner_headers,
    )
    assert get_response.status_code == 200
    assert get_response.json()["degree"] == "BS Computer Science"

    forbidden_get = await client.get(
        f"/api/v1/education/{created['id']}",
        headers=other_headers,
    )
    assert forbidden_get.status_code == 403

    patch_response = await client.patch(
        f"/api/v1/education/{created['id']}",
        headers=owner_headers,
        json={
            "grade_point": "4.0",
            "achievements": ["Dean's List", "Published research"],
        },
    )
    assert patch_response.status_code == 200, patch_response.text
    patched = patch_response.json()
    assert patched["grade_point"] == "4.0"
    assert patched["achievements"] == ["Dean's List", "Published research"]

    forbidden_patch = await client.patch(
        f"/api/v1/education/{created['id']}",
        headers=other_headers,
        json={"degree": "Hijacked"},
    )
    assert forbidden_patch.status_code == 403

    delete_response = await client.delete(
        f"/api/v1/education/{created['id']}",
        headers=owner_headers,
    )
    assert delete_response.status_code == 200
    assert delete_response.json()["id"] == created["id"]

    missing_response = await client.get(
        f"/api/v1/education/{created['id']}",
        headers=owner_headers,
    )
    assert missing_response.status_code == 404


async def test_list_education_paginates_without_leaking_other_users_rows(
    client: AsyncClient,
) -> None:
    owner_email = await _register_user("education-page-owner")
    other_email = await _register_user("education-page-other")
    owner_headers = await _auth_headers(client, owner_email, "education-page-owner")
    other_headers = await _auth_headers(client, other_email, "education-page-other")

    owner_ids = {
        (
            await _create_education(
                client,
                owner_headers,
                university=f"Owner University {idx}",
                degree=f"Owner Degree {idx}",
                grade_point="3.8",
                days_offset=idx,
            )
        )["id"]
        for idx in range(3)
    }
    other_education = await _create_education(
        client,
        other_headers,
        university="Other University",
        degree="Other Degree",
        grade_point="3.5",
        days_offset=10,
    )

    page_one = await client.get(
        "/api/v1/education/",
        headers=owner_headers,
        params={"page": 1, "page_size": 2},
    )
    page_two = await client.get(
        "/api/v1/education/",
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
    assert other_education["id"] not in page_one_ids | page_two_ids


async def test_extract_education_delegates_to_shared_extraction_helper(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, object] = {}

    async def fake_extract_and_create_records(**kwargs):
        captured.update(kwargs)
        now = datetime.now(timezone.utc)
        return [
            schemas.EducationRead(
                id=uuid4(),
                created_at=now,
                updated_at=now,
                university="Example University",
                degree="MS Computer Science",
                grade_point="4.0",
                activities=["Research"],
                achievements=["Published paper"],
                start_date=now - timedelta(days=365),
                end_date=now,
            )
        ]

    monkeypatch.setattr(
        education_routes,
        "extract_and_create_records",
        fake_extract_and_create_records,
    )

    email = await _register_user("education-extract-pass")
    headers = await _auth_headers(client, email, "education-extract-pass")

    response = await client.post(
        "/api/v1/education/extract",
        headers=headers,
        json={"mode": "entire_document", "text": "MS in CS from Example University"},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert len(body) == 1
    assert body[0]["degree"] == "MS Computer Science"
    assert captured["extractor_name"] == "education"
    assert captured["extractor_description"] == "Education data extractor"
    assert (
        captured["extractor_instruction"]
        == "Extract education JSON data from a given context"
    )
    assert captured["json_schema"] == schemas.EducationCreate.model_json_schema()
    assert isinstance(captured["payload"], schemas.ExtractorRun)
    assert captured["payload"].text == "MS in CS from Example University"
    assert captured["user"] is not None
    assert captured["db"] is not None
