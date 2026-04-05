from contextlib import asynccontextmanager
from uuid import UUID

import pytest
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app import models
from app.core import conf
from app.core.db import async_engine, create_db_and_tables, session_context
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
    if not getattr(app.state, "bootstrap_completed", False):
        await create_db_and_tables()
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
        "/auth/jwt/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _lead_payload(url: str | None = None) -> dict[str, str]:
    suffix = utils.random_lower_string(8)
    return {
        "url": url or f"https://example.com/jobs/{suffix}",
        "title": f"Software Engineer {suffix}",
        "description": "Write code",
        "location": "Remote",
        "salary": "100000",
        "job_function": "Engineering",
        "employment_type": "Full-time",
    }


async def _insert_lead(*, user_id: UUID | None = None) -> UUID:
    async with session_context() as session:
        lead = models.Lead(
            url=f"https://example.com/jobs/{utils.random_lower_string(10)}",
            title="Shared Lead",
        )
        if user_id is not None:
            user = await session.get(models.User, user_id)
            assert user is not None
            lead.users.append(user)
        session.add(lead)
        await session.commit()
        return lead.id


async def test_create_lead_associates_current_user() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        email, user_id = await _create_user("lead-create-pass")
        headers = await _auth_headers(client, email, "lead-create-pass")
        payload = _lead_payload()

        response = await client.post("/leads/", json=payload, headers=headers)

    assert response.status_code == 201
    body = response.json()
    assert body["url"] == payload["url"]
    assert body["title"] == payload["title"]

    async with session_context() as session:
        result = await session.execute(
            select(models.Lead)
            .options(selectinload(models.Lead.users))
            .where(models.Lead.id == body["id"])
        )
        lead = result.scalars().first()

    assert lead is not None
    assert {lead_user.id for lead_user in lead.users} == {user_id}


async def test_create_lead_existing_url_links_second_user() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        owner_email, owner_id = await _create_user("lead-owner-pass")
        other_email, other_id = await _create_user("lead-other-pass")
        owner_headers = await _auth_headers(client, owner_email, "lead-owner-pass")
        other_headers = await _auth_headers(client, other_email, "lead-other-pass")
        payload = _lead_payload()

        owner_response = await client.post(
            "/leads/", json=payload, headers=owner_headers
        )
        other_response = await client.post(
            "/leads/", json=payload, headers=other_headers
        )

    assert owner_response.status_code == 201
    assert other_response.status_code == 201
    assert other_response.json()["id"] == owner_response.json()["id"]

    async with session_context() as session:
        result = await session.execute(
            select(models.Lead)
            .options(selectinload(models.Lead.users))
            .where(models.Lead.id == owner_response.json()["id"])
        )
        lead = result.scalars().first()

    assert lead is not None
    assert {lead_user.id for lead_user in lead.users} == {owner_id, other_id}


async def test_read_leads_returns_owned_and_unassociated_records() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        owner_email, _ = await _create_user("lead-list-owner-pass")
        other_email, _ = await _create_user("lead-list-other-pass")
        owner_headers = await _auth_headers(client, owner_email, "lead-list-owner-pass")
        other_headers = await _auth_headers(client, other_email, "lead-list-other-pass")

        owner_response = await client.post(
            "/leads/", json=_lead_payload(), headers=owner_headers
        )
        other_response = await client.post(
            "/leads/", json=_lead_payload(), headers=other_headers
        )
        unassociated_lead_id = await _insert_lead()

        response = await client.get("/leads/", headers=owner_headers)

    assert response.status_code == 200
    returned_ids = {item["id"] for item in response.json()["leads"]}
    assert owner_response.json()["id"] in returned_ids
    assert other_response.json()["id"] not in returned_ids
    assert str(unassociated_lead_id) in returned_ids


async def test_owner_can_update_and_delete_lead() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("lead-owner-mutate-pass")
        headers = await _auth_headers(client, email, "lead-owner-mutate-pass")
        create_response = await client.post(
            "/leads/", json=_lead_payload(), headers=headers
        )
        lead_id = create_response.json()["id"]

        update_response = await client.patch(
            f"/leads/{lead_id}",
            json={"title": "Updated Lead Title"},
            headers=headers,
        )
        delete_response = await client.delete(f"/leads/{lead_id}", headers=headers)

    assert update_response.status_code == 200
    assert update_response.json()["title"] == "Updated Lead Title"
    assert delete_response.status_code == 204

    async with session_context() as session:
        deleted_lead = await session.get(models.Lead, lead_id)

    assert deleted_lead is None
