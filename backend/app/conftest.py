# Path: app/conftest.py
"""
Shared pytest fixtures for backend integration tests.

Executed before any test under ``app/tests/``.  Provides reusable,
properly scoped fixtures so that new test modules can import a ready-made
async client, authenticated user, and database reset without copy-pasting
the same boilerplate that currently lives in every test file.

**Migration note** — existing test files still use their own private
``_ensure_db_ready`` / ``_client`` / ``_create_user`` helpers.  A follow-up
story will migrate them to these shared fixtures.  Until then, both
patterns coexist safely because pytest fixtures and module-level helpers
share the same underlying database lifecycle and FastAPI app instance.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from uuid import UUID

import pytest
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient

# This will ensure using test database — must be set before any app imports.
os.environ["ENVIRONMENT"] = "PYTEST"

from app.core import conf  # noqa: E402
from app.core.db import (  # noqa: E402
    async_engine,
    drop_and_create_db_and_tables,
    session_context,
)
from app.main import app  # noqa: E402
from app.tests import utils  # noqa: E402

password_helper = PasswordHelper()


# ---------------------------------------------------------------------------
# Database readiness
# ---------------------------------------------------------------------------

_db_ready = False


async def _reset_test_db() -> None:
    """Drop + recreate the test database tables and refresh app bootstrap state."""
    await async_engine.dispose()
    await drop_and_create_db_and_tables()
    app.state.bootstrap_completed = True


async def _do_ensure_db(*, force: bool = False) -> None:
    """Ensure the shared test DB is ready, optionally forcing a fresh reset."""
    global _db_ready
    if _db_ready and not force:
        return
    await _reset_test_db()
    _db_ready = True


@pytest.fixture(scope="module")
async def ensure_db() -> None:
    """Module-scoped fixture that ensures the test DB tables exist.

    Each test *module* gets a fresh set of tables the first time a test
    in that module requests this fixture.  The module-level scope matches
    the ``loop_scope="module"`` convention used by the existing tests.
    """
    global _db_ready
    _db_ready = False  # force re-creation per module
    await _do_ensure_db()


@pytest.fixture
async def fresh_db() -> None:
    """Function-scoped fixture that forces a clean DB reset for the test."""
    await _do_ensure_db(force=True)


# ---------------------------------------------------------------------------
# Async HTTP client
# ---------------------------------------------------------------------------


@asynccontextmanager
async def async_client_ctx() -> AsyncGenerator[AsyncClient, None]:
    """Context-manager that yields an ``httpx.AsyncClient`` wired to the app.

    Useful in non-fixture helper functions that need a client.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url=str(conf.settings.BACKEND_CORS_ORIGINS[-1]),
    ) as client:
        yield client


@pytest.fixture
async def client(ensure_db: None) -> AsyncGenerator[AsyncClient, None]:
    """Yield an ``httpx.AsyncClient`` pointed at the FastAPI app.

    Implicitly requests ``ensure_db`` so callers don't need to remember.
    """
    async with async_client_ctx() as c:
        yield c


@pytest.fixture
async def fresh_client(fresh_db: None) -> AsyncGenerator[AsyncClient, None]:
    """Yield a client backed by a freshly reset DB for each test."""
    async with async_client_ctx() as c:
        yield c


# ---------------------------------------------------------------------------
# User creation helpers
# ---------------------------------------------------------------------------


async def create_user(
    password: str,
    *,
    email: str | None = None,
    is_superuser: bool = False,
    is_verified: bool = True,
    tier: str | None = None,
) -> tuple[str, UUID]:
    """Register a user directly in the DB and return ``(email, user_id)``.

    Parameters
    ----------
    password:
        Plain-text password (will be hashed before storage).
    email:
        Optional email override. When omitted, a random address is used.
    is_superuser:
        Grant superuser flag.
    is_verified:
        Mark the user's email as verified (default ``True``).
    tier:
        Optional subscription tier (e.g. ``"starter"``, ``"pro"``).
    """
    email = email or utils.random_email()
    async with session_context() as session:
        user = await utils.create_db_user(
            email,
            password_helper.hash(password),
            session,
            is_superuser=is_superuser,
            is_verified=is_verified,
        )
        if tier is not None:
            user.subscription_tier = tier
        await session.commit()
    return email, user.id


@pytest.fixture
async def registered_user(ensure_db: None) -> tuple[str, UUID, str]:
    """Create a verified user and return ``(email, user_id, password)``."""
    password = "TestPass1!"
    email, uid = await create_user(password)
    return email, uid, password


# ---------------------------------------------------------------------------
# Auth convenience
# ---------------------------------------------------------------------------


async def login_and_get_headers(
    client: AsyncClient,
    email: str,
    password: str,
) -> dict[str, str]:
    """Log in via the backend auth route and return Bearer-token headers."""
    response = await client.post(
        "/api/v1/auth/jwt/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def auth_headers(
    client: AsyncClient,
    registered_user: tuple[str, UUID, str],
) -> dict[str, str]:
    """Return Bearer-token headers for the ``registered_user``."""
    email, _, password = registered_user
    return await login_and_get_headers(client, email, password)


# ---------------------------------------------------------------------------
# Rate-limiter isolation
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def reset_rate_limiter() -> None:
    """Reset the in-memory rate-limit counters before every test.

    All tests share the same ``127.0.0.1`` key.  Without a reset, the
    10-per-minute limit on ``/auth/jwt/login`` is exhausted after the
    first ~10 login calls across the entire suite, causing every
    subsequent authentication to return 429.
    """
    app.state.limiter.reset()
