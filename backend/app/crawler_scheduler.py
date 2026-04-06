# Path: app/crawler_scheduler.py
"""
Background scheduler loop for recurring CrawlerPipeline execution.

Runs as an asyncio task during the app lifespan, checking for due pipelines
every POLL_INTERVAL_SECONDS and dispatching scheduled runs through the same
execute_crawler_run_background path used by manual triggers.
"""

import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app import models
from app.core.db import session_context
from app.logging import get_async_logger

log = get_async_logger(__name__)

POLL_INTERVAL_SECONDS = 60


async def crawler_scheduler_loop() -> None:
    """Long-running loop that polls for due CrawlerPipelines and launches runs."""
    await log.info("Crawler scheduler started")

    while True:
        try:
            await _tick()
        except asyncio.CancelledError:
            await log.info("Crawler scheduler cancelled — shutting down")
            return
        except Exception:
            await log.exception("Crawler scheduler tick failed")

        try:
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            await log.info("Crawler scheduler cancelled during sleep — shutting down")
            return


async def _tick() -> None:
    """Single scheduler tick: find due pipelines and launch runs."""
    from app.api.deps import create_crawler_run, execute_crawler_run_background

    now = datetime.now(timezone.utc)

    async with session_context() as db:
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

            # Parse next_run_at — accept ISO 8601
            if isinstance(next_run_at_raw, str):
                next_run_at = datetime.fromisoformat(
                    next_run_at_raw.replace("Z", "+00:00")
                )
            elif isinstance(next_run_at_raw, datetime):
                next_run_at = next_run_at_raw
            else:
                continue

            # Make offset-aware if naive
            if next_run_at.tzinfo is None:
                next_run_at = next_run_at.replace(tzinfo=timezone.utc)

            if next_run_at > now:
                continue

            # Pipeline is due — create a scheduled run
            await log.info(
                f"Scheduler: pipeline {pipeline.id} ({pipeline.name}) is due"
            )

            run = await create_crawler_run(pipeline, "scheduled", db)

            # Advance next_run_at
            new_next = next_run_at + timedelta(minutes=interval_minutes)
            # If the new time is still in the past (e.g. app was offline),
            # skip forward to the next future slot
            while new_next <= now:
                new_next += timedelta(minutes=interval_minutes)

            updated_sched = dict(sched)
            updated_sched["next_run_at"] = new_next.isoformat()
            pipeline.schedule_definition = updated_sched
            await db.commit()

            if pipeline.requires_approval:
                # Hold for review — don't execute
                run.status = "pending_review"
                await db.commit()
                await log.info(
                    f"Scheduler: pipeline {pipeline.id} run {run.id} held for review"
                )
            else:
                # Launch in background — use the pipeline creator as the acting user
                asyncio.create_task(
                    execute_crawler_run_background(run.id, pipeline.created_by_user_id)
                )
