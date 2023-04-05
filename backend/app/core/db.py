from typing import AsyncGenerator, Optional
from fastapi import Depends
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core import conf
from app.models import Base, User
from app.schemas.user import UserCreate



if conf.settings.ENVIRONMENT == "PYTEST":
    sqlalchemy_database_uri = conf.settings.TEST_SQLALCHEMY_DATABASE_URI
else:
    sqlalchemy_database_uri = conf.settings.DEFAULT_SQLALCHEMY_DATABASE_URI

async_engine = create_async_engine(sqlalchemy_database_uri, echo=True)

async_session_maker = async_sessionmaker(async_engine, expire_on_commit=False)

async def create_db_and_tables():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session


async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    yield SQLAlchemyUserDatabase(session, User)


async def create_superuser():
    pass

# async def register_initial_superuser() -> None:
#     print("Creating Super User")
#     async with async_session_maker() as session:
#         result = await session.execute(
#             select(User).where(
#                 User.email == conf.settings.FIRST_SUPERUSER_EMAIL # type: ignore
#             )
#         )
#         user: Optional[User] = result.scalars().first()

#         if user is None:
#             await SQLAlchemyUserDatabase(UserCreate, session, User).create( # type: ignore
#                 UserCreate(
#                     email=conf.settings.FIRST_SUPERUSER_EMAIL,
#                     is_superuser=True,
#                     is_verified=True,
#                     password=conf.settings.FIRST_SUPERUSER_PASSWORD,
#                     is_active=True,
#                 ) # type: ignore
#             )
#             print("Superuser was created")
#         else:
#             print("Superuser already exists in database")
