from typing import AsyncGenerator

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from fastapi_users.fastapi_users import FastAPIUsers
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession

from app import schemas
from app.core import security
from app.models import UserTable, Base
from app.session import async_session, async_engine

reusable_oauth2 = OAuth2PasswordBearer(tokenUrl="auth/access-token")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session: # type: ignore
        yield session


async def get_user_db(session: AsyncSession = Depends(get_db)):
    yield SQLAlchemyUserDatabase(schemas.UserDB, session, UserTable)


async def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
    yield security.UserManager(user_db)


fastapi_users = FastAPIUsers(
    get_user_manager,  # type: ignore
    [security.AUTH_BACKEND],
    schemas.User,
    schemas.UserCreate,
    schemas.UserUpdate,
    schemas.UserDB,
)


get_current_user = fastapi_users.current_user()
get_current_active_user = fastapi_users.current_user(active=True)
get_current_superuser = fastapi_users.current_user(active=True, superuser=True)
