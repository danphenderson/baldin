# Path: app/tests/conftest.py
import pytest
from fastapi_users.password import PasswordHelper
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import conf
from app.core.db import (
    async_engine,
    drop_and_create_db_and_tables,
    session_context,
    sqlalchemy_database_uri,
)
from app.main import app
from app.models import (
    Application,
    Contact,
    CoverLetter,
    Experience,
    Lead,
    OrchestrationEvent,
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
async def test_client():
    assert conf.settings.ENVIRONMENT == "PYTEST"
    assert conf.settings.TEST_SQLALCHEMY_DATABASE_URI == sqlalchemy_database_uri
    async with AsyncClient(
        app=app, base_url=str(conf.settings.BACKEND_CORS_ORIGINS[-1])
    ) as client:
        yield client


@pytest.fixture(scope="session")
async def session():
    assert str(async_engine.url) == str(conf.settings.TEST_SQLALCHEMY_DATABASE_URI)
    await drop_and_create_db_and_tables()
    async with session_context() as session:
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
async def etl_event(session: AsyncSession) -> OrchestrationEvent:
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
