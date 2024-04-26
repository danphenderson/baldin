# Path: app/core/db.py
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator, Type

import aiofiles
from fastapi import Depends
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.sql import text

from app import models, schemas
from app.core import conf
from app.logging import console_log

# Determine the appropriate SQLAlchemy database URI based on the environment
if conf.settings.ENVIRONMENT == "PYTEST":
    sqlalchemy_database_uri = str(conf.settings.TEST_SQLALCHEMY_DATABASE_URI)
else:
    sqlalchemy_database_uri = str(
        conf.settings.DEFAULT_SQLALCHEMY_DATABASE_URI
    )  # Use string conversion as a workaround

print(f"SQLALCHEMY_DATABASE_URI: {sqlalchemy_database_uri}\n")
# Create an asynchronous engine for SQLAlchemy
async_engine = create_async_engine(sqlalchemy_database_uri, echo=False)

# Create an asynchronous session maker
async_session_maker = async_sessionmaker(bind=async_engine, expire_on_commit=False)


async def create_db_and_tables() -> None:
    """
    Asynchronously create the database and all defined tables.

    This function is typically used during the application startup to ensure
    that the database schema is set up correctly.
    """
    async with async_engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)


async def drop_and_create_db_and_tables():
    """
    Asynchronously drop the database and all defined tables, then recreate them.

    This function is typically used during testing to ensure that the database
    schema is set up correctly.

    # TODO: This function should be removed once we have alembic migrations in place.
    """
    async with async_engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.drop_all)
        await conn.run_sync(models.Base.metadata.create_all)


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


async def fill_db_with_seeds():
    """
    Fill the database with seed data.

    This function is used to populate the database with initial data, such as
    default users, roles, permissions, etc.
    """

    # Use session_context() to create an asynchronous session
    async with session_context() as session:
        # Create a new user database instance
        user_db = SQLAlchemyUserDatabase(session, models.User)
        # Load seeds from environment public assets dir
        seeds_dir = Path(conf.settings.PUBLIC_ASSETS_DIR) / "seeds"
        # Load seed data from JSON files
        ...


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

    async def create_table_record(
        self,
        create_payload: schemas.BaseSchema,
        table_model: Type[models.Base],
        db: AsyncSession,
    ):
        """
        Inserts record into the table based on the provided table model.
        """
        record = table_model(
            **create_payload.dict()
        )  # Ensure table_model is a concrete model class
        db.add(record)
        await db.commit()
        await db.refresh(record)
        return record

    async def create_table_records(
        self,
        create_schemas: list[schemas.BaseSchema],
        table_model: Type[models.Base],
        db: AsyncSession,
    ):
        """
        Inserts multiple records into the table based on the provided table model.
        """
        records = [
            table_model(**create_schema.dict()) for create_schema in create_schemas
        ]
        db.add_all(records)
        await db.commit()
        return records

    async def seed_tables(self) -> schemas.BaseSchema:  # substype of BaseSchema
        """Asynchronously seed all tables with default data."""
        # Update to seed all tables
        pass

    async def seed_table(self, table_name: str) -> str:  # substype of BaseSchema
        """Asynchronously seed a specific table with default data."""
        seeds_path = (
            Path(conf.settings.PUBLIC_ASSETS_DIR) / "seeds" / f"{table_name}.json"
        )
        table_model = models.table_models[table_name]
        create_schema = schemas.table_create_map[table_name]

        async with aiofiles.open(seeds_path, "r") as file:
            seeds = await file.read()
            console_log.warning(f"seeds: {seeds}")

        create_payload: list = []

        for doc in seeds:
            try:
                if isinstance(doc, dict):
                    create_payload.append(create_schema(**doc))
            except Exception as e:
                console_log.error(f"Error seeding table {table_name}: {e}")
                continue

        if create_payload:
            await self.create_table_records(create_payload, table_model, self.session)

        return f"Seeded {table_name} table"
