"""Regression tests for local-first bootstrap schema repair."""

import asyncio
from collections.abc import Awaitable, Callable
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi_users.password import PasswordHelper
from sqlalchemy import text

from app import models
from app.core import db as db_module
from app.core.db import (
    async_engine,
    create_db_and_tables,
    drop_and_create_db_and_tables,
    session_context,
)
from app.tests import utils

pytestmark = pytest.mark.asyncio(loop_scope="module")

password_helper = PasswordHelper()


async def _column_names(table_name: str) -> set[str]:
    async with session_context() as session:
        result = await session.execute(
            text(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = :table_name
                """
            ),
            {"table_name": table_name},
        )
        return {row[0] for row in result.all()}


async def _column_type(table_name: str, column_name: str) -> tuple[str, str] | None:
    async with session_context() as session:
        result = await session.execute(
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
        )
        row = result.first()
        if row is None:
            return None
        return row[0], row[1]


async def _table_exists(table_name: str) -> bool:
    async with session_context() as session:
        result = await session.execute(
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


async def test_create_db_and_tables_repairs_existing_local_schema() -> None:
    await async_engine.dispose()
    await drop_and_create_db_and_tables()

    async with session_context() as session:
        user = await utils.create_db_user(
            utils.random_email(),
            password_helper.hash("geralt"),
            session,
        )
        document = models.Document(
            user_id=user.id, kind="freeform", title="Local draft"
        )
        session.add(document)
        await session.flush()

        version = models.DocumentVersion(
            document_id=document.id,
            version_number=1,
            name="v1",
            content="hello world",
        )
        session.add(version)
        await session.flush()

        extractor = models.Extractor(
            name="Bootstrap extractor",
            instruction="Extract contact data.",
            json_schema={"type": "object"},
            user_id=user.id,
        )
        session.add(extractor)
        await session.flush()

        crawler_pipeline = models.CrawlerPipeline(
            name="Bootstrap crawler",
            source="linkedin",
            query_definition={"keywords": ["python"]},
            created_by_user_id=user.id,
        )
        session.add(crawler_pipeline)
        await session.flush()

        document.head_version_id = version.id
        await session.commit()

        user_id = user.id
        document_id = document.id
        version_id = version.id
        extractor_id = extractor.id
        crawler_pipeline_id = crawler_pipeline.id

    async with session_context() as session:
        await session.execute(text("DROP TABLE IF EXISTS document_shares CASCADE"))
        await session.execute(text("DROP TABLE IF EXISTS document_activities CASCADE"))
        await session.execute(
            text("ALTER TABLE users DROP COLUMN IF EXISTS headline CASCADE")
        )
        await session.execute(
            text("ALTER TABLE users DROP COLUMN IF EXISTS bio CASCADE")
        )
        await session.execute(
            text("ALTER TABLE users DROP COLUMN IF EXISTS is_discoverable CASCADE")
        )
        await session.execute(
            text("ALTER TABLE users DROP COLUMN IF EXISTS subscription_tier CASCADE")
        )
        await session.execute(
            text(
                "ALTER TABLE users DROP COLUMN IF EXISTS subscription_expires_at CASCADE"
            )
        )
        await session.execute(
            text("ALTER TABLE users DROP COLUMN IF EXISTS placement_status CASCADE")
        )
        await session.execute(
            text("ALTER TABLE users DROP COLUMN IF EXISTS placement_date CASCADE")
        )
        await session.execute(
            text("ALTER TABLE documents DROP COLUMN IF EXISTS yjs_state CASCADE")
        )
        await session.execute(
            text(
                "ALTER TABLE document_versions DROP COLUMN IF EXISTS content_format CASCADE"
            )
        )
        await session.execute(
            text(
                "ALTER TABLE document_versions DROP COLUMN IF EXISTS source_file CASCADE"
            )
        )
        await session.execute(
            text(
                "ALTER TABLE extractors DROP COLUMN IF EXISTS requires_approval CASCADE"
            )
        )
        await session.execute(
            text(
                "ALTER TABLE crawler_pipelines DROP COLUMN IF EXISTS requires_approval CASCADE"
            )
        )
        await session.commit()

    await create_db_and_tables()

    assert await _table_exists("document_shares")
    assert await _table_exists("document_activities")
    assert {
        "headline",
        "bio",
        "is_discoverable",
        "subscription_tier",
        "subscription_expires_at",
        "placement_status",
        "placement_date",
    }.issubset(await _column_names("users"))
    assert {"yjs_state"}.issubset(await _column_names("documents"))
    assert {"content_format", "source_file"}.issubset(
        await _column_names("document_versions")
    )
    assert {"requires_approval"}.issubset(await _column_names("extractors"))
    assert {"requires_approval"}.issubset(await _column_names("crawler_pipelines"))

    async with session_context() as session:
        repaired_user = await session.get(models.User, user_id)
        repaired_document = await session.get(models.Document, document_id)
        repaired_version = await session.get(models.DocumentVersion, version_id)
        repaired_extractor = await session.get(models.Extractor, extractor_id)
        repaired_crawler_pipeline = await session.get(
            models.CrawlerPipeline, crawler_pipeline_id
        )

        assert repaired_user is not None
        assert repaired_user.headline is None
        assert repaired_user.bio is None
        assert repaired_user.is_discoverable is False
        assert repaired_user.subscription_tier == "free"
        assert repaired_user.subscription_expires_at is None
        assert repaired_user.placement_status == "active"
        assert repaired_user.placement_date is None

        assert repaired_document is not None
        assert repaired_document.yjs_state is None

        assert repaired_version is not None
        assert repaired_version.content_format == "plain_text"
        assert repaired_version.source_file is None

        assert repaired_extractor is not None
        assert repaired_extractor.requires_approval is False

        assert repaired_crawler_pipeline is not None
        assert repaired_crawler_pipeline.requires_approval is False


async def test_create_db_and_tables_repairs_string_backed_enum_columns() -> None:
    await async_engine.dispose()
    await drop_and_create_db_and_tables()

    async with session_context() as session:
        user = await utils.create_db_user(
            utils.random_email(),
            password_helper.hash("geralt"),
            session,
        )
        lead = await utils.create_lead(session)
        lead.review_status = models.LeadReviewStatus.PENDING_REVIEW

        crawler_pipeline = models.CrawlerPipeline(
            name="Enum repair crawler",
            source="linkedin",
            query_definition={"keywords": ["python"]},
            created_by_user_id=user.id,
        )
        session.add(crawler_pipeline)
        await session.flush()

        crawler_run = models.CrawlerRun(
            crawler_pipeline_id=crawler_pipeline.id,
            trigger_type="manual",
            status=models.CrawlerRunStatus.RUNNING,
        )
        application = models.Application(
            lead_id=lead.id,
            user_id=user.id,
            status=models.ApplicationStatus.APPLIED,
        )
        session.add_all([crawler_run, application])
        await session.commit()

        lead_id = lead.id
        crawler_run_id = crawler_run.id
        application_id = application.id

    async with session_context() as session:
        await session.execute(
            text(
                "ALTER TABLE applications ALTER COLUMN status TYPE varchar USING status::text"
            )
        )
        await session.execute(
            text(
                "ALTER TABLE crawler_runs ALTER COLUMN status TYPE varchar USING status::text"
            )
        )
        await session.execute(
            text(
                "ALTER TABLE leads ALTER COLUMN review_status TYPE varchar USING review_status::text"
            )
        )

        await session.execute(
            text(
                "UPDATE applications SET status = 'applied' WHERE id = :application_id"
            ),
            {"application_id": application_id},
        )
        await session.execute(
            text(
                "UPDATE crawler_runs SET status = 'RUNNING' WHERE id = :crawler_run_id"
            ),
            {"crawler_run_id": crawler_run_id},
        )
        await session.execute(
            text(
                "UPDATE leads SET review_status = 'pending_review' WHERE id = :lead_id"
            ),
            {"lead_id": lead_id},
        )

        await session.execute(
            text("ALTER TYPE applicationstatus RENAME VALUE 'applied' TO 'APPLIED'")
        )
        await session.execute(
            text("ALTER TYPE crawlerrunstatus RENAME VALUE 'running' TO 'RUNNING'")
        )
        await session.execute(
            text(
                "ALTER TYPE leadreviewstatus RENAME VALUE 'pending_review' TO 'PENDING_REVIEW'"
            )
        )
        await session.commit()

    assert await _column_type("applications", "status") == (
        "character varying",
        "varchar",
    )
    assert await _column_type("crawler_runs", "status") == (
        "character varying",
        "varchar",
    )
    assert await _column_type("leads", "review_status") == (
        "character varying",
        "varchar",
    )

    await create_db_and_tables()

    assert await _column_type("applications", "status") == (
        "USER-DEFINED",
        "applicationstatus",
    )
    assert await _column_type("crawler_runs", "status") == (
        "USER-DEFINED",
        "crawlerrunstatus",
    )
    assert await _column_type("leads", "review_status") == (
        "USER-DEFINED",
        "leadreviewstatus",
    )

    async with session_context() as session:
        repaired_application = await session.get(models.Application, application_id)
        repaired_crawler_run = await session.get(models.CrawlerRun, crawler_run_id)
        repaired_lead = await session.get(models.Lead, lead_id)

        assert repaired_application is not None
        assert repaired_application.status == models.ApplicationStatus.APPLIED

        assert repaired_crawler_run is not None
        assert repaired_crawler_run.status == models.CrawlerRunStatus.RUNNING

        assert repaired_lead is not None
        assert repaired_lead.review_status == models.LeadReviewStatus.PENDING_REVIEW


@pytest.mark.parametrize(
    ("bootstrap", "failure"),
    [
        (create_db_and_tables, asyncio.TimeoutError()),
        (drop_and_create_db_and_tables, asyncio.CancelledError()),
    ],
)
async def test_db_bootstrap_disposes_engine_after_wait_for_failure(
    monkeypatch: pytest.MonkeyPatch,
    bootstrap: Callable[[], Awaitable[None]],
    failure: BaseException,
) -> None:
    dispose = AsyncMock()

    async def fake_wait_for(operation: Awaitable[None], timeout: float) -> None:
        assert timeout == db_module.PYTEST_DB_OPERATION_TIMEOUT_SECONDS
        operation.close()
        raise failure

    monkeypatch.setattr(
        db_module,
        "async_engine",
        SimpleNamespace(dispose=dispose),
    )
    monkeypatch.setattr(db_module.asyncio, "wait_for", fake_wait_for)

    with pytest.raises(RuntimeError, match="Unable to connect to the PYTEST database"):
        await bootstrap()

    dispose.assert_awaited_once()
