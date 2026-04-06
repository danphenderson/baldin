# Path: app/core/db.py

import asyncio
import socket
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator
from uuid import UUID

from fastapi import Depends
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy import UniqueConstraint, delete, inspect, or_, select
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
        "or update backend/.env TEST_DATABASE_* settings."
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


def _quote_identifier(connection: Connection, identifier: str) -> str:
    return connection.dialect.identifier_preparer.quote(identifier)


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


def _create_and_sync_schema(connection: Connection) -> None:
    models.Base.metadata.create_all(connection)
    _sync_missing_columns(connection)
    _sync_missing_named_unique_constraints(connection)


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


async def create_db_and_tables() -> None:
    """
    Asynchronously create the database tables and repair additive local schema drift.

    This function is typically used during the application startup to ensure
    that the database schema is set up correctly.

    `metadata.create_all()` only creates missing tables; it does not alter
    existing ones. In local developer-preview environments we keep a persisted
    Postgres volume, so additive model changes would otherwise break startup
    until the user manually reset the database. This sync step only adds missing
    columns and does not attempt destructive migrations.
    """

    async def _create_schema() -> None:
        async with async_engine.begin() as conn:
            await conn.run_sync(_create_and_sync_schema)

    try:
        if conf.settings.ENVIRONMENT == "PYTEST":
            await asyncio.wait_for(
                _create_schema(), timeout=PYTEST_DB_OPERATION_TIMEOUT_SECONDS
            )
        else:
            await _create_schema()
    except (asyncio.TimeoutError, asyncio.CancelledError) as exc:
        if conf.settings.ENVIRONMENT == "PYTEST":
            await _dispose_engine_and_raise_pytest_database_runtime_error(exc)
        raise
    except (ConnectionError, OSError, socket.gaierror) as exc:
        if conf.settings.ENVIRONMENT == "PYTEST":
            raise _pytest_database_runtime_error() from exc
        raise


async def drop_and_create_db_and_tables() -> None:
    """
    Asynchronously drop the database and all defined tables, then recreate them.

    This function is typically used during testing to ensure that the database
    schema is set up correctly.

    # TODO: This function should be removed once we have alembic migrations in place.
    """

    async def _reset_schema() -> None:
        async with async_engine.begin() as conn:
            if conf.settings.ENVIRONMENT == "PYTEST":
                await _terminate_other_test_db_sessions(conn)
            await conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
            await conn.execute(text("CREATE SCHEMA public"))
            await conn.execute(text("GRANT ALL ON SCHEMA public TO postgres"))
            await conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
            await conn.run_sync(_create_and_sync_schema)

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
        resume_ids = await self._list_ids(
            select(models.Resume.id).where(models.Resume.user_id == user_id)
        )
        cover_letter_ids = await self._list_ids(
            select(models.CoverLetter.id).where(models.CoverLetter.user_id == user_id)
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
            models.OrchestrationEvent.__tablename__: 0,
            models.ExtractorExample.__tablename__: 0,
            models.LeadRegistration.__tablename__: 0,
            models.LeadComment.__tablename__: 0,
            models.ResumeXApplication.__tablename__: 0,
            models.CoverLetterXApplication.__tablename__: 0,
            models.Application.__tablename__: 0,
            models.Skill.__tablename__: 0,
            models.Experience.__tablename__: 0,
            models.Education.__tablename__: 0,
            models.Certificate.__tablename__: 0,
            models.Contact.__tablename__: 0,
            models.Resume.__tablename__: 0,
            models.CoverLetter.__tablename__: 0,
            models.Extractor.__tablename__: 0,
            models.OrchestrationPipeline.__tablename__: 0,
        }

        if pipeline_ids:
            deleted_records[models.OrchestrationEvent.__tablename__] = (
                await self._delete_rows(
                    models.OrchestrationEvent,
                    models.OrchestrationEvent.pipeline_id.in_(pipeline_ids),
                )
            )

        if extractor_ids:
            deleted_records[models.ExtractorExample.__tablename__] = (
                await self._delete_rows(
                    models.ExtractorExample,
                    models.ExtractorExample.extractor_id.in_(extractor_ids),
                )
            )

        resume_link_conditions: list[Any] = []
        if application_ids:
            resume_link_conditions.append(
                models.ResumeXApplication.application_id.in_(application_ids)
            )
        if resume_ids:
            resume_link_conditions.append(
                models.ResumeXApplication.resume_id.in_(resume_ids)
            )
        deleted_records[models.ResumeXApplication.__tablename__] = (
            await self._delete_rows_matching_any(
                models.ResumeXApplication, resume_link_conditions
            )
        )

        cover_letter_link_conditions: list[Any] = []
        if application_ids:
            cover_letter_link_conditions.append(
                models.CoverLetterXApplication.application_id.in_(application_ids)
            )
        if cover_letter_ids:
            cover_letter_link_conditions.append(
                models.CoverLetterXApplication.cover_letter_id.in_(cover_letter_ids)
            )
        deleted_records[models.CoverLetterXApplication.__tablename__] = (
            await self._delete_rows_matching_any(
                models.CoverLetterXApplication, cover_letter_link_conditions
            )
        )

        deleted_records[models.LeadRegistration.__tablename__] = (
            await self._delete_rows(
                models.LeadRegistration, models.LeadRegistration.user_id == user_id
            )
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
        deleted_records[models.Contact.__tablename__] = await self._delete_rows(
            models.Contact, models.Contact.user_id == user_id
        )
        deleted_records[models.Resume.__tablename__] = await self._delete_rows(
            models.Resume, models.Resume.user_id == user_id
        )
        deleted_records[models.CoverLetter.__tablename__] = await self._delete_rows(
            models.CoverLetter, models.CoverLetter.user_id == user_id
        )
        deleted_records[models.Extractor.__tablename__] = await self._delete_rows(
            models.Extractor, models.Extractor.user_id == user_id
        )
        deleted_records[models.OrchestrationPipeline.__tablename__] = (
            await self._delete_rows(
                models.OrchestrationPipeline,
                models.OrchestrationPipeline.user_id == user_id,
            )
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
