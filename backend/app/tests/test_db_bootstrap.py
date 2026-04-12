"""Regression tests for migration bootstrap and the transitional legacy path."""

import asyncio
from collections.abc import Awaitable, Callable
from contextlib import asynccontextmanager
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


async def _check_constraint_names(table_name: str) -> set[str]:
    async with session_context() as session:
        result = await session.execute(
            text(
                """
                SELECT con.conname
                FROM pg_constraint AS con
                JOIN pg_class AS rel ON rel.oid = con.conrelid
                JOIN pg_namespace AS ns ON ns.oid = rel.relnamespace
                WHERE ns.nspname = 'public'
                  AND rel.relname = :table_name
                  AND con.contype = 'c'
                """
            ),
            {"table_name": table_name},
        )
        return {row[0] for row in result.all()}


async def _foreign_key_constraint_names(table_name: str) -> set[str]:
    async with session_context() as session:
        result = await session.execute(
            text(
                """
                SELECT con.conname
                FROM pg_constraint AS con
                JOIN pg_class AS rel ON rel.oid = con.conrelid
                JOIN pg_namespace AS ns ON ns.oid = rel.relnamespace
                WHERE ns.nspname = 'public'
                  AND rel.relname = :table_name
                  AND con.contype = 'f'
                """
            ),
            {"table_name": table_name},
        )
        return {row[0] for row in result.all()}


async def _index_names(table_name: str) -> set[str]:
    async with session_context() as session:
        result = await session.execute(
            text(
                """
                SELECT indexname
                FROM pg_indexes
                WHERE schemaname = 'public' AND tablename = :table_name
                """
            ),
            {"table_name": table_name},
        )
        return {row[0] for row in result.all()}


async def test_create_db_and_tables_stamps_baseline_before_upgrade(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await async_engine.dispose()
    await drop_and_create_db_and_tables()

    commands: list[tuple[list[str], str | None]] = []

    def fake_subprocess_run(command, *, capture_output, text, cwd, env):
        commands.append((list(command), env.get("ALEMBIC_DATABASE_URL")))
        return SimpleNamespace(returncode=0, stdout="", stderr="")

    monkeypatch.delenv("LEGACY_BOOTSTRAP", raising=False)
    monkeypatch.setattr(db_module.subprocess, "run", fake_subprocess_run)

    await create_db_and_tables()

    assert [command for command, _db_url in commands] == [
        ["alembic", "stamp", "0001"],
        ["alembic", "upgrade", "head"],
    ]
    assert all(
        db_url == db_module.sqlalchemy_database_uri for _command, db_url in commands
    )


async def test_drop_and_create_db_and_tables_bootstraps_cell_doc_schema() -> None:
    await async_engine.dispose()
    await drop_and_create_db_and_tables()

    assert await _table_exists("agents")
    assert await _table_exists("agent_runs")
    assert await _table_exists("agent_chat_sessions")
    assert await _table_exists("agent_chat_messages")
    assert await _table_exists("document_blocks")
    assert "configuration" in await _column_names("agents")
    assert "input_context" in await _column_names("agent_runs")
    assert "application_id" in await _column_names("agent_chat_sessions")
    assert "message_count" in await _column_names("agent_chat_sessions")
    assert "status" in await _column_names("agent_chat_sessions")
    assert "session_id" in await _column_names("agent_chat_messages")
    assert "role" in await _column_names("agent_chat_messages")
    assert "metadata" in await _column_names("agent_chat_messages")
    assert "block_snapshot" in await _column_names("document_versions")
    assert "block_id" in await _column_names("document_activities")
    assert await _column_type("agents", "configuration") == ("jsonb", "jsonb")
    assert await _column_type("agent_runs", "input_context") == ("jsonb", "jsonb")
    assert await _column_type("agent_chat_sessions", "message_count") == (
        "integer",
        "int4",
    )
    assert await _column_type("agent_chat_sessions", "last_message_at") == (
        "timestamp with time zone",
        "timestamptz",
    )
    assert await _column_type("agent_chat_messages", "metadata") == ("jsonb", "jsonb")
    assert (
        "document_activities_block_id_fkey"
        not in await _foreign_key_constraint_names("document_activities")
    )

    assert {"ck_agents_kind"}.issubset(await _check_constraint_names("agents"))
    assert {
        "ck_agent_runs_trigger_kind",
        "ck_agent_runs_status",
        "ck_agent_runs_source_surface_kind",
        "ck_agent_runs_apply_status",
    }.issubset(
        await _check_constraint_names("agent_runs")
    )
    assert {"ck_agent_chat_sessions_status"}.issubset(
        await _check_constraint_names("agent_chat_sessions")
    )
    assert {"ck_agent_chat_messages_role"}.issubset(
        await _check_constraint_names("agent_chat_messages")
    )
    assert {
        "agent_chat_sessions_agent_id_fkey",
        "agent_chat_sessions_application_id_fkey",
        "agent_chat_sessions_user_id_fkey",
    }.issubset(await _foreign_key_constraint_names("agent_chat_sessions"))
    assert {"agent_chat_messages_session_id_fkey"}.issubset(
        await _foreign_key_constraint_names("agent_chat_messages")
    )
    assert {
        "ck_documents_kind",
        "ck_documents_status",
    }.issubset(await _check_constraint_names("documents"))
    assert {"ck_document_versions_content_format"}.issubset(
        await _check_constraint_names("document_versions")
    )
    assert {"ck_document_blocks_block_type"}.issubset(
        await _check_constraint_names("document_blocks")
    )
    assert {"ck_document_activities_activity_type"}.issubset(
        await _check_constraint_names("document_activities")
    )
    assert {"ck_document_shares_role"}.issubset(
        await _check_constraint_names("document_shares")
    )
    assert {"ck_orchestration_events_status"}.issubset(
        await _check_constraint_names("orchestration_events")
    )
    assert {"ck_connections_status"}.issubset(
        await _check_constraint_names("connections")
    )
    assert {"ck_conversations_type"}.issubset(
        await _check_constraint_names("conversations")
    )
    assert {"ck_conversation_participants_role"}.issubset(
        await _check_constraint_names("conversation_participants")
    )
    assert {
        "ix_agent_chat_sessions_agent",
        "ix_agent_chat_sessions_application_id",
        "ix_agent_chat_sessions_user_updated",
    }.issubset(await _index_names("agent_chat_sessions"))
    assert {
        "ix_agent_chat_messages_session_created",
    }.issubset(await _index_names("agent_chat_messages"))
    assert {
        "ix_agent_runs_source_surface_kind",
        "ix_agent_runs_source_document_id",
        "ix_agent_runs_source_field_key",
        "ix_agent_runs_source_route",
        "ix_agent_runs_source_anchor_id",
        "ix_agent_runs_apply_status",
    }.issubset(await _index_names("agent_runs"))
    assert {
        "ck_action_items_status",
        "ck_action_items_kind",
        "ck_action_items_priority",
    }.issubset(await _check_constraint_names("action_items"))


async def test_create_db_and_tables_applies_head_without_document_activity_block_fk(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await async_engine.dispose()

    async with async_engine.begin() as conn:
        await db_module._terminate_other_test_db_sessions(conn)
        await conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO postgres"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO public"))

    monkeypatch.delenv("LEGACY_BOOTSTRAP", raising=False)
    await create_db_and_tables()

    assert await _table_exists("agents")
    assert await _table_exists("agent_runs")
    assert await _table_exists("agent_chat_sessions")
    assert await _table_exists("agent_chat_messages")
    assert await _table_exists("document_activities")
    assert (
        "document_activities_block_id_fkey"
        not in await _foreign_key_constraint_names("document_activities")
    )
    assert {"ck_agents_kind"}.issubset(await _check_constraint_names("agents"))
    assert {
        "ck_agent_runs_trigger_kind",
        "ck_agent_runs_status",
        "ck_agent_runs_source_surface_kind",
        "ck_agent_runs_apply_status",
    }.issubset(
        await _check_constraint_names("agent_runs")
    )
    assert {"ck_agent_chat_sessions_status"}.issubset(
        await _check_constraint_names("agent_chat_sessions")
    )
    assert {"ck_agent_chat_messages_role"}.issubset(
        await _check_constraint_names("agent_chat_messages")
    )
    assert {
        "agent_chat_sessions_agent_id_fkey",
        "agent_chat_sessions_application_id_fkey",
        "agent_chat_sessions_user_id_fkey",
    }.issubset(await _foreign_key_constraint_names("agent_chat_sessions"))
    assert {"agent_chat_messages_session_id_fkey"}.issubset(
        await _foreign_key_constraint_names("agent_chat_messages")
    )


async def test_create_db_and_tables_uses_legacy_bootstrap_when_flag_enabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    run_sync_calls: list[Callable[[object], None]] = []

    class FakeConnection:
        async def run_sync(self, fn: Callable[[object], None]) -> None:
            run_sync_calls.append(fn)

    @asynccontextmanager
    async def fake_begin():
        yield FakeConnection()

    monkeypatch.setenv("LEGACY_BOOTSTRAP", "1")
    monkeypatch.setattr(
        db_module,
        "async_engine",
        SimpleNamespace(begin=fake_begin),
    )
    monkeypatch.setattr(
        db_module,
        "run_alembic_migrations",
        lambda: pytest.fail("Alembic path should not run when LEGACY_BOOTSTRAP=1"),
    )

    await create_db_and_tables()

    assert run_sync_calls == [db_module._create_and_sync_schema]


async def test_create_db_and_tables_repairs_string_backed_enum_columns_with_legacy_bootstrap(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
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
            stage=models.ApplicationStage.APPLIED,
        )
        session.add_all([crawler_run, application])
        await session.commit()

        lead_id = lead.id
        crawler_run_id = crawler_run.id
        application_id = application.id

    async with session_context() as session:
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
            text("ALTER TYPE crawlerrunstatus RENAME VALUE 'running' TO 'RUNNING'")
        )
        await session.execute(
            text(
                "ALTER TYPE leadreviewstatus RENAME VALUE 'pending_review' TO 'PENDING_REVIEW'"
            )
        )
        await session.commit()

    assert await _column_type("crawler_runs", "status") == (
        "character varying",
        "varchar",
    )
    assert await _column_type("leads", "review_status") == (
        "character varying",
        "varchar",
    )

    monkeypatch.setenv("LEGACY_BOOTSTRAP", "1")
    await create_db_and_tables()

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
        assert repaired_application.stage == models.ApplicationStage.APPLIED

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
