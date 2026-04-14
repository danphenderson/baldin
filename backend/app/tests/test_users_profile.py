import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app import models
from app.conftest import create_user, login_and_get_headers
from app.core.db import session_context

pytestmark = pytest.mark.asyncio(loop_scope="module")


async def _auth_headers(
    client: AsyncClient,
    email: str,
    password: str,
) -> dict[str, str]:
    return await login_and_get_headers(client, email, password)


async def _lookup_user_id(email: str):
    async with session_context() as session:
        result = await session.execute(
            select(models.User.id).where(models.User.email == email)
        )
        return result.scalar_one()


async def _seed_profile_records(owner_id, other_id) -> None:
    async with session_context() as session:
        session.add_all(
            [
                models.Skill(
                    user_id=owner_id,
                    name="Python",
                    category="backend",
                ),
                models.Skill(
                    user_id=other_id,
                    name="Go",
                    category="backend",
                ),
                models.Experience(
                    user_id=owner_id,
                    title="Platform Engineer",
                    company="Baldin",
                    description="Built internal workflow tooling.",
                ),
                models.Experience(
                    user_id=other_id,
                    title="Other Experience",
                    company="Other Co",
                ),
                models.Education(
                    user_id=owner_id,
                    university="Example University",
                    degree="BS Computer Science",
                ),
                models.Education(
                    user_id=other_id,
                    university="Other University",
                    degree="MBA",
                ),
                models.Certificate(
                    user_id=owner_id,
                    title="AWS Solutions Architect",
                    issuer="Amazon",
                ),
                models.Certificate(
                    user_id=other_id,
                    title="PMP",
                    issuer="PMI",
                ),
            ]
        )
        await session.commit()


async def test_read_profile_returns_only_current_users_related_records(
    client: AsyncClient,
) -> None:
    password = "UserProfilePass1"
    owner_email, _ = await create_user(password)
    other_email, _ = await create_user("OtherProfilePass1")
    owner_headers = await _auth_headers(client, owner_email, password)

    owner_id = await _lookup_user_id(owner_email)
    other_id = await _lookup_user_id(other_email)
    await _seed_profile_records(owner_id, other_id)

    response = await client.get("/api/v1/users/me/profile", headers=owner_headers)

    assert response.status_code == 200
    body = response.json()
    assert [item["name"] for item in body["skills"]] == ["Python"]
    assert [item["title"] for item in body["experiences"]] == ["Platform Engineer"]
    assert [item["degree"] for item in body["education"]] == ["BS Computer Science"]
    assert [item["title"] for item in body["certificates"]] == [
        "AWS Solutions Architect"
    ]


async def test_read_profile_requires_authentication(client: AsyncClient) -> None:
    response = await client.get("/api/v1/users/me/profile")

    assert response.status_code == 401
