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

import base64
import contextlib
import hashlib
import re
import uuid
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from typing import Optional

import jwt
from cryptography.fernet import Fernet, InvalidToken
from fastapi import Depends, Request
from fastapi_users import (
    BaseUserManager,
    FastAPIUsers,
    InvalidPasswordException,
    UUIDIDMixin,
)
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    JWTStrategy,
)
from fastapi_users.db import SQLAlchemyUserDatabase
from fastapi_users.exceptions import UserAlreadyExists, UserNotExists

from app import models, schemas
from app.core import conf
from app.core.db import get_async_session, get_user_db
from app.logging import console_log

MIN_PASSWORD_LENGTH = 8
_PASSWORD_RULES = [
    (re.compile(r"[A-Z]"), "one uppercase letter"),
    (re.compile(r"[a-z]"), "one lowercase letter"),
    (re.compile(r"\d"), "one digit"),
]

MFA_TOKEN_EXPIRE_MINUTES = 5
MFA_TOKEN_AUDIENCE = "baldin:mfa"


def _password_validation_reason(password: str) -> str | None:
    reasons: list[str] = []
    if len(password) < MIN_PASSWORD_LENGTH:
        reasons.append(f"at least {MIN_PASSWORD_LENGTH} characters")
    for pattern, label in _PASSWORD_RULES:
        if not pattern.search(password):
            reasons.append(label)
    if reasons:
        return f"Password must contain {', '.join(reasons)}."
    return None


def _invalid_default_superuser_password_error(reason: str) -> RuntimeError:
    message = (
        "Configured FIRST_SUPERUSER_PASSWORD is invalid for automatic startup bootstrap. "
        f"{reason} Update backend/.env, backend/.env.local, or the process environment and restart the docker-compose stack."
    )
    console_log.error(message)
    return RuntimeError(message)


@lru_cache(maxsize=1)
def _get_mfa_fernet() -> Fernet:
    """Derive the MFA-at-rest encryption key from a dedicated override or SECRET_KEY.

    Rotating the effective source key invalidates decryption of previously stored MFA
    secrets until an administrator resets MFA for affected accounts.
    """
    encryption_seed = (
        conf.settings.MFA_ENCRYPTION_KEY or f"{conf.settings.SECRET_KEY}:mfa"
    )
    key_material = hashlib.sha256(encryption_seed.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(key_material))


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

    async def validate_password(
        self, password: str, user: models.User | schemas.UserCreate
    ) -> None:
        reason = _password_validation_reason(password)
        if reason:
            raise InvalidPasswordException(reason=reason)

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


async def authenticate_user_credentials(
    email: str, password: str
) -> Optional[models.User]:
    async with get_async_session_context() as session:
        async with get_user_db_context(session) as user_db:
            async with get_user_manager_context(user_db) as user_manager:
                try:
                    user = await user_manager.get_by_email(email)
                except UserNotExists:
                    user_manager.password_helper.hash(password)
                    return None

                verified, updated_password_hash = (
                    user_manager.password_helper.verify_and_update(
                        password, user.hashed_password
                    )
                )
                if not verified or not user.is_active:
                    return None

                if updated_password_hash is not None:
                    user = await user_db.update(
                        user, {"hashed_password": updated_password_hash}
                    )

                return user


async def authenticate_superuser_credentials(
    email: str, password: str
) -> Optional[models.User]:
    user = await authenticate_user_credentials(email, password)
    if user is None or not user.is_superuser:
        return None
    return user


async def get_user_by_email(email: str) -> Optional[models.User]:
    async with get_async_session_context() as session:
        async with get_user_db_context(session) as user_db:
            async with get_user_manager_context(user_db) as user_manager:
                try:
                    return await user_manager.get_by_email(email)
                except UserNotExists:
                    return None


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
    existing_user = await get_user_by_email(conf.settings.FIRST_SUPERUSER_EMAIL)
    if existing_user is not None:
        if existing_user.is_superuser:
            console_log.info(
                "Default superuser already exists for %s; skipping bootstrap.",
                conf.settings.FIRST_SUPERUSER_EMAIL,
            )
        else:
            console_log.warning(
                "Configured FIRST_SUPERUSER_EMAIL %s already exists but is not a superuser; leaving account unchanged.",
                conf.settings.FIRST_SUPERUSER_EMAIL,
            )
        return

    reason = _password_validation_reason(conf.settings.FIRST_SUPERUSER_PASSWORD)
    if reason:
        raise _invalid_default_superuser_password_error(reason)

    default_superuser_payload = schemas.UserCreate(
        email=conf.settings.FIRST_SUPERUSER_EMAIL,
        password=conf.settings.FIRST_SUPERUSER_PASSWORD,
        is_discoverable=False,
        is_superuser=True,  # type: ignore
    )
    try:
        await create_user(default_superuser_payload)
    except InvalidPasswordException as exc:
        raise _invalid_default_superuser_password_error(
            getattr(
                exc,
                "reason",
                "Password does not satisfy the configured policy.",
            )
        ) from exc


# ---------------------------------------------------------------------------
# MFA challenge-token helpers
# ---------------------------------------------------------------------------


def create_mfa_token(user_id: uuid.UUID) -> str:
    """Return a short-lived JWT that proves the user passed password auth
    but still needs to present a valid TOTP code."""
    payload = {
        "sub": str(user_id),
        "aud": MFA_TOKEN_AUDIENCE,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=MFA_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, conf.settings.SECRET_KEY, algorithm="HS256")


def encrypt_mfa_secret(secret: str) -> str:
    return _get_mfa_fernet().encrypt(secret.encode("utf-8")).decode("utf-8")


def decrypt_mfa_secret(secret: str | None) -> tuple[str | None, bool]:
    if not secret:
        return None, False

    try:
        decrypted = _get_mfa_fernet().decrypt(secret.encode("utf-8")).decode("utf-8")
        return decrypted, True
    except InvalidToken:
        return secret, False


def verify_mfa_token(token: str) -> uuid.UUID:
    """Decode an MFA challenge token and return the user id.

    Raises ``jwt.PyJWTError`` (or a subclass) on any failure.
    """
    data = jwt.decode(
        token,
        conf.settings.SECRET_KEY,
        algorithms=["HS256"],
        audience=MFA_TOKEN_AUDIENCE,
    )
    return uuid.UUID(data["sub"])
