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

import uuid
from typing import Optional

from app.core import conf

from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers, UUIDIDMixin    
from fastapi_users.db import SQLAlchemyUserDatabase
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    JWTStrategy,
)
from fastapi_users.manager import BaseUserManager
from app.core.db import get_user_db
from app.models import User


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


class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]): # type: ignore
    reset_password_token_secret = conf.settings.SECRET_KEY
    verification_token_secret = conf.settings.SECRET_KEY

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        print(f"User {user.id} has registered.")

    async def on_after_forgot_password(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        print(f"User {user.id} has forgot their password. Reset token: {token}")

    async def on_after_request_verify(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        print(f"Verification requested for user {user.id}. Verification token: {token}")


async def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
    yield UserManager(user_db)


fastapi_users = FastAPIUsers[User, uuid.UUID](get_user_manager, [AUTH_BACKEND]) # type: ignore


get_current_active_user = fastapi_users.current_user(active=True)


get_current_superuser = fastapi_users.current_user(active=True, superuser=True)

