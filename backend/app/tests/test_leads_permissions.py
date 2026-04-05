from contextlib import asynccontextmanager
from uuid import UUID

import pytest
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

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


async def _insert_lead(*, user_id: UUID | None = None) -> UUID:
    async with session_context() as session:
        lead = models.Lead(
            url=f"https://example.com/jobs/{utils.random_lower_string(10)}",
            title="Permission Test Lead",
        )
        if user_id is not None:
            user = await session.get(models.User, user_id)
            assert user is not None
            lead.users.append(user)
        session.add(lead)
        await session.commit()
        return lead.id


async def test_leads_purge_rejects_non_superusers() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        password = "lead-user-pass"
        email, _ = await _create_user(password)
        headers = await _auth_headers(client, email, password)
        response = await client.delete("/leads/purge", headers=headers)

    assert response.status_code == 403


async def test_leads_purge_allows_superusers() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        password = "lead-admin-pass"
        email, owner_id = await _create_user(password, is_superuser=True)
        await _insert_lead(user_id=owner_id)
        headers = await _auth_headers(client, email, password)
        response = await client.delete("/leads/purge", headers=headers)

    assert response.status_code == 202
    assert response.json() == {"message": "All leads have been purged successfully"}

    async with session_context() as session:
        remaining_leads = await session.execute(select(models.Lead.id))
        remaining_links = await session.execute(select(models.LeadXUser.id))

    assert remaining_leads.scalars().first() is None
    assert remaining_links.scalars().first() is None


async def test_associated_lead_rejects_unrelated_user_reads() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        owner_email, owner_id = await _create_user("lead-owner-read-pass")
        other_email, _ = await _create_user("lead-other-read-pass")
        other_headers = await _auth_headers(client, other_email, "lead-other-read-pass")
        lead_id = await _insert_lead(user_id=owner_id)

        response = await client.get(f"/leads/{lead_id}", headers=other_headers)

    assert response.status_code == 403


async def test_unassociated_lead_allows_reads_but_rejects_mutation() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("lead-unassociated-pass")
        headers = await _auth_headers(client, email, "lead-unassociated-pass")
        lead_id = await _insert_lead()

        read_response = await client.get(f"/leads/{lead_id}", headers=headers)
        update_response = await client.patch(
            f"/leads/{lead_id}",
            json={"title": "Unauthorized Update"},
            headers=headers,
        )
        delete_response = await client.delete(f"/leads/{lead_id}", headers=headers)

    assert read_response.status_code == 200
    assert update_response.status_code == 403
    assert delete_response.status_code == 403


async def test_superuser_can_delete_associated_lead() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        _, owner_id = await _create_user("lead-owner-superuser-pass")
        admin_email, _ = await _create_user("lead-superuser-pass", is_superuser=True)
        admin_headers = await _auth_headers(client, admin_email, "lead-superuser-pass")
        lead_id = await _insert_lead(user_id=owner_id)

        response = await client.delete(f"/leads/{lead_id}", headers=admin_headers)

    assert response.status_code == 204

    async with session_context() as session:
        deleted_lead = await session.get(models.Lead, lead_id)
        lead_link = await session.execute(
            select(models.LeadXUser).where(models.LeadXUser.lead_id == lead_id)
        )

    assert deleted_lead is None
    assert lead_link.scalar_one_or_none() is None
