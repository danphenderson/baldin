# Path: app/crawler_scheduler.py
"""
Crawler scheduler.

Periodically checks for pending crawler runs and either enqueues them
(worker mode) or launches them as asyncio tasks (inline mode).

The scheduler is started from app/main.py on application startup.
"""

import asyncio

from app.core import conf
from app.core.db import session_context
from app.crawler_queue import _queue_enabled, enqueue_crawler_job
from app.logging import get_async_logger

log = get_async_logger(__name__)

# How often (in seconds) the scheduler polls for pending runs.
SCHEDULER_INTERVAL_SECONDS: int = 60


async def _dispatch_pending_runs() -> None:
    """Enqueue or inline-execute all pending crawler runs found in Postgres."""
    from sqlalchemy import select

    from app.models import CrawlerRun

    async with session_context() as db:
        result = await db.execute(
            select(CrawlerRun).where(CrawlerRun.status == "pending")
        )
        pending = result.scalars().all()

        if not pending:
            return

        await log.info(f"Scheduler: dispatching {len(pending)} pending crawler run(s)")

        for run in pending:
            if _queue_enabled():
                await enqueue_crawler_job(str(run.id), str(run.user_id))
            else:
                # Inline: run directly inside a fresh session task
                asyncio.create_task(_inline_execute(run_id=run.id, user_id=run.user_id))


async def _inline_execute(run_id, user_id) -> None:
    from app.api.deps import execute_crawler_run

    async with session_context() as db:
        await execute_crawler_run(run_id, user_id, db)


async def start_crawler_scheduler() -> None:
    """Run the scheduler loop indefinitely.  Designed to be launched with
    ``asyncio.create_task()`` from the application startup handler."""
    await log.info(
        f"Crawler scheduler started (interval={SCHEDULER_INTERVAL_SECONDS}s, "
        f"mode={conf.settings.CRAWLER_EXECUTION_MODE})"
    )
    while True:
        try:
            await _dispatch_pending_runs()
        except Exception as exc:
            await log.error(f"Crawler scheduler error: {exc}")
        await asyncio.sleep(SCHEDULER_INTERVAL_SECONDS)
