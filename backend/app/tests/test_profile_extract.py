from contextlib import asynccontextmanager

import pytest
from fastapi import HTTPException
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app import models, schemas
from app.api.routes import users as user_routes
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


async def _create_user(password: str) -> tuple[str, object]:
    email = utils.random_email()
    async with session_context() as session:
        user = await utils.create_db_user(
            email,
            password_helper.hash(password),
            session,
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


async def test_extract_user_profile_handles_missing_extractors_without_session_fanout(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await _ensure_db_ready()

    async def fake_get_extractor_by_name(*args, **kwargs):
        raise HTTPException(status_code=404, detail="not found")

    async def fake_run_extractor(extractor, payload, user, db):
        if extractor.name == "user_profile":
            return schemas.ExtractorResponse(
                data=[{"first_name": "Dana", "last_name": "Henderson"}],
                content_too_long=False,
            )
        if extractor.name == "skills":
            return schemas.ExtractorResponse(
                data=[
                    {"name": "Python", "category": "Programming"},
                    {"name": "SQL", "category": "Data"},
                ],
                content_too_long=False,
            )
        if extractor.name == "experiences":
            return schemas.ExtractorResponse(
                data=[
                    {
                        "title": "Senior Engineer",
                        "company": "Acme",
                        "description": "Built platform services",
                    }
                ],
                content_too_long=False,
            )
        return schemas.ExtractorResponse(data=[], content_too_long=False)

    monkeypatch.setattr(
        user_routes,
        "get_extractor_by_name",
        fake_get_extractor_by_name,
    )
    monkeypatch.setattr(user_routes, "run_extractor", fake_run_extractor)

    async with _client() as client:
        email, user_id = await _create_user("profile-extract-pass")
        headers = await _auth_headers(client, email, "profile-extract-pass")

        response = await client.post(
            "/users/me/profile/extract",
            files={
                "text": (None, "Dana Henderson\nPython\nSQL\nAcme"),
                "mode": (None, "entire_document"),
            },
            headers=headers,
        )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["user"]["first_name"] == "Dana"
    assert body["user"]["last_name"] == "Henderson"
    assert [skill["name"] for skill in body["skills"]] == ["Python", "SQL"]
    assert len(body["experiences"]) == 1

    async with session_context() as session:
        db_user = await session.get(models.User, user_id)
        assert db_user is not None
        assert db_user.first_name == "Dana"
        assert db_user.last_name == "Henderson"

        skills = (
            (
                await session.execute(
                    select(models.Skill)
                    .where(models.Skill.user_id == user_id)
                    .order_by(models.Skill.name.asc())
                )
            )
            .scalars()
            .all()
        )
        assert [skill.name for skill in skills] == ["Python", "SQL"]

        experiences = (
            (
                await session.execute(
                    select(models.Experience).where(
                        models.Experience.user_id == user_id
                    )
                )
            )
            .scalars()
            .all()
        )
        assert len(experiences) == 1
        assert experiences[0].company == "Acme"
