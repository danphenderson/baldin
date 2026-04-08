# Path: app/crawler_scheduler.py
"""Background scheduler loop for recurring CrawlerPipeline execution.

Runs as an asyncio task during the app lifespan, checking for due pipelines
at the configured interval and dispatching scheduled runs through the same
queue-aware scheduling helper used by manual triggers. Each tick elects a
single leader via a Postgres advisory lock so multiple API processes can host
the loop without duplicate scheduled dispatches.
"""

import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, text

from app import models
from app.core import conf
from app.core.db import session_context
from app.logging import get_async_logger

log = get_async_logger(__name__)

_SCHEDULER_ADVISORY_LOCK_ID = 64127831


async def _acquire_scheduler_leader_lock(db) -> bool:
    result = await db.execute(
        text("SELECT pg_try_advisory_lock(:lock_id)"),
        {"lock_id": _SCHEDULER_ADVISORY_LOCK_ID},
    )
    return bool(result.scalar())


async def _release_scheduler_leader_lock(db) -> None:
    await db.execute(
        text("SELECT pg_advisory_unlock(:lock_id)"),
        {"lock_id": _SCHEDULER_ADVISORY_LOCK_ID},
    )


async def crawler_scheduler_loop() -> None:
    """Long-running loop that polls for due CrawlerPipelines and launches runs."""
    await log.info(
        "Crawler scheduler started (interval=%ss, mode=%s)",
        conf.settings.CRAWLER_SCHEDULER_INTERVAL,
        conf.settings.CRAWLER_EXECUTION_MODE,
    )

    while True:
        try:
            await _tick()
        except asyncio.CancelledError:
            await log.info("Crawler scheduler cancelled; shutting down")
            return
        except Exception:
            await log.exception("Crawler scheduler tick failed")

        try:
            await asyncio.sleep(conf.settings.CRAWLER_SCHEDULER_INTERVAL)
        except asyncio.CancelledError:
            await log.info("Crawler scheduler cancelled during sleep; shutting down")
            return


async def _tick() -> None:
    """Single scheduler tick: find due pipelines and schedule runs."""
    from app.api.deps import create_crawler_run, schedule_crawler_run_execution

    now = datetime.now(timezone.utc)

    async with session_context() as db:
        if not await _acquire_scheduler_leader_lock(db):
            await log.debug(
                "Crawler scheduler tick skipped; another process holds the leader lock"
            )
            return

        try:
            result = await db.execute(
                select(models.CrawlerPipeline).where(
                    models.CrawlerPipeline.enabled.is_(True)
                )
            )
            pipelines = result.scalars().all()

            for pipeline in pipelines:
                sched = pipeline.schedule_definition
                if not sched:
                    continue

                next_run_at_raw = sched.get("next_run_at")
                interval_minutes = sched.get("interval_minutes")
                if not next_run_at_raw or not interval_minutes:
                    continue

                if isinstance(next_run_at_raw, str):
                    next_run_at = datetime.fromisoformat(
                        next_run_at_raw.replace("Z", "+00:00")
                    )
                elif isinstance(next_run_at_raw, datetime):
                    next_run_at = next_run_at_raw
                else:
                    continue

                if next_run_at.tzinfo is None:
                    next_run_at = next_run_at.replace(tzinfo=timezone.utc)

                if next_run_at > now:
                    continue

                await log.info(
                    "Scheduler: pipeline %s (%s) is due",
                    pipeline.id,
                    pipeline.name,
                )

                run = await create_crawler_run(pipeline, "scheduled", db)

                new_next = next_run_at + timedelta(minutes=interval_minutes)
                while new_next <= now:
                    new_next += timedelta(minutes=interval_minutes)

                updated_sched = dict(sched)
                updated_sched["next_run_at"] = new_next.isoformat()
                pipeline.schedule_definition = updated_sched
                await db.commit()

                if pipeline.requires_approval:
                    run.status = "pending_review"
                    await db.commit()
                    await log.info(
                        "Scheduler: pipeline %s run %s held for review",
                        pipeline.id,
                        run.id,
                    )
                    continue

                await schedule_crawler_run_execution(
                    run.id,
                    pipeline.created_by_user_id,
                )
        finally:
            await _release_scheduler_leader_lock(db)
