import asyncio
from typing import AsyncGenerator

import pytest
from fastapi_users.password import PasswordHelper
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import conf
from app.core.db import async_engine
from app.core.db import async_session_maker as async_session
from app.main import app
from app.models import Base
from app.tests import utils

password_helper = PasswordHelper()

default_user_email = "geralt@wiedzmin.pl"
default_user_hash = password_helper.hash("geralt")
superuser_user_email = "yennefer@wiedzmin.pl"
superuser_user_hash = password_helper.hash("yennefer")


@pytest.fixture(scope="session")
async def test_client():
    async with AsyncClient(app=app, base_url="http://doesnt.matter") as client:
        yield client


@pytest.fixture(scope="session")
async def test_db_setup_sessionmaker():
    # assert if we use TEST_DB URL for 100%
    assert conf.settings.ENVIRONMENT == "PYTEST"
    assert str(async_engine.url) == conf.settings.TEST_SQLALCHEMY_DATABASE_URI

    # always drop and create test db tables between tests session
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    return async_session


@pytest.fixture
async def session(test_db_setup_sessionmaker) -> AsyncGenerator[AsyncSession, None]:
    async with test_db_setup_sessionmaker() as session:
        yield session


@pytest.fixture
async def default_user(session: AsyncSession):
    return await utils.create_db_user(default_user_email, default_user_hash, session)


@pytest.fixture
async def superuser_user(session: AsyncSession):
    return await utils.create_db_user(
        superuser_user_email, superuser_user_hash, session, is_superuser=True
    )
