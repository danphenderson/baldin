"""Tests for the stale-run reaper."""

from datetime import datetime, timedelta

import pytest
from fastapi_users.password import PasswordHelper

from app import models
from app.core.db import async_engine, drop_and_create_db_and_tables, session_context
from app.tests import utils

pytestmark = pytest.mark.asyncio(loop_scope="module")

password_helper = PasswordHelper()
_db_ready = False


async def _ensure_db_ready():
    global _db_ready
    if _db_ready:
        return
    await async_engine.dispose()
    await drop_and_create_db_and_tables()
    _db_ready = True


async def _create_user(email: str = "reaper@test.com", is_superuser: bool = False):
    async with session_context() as session:
        user = await utils.create_db_user(
            email,
            password_helper.hash("testpass"),
            session,
            is_superuser=is_superuser,
        )
        await session.commit()
    return user


async def test_reap_stale_crawler_run():
    await _ensure_db_ready()

    async with session_context() as db:
        user = await _create_user(email="reaper-cr@test.com")

        pipeline = models.CrawlerPipeline(
            name="test-reap-pipeline",
            source="test",
            query_definition={"q": "test"},
            schedule_definition={"type": "manual"},
            created_by_user_id=user.id,
        )
        db.add(pipeline)
        await db.commit()
        await db.refresh(pipeline)

        run = models.CrawlerRun(
            crawler_pipeline_id=pipeline.id,
            trigger_type="manual",
            status="running",
            created_at=datetime.utcnow() - timedelta(minutes=31),
        )
        db.add(run)
        await db.commit()
        await db.refresh(run)
        run_id = run.id

    from app.run_reaper import _reap

    await _reap()

    async with session_context() as db:
        run = await db.get(models.CrawlerRun, run_id)
        assert run.status == "failed"
        assert "Reaped" in (run.error_summary or "")


async def test_reap_stale_orchestration_event():
    await _ensure_db_ready()

    async with session_context() as db:
        user = await _create_user(email="reaper-orch@test.com")

        pipeline = models.OrchestrationPipeline(
            name="test-reap-orch",
            user_id=user.id,
        )
        db.add(pipeline)
        await db.commit()
        await db.refresh(pipeline)

        event = models.OrchestrationEvent(
            pipeline_id=pipeline.id,
            status="running",
            created_at=datetime.utcnow() - timedelta(minutes=31),
        )
        db.add(event)
        await db.commit()
        await db.refresh(event)
        event_id = event.id

    from app.run_reaper import _reap

    await _reap()

    async with session_context() as db:
        event = await db.get(models.OrchestrationEvent, event_id)
        assert event.status == "failure"
        assert "Reaped" in (event.message or "")


async def test_reap_skips_pending_review():
    """Items in pending_review should not be reaped."""
    await _ensure_db_ready()

    async with session_context() as db:
        user = await _create_user(email="reaper-skip@test.com")

        pipeline = models.CrawlerPipeline(
            name="test-skip-pipeline",
            source="test",
            query_definition={"q": "test"},
            schedule_definition={"type": "manual"},
            created_by_user_id=user.id,
        )
        db.add(pipeline)
        await db.commit()
        await db.refresh(pipeline)

        run = models.CrawlerRun(
            crawler_pipeline_id=pipeline.id,
            trigger_type="manual",
            status="pending_review",
            created_at=datetime.utcnow() - timedelta(minutes=31),
        )
        db.add(run)
        await db.commit()
        await db.refresh(run)
        run_id = run.id

    from app.run_reaper import _reap

    await _reap()

    async with session_context() as db:
        run = await db.get(models.CrawlerRun, run_id)
        assert run.status == "pending_review"  # unchanged
