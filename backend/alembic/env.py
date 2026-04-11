"""Alembic environment configuration for Baldin backend.

Reuses the async SQLAlchemy engine settings from ``app.core.conf`` and
imports ``app.models.Base.metadata`` so ``--autogenerate`` can diff
the ORM against the live database.
"""

from __future__ import annotations

import asyncio
import os as _os
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context
from app.core.conf import settings  # noqa: E402

# ---------------------------------------------------------------------------
# Import the application metadata so autogenerate can introspect models.
# ---------------------------------------------------------------------------
from app.models import Base  # noqa: E402 – must come after sys.path setup

target_metadata = Base.metadata

# ---------------------------------------------------------------------------
# Alembic Config object — provides access to alembic.ini values.
# ---------------------------------------------------------------------------
config = context.config

# Interpret the config file for Python logging if present.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ---------------------------------------------------------------------------
# Build the async database URL from the same env vars the app uses.
# An explicit ALEMBIC_DATABASE_URL env var takes precedence, allowing
# host-side invocations or CI to override the container-internal default.
# ---------------------------------------------------------------------------
_db_url = _os.environ.get("ALEMBIC_DATABASE_URL") or str(
    settings.DEFAULT_SQLALCHEMY_DATABASE_URI
)
config.set_main_option("sqlalchemy.url", _db_url)


# ---------------------------------------------------------------------------
# Offline (SQL-script) migrations
# ---------------------------------------------------------------------------


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode — emit SQL to stdout."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


# ---------------------------------------------------------------------------
# Online (connected) migrations
# ---------------------------------------------------------------------------


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Create an async engine and run migrations within a connection."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode — connect to the DB directly."""
    asyncio.run(run_async_migrations())


# ---------------------------------------------------------------------------
# Entry point — Alembic calls this module at import time.
# ---------------------------------------------------------------------------

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
