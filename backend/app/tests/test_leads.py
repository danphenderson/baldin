from contextlib import asynccontextmanager
from datetime import datetime
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app import models, schemas
from app.api.routes import leads as lead_routes
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
        "/auth/jwt/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def _set_user_profile(user_id: UUID, **values: str | None) -> None:
    async with session_context() as session:
        user = await session.get(models.User, user_id)
        assert user is not None
        for field, value in values.items():
            setattr(user, field, value)
        await session.commit()


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
        "title": f"Software Engineer {suffix}",
        "description": "Write code",
        "location": "Remote",
        "salary": "100000",
        "job_function": "Engineering",
        "employment_type": "Full-time",
    }
    payload.update(overrides)
    return payload


async def _get_lead_from_db(lead_id: str) -> models.Lead | None:
    async with session_context() as session:
        result = await session.execute(
            select(models.Lead)
            .options(
                selectinload(models.Lead.registrations),
                selectinload(models.Lead.comments),
            )
            .where(models.Lead.id == lead_id)
        )
        return result.scalars().unique().first()


def _extractor_stub() -> SimpleNamespace:
    return SimpleNamespace(
        id=uuid4(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        name="lead",
        description="Lead extractor",
        instruction="Extract lead details",
        json_schema=schemas.LeadCreate.model_json_schema(),
        extractor_examples=[],
    )


async def test_create_lead_uses_canonical_dedupe_and_registration_counts() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        owner_email, owner_id = await _create_user("lead-owner-pass")
        other_email, other_id = await _create_user("lead-other-pass")
        owner_headers = await _auth_headers(client, owner_email, "lead-owner-pass")
        other_headers = await _auth_headers(client, other_email, "lead-other-pass")

        owner_response = await client.post(
            "/leads/",
            json=_lead_payload(
                url="HTTPS://WWW.Example.com/jobs/Role/?utm_source=newsletter&b=2&a=1#fragment"
            ),
            headers=owner_headers,
        )
        other_response = await client.post(
            "/leads/",
            json=_lead_payload(
                url="https://example.com/jobs/Role?a=1&b=2",
                title="Different title should not overwrite",
            ),
            headers=other_headers,
        )

    assert owner_response.status_code == 201
    assert other_response.status_code == 201
    owner_body = owner_response.json()
    other_body = other_response.json()
    assert other_body["id"] == owner_body["id"]
    assert owner_body["canonical_url"] == "https://example.com/jobs/Role?a=1&b=2"
    assert other_body["canonical_url"] == owner_body["canonical_url"]
    assert other_body["url"] == owner_body["url"]
    assert other_body["interest_count"] == 2
    assert other_body["viewer_is_registered"] is True

    lead = await _get_lead_from_db(owner_body["id"])
    assert lead is not None
    assert {registration.user_id for registration in lead.registrations} == {
        owner_id,
        other_id,
    }


async def test_extract_lead_returns_created_joined_and_already_registered_dispositions(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await _ensure_db_ready()

    async def _get_extractor_by_name(*args, **kwargs):
        raise HTTPException(status_code=404, detail="not found")

    async def _create_extractor(*args, **kwargs):
        return _extractor_stub()

    async def _run_extractor(*args, **kwargs):
        return schemas.ExtractorResponse(
            data=[
                {
                    "title": "Extracted Lead",
                    "description": "Extracted description",
                    "location": "Remote",
                    "job_function": "Engineering",
                }
            ]
        )

    monkeypatch.setattr(lead_routes, "get_extractor_by_name", _get_extractor_by_name)
    monkeypatch.setattr(lead_routes, "create_extractor", _create_extractor)
    monkeypatch.setattr(lead_routes, "run_extractor", _run_extractor)

    async with _client() as client:
        creator_email, _ = await _create_user("extract-create-pass")
        joiner_email, _ = await _create_user("extract-join-pass")
        creator_headers = await _auth_headers(
            client, creator_email, "extract-create-pass"
        )
        joiner_headers = await _auth_headers(client, joiner_email, "extract-join-pass")

        created_response = await client.post(
            "/leads/extract",
            params={
                "extraction_url": "https://www.example.com/jobs/extract-me/?utm_medium=email"
            },
            headers=creator_headers,
        )
        joined_response = await client.post(
            "/leads/extract",
            params={"extraction_url": "https://example.com/jobs/extract-me"},
            headers=joiner_headers,
        )
        already_registered_response = await client.post(
            "/leads/extract",
            params={"extraction_url": "https://example.com/jobs/extract-me#top"},
            headers=joiner_headers,
        )

    assert created_response.status_code == 200
    assert joined_response.status_code == 200
    assert already_registered_response.status_code == 200

    created_body = created_response.json()
    joined_body = joined_response.json()
    already_registered_body = already_registered_response.json()

    assert created_body["disposition"] == "created"
    assert joined_body["disposition"] == "matched_existing_joined"
    assert (
        already_registered_body["disposition"] == "matched_existing_already_registered"
    )
    assert created_body["lead"]["id"] == joined_body["lead"]["id"]
    assert joined_body["lead"]["id"] == already_registered_body["lead"]["id"]
    assert created_body["normalized_url"] == "https://example.com/jobs/extract-me"


async def test_lead_detail_scopes_registration_notes_and_exposed_participants() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        owner_email, owner_id = await _create_user("detail-owner-pass")
        viewer_email, viewer_id = await _create_user("detail-viewer-pass")
        await _set_user_profile(
            owner_id,
            first_name="Owner",
            last_name="User",
            city="New York",
            state="NY",
            country="US",
            avatar_uri="https://cdn.example.com/avatar.png",
        )
        await _set_user_profile(
            viewer_id,
            first_name="Viewer",
            last_name="User",
            city="Chicago",
            state="IL",
            country="US",
        )
        owner_headers = await _auth_headers(client, owner_email, "detail-owner-pass")
        viewer_headers = await _auth_headers(client, viewer_email, "detail-viewer-pass")

        create_response = await client.post(
            "/leads/",
            json=_lead_payload(description=None, location=None),
            headers=owner_headers,
        )
        lead_id = create_response.json()["id"]

        registration_response = await client.post(
            f"/leads/{lead_id}/registration",
            headers=viewer_headers,
        )
        owner_registration_response = await client.patch(
            f"/leads/{lead_id}/registration",
            json={"internal_notes": "Owner only note", "expose_profile": True},
            headers=owner_headers,
        )
        viewer_registration_response = await client.patch(
            f"/leads/{lead_id}/registration",
            json={"internal_notes": "Viewer private note", "expose_profile": False},
            headers=viewer_headers,
        )
        lead_list_response = await client.get("/leads/", headers=viewer_headers)
        detail_response = await client.get(f"/leads/{lead_id}", headers=viewer_headers)
        owner_detail_response = await client.get(
            f"/leads/{lead_id}", headers=owner_headers
        )

    assert registration_response.status_code == 200
    assert owner_registration_response.status_code == 200
    assert viewer_registration_response.status_code == 200
    assert lead_list_response.status_code == 200
    assert detail_response.status_code == 200
    assert owner_detail_response.status_code == 200

    lead_list_item = next(
        item for item in lead_list_response.json()["leads"] if item["id"] == lead_id
    )
    assert lead_list_item["interest_count"] == 2
    assert lead_list_item["viewer_is_registered"] is True
    assert lead_list_item["viewer_permissions"]["can_post_comments"] is True

    detail_body = detail_response.json()
    assert detail_body["viewer_registration"]["user_id"] == str(viewer_id)
    assert detail_body["viewer_registration"]["internal_notes"] == "Viewer private note"
    assert len(detail_body["participant_summaries"]) == 1
    participant = detail_body["participant_summaries"][0]["public_profile"]
    assert participant == {
        "user_id": str(owner_id),
        "display_name": "Owner User",
        "city": "New York",
        "state": "NY",
        "country": "US",
        "avatar_uri": "https://cdn.example.com/avatar.png",
    }

    owner_detail_body = owner_detail_response.json()
    assert (
        owner_detail_body["viewer_registration"]["internal_notes"] == "Owner only note"
    )


async def test_registration_join_and_leave_updates_viewer_state() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        owner_email, _ = await _create_user("leave-owner-pass")
        viewer_email, viewer_id = await _create_user("leave-viewer-pass")
        owner_headers = await _auth_headers(client, owner_email, "leave-owner-pass")
        viewer_headers = await _auth_headers(client, viewer_email, "leave-viewer-pass")

        create_response = await client.post(
            "/leads/",
            json=_lead_payload(),
            headers=owner_headers,
        )
        lead_id = create_response.json()["id"]

        join_response = await client.post(
            f"/leads/{lead_id}/registration",
            headers=viewer_headers,
        )
        leave_response = await client.delete(
            f"/leads/{lead_id}/registration",
            headers=viewer_headers,
        )
        detail_response = await client.get(f"/leads/{lead_id}", headers=viewer_headers)

    assert join_response.status_code == 200
    assert join_response.json()["user_id"] == str(viewer_id)
    assert leave_response.status_code == 204
    assert detail_response.status_code == 200
    assert detail_response.json()["viewer_registration"] is None
    assert detail_response.json()["viewer_is_registered"] is False
    assert detail_response.json()["interest_count"] == 1
    assert detail_response.json()["viewer_permissions"]["can_register"] is True


async def test_registered_viewers_can_post_anonymous_comments_and_single_level_replies() -> (
    None
):
    await _ensure_db_ready()
    async with _client() as client:
        author_email, author_id = await _create_user("comment-author-pass")
        replier_email, replier_id = await _create_user("comment-replier-pass")
        await _set_user_profile(
            author_id,
            first_name="Hidden",
            last_name="Author",
            city="Austin",
            state="TX",
            country="US",
        )
        await _set_user_profile(
            replier_id,
            first_name="Reply",
            last_name="Author",
            city="Seattle",
            state="WA",
            country="US",
        )
        author_headers = await _auth_headers(
            client, author_email, "comment-author-pass"
        )
        replier_headers = await _auth_headers(
            client, replier_email, "comment-replier-pass"
        )

        create_response = await client.post(
            "/leads/",
            json=_lead_payload(),
            headers=author_headers,
        )
        lead_id = create_response.json()["id"]
        await client.post(f"/leads/{lead_id}/registration", headers=replier_headers)

        comment_response = await client.post(
            f"/leads/{lead_id}/comments",
            json={"content": "First comment"},
            headers=author_headers,
        )
        reply_response = await client.post(
            f"/leads/{lead_id}/comments/{comment_response.json()['id']}/replies",
            json={"content": "Visible reply", "anonymous": False},
            headers=replier_headers,
        )
        comments_response = await client.get(
            f"/leads/{lead_id}/comments",
            headers=author_headers,
        )
        nested_reply_response = await client.post(
            f"/leads/{lead_id}/comments/{reply_response.json()['id']}/replies",
            json={"content": "Not allowed"},
            headers=author_headers,
        )
        detail_response = await client.get(f"/leads/{lead_id}", headers=author_headers)

    assert comment_response.status_code == 201
    assert reply_response.status_code == 201
    assert comments_response.status_code == 200
    assert nested_reply_response.status_code == 400
    assert detail_response.status_code == 200

    comment_body = comment_response.json()
    reply_body = reply_response.json()
    comments_body = comments_response.json()
    assert comment_body["anonymous"] is True
    assert comment_body["author_public_profile"] is None
    assert reply_body["anonymous"] is False
    assert reply_body["author_public_profile"]["display_name"] == "Reply Author"
    assert len(comments_body) == 1
    assert len(comments_body[0]["replies"]) == 1
    assert comments_body[0]["replies"][0]["author_public_profile"]["city"] == "Seattle"
    assert detail_response.json()["comment_count"] == 2
