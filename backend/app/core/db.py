# Path: app/core/db.py

import asyncio
import os
import socket
import subprocess
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator
from uuid import UUID

from fastapi import Depends
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy import UniqueConstraint, delete, false, inspect, or_, select, update
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

    async def list_tables(self):
        """Asynchronously list all tables in the database."""
        query = text(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
        )
        result = await self.session.execute(query)
        # Update to handle result set correctly
        return [row.table_name for row in result.mappings().all()]

    async def get_table_details(self, table_name: str):
        """Asynchronously get details of a specific table such as columns and types."""
        query = text(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = :table_name"
        )
        result = await self.session.execute(query, {"table_name": table_name})
        # Same here, ensure to access results correctly
        return {row.column_name: row.data_type for row in result.mappings().all()}

    async def _list_ids(self, statement: Any) -> list[UUID]:
        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def _delete_rows(self, model: Any, *conditions: Any) -> int:
        result = await self.session.execute(delete(model).where(*conditions))
        return int(result.rowcount or 0)

    async def _delete_rows_matching_any(self, model: Any, conditions: list[Any]) -> int:
        if not conditions:
            return 0
        return await self._delete_rows(model, or_(*conditions))

    async def _delete_user_related_rows(self, user_id: UUID) -> dict[str, int]:
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

        deleted_records = {
            models.AgentRun.__tablename__: 0,
            models.AgentChatMessage.__tablename__: 0,
            models.AgentChatSession.__tablename__: 0,
            models.Agent.__tablename__: 0,
            models.OrchestrationEvent.__tablename__: 0,
            models.ExtractorExample.__tablename__: 0,
            models.LeadRegistration.__tablename__: 0,
            models.LeadComment.__tablename__: 0,
            models.DocumentXApplication.__tablename__: 0,
            models.DocumentEmbedding.__tablename__: 0,
            models.DocumentShare.__tablename__: 0,
            models.DocumentActivity.__tablename__: 0,
            models.DocumentVersion.__tablename__: 0,
            models.Application.__tablename__: 0,
            models.Skill.__tablename__: 0,
            models.Experience.__tablename__: 0,
            models.Education.__tablename__: 0,
            models.Certificate.__tablename__: 0,
            models.Aspiration.__tablename__: 0,
            models.Contact.__tablename__: 0,
            models.Document.__tablename__: 0,
            models.Extractor.__tablename__: 0,
            models.OrchestrationPipeline.__tablename__: 0,
        }

        deleted_records[models.AgentRun.__tablename__] = await self._delete_rows(
            models.AgentRun,
            models.AgentRun.user_id == user_id,
        )
        if chat_session_ids:
            deleted_records[
                models.AgentChatMessage.__tablename__
            ] = await self._delete_rows(
                models.AgentChatMessage,
                models.AgentChatMessage.session_id.in_(chat_session_ids),
            )
            deleted_records[
                models.AgentChatSession.__tablename__
            ] = await self._delete_rows(
                models.AgentChatSession,
                models.AgentChatSession.id.in_(chat_session_ids),
            )
        deleted_records[models.Agent.__tablename__] = await self._delete_rows(
            models.Agent,
            models.Agent.id.in_(agent_ids) if agent_ids else false(),
        )

        if pipeline_ids:
            deleted_records[
                models.OrchestrationEvent.__tablename__
            ] = await self._delete_rows(
                models.OrchestrationEvent,
                models.OrchestrationEvent.pipeline_id.in_(pipeline_ids),
            )

        if extractor_ids:
            deleted_records[
                models.ExtractorExample.__tablename__
            ] = await self._delete_rows(
                models.ExtractorExample,
                models.ExtractorExample.extractor_id.in_(extractor_ids),
            )

        document_link_conditions: list[Any] = []
        if application_ids:
            document_link_conditions.append(
                models.DocumentXApplication.application_id.in_(application_ids)
            )
        if document_ids:
            document_link_conditions.append(
                models.DocumentXApplication.document_id.in_(document_ids)
            )
        deleted_records[
            models.DocumentXApplication.__tablename__
        ] = await self._delete_rows_matching_any(
            models.DocumentXApplication, document_link_conditions
        )

        document_activity_conditions: list[Any] = []
        if document_ids:
            document_activity_conditions.append(
                models.DocumentActivity.document_id.in_(document_ids)
            )
        document_activity_conditions.append(
            models.DocumentActivity.actor_user_id == user_id
        )
        deleted_records[
            models.DocumentActivity.__tablename__
        ] = await self._delete_rows_matching_any(
            models.DocumentActivity, document_activity_conditions
        )

        deleted_records[models.DocumentShare.__tablename__] = await self._delete_rows(
            models.DocumentShare,
            or_(
                models.DocumentShare.document_id.in_(document_ids)
                if document_ids
                else false(),
                models.DocumentShare.shared_with_user_id == user_id,
                models.DocumentShare.shared_by_user_id == user_id,
            ),
        )
        if document_version_ids:
            deleted_records[
                models.DocumentEmbedding.__tablename__
            ] = await self._delete_rows(
                models.DocumentEmbedding,
                models.DocumentEmbedding.document_version_id.in_(document_version_ids),
            )
        if document_ids:
            await self.session.execute(
                update(models.Document)
                .where(models.Document.id.in_(document_ids))
                .values(head_version_id=None)
            )
        deleted_records[models.DocumentVersion.__tablename__] = await self._delete_rows(
            models.DocumentVersion,
            models.DocumentVersion.document_id.in_(document_ids)
            if document_ids
            else false(),
        )

        deleted_records[
            models.LeadRegistration.__tablename__
        ] = await self._delete_rows(
            models.LeadRegistration, models.LeadRegistration.user_id == user_id
        )
        deleted_records[models.LeadComment.__tablename__] = await self._delete_rows(
            models.LeadComment, models.LeadComment.author_user_id == user_id
        )

        deleted_records[models.Application.__tablename__] = await self._delete_rows(
            models.Application, models.Application.user_id == user_id
        )
        deleted_records[models.Skill.__tablename__] = await self._delete_rows(
            models.Skill, models.Skill.user_id == user_id
        )
        deleted_records[models.Experience.__tablename__] = await self._delete_rows(
            models.Experience, models.Experience.user_id == user_id
        )
        deleted_records[models.Education.__tablename__] = await self._delete_rows(
            models.Education, models.Education.user_id == user_id
        )
        deleted_records[models.Certificate.__tablename__] = await self._delete_rows(
            models.Certificate, models.Certificate.user_id == user_id
        )
        deleted_records[models.Aspiration.__tablename__] = await self._delete_rows(
            models.Aspiration, models.Aspiration.user_id == user_id
        )
        deleted_records[models.Contact.__tablename__] = await self._delete_rows(
            models.Contact, models.Contact.user_id == user_id
        )
        deleted_records[models.Document.__tablename__] = await self._delete_rows(
            models.Document, models.Document.user_id == user_id
        )
        deleted_records[models.Extractor.__tablename__] = await self._delete_rows(
            models.Extractor, models.Extractor.user_id == user_id
        )
        deleted_records[
            models.OrchestrationPipeline.__tablename__
        ] = await self._delete_rows(
            models.OrchestrationPipeline,
            models.OrchestrationPipeline.user_id == user_id,
        )

        return deleted_records

    def _clear_user_profile_fields(self, user: models.User) -> int:
        cleared_profile_fields = 0
        for field_name in USER_PROFILE_FIELDS:
            if getattr(user, field_name) is not None:
                setattr(user, field_name, None)
                cleared_profile_fields += 1
        return cleared_profile_fields

    async def purge_user_data(self, user_id: UUID) -> dict[str, Any] | None:
        user = await self.session.get(models.User, user_id)
        if user is None:
            return None

        try:
            deleted_records = await self._delete_user_related_rows(user_id)
            cleared_profile_fields = self._clear_user_profile_fields(user)
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

        return {
            "user_id": user_id,
            "user_deleted": False,
            "cleared_profile_fields": cleared_profile_fields,
            "deleted_records": deleted_records,
        }

    async def delete_user(self, user_id: UUID) -> dict[str, Any] | None:
        user = await self.session.get(models.User, user_id)
        if user is None:
            return None

        try:
            deleted_records = await self._delete_user_related_rows(user_id)
            await self.session.delete(user)
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise

        return {
            "user_id": user_id,
            "user_deleted": True,
            "cleared_profile_fields": 0,
            "deleted_records": deleted_records,
        }
