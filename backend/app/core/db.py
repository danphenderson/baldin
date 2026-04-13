# Path: app/core/db.py

import asyncio
import os
import socket
import subprocess
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any, AsyncGenerator, Collection, Mapping
from uuid import UUID

from alembic.config import Config as AlembicConfig
from alembic.script import ScriptDirectory
from fastapi import Depends
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy import (
    UniqueConstraint,
    delete,
    false,
    func,
    inspect,
    or_,
    select,
    update,
)
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.schema import CreateColumn
from sqlalchemy.sql import text

from app import models
from app.core import conf
from app.logging import console_log

USER_PROFILE_FIELDS = (
    "first_name",
    "last_name",
    "phone_number",
    "address_line_1",
    "address_line_2",
    "city",
    "state",
    "zip_code",
    "country",
    "time_zone",
    "avatar_uri",
)

PYTEST_DB_OPERATION_TIMEOUT_SECONDS = 5
OBSOLETE_TABLES = (
    "resumes_x_applications",
    "cover_letters_x_applications",
    "resumes",
    "cover_letters",
)

# Determine the appropriate SQLAlchemy database URI based on the environment
if conf.settings.ENVIRONMENT == "PYTEST":
    sqlalchemy_database_uri = str(conf.settings.TEST_SQLALCHEMY_DATABASE_URI)
else:
    sqlalchemy_database_uri = str(
        conf.settings.DEFAULT_SQLALCHEMY_DATABASE_URI
    )  # Use string conversion as a workaround


def _build_engine_connect_args() -> dict[str, Any]:
    if conf.settings.ENVIRONMENT == "PYTEST":
        # Fail fast when the local test_db service is not running instead of
        # leaving pytest to appear hung during connection attempts.
        return {"timeout": 5}
    return {}


def _build_async_engine_kwargs() -> dict[str, Any]:
    kwargs: dict[str, Any] = {
        "echo": False,
        "connect_args": _build_engine_connect_args(),
    }
    if conf.settings.ENVIRONMENT == "PYTEST":
        kwargs["poolclass"] = NullPool
    return kwargs


def _pytest_database_runtime_error() -> RuntimeError:
    return RuntimeError(
        "Unable to connect to the PYTEST database at "
        f"{conf.settings.TEST_DATABASE_HOSTNAME}:{conf.settings.TEST_DATABASE_PORT}. "
        "Start the local test_db service with `docker compose up -d test_db` "
        "or update backend/.env, backend/.env.local, or the process env TEST_DATABASE_* settings."
    )


async def _dispose_engine_and_raise_pytest_database_runtime_error(
    exc: BaseException,
) -> None:
    await async_engine.dispose()
    raise _pytest_database_runtime_error() from exc


# Create an asynchronous engine for SQLAlchemy
async_engine = create_async_engine(
    sqlalchemy_database_uri,
    **_build_async_engine_kwargs(),
)

# Create an asynchronous session maker
async_session_maker = async_sessionmaker(bind=async_engine, expire_on_commit=False)

_ENUM_COLUMN_SPECS: tuple[tuple[str, str, str, tuple[str, ...]], ...] = (
    (
        "crawler_runs",
        "status",
        "crawlerrunstatus",
        tuple(status.value for status in models.CrawlerRunStatus),
    ),
    (
        "leads",
        "review_status",
        "leadreviewstatus",
        tuple(status.value for status in models.LeadReviewStatus),
    ),
)


def _quote_identifier(connection: Connection, identifier: str) -> str:
    return connection.dialect.identifier_preparer.quote(identifier)


def _quote_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


DELETE_BLOCK_REASON_SELF_DELETE = "self_delete"
DELETE_BLOCK_REASON_LAST_REMAINING_SUPERUSER = "last_remaining_superuser"
USER_CLEANUP_DOMAIN_AGENTS = "agents"
USER_CLEANUP_DOMAIN_LEADS = "leads"
USER_CLEANUP_DOMAIN_APPLICATIONS = "applications"
USER_CLEANUP_DOMAIN_DOCUMENTS = "documents"
USER_CLEANUP_DOMAIN_EXTRACTORS = "extractors"
USER_CLEANUP_DOMAIN_ORCHESTRATION = "orchestration"
USER_CLEANUP_DOMAIN_PROFILE = "profile"
USER_CLEANUP_DOMAINS = (
    USER_CLEANUP_DOMAIN_PROFILE,
    USER_CLEANUP_DOMAIN_LEADS,
    USER_CLEANUP_DOMAIN_APPLICATIONS,
    USER_CLEANUP_DOMAIN_DOCUMENTS,
    USER_CLEANUP_DOMAIN_AGENTS,
    USER_CLEANUP_DOMAIN_EXTRACTORS,
    USER_CLEANUP_DOMAIN_ORCHESTRATION,
)


@dataclass(frozen=True)
class UserCleanupScope:
    application_ids: list[UUID]
    document_ids: list[UUID]
    agent_ids: list[UUID]
    chat_session_ids: list[UUID]
    document_version_ids: list[UUID]
    extractor_ids: list[UUID]
    pipeline_ids: list[UUID]


@dataclass(frozen=True)
class _CleanupSpec:
    table_name: str
    model: Any
    conditions_by_domain: Mapping[str, tuple[Any, ...]]
    match_any: bool = False


@dataclass(frozen=True)
class UserCleanupPlan:
    domains: tuple[str, ...]
    deleted_records: dict[str, int]
    cleared_profile_fields: int
    delete_block_reason: str | None
    purge_block_reason: str | None


def _get_enum_labels(connection: Connection, enum_name: str) -> list[str]:
    result = connection.execute(
        text(
            """
            SELECT enumlabel
            FROM pg_type AS t
            JOIN pg_enum AS e ON t.oid = e.enumtypid
            WHERE t.typname = :enum_name
            ORDER BY e.enumsortorder
            """
        ),
        {"enum_name": enum_name},
    )
    return [row[0] for row in result]


def _get_column_type_info(
    connection: Connection, table_name: str, column_name: str
) -> tuple[str, str] | None:
    result = connection.execute(
        text(
            """
            SELECT data_type, udt_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = :table_name
              AND column_name = :column_name
            """
        ),
        {"table_name": table_name, "column_name": column_name},
    ).first()
    if result is None:
        return None
    return result[0], result[1]


def _sync_enum_labels(
    connection: Connection, enum_name: str, desired_labels: tuple[str, ...]
) -> None:
    existing_labels = _get_enum_labels(connection, enum_name)
    if not existing_labels or existing_labels == list(desired_labels):
        return

    if len(existing_labels) != len(desired_labels):
        console_log.warning(
            "Skipped enum label repair for %s because the existing label count does not match the model.",
            enum_name,
        )
        return

    for existing_label, desired_label in zip(existing_labels, desired_labels):
        if existing_label == desired_label:
            continue
        if existing_label.lower() != desired_label.lower():
            console_log.warning(
                "Skipped enum label repair for %s because label %s does not match expected value %s.",
                enum_name,
                existing_label,
                desired_label,
            )
            return

    quoted_enum_name = _quote_identifier(connection, enum_name)
    for existing_label, desired_label in zip(existing_labels, desired_labels):
        if existing_label == desired_label:
            continue

        connection.execute(
            text(
                "ALTER TYPE "
                f"{quoted_enum_name} RENAME VALUE {_quote_literal(existing_label)} "
                f"TO {_quote_literal(desired_label)}"
            )
        )
        console_log.info(
            "Renamed enum label %s.%s -> %s during bootstrap schema sync.",
            enum_name,
            existing_label,
            desired_label,
        )


def _sync_string_backed_enum_column(
    connection: Connection,
    table_name: str,
    column_name: str,
    enum_name: str,
) -> None:
    column_type = _get_column_type_info(connection, table_name, column_name)
    if column_type is None:
        return

    data_type, udt_name = column_type
    if data_type == "USER-DEFINED" and udt_name == enum_name:
        return

    if data_type not in {"character varying", "text"}:
        console_log.warning(
            "Skipped enum column repair for %s.%s because the existing type is %s (%s).",
            table_name,
            column_name,
            data_type,
            udt_name,
        )
        return

    quoted_table_name = _quote_identifier(connection, table_name)
    quoted_column_name = _quote_identifier(connection, column_name)
    quoted_enum_name = _quote_identifier(connection, enum_name)

    connection.execute(
        text(
            "ALTER TABLE "
            f"{quoted_table_name} ALTER COLUMN {quoted_column_name} TYPE {quoted_enum_name} "
            "USING CASE "
            f"WHEN {quoted_column_name} IS NULL THEN NULL "
            f"ELSE lower({quoted_column_name}::text)::{quoted_enum_name} END"
        )
    )
    console_log.info(
        "Converted %s.%s from %s to enum %s during bootstrap schema sync.",
        table_name,
        column_name,
        data_type,
        enum_name,
    )


def _sync_named_enum_columns(connection: Connection) -> None:
    for table_name, column_name, enum_name, desired_labels in _ENUM_COLUMN_SPECS:
        _sync_enum_labels(connection, enum_name, desired_labels)
        _sync_string_backed_enum_column(connection, table_name, column_name, enum_name)


def _sync_missing_columns(connection: Connection) -> None:
    """Add model columns that are missing from an existing local database table."""
    inspector = inspect(connection)
    existing_tables = set(inspector.get_table_names(schema="public"))

    for table in models.Base.metadata.tables.values():
        if table.name not in existing_tables:
            continue

        existing_columns = {
            column["name"]
            for column in inspector.get_columns(table.name, schema="public")
        }
        quoted_table_name = _quote_identifier(connection, table.name)

        for column in table.columns:
            if column.name in existing_columns:
                continue

            column_ddl = str(
                CreateColumn(column).compile(dialect=connection.dialect)
            ).strip()
            if not column_ddl:
                continue

            connection.execute(
                text(f"ALTER TABLE {quoted_table_name} ADD COLUMN {column_ddl}")
            )
            existing_columns.add(column.name)
            console_log.info(
                f"Added missing column {table.name}.{column.name} during bootstrap schema sync."
            )


def _sync_missing_named_unique_constraints(connection: Connection) -> None:
    """Add explicitly named unique constraints that are missing from local tables."""
    inspector = inspect(connection)
    existing_tables = set(inspector.get_table_names(schema="public"))

    for table in models.Base.metadata.tables.values():
        if table.name not in existing_tables:
            continue

        existing_constraints = inspector.get_unique_constraints(
            table.name, schema="public"
        )
        existing_names = {constraint["name"] for constraint in existing_constraints}
        existing_columns = {
            tuple(constraint.get("column_names") or [])
            for constraint in existing_constraints
        }
        quoted_table_name = _quote_identifier(connection, table.name)

        for constraint in table.constraints:
            if not isinstance(constraint, UniqueConstraint) or not constraint.name:
                continue

            column_names = tuple(column.name for column in constraint.columns)
            if constraint.name in existing_names or column_names in existing_columns:
                continue

            quoted_constraint_name = _quote_identifier(connection, constraint.name)
            quoted_columns = ", ".join(
                _quote_identifier(connection, column_name)
                for column_name in column_names
            )
            connection.execute(
                text(
                    "ALTER TABLE "
                    f"{quoted_table_name} ADD CONSTRAINT {quoted_constraint_name} "
                    f"UNIQUE ({quoted_columns})"
                )
            )
            existing_names.add(constraint.name)
            existing_columns.add(column_names)
            console_log.info(
                "Added missing unique constraint "
                f"{constraint.name} during bootstrap schema sync."
            )


def _drop_obsolete_tables(connection: Connection) -> None:
    quoted_tables = ", ".join(
        _quote_identifier(connection, table_name) for table_name in OBSOLETE_TABLES
    )
    connection.execute(text(f"DROP TABLE IF EXISTS {quoted_tables} CASCADE"))


def _create_and_sync_schema(connection: Connection) -> None:
    """Legacy bootstrap — retained behind ``LEGACY_BOOTSTRAP=1`` for transition.

    Production and local-development startup now use Alembic migrations via
    :func:`run_alembic_migrations`.  This function is only reachable when the
    ``LEGACY_BOOTSTRAP`` environment variable is explicitly set to ``1``.
    """
    connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    _drop_obsolete_tables(connection)
    models.Base.metadata.create_all(connection)
    _sync_missing_columns(connection)
    _sync_missing_named_unique_constraints(connection)
    _sync_named_enum_columns(connection)


def _create_test_schema(connection: Connection) -> None:
    """Fast schema bootstrap used only by the pytest test path.

    Uses ``metadata.create_all`` for speed — not the production migration
    path.  This is acceptable because test databases are disposable.
    """
    connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    models.Base.metadata.create_all(connection)


async def _terminate_other_test_db_sessions(conn: AsyncSession | Any) -> None:
    await conn.execute(
        text(
            """
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = current_database()
              AND pid <> pg_backend_pid()
            """
        )
    )


def _alembic_working_directory() -> str:
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _build_alembic_environment() -> dict[str, str]:
    env = os.environ.copy()
    env["ALEMBIC_DATABASE_URL"] = sqlalchemy_database_uri
    return env


def _run_alembic_command(*args: str) -> None:
    command = ["alembic", *args]
    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        cwd=_alembic_working_directory(),
        env=_build_alembic_environment(),
    )
    if result.returncode != 0:
        output = result.stderr.strip() or result.stdout.strip() or "No output captured."
        console_log.error(
            "Alembic command failed (exit %d): %s\n%s",
            result.returncode,
            " ".join(command),
            output,
        )
        raise RuntimeError(
            f"{' '.join(command)} exited with code {result.returncode}: {output}"
        )


async def _public_table_exists(table_name: str) -> bool:
    async with async_engine.connect() as conn:
        result = await conn.execute(
            text(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = :table_name
                )
                """
            ),
            {"table_name": table_name},
        )
        return bool(result.scalar_one())


async def _schema_has_non_alembic_tables() -> bool:
    async with async_engine.connect() as conn:
        result = await conn.execute(
            text(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                      AND table_name <> 'alembic_version'
                )
                """
            )
        )
        return bool(result.scalar_one())


async def _stamp_existing_schema_if_needed() -> None:
    if await _public_table_exists("alembic_version"):
        return
    if not await _schema_has_non_alembic_tables():
        return

    console_log.info(
        "Existing schema detected without alembic_version; stamping baseline revision 0001 before upgrade."
    )
    await asyncio.to_thread(_run_alembic_command, "stamp", "0001")


def run_alembic_migrations() -> None:
    """Run ``alembic upgrade head`` as a subprocess.

    This is the production / local-development schema bootstrap path.  It
    replaces the legacy ``_create_and_sync_schema`` function so that Alembic
    migrations are the single source of truth for DDL changes.

    Raises ``RuntimeError`` if the subprocess exits non-zero.
    """
    _run_alembic_command("upgrade", "head")
    console_log.info("Alembic migrations applied successfully.")


async def create_db_and_tables() -> None:
    """Bootstrap the database schema at application startup.

    * **Default path** — runs ``alembic upgrade head`` so Alembic migrations
      are the single source of truth for schema changes.
    * **Legacy path** — set ``LEGACY_BOOTSTRAP=1`` in the environment to fall
      back to the old ``metadata.create_all`` + sync behaviour while
      transitioning to Alembic.  This flag is temporary.
        * **Test path** — direct callers in ``ENVIRONMENT=PYTEST`` still target the
            dedicated test database and keep the same timeout semantics.
    """
    use_legacy = os.environ.get("LEGACY_BOOTSTRAP", "") == "1"

    if use_legacy:
        console_log.warning(
            "LEGACY_BOOTSTRAP=1 detected — using metadata.create_all bootstrap. "
            "Remove this flag once Alembic migrations are the only schema path."
        )

        async def _create_schema() -> None:
            async with async_engine.begin() as conn:
                await conn.run_sync(_create_and_sync_schema)

        try:
            await _create_schema()
        except (ConnectionError, OSError, socket.gaierror):
            raise
        return

    async def _migrate_schema() -> None:
        await _stamp_existing_schema_if_needed()
        await asyncio.to_thread(run_alembic_migrations)

    try:
        if conf.settings.ENVIRONMENT == "PYTEST":
            await asyncio.wait_for(
                _migrate_schema(), timeout=PYTEST_DB_OPERATION_TIMEOUT_SECONDS
            )
        else:
            await _migrate_schema()
    except (asyncio.TimeoutError, asyncio.CancelledError) as exc:
        if conf.settings.ENVIRONMENT == "PYTEST":
            await _dispose_engine_and_raise_pytest_database_runtime_error(exc)
        raise
    except (ConnectionError, OSError, socket.gaierror) as exc:
        if conf.settings.ENVIRONMENT == "PYTEST":
            raise _pytest_database_runtime_error() from exc
        raise


async def drop_and_create_db_and_tables() -> None:
    """Drop and recreate the public schema — **test-only**.

    Uses ``metadata.create_all`` for speed since test databases are disposable
    and do not need the full Alembic migration history.
    """

    async def _reset_schema() -> None:
        async with async_engine.begin() as conn:
            if conf.settings.ENVIRONMENT == "PYTEST":
                await _terminate_other_test_db_sessions(conn)
            await conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
            await conn.execute(text("CREATE SCHEMA public"))
            await conn.execute(text("GRANT ALL ON SCHEMA public TO postgres"))
            await conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
            await conn.run_sync(_create_test_schema)

    try:
        if conf.settings.ENVIRONMENT == "PYTEST":
            await asyncio.wait_for(
                _reset_schema(), timeout=PYTEST_DB_OPERATION_TIMEOUT_SECONDS
            )
        else:
            await _reset_schema()
    except (asyncio.TimeoutError, asyncio.CancelledError) as exc:
        if conf.settings.ENVIRONMENT == "PYTEST":
            await _dispose_engine_and_raise_pytest_database_runtime_error(exc)
        raise
    except (ConnectionError, OSError, socket.gaierror) as exc:
        if conf.settings.ENVIRONMENT == "PYTEST":
            raise _pytest_database_runtime_error() from exc
        raise


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Generate an asynchronous session for interacting with the database.

    This is a dependency injection utility that should be used in FastAPI endpoints
    to provide a session for database operations.

    Yields:
        AsyncSession: An asynchronous session bound to the current FastAPI context.
    """
    async with async_session_maker() as session:
        yield session


@asynccontextmanager
async def session_context() -> AsyncGenerator[AsyncSession, None]:
    """
    Provide a context manager for an asynchronous session.

    This is useful for scenarios where dependency injection is not applicable, such as:
    - Running database operations in background tasks.
    - Interacting with the database from an interactive shell.

    Yields:
        AsyncSession: An asynchronous session for database operations.
    """
    async for session in get_async_session():
        yield session


async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    """
    Generate a user database instance for FastAPI-Users integration.

    This function provides a SQLAlchemyUserDatabase instance which is required
    by FastAPI-Users to handle user-related operations in the database.

    Args:
        session (AsyncSession, optional): An AsyncSession instance. Defaults to Depends(get_async_session).

    Yields:
        SQLAlchemyUserDatabase: A user database instance for FastAPI-Users.
    """
    yield SQLAlchemyUserDatabase(session, models.User)


class DataBaseManager:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_tables(self) -> list[str]:
        """Asynchronously list all tables in the database."""
        result = await self.session.execute(
            text(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name
                """
            )
        )
        return [row.table_name for row in result.mappings().all()]

    async def get_table_details(self, table_name: str) -> dict[str, str]:
        """Asynchronously get details of a specific table such as columns and types."""
        result = await self.session.execute(
            text(
                """
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = :table_name
                ORDER BY ordinal_position
                """
            ),
            {"table_name": table_name},
        )
        return {row.column_name: row.data_type for row in result.mappings().all()}

    async def _list_ids(self, statement: Any) -> list[UUID]:
        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def _count_rows(self, model: Any, *conditions: Any) -> int:
        result = await self.session.execute(
            select(func.count()).select_from(model).where(*conditions)
        )
        return int(result.scalar() or 0)

    async def _delete_rows(self, model: Any, *conditions: Any) -> int:
        result = await self.session.execute(delete(model).where(*conditions))
        return int(result.rowcount or 0)

    async def _count_rows_matching_any(self, model: Any, conditions: list[Any]) -> int:
        if not conditions:
            return 0
        return await self._count_rows(model, or_(*conditions))

    async def _delete_rows_matching_any(self, model: Any, conditions: list[Any]) -> int:
        if not conditions:
            return 0
        return await self._delete_rows(model, or_(*conditions))

    async def _list_public_base_table_names(self) -> list[str]:
        result = await self.session.execute(
            text(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                ORDER BY table_name
                """
            )
        )
        return [row.table_name for row in result.mappings().all()]

    async def _public_base_table_exists(self, table_name: str) -> bool:
        result = await self.session.execute(
            text(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                      AND table_type = 'BASE TABLE'
                      AND table_name = :table_name
                )
                """
            ),
            {"table_name": table_name},
        )
        return bool(result.scalar())

    def _quote_identifier_for_session(self, identifier: str) -> str:
        bind = self.session.get_bind()
        return bind.dialect.identifier_preparer.quote(identifier)

    async def _count_public_table_rows(self, table_name: str) -> int:
        quoted_table_name = self._quote_identifier_for_session(table_name)
        result = await self.session.execute(
            text(f"SELECT COUNT(*) FROM public.{quoted_table_name}")
        )
        return int(result.scalar() or 0)

    async def _count_public_table_rows_bulk(
        self, table_names: list[str]
    ) -> dict[str, int]:
        if not table_names:
            return {}

        counts_query = " UNION ALL ".join(
            (
                "SELECT "
                f"{_quote_literal(table_name)} AS table_name, "
                f"COUNT(*)::int AS row_count FROM public.{self._quote_identifier_for_session(table_name)}"
            )
            for table_name in table_names
        )
        result = await self.session.execute(text(counts_query))
        return {row.table_name: int(row.row_count) for row in result.mappings().all()}

    def _get_alembic_head_revision(self) -> str | None:
        backend_root = Path(__file__).resolve().parents[2]
        alembic_config = AlembicConfig(str(backend_root / "alembic.ini"))
        alembic_config.set_main_option("script_location", str(backend_root / "alembic"))
        try:
            return ScriptDirectory.from_config(alembic_config).get_current_head()
        except Exception:
            return None

    async def get_database_status(self) -> dict[str, Any]:
        head_revision = self._get_alembic_head_revision()
        public_table_names = await self._list_public_base_table_names()
        current_revision: str | None = None
        if await self._public_base_table_exists("alembic_version"):
            result = await self.session.execute(
                text("SELECT version_num FROM alembic_version")
            )
            current_revision = result.scalar_one_or_none()
        return {
            "current_revision": current_revision,
            "head_revision": head_revision,
            "is_at_head": bool(head_revision and current_revision == head_revision),
            "public_table_count": len(public_table_names),
        }

    async def list_table_summaries(self) -> list[dict[str, Any]]:
        public_table_names = await self._list_public_base_table_names()
        result = await self.session.execute(
            text(
                """
                SELECT table_name, COUNT(*)::int AS column_count
                FROM information_schema.columns
                WHERE table_schema = 'public'
                GROUP BY table_name
                ORDER BY table_name
                """
            )
        )
        column_counts = {
            row.table_name: int(row.column_count) for row in result.mappings().all()
        }
        row_counts = await self._count_public_table_rows_bulk(public_table_names)
        summaries: list[dict[str, Any]] = []
        for table_name in public_table_names:
            summaries.append(
                {
                    "table_name": table_name,
                    "column_count": column_counts.get(table_name, 0),
                    "row_count": row_counts.get(table_name, 0),
                }
            )
        return summaries

    async def get_table_summary_details(self, table_name: str) -> dict[str, Any] | None:
        if not await self._public_base_table_exists(table_name):
            return None
        result = await self.session.execute(
            text(
                """
                SELECT
                    column_name,
                    data_type,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = :table_name
                ORDER BY ordinal_position
                """
            ),
            {"table_name": table_name},
        )
        return {
            "table_name": table_name,
            "row_count": await self._count_public_table_rows(table_name),
            "columns": [
                {
                    "name": row.column_name,
                    "data_type": row.data_type,
                    "is_nullable": row.is_nullable == "YES",
                    "default": row.column_default,
                }
                for row in result.mappings().all()
            ],
        }

    async def _build_user_cleanup_scope(self, user_id: UUID) -> UserCleanupScope:
        application_ids = await self._list_ids(
            select(models.Application.id).where(models.Application.user_id == user_id)
        )
        document_ids = await self._list_ids(
            select(models.Document.id).where(models.Document.user_id == user_id)
        )
        agent_ids = await self._list_ids(
            select(models.Agent.id).where(models.Agent.user_id == user_id)
        )
        chat_session_ids = await self._list_ids(
            select(models.AgentChatSession.id).where(
                models.AgentChatSession.user_id == user_id
            )
        )
        document_version_ids = (
            await self._list_ids(
                select(models.DocumentVersion.id).where(
                    models.DocumentVersion.document_id.in_(document_ids)
                )
            )
            if document_ids
            else []
        )
        extractor_ids = await self._list_ids(
            select(models.Extractor.id).where(models.Extractor.user_id == user_id)
        )
        pipeline_ids = await self._list_ids(
            select(models.OrchestrationPipeline.id).where(
                models.OrchestrationPipeline.user_id == user_id
            )
        )
        return UserCleanupScope(
            application_ids=application_ids,
            document_ids=document_ids,
            agent_ids=agent_ids,
            chat_session_ids=chat_session_ids,
            document_version_ids=document_version_ids,
            extractor_ids=extractor_ids,
            pipeline_ids=pipeline_ids,
        )

    def _normalize_cleanup_domains(
        self, domains: Collection[str] | None
    ) -> tuple[str, ...]:
        if not domains:
            return USER_CLEANUP_DOMAINS

        normalized: list[str] = []
        seen: set[str] = set()
        for domain in domains:
            if domain not in USER_CLEANUP_DOMAINS:
                raise ValueError(f"Unknown cleanup domain: {domain}")
            if domain in seen:
                continue
            seen.add(domain)
            normalized.append(domain)
        return tuple(normalized)

    def _build_user_cleanup_specs(
        self, user_id: UUID, scope: UserCleanupScope
    ) -> tuple[_CleanupSpec, ...]:
        return (
            _CleanupSpec(
                table_name=models.AgentRun.__tablename__,
                model=models.AgentRun,
                conditions_by_domain={
                    USER_CLEANUP_DOMAIN_AGENTS: (models.AgentRun.user_id == user_id,)
                },
            ),
            _CleanupSpec(
                table_name=models.AgentChatMessage.__tablename__,
                model=models.AgentChatMessage,
                conditions_by_domain={
                    USER_CLEANUP_DOMAIN_AGENTS: (
                        models.AgentChatMessage.session_id.in_(scope.chat_session_ids)
                        if scope.chat_session_ids
                        else false(),
                    )
                },
            ),
            _CleanupSpec(
                table_name=models.AgentChatSession.__tablename__,
                model=models.AgentChatSession,
                conditions_by_domain={
                    USER_CLEANUP_DOMAIN_AGENTS: (
                        models.AgentChatSession.id.in_(scope.chat_session_ids)
                        if scope.chat_session_ids
                        else false(),
                    )
                },
            ),
            _CleanupSpec(
                table_name=models.Agent.__tablename__,
                model=models.Agent,
                conditions_by_domain={
                    USER_CLEANUP_DOMAIN_AGENTS: (
                        models.Agent.id.in_(scope.agent_ids)
                        if scope.agent_ids
                        else false(),
                    )
                },
            ),
            _CleanupSpec(
                table_name=models.OrchestrationEvent.__tablename__,
                model=models.OrchestrationEvent,
                conditions_by_domain={
                    USER_CLEANUP_DOMAIN_ORCHESTRATION: (
                        models.OrchestrationEvent.pipeline_id.in_(scope.pipeline_ids)
                        if scope.pipeline_ids
                        else false(),
                    )
                },
            ),
            _CleanupSpec(
                table_name=models.ExtractorExample.__tablename__,
                model=models.ExtractorExample,
                conditions_by_domain={
                    USER_CLEANUP_DOMAIN_EXTRACTORS: (
                        models.ExtractorExample.extractor_id.in_(scope.extractor_ids)
                        if scope.extractor_ids
                        else false(),
                    )
                },
            ),
            _CleanupSpec(
                table_name=models.DocumentXApplication.__tablename__,
                model=models.DocumentXApplication,
                conditions_by_domain={
                    USER_CLEANUP_DOMAIN_APPLICATIONS: (
                        models.DocumentXApplication.application_id.in_(
                            scope.application_ids
                        )
                        if scope.application_ids
                        else false(),
                    ),
                    USER_CLEANUP_DOMAIN_DOCUMENTS: (
                        models.DocumentXApplication.document_id.in_(scope.document_ids)
                        if scope.document_ids
                        else false(),
                    ),
                },
                match_any=True,
            ),
            _CleanupSpec(
                table_name=models.DocumentActivity.__tablename__,
                model=models.DocumentActivity,
                conditions_by_domain={
                    USER_CLEANUP_DOMAIN_DOCUMENTS: (
                        models.DocumentActivity.document_id.in_(scope.document_ids)
                        if scope.document_ids
                        else false(),
                        models.DocumentActivity.actor_user_id == user_id,
                    )
                },
                match_any=True,
            ),
            _CleanupSpec(
                table_name=models.DocumentShare.__tablename__,
                model=models.DocumentShare,
                conditions_by_domain={
                    USER_CLEANUP_DOMAIN_DOCUMENTS: (
                        or_(
                            models.DocumentShare.document_id.in_(scope.document_ids)
                            if scope.document_ids
                            else false(),
                            models.DocumentShare.shared_with_user_id == user_id,
                            models.DocumentShare.shared_by_user_id == user_id,
                        ),
                    )
                },
            ),
            _CleanupSpec(
                table_name=models.DocumentEmbedding.__tablename__,
                model=models.DocumentEmbedding,
                conditions_by_domain={
                    USER_CLEANUP_DOMAIN_DOCUMENTS: (
                        models.DocumentEmbedding.document_version_id.in_(
                            scope.document_version_ids
                        )
                        if scope.document_version_ids
                        else false(),
                    )
                },
            ),
            _CleanupSpec(
                table_name=models.DocumentVersion.__tablename__,
                model=models.DocumentVersion,
                conditions_by_domain={
                    USER_CLEANUP_DOMAIN_DOCUMENTS: (
                        models.DocumentVersion.document_id.in_(scope.document_ids)
                        if scope.document_ids
                        else false(),
                    )
                },
            ),
            _CleanupSpec(
                table_name=models.LeadRegistration.__tablename__,
                model=models.LeadRegistration,
                conditions_by_domain={
                    USER_CLEANUP_DOMAIN_LEADS: (
                        models.LeadRegistration.user_id == user_id,
                    )
                },
            ),
            _CleanupSpec(
                table_name=models.LeadComment.__tablename__,
                model=models.LeadComment,
                conditions_by_domain={
                    USER_CLEANUP_DOMAIN_LEADS: (
                        models.LeadComment.author_user_id == user_id,
                    )
                },
            ),
            _CleanupSpec(
                table_name=models.Application.__tablename__,
                model=models.Application,
                conditions_by_domain={
                    USER_CLEANUP_DOMAIN_APPLICATIONS: (
                        models.Application.user_id == user_id,
                    )
                },
            ),
            _CleanupSpec(
                table_name=models.Skill.__tablename__,
                model=models.Skill,
                conditions_by_domain={
                    USER_CLEANUP_DOMAIN_PROFILE: (models.Skill.user_id == user_id,)
                },
            ),
            _CleanupSpec(
                table_name=models.Experience.__tablename__,
                model=models.Experience,
                conditions_by_domain={
                    USER_CLEANUP_DOMAIN_PROFILE: (models.Experience.user_id == user_id,)
                },
            ),
            _CleanupSpec(
                table_name=models.Education.__tablename__,
                model=models.Education,
                conditions_by_domain={
                    USER_CLEANUP_DOMAIN_PROFILE: (models.Education.user_id == user_id,)
                },
            ),
            _CleanupSpec(
                table_name=models.Certificate.__tablename__,
                model=models.Certificate,
                conditions_by_domain={
                    USER_CLEANUP_DOMAIN_PROFILE: (
                        models.Certificate.user_id == user_id,
                    )
                },
            ),
            _CleanupSpec(
                table_name=models.Aspiration.__tablename__,
                model=models.Aspiration,
                conditions_by_domain={
                    USER_CLEANUP_DOMAIN_PROFILE: (models.Aspiration.user_id == user_id,)
                },
            ),
            _CleanupSpec(
                table_name=models.Contact.__tablename__,
                model=models.Contact,
                conditions_by_domain={
                    USER_CLEANUP_DOMAIN_PROFILE: (models.Contact.user_id == user_id,)
                },
            ),
            _CleanupSpec(
                table_name=models.Document.__tablename__,
                model=models.Document,
                conditions_by_domain={
                    USER_CLEANUP_DOMAIN_DOCUMENTS: (models.Document.user_id == user_id,)
                },
            ),
            _CleanupSpec(
                table_name=models.Extractor.__tablename__,
                model=models.Extractor,
                conditions_by_domain={
                    USER_CLEANUP_DOMAIN_EXTRACTORS: (
                        models.Extractor.user_id == user_id,
                    )
                },
            ),
            _CleanupSpec(
                table_name=models.OrchestrationPipeline.__tablename__,
                model=models.OrchestrationPipeline,
                conditions_by_domain={
                    USER_CLEANUP_DOMAIN_ORCHESTRATION: (
                        models.OrchestrationPipeline.user_id == user_id,
                    )
                },
            ),
        )

    def _build_empty_deleted_records(
        self,
        specs: tuple[_CleanupSpec, ...],
        selected_domains: tuple[str, ...],
    ) -> dict[str, int]:
        deleted_records: dict[str, int] = {}
        for spec in specs:
            if any(domain in spec.conditions_by_domain for domain in selected_domains):
                deleted_records[spec.table_name] = 0
        return deleted_records

    def _select_cleanup_conditions(
        self,
        spec: _CleanupSpec,
        selected_domains: tuple[str, ...],
    ) -> tuple[Any, ...]:
        conditions: list[Any] = []
        for domain in selected_domains:
            conditions.extend(spec.conditions_by_domain.get(domain, ()))
        return tuple(conditions)

    async def _collect_user_related_counts_for_domains(
        self,
        specs: tuple[_CleanupSpec, ...],
        selected_domains: tuple[str, ...],
    ) -> dict[str, int]:
        deleted_records = self._build_empty_deleted_records(specs, selected_domains)
        for spec in specs:
            conditions = self._select_cleanup_conditions(spec, selected_domains)
            if not conditions:
                continue
            if spec.match_any:
                deleted_records[spec.table_name] = await self._count_rows_matching_any(
                    spec.model,
                    list(conditions),
                )
            else:
                deleted_records[spec.table_name] = await self._count_rows(
                    spec.model,
                    *conditions,
                )
        return deleted_records

    async def _delete_user_related_rows_for_domains(
        self,
        scope: UserCleanupScope,
        specs: tuple[_CleanupSpec, ...],
        selected_domains: tuple[str, ...],
    ) -> dict[str, int]:
        deleted_records = self._build_empty_deleted_records(specs, selected_domains)
        for spec in specs:
            conditions = self._select_cleanup_conditions(spec, selected_domains)
            if not conditions:
                continue
            if (
                spec.table_name == models.DocumentVersion.__tablename__
                and scope.document_ids
            ):
                await self.session.execute(
                    update(models.Document)
                    .where(models.Document.id.in_(scope.document_ids))
                    .values(head_version_id=None)
                )
            if spec.match_any:
                deleted_records[spec.table_name] = await self._delete_rows_matching_any(
                    spec.model,
                    list(conditions),
                )
            else:
                deleted_records[spec.table_name] = await self._delete_rows(
                    spec.model,
                    *conditions,
                )
        return deleted_records

    def _count_user_profile_fields_to_clear(self, user: models.User) -> int:
        return sum(
            1
            for field_name in USER_PROFILE_FIELDS
            if getattr(user, field_name) is not None
        )

    def _count_user_profile_fields_for_domains(
        self,
        user: models.User,
        selected_domains: tuple[str, ...],
    ) -> int:
        if USER_CLEANUP_DOMAIN_PROFILE not in selected_domains:
            return 0
        return self._count_user_profile_fields_to_clear(user)

    def _clear_user_profile_fields(self, user: models.User) -> int:
        cleared_profile_fields = self._count_user_profile_fields_to_clear(user)
        for field_name in USER_PROFILE_FIELDS:
            if getattr(user, field_name) is not None:
                setattr(user, field_name, None)
        return cleared_profile_fields

    def _clear_user_profile_fields_for_domains(
        self,
        user: models.User,
        selected_domains: tuple[str, ...],
    ) -> int:
        if USER_CLEANUP_DOMAIN_PROFILE not in selected_domains:
            return 0
        return self._clear_user_profile_fields(user)

    async def get_delete_block_reason(
        self,
        target_user: models.User,
        current_superuser_id: UUID,
    ) -> str | None:
        if target_user.is_superuser:
            remaining_superusers = await self.session.scalar(
                select(func.count())
                .select_from(models.User)
                .where(models.User.is_superuser.is_(True))
            )
            if int(remaining_superusers or 0) <= 1:
                return DELETE_BLOCK_REASON_LAST_REMAINING_SUPERUSER
        if target_user.id == current_superuser_id:
            return DELETE_BLOCK_REASON_SELF_DELETE
        return None

    def _is_full_user_purge(self, selected_domains: tuple[str, ...]) -> bool:
        return set(selected_domains) == set(USER_CLEANUP_DOMAINS)

    async def get_user_cleanup_plan(
        self,
        user_id: UUID,
        *,
        current_superuser_id: UUID | None = None,
        domains: Collection[str] | None = None,
    ) -> UserCleanupPlan | None:
        user = await self.session.get(models.User, user_id)
        if user is None:
            return None

        selected_domains = self._normalize_cleanup_domains(domains)
        scope = await self._build_user_cleanup_scope(user_id)
        specs = self._build_user_cleanup_specs(user_id, scope)
        delete_block_reason: str | None = None
        purge_block_reason: str | None = None

        if current_superuser_id is not None:
            delete_block_reason = await self.get_delete_block_reason(
                user,
                current_superuser_id,
            )
            if self._is_full_user_purge(selected_domains):
                purge_block_reason = delete_block_reason

        return UserCleanupPlan(
            domains=selected_domains,
            deleted_records=await self._collect_user_related_counts_for_domains(
                specs,
                selected_domains,
            ),
            cleared_profile_fields=self._count_user_profile_fields_for_domains(
                user,
                selected_domains,
            ),
            delete_block_reason=delete_block_reason,
            purge_block_reason=purge_block_reason,
        )

    async def preview_user_data_operation(
        self,
        user_id: UUID,
        current_superuser_id: UUID,
        domains: Collection[str] | None = None,
    ) -> dict[str, Any] | None:
        cleanup_plan = await self.get_user_cleanup_plan(
            user_id,
            current_superuser_id=current_superuser_id,
            domains=domains,
        )
        if cleanup_plan is None:
            return None
        return {
            "user_id": user_id,
            "domains": list(cleanup_plan.domains),
            "cleared_profile_fields": cleanup_plan.cleared_profile_fields,
            "deleted_records": cleanup_plan.deleted_records,
            "delete_allowed": cleanup_plan.delete_block_reason is None,
            "delete_block_reason": cleanup_plan.delete_block_reason,
            "purge_allowed": cleanup_plan.purge_block_reason is None,
            "purge_block_reason": cleanup_plan.purge_block_reason,
        }

    async def list_users_for_db_management(
        self,
        *,
        q: str | None = None,
        is_superuser: bool | None = None,
        is_active: bool | None = None,
        page: int = 1,
        page_size: int = 10,
        request_count: bool = False,
    ) -> dict[str, Any]:
        base = select(models.User)
        if q:
            pattern = f"%{q}%"
            base = base.where(
                models.User.email.ilike(pattern)
                | models.User.first_name.ilike(pattern)
                | models.User.last_name.ilike(pattern)
            )
        if is_superuser is not None:
            base = base.where(models.User.is_superuser.is_(is_superuser))
        if is_active is not None:
            base = base.where(models.User.is_active.is_(is_active))

        total = 0
        if request_count:
            count_result = await self.session.execute(
                select(func.count()).select_from(base.subquery())
            )
            total = int(count_result.scalar_one())

        offset = (page - 1) * page_size
        result = await self.session.execute(
            base.order_by(models.User.created_at.desc()).offset(offset).limit(page_size)
        )
        return {
            "items": result.scalars().all(),
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    async def purge_user_data(
        self,
        user_id: UUID,
        current_superuser_id: UUID,
        domains: Collection[str] | None = None,
    ) -> dict[str, Any] | None:
        cleanup_plan = await self.get_user_cleanup_plan(
            user_id,
            current_superuser_id=current_superuser_id,
            domains=domains,
        )
        if cleanup_plan is None:
            return None
        if cleanup_plan.purge_block_reason is not None:
            raise ValueError(cleanup_plan.purge_block_reason)

        user = await self.session.get(models.User, user_id)
        assert user is not None
        selected_domains = cleanup_plan.domains
        scope = await self._build_user_cleanup_scope(user_id)
        specs = self._build_user_cleanup_specs(user_id, scope)

        try:
            deleted_records = await self._delete_user_related_rows_for_domains(
                scope,
                specs,
                selected_domains,
            )
            cleared_profile_fields = self._clear_user_profile_fields_for_domains(
                user,
                selected_domains,
            )
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

        return {
            "user_id": user_id,
            "user_deleted": False,
            "domains": list(selected_domains),
            "cleared_profile_fields": cleared_profile_fields,
            "deleted_records": deleted_records,
        }

    async def delete_user(
        self,
        user_id: UUID,
    ) -> dict[str, Any] | None:
        user = await self.session.get(models.User, user_id)
        if user is None:
            return None

        selected_domains = self._normalize_cleanup_domains(None)
        scope = await self._build_user_cleanup_scope(user_id)
        specs = self._build_user_cleanup_specs(user_id, scope)

        try:
            deleted_records = await self._delete_user_related_rows_for_domains(
                scope,
                specs,
                selected_domains,
            )
            await self.session.delete(user)
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

        return {
            "user_id": user_id,
            "user_deleted": True,
            "domains": list(selected_domains),
            "cleared_profile_fields": 0,
            "deleted_records": deleted_records,
        }
