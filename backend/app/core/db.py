from typing import AsyncGenerator
from fastapi import Depends
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core import conf
from app.models import Base, User

if conf.settings.ENVIRONMENT == "PYTEST":
    sqlalchemy_database_uri = conf.settings.TEST_SQLALCHEMY_DATABASE_URI
else:
    sqlalchemy_database_uri = conf.settings.DEFAULT_SQLALCHEMY_DATABASE_URI

async_engine = create_async_engine(sqlalchemy_database_uri, echo=True)

async_session_maker = async_sessionmaker(bind=async_engine, expire_on_commit=False)

async def create_db_and_tables():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session


async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    yield SQLAlchemyUserDatabase(session, User)

