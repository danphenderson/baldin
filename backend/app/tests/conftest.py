from typing import AsyncGenerator, Callable

import pytest
from fastapi_users.password import PasswordHelper
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import conf
from app.core.db import async_engine
from app.core.db import async_session_maker as async_session
from app.core.db import drop_and_create_db_and_tables
from app.main import app
from app.models import (
    Application,
    Contact,
    CoverLetter,
    ETLEvent,
    Experience,
    Lead,
    Resume,
    Skill,
    User,
)
from app.tests import utils

password_helper = PasswordHelper()

default_user_email = "geralt@wiedzmin.pl"
default_user_hash = password_helper.hash("geralt")
superuser_user_email = "yennefer@wiedzmin.pl"
superuser_user_hash = password_helper.hash("yennefer")


@pytest.fixture(scope="session")
async def test_client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(app=app, base_url="http://doesnt.matter") as client:
        yield client


@pytest.fixture(scope="session")
async def test_db_setup_sessionmaker() -> Callable[
    ..., AsyncGenerator[AsyncSession, None]
]:
    assert conf.settings.ENVIRONMENT == "PYTEST"
    assert str(async_engine.url) == conf.settings.TEST_SQLALCHEMY_DATABASE_URI

    await drop_and_create_db_and_tables()

    return async_session


@pytest.fixture
async def session(
    test_db_setup_sessionmaker: Callable[..., AsyncGenerator[AsyncSession, None]]
) -> AsyncGenerator[AsyncSession, None]:
    async with test_db_setup_sessionmaker() as session:
        yield session


@pytest.fixture
async def default_user(session: AsyncSession) -> User:
    return await utils.create_db_user(default_user_email, default_user_hash, session)


@pytest.fixture
async def superuser_user(session: AsyncSession) -> User:
    return await utils.create_db_user(
        superuser_user_email, superuser_user_hash, session, is_superuser=True
    )


@pytest.fixture
async def etl_event(session: AsyncSession) -> ETLEvent:
    return await utils.create_etl_event(session)


@pytest.fixture
async def lead(session: AsyncSession) -> Lead:
    return await utils.create_lead(session)


@pytest.fixture
async def skill(session: AsyncSession, default_user: User) -> Skill:
    return await utils.create_skill(session, default_user.id)


@pytest.fixture
async def experience(session: AsyncSession, default_user: User) -> Experience:
    return await utils.create_experience(session, default_user.id)


@pytest.fixture
async def application(
    session: AsyncSession, default_user: User, lead: Lead
) -> Application:
    return await utils.create_application(session, default_user.id, lead.id)


@pytest.fixture
async def contact(session: AsyncSession, default_user: User) -> Contact:
    return await utils.create_contact(session, default_user.id)


@pytest.fixture
async def resume(session: AsyncSession, default_user: User) -> Resume:
    return await utils.create_resume(session, default_user.id)


@pytest.fixture
async def cover_letter(session: AsyncSession, default_user: User) -> CoverLetter:
    return await utils.create_cover_letter(session, default_user.id)
