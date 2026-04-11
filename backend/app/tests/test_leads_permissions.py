from contextlib import asynccontextmanager
from uuid import UUID

import pytest
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

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
    password: str, *, is_superuser: bool = False
) -> tuple[str, UUID]:
    email = utils.random_email()
    async with session_context() as session:
        user = await utils.create_db_user(
            email,
            password_helper.hash(password),
            session,
            is_superuser=is_superuser,
        )
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


async def _create_company(name: str | None = None) -> UUID:
    async with session_context() as session:
        company = models.Company(name=name or f"Company {utils.random_lower_string(6)}")
        session.add(company)
        await session.commit()
        return company.id


def _lead_payload(url: str | None = None, **overrides: object) -> dict[str, object]:
    suffix = utils.random_lower_string(8)
    payload: dict[str, object] = {
        "url": url or f"https://example.com/jobs/{suffix}",
        "title": f"Lead {suffix}",
        "description": "Baseline description",
        "location": "Remote",
        "salary": "100000",
        "job_function": "Engineering",
        "employment_type": "Full-time",
    }
    payload.update(overrides)
    return payload


async def test_registered_viewer_can_fill_empty_shared_fields_and_add_companies() -> (
    None
):
    await _ensure_db_ready()
    async with _client() as client:
        owner_email, _ = await _create_user("fill-owner-pass")
        collaborator_email, _ = await _create_user("fill-collaborator-pass")
        owner_headers = await _auth_headers(client, owner_email, "fill-owner-pass")
        collaborator_headers = await _auth_headers(
            client, collaborator_email, "fill-collaborator-pass"
        )
        company_a = await _create_company("Alpha")
        company_b = await _create_company("Beta")

        create_response = await client.post(
            "/api/v1/leads/",
            json=_lead_payload(description=None, company_ids=[str(company_a)]),
            headers=owner_headers,
        )
        lead_id = create_response.json()["id"]

        await client.post(
            f"/api/v1/leads/{lead_id}/registration", headers=collaborator_headers
        )
        fill_response = await client.patch(
            f"/api/v1/leads/{lead_id}",
            json={"description": "Filled later", "company_ids": [str(company_b)]},
            headers=collaborator_headers,
        )
        overwrite_response = await client.patch(
            f"/api/v1/leads/{lead_id}",
            json={"title": "Overwrite not allowed"},
            headers=collaborator_headers,
        )
        clear_response = await client.patch(
            f"/api/v1/leads/{lead_id}",
            json={"description": None},
            headers=collaborator_headers,
        )
        immutable_url_response = await client.patch(
            f"/api/v1/leads/{lead_id}",
            json={"url": "https://example.com/other"},
            headers=collaborator_headers,
        )

    assert fill_response.status_code == 200
    assert fill_response.json()["description"] == "Filled later"
    assert {company["id"] for company in fill_response.json()["companies"]} == {
        str(company_a),
        str(company_b),
    }
    assert overwrite_response.status_code == 403
    assert clear_response.status_code == 403
    assert immutable_url_response.status_code == 422


async def test_superuser_can_overwrite_populated_fields_and_replace_companies() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        owner_email, _ = await _create_user("admin-owner-pass")
        admin_email, _ = await _create_user("admin-pass", is_superuser=True)
        owner_headers = await _auth_headers(client, owner_email, "admin-owner-pass")
        admin_headers = await _auth_headers(client, admin_email, "admin-pass")
        company_a = await _create_company("Gamma")
        company_b = await _create_company("Delta")

        create_response = await client.post(
            "/api/v1/leads/",
            json=_lead_payload(company_ids=[str(company_a)]),
            headers=owner_headers,
        )
        lead_id = create_response.json()["id"]

        update_response = await client.patch(
            f"/api/v1/leads/{lead_id}",
            json={
                "title": "Admin overwrite",
                "description": None,
                "company_ids": [str(company_b)],
            },
            headers=admin_headers,
        )

    assert update_response.status_code == 200
    assert update_response.json()["title"] == "Admin overwrite"
    assert update_response.json()["description"] is None
    assert [company["id"] for company in update_response.json()["companies"]] == [
        str(company_b)
    ]


async def test_unregistered_viewer_can_read_lead_but_cannot_mutate_or_comment() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        owner_email, _ = await _create_user("perm-owner-pass")
        other_email, _ = await _create_user("perm-other-pass")
        owner_headers = await _auth_headers(client, owner_email, "perm-owner-pass")
        other_headers = await _auth_headers(client, other_email, "perm-other-pass")

        create_response = await client.post(
            "/api/v1/leads/",
            json=_lead_payload(),
            headers=owner_headers,
        )
        lead_id = create_response.json()["id"]

        read_response = await client.get(
            f"/api/v1/leads/{lead_id}", headers=other_headers
        )
        update_response = await client.patch(
            f"/api/v1/leads/{lead_id}",
            json={"description": "Unauthorized"},
            headers=other_headers,
        )
        registration_response = await client.patch(
            f"/api/v1/leads/{lead_id}/registration",
            json={"internal_notes": "Unauthorized"},
            headers=other_headers,
        )
        read_comments_response = await client.get(
            f"/api/v1/leads/{lead_id}/comments",
            headers=other_headers,
        )
        post_comment_response = await client.post(
            f"/api/v1/leads/{lead_id}/comments",
            json={"content": "Unauthorized"},
            headers=other_headers,
        )

    assert read_response.status_code == 200
    assert update_response.status_code == 403
    assert registration_response.status_code == 403
    assert read_comments_response.status_code == 403
    assert post_comment_response.status_code == 403


async def test_regular_users_cannot_delete_shared_lead_but_superuser_can() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        owner_email, _ = await _create_user("delete-owner-pass")
        admin_email, _ = await _create_user("delete-admin-pass", is_superuser=True)
        owner_headers = await _auth_headers(client, owner_email, "delete-owner-pass")
        admin_headers = await _auth_headers(client, admin_email, "delete-admin-pass")

        create_response = await client.post(
            "/api/v1/leads/",
            json=_lead_payload(),
            headers=owner_headers,
        )
        lead_id = create_response.json()["id"]

        owner_delete_response = await client.delete(
            f"/api/v1/leads/{lead_id}", headers=owner_headers
        )
        admin_delete_response = await client.delete(
            f"/api/v1/leads/{lead_id}", headers=admin_headers
        )

    assert owner_delete_response.status_code == 403
    assert admin_delete_response.status_code == 204

    async with session_context() as session:
        deleted_lead = await session.get(models.Lead, lead_id)
        remaining_registration = await session.execute(
            select(models.LeadRegistration).where(
                models.LeadRegistration.lead_id == lead_id
            )
        )

    assert deleted_lead is None
    assert remaining_registration.scalar_one_or_none() is None


async def test_leads_purge_rejects_non_superusers_and_clears_registrations_and_comments() -> (
    None
):
    await _ensure_db_ready()
    async with _client() as client:
        user_email, _ = await _create_user("purge-user-pass")
        owner_email, _ = await _create_user("purge-owner-pass")
        collaborator_email, _ = await _create_user("purge-collaborator-pass")
        admin_email, _ = await _create_user("purge-admin-pass", is_superuser=True)
        user_headers = await _auth_headers(client, user_email, "purge-user-pass")
        owner_headers = await _auth_headers(client, owner_email, "purge-owner-pass")
        collaborator_headers = await _auth_headers(
            client, collaborator_email, "purge-collaborator-pass"
        )
        admin_headers = await _auth_headers(client, admin_email, "purge-admin-pass")

        reject_response = await client.delete(
            "/api/v1/leads/purge", headers=user_headers
        )
        create_response = await client.post(
            "/api/v1/leads/",
            json=_lead_payload(),
            headers=owner_headers,
        )
        lead_id = create_response.json()["id"]
        await client.post(
            f"/api/v1/leads/{lead_id}/registration", headers=collaborator_headers
        )
        await client.post(
            f"/api/v1/leads/{lead_id}/comments",
            json={"content": "Comment before purge"},
            headers=owner_headers,
        )

        purge_response = await client.delete(
            "/api/v1/leads/purge", headers=admin_headers
        )

    assert reject_response.status_code == 403
    assert purge_response.status_code == 202
    assert purge_response.json() == {
        "message": "All leads have been purged successfully"
    }

    async with session_context() as session:
        remaining_leads = await session.execute(select(models.Lead.id))
        remaining_registrations = await session.execute(
            select(models.LeadRegistration.id)
        )
        remaining_comments = await session.execute(select(models.LeadComment.id))

    assert remaining_leads.scalars().first() is None
    assert remaining_registrations.scalars().first() is None
    assert remaining_comments.scalars().first() is None
