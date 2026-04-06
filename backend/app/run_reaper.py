"""
Background reaper that marks stuck automation runs as failed.

Runs every REAPER_POLL_SECONDS, scans for CrawlerRuns and OrchestrationEvents
that have been in 'running' or 'pending' status for longer than
STALE_TIMEOUT_MINUTES, and marks them as failed.

Items in 'pending_review' are deliberately excluded — they are waiting
for human action, not stuck.
"""

import asyncio
from datetime import datetime, timedelta

from sqlalchemy import update

from app import models
from app.core.db import session_context
from app.logging import get_async_logger

log = get_async_logger(__name__)

REAPER_POLL_SECONDS = 300  # 5 minutes
STALE_TIMEOUT_MINUTES = 30


async def run_reaper_loop() -> None:
    """Long-running loop that reaps stale runs."""
    await log.info("Run reaper started")

    while True:
        try:
            await _reap()
        except asyncio.CancelledError:
            await log.info("Run reaper cancelled")
            return
        except Exception:
            await log.exception("Reaper tick failed")
        await asyncio.sleep(REAPER_POLL_SECONDS)


async def _reap() -> None:
    cutoff = datetime.utcnow() - timedelta(minutes=STALE_TIMEOUT_MINUTES)

    async with session_context() as db:
        # Reap stale CrawlerRuns
        result = await db.execute(
            update(models.CrawlerRun)
            .where(
                models.CrawlerRun.status.in_(["running", "pending"]),
                models.CrawlerRun.created_at < cutoff,
            )
            .values(
                status="failed",
                error_summary="Reaped: exceeded 30-minute timeout",
                finished_at=datetime.utcnow(),
            )
        )
        reaped_runs = result.rowcount
        if reaped_runs:
            await log.info(f"Reaped {reaped_runs} stale CrawlerRun(s)")

        # Reap stale OrchestrationEvents
        result = await db.execute(
            update(models.OrchestrationEvent)
            .where(
                models.OrchestrationEvent.status.in_(["running", "pending"]),
                models.OrchestrationEvent.created_at < cutoff,
            )
            .values(
                status="failure",
                message="Reaped: exceeded 30-minute timeout",
            )
        )
        reaped_events = result.rowcount
        if reaped_events:
            await log.info(f"Reaped {reaped_events} stale OrchestrationEvent(s)")

        await db.commit()
