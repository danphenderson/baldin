# Path: app/core/security.py
"""
You can have several authentication methods, e.g. a cookie
authentication for browser-based queries and a JWT token authentication for pure API queries.

In this template, token will be sent through Bearer header
{"Authorization": "Bearer xyz"}
using JWT tokens.

There are more option to consider, refer to
https://fastapi-users.github.io/fastapi-users/configuration/authentication/

UserManager class is core fastapi users class with customizable attrs and methods
https://fastapi-users.github.io/fastapi-users/configuration/user-manager/
"""

import contextlib
import uuid
from typing import Optional

from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers, UUIDIDMixin
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    JWTStrategy,
)
from fastapi_users.db import SQLAlchemyUserDatabase
from fastapi_users.exceptions import UserAlreadyExists

from app import models, schemas
from app.core import conf
from app.core.db import get_async_session, get_user_db
from app.logging import console_log


def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(
        secret=conf.settings.SECRET_KEY,
        lifetime_seconds=conf.settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


BEARER_TRANSPORT = BearerTransport(tokenUrl="auth/jwt/login")


AUTH_BACKEND = AuthenticationBackend(
    name="jwt",
    transport=BEARER_TRANSPORT,
    get_strategy=get_jwt_strategy,
)


class UserManager(UUIDIDMixin, BaseUserManager[models.User, uuid.UUID]):  # type: ignore # noqa
    reset_password_token_secret = conf.settings.SECRET_KEY
    verification_token_secret = conf.settings.SECRET_KEY

    async def on_after_register(
        self, user: models.User, request: Optional[Request] = None
    ):
        console_log.info(f"User {user.id} has registered.")

    async def on_after_forgot_password(
        self, user: models.User, token: str, request: Optional[Request] = None
    ):
        console_log.info(
            f"User {user.id} has forgot their password. Reset token: {token}"
        )

    async def on_after_request_verify(
        self, user: models.User, token: str, request: Optional[Request] = None
    ):
        console_log.info(
            f"Verification requested for user {user.id}. Verification token: {token}"
        )


async def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
    yield UserManager(user_db)


fastapi_users = FastAPIUsers[models.User, uuid.UUID](get_user_manager, [AUTH_BACKEND])  # type: ignore
get_current_user = fastapi_users.current_user(active=True)
get_current_superuser = fastapi_users.current_user(active=True, superuser=True)

get_async_session_context = contextlib.asynccontextmanager(get_async_session)
get_user_db_context = contextlib.asynccontextmanager(get_user_db)
get_user_manager_context = contextlib.asynccontextmanager(get_user_manager)


async def create_user(schema: schemas.UserCreate):
    try:
        async with get_async_session_context() as session:
            async with get_user_db_context(session) as user_db:
                async with get_user_manager_context(user_db) as user_manager:
                    user = await user_manager.create(schema)
                    console_log.info(f"User created {user}")
    except UserAlreadyExists:
        console_log.info(f"User already exists for {schema}")


async def create_default_superuser():
    default_superuser_payload = schemas.UserCreate(
        email=conf.settings.FIRST_SUPERUSER_EMAIL,
        password=conf.settings.FIRST_SUPERUSER_PASSWORD,
        is_superuser=True,  # type: ignore
    )
    await create_user(default_superuser_payload)
