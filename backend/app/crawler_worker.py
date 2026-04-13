#!/usr/bin/env python
# Path: app/crawler_worker.py
"""Background worker process.

Consumes crawler and seed jobs from the Redis queue.

Crawler jobs are dispatched to the internal ETL service for browser execution,
then the backend applies normalized results to Baldin's run and lead models.

Run with:
    python -m app.crawler_worker

The worker exits cleanly on SIGINT / SIGTERM.
"""

import asyncio
import signal
import uuid

import sentry_sdk

from app.core import conf
from app.core.sentry import init_sentry
from app.crawler_queue import dequeue_job
from app.logging import get_async_logger

# Initialise Sentry before the worker loop so exceptions and breadcrumbs are
# captured for the baldin-api Sentry project.
init_sentry()

log = get_async_logger(__name__)

_shutdown: bool = False


def _handle_signal(sig, frame) -> None:  # pragma: no cover
    global _shutdown
    _shutdown = True


async def _process_job(job: dict) -> None:
    """Dispatch a background job to the shared execution path."""
    kind = job.get("kind")
    user_id = job.get("user_id")
    if not kind or not user_id:
        await log.warning(f"Worker: malformed job payload, skipping: {job}")
        return

    if kind == "crawler":
        from app.api.deps import execute_crawler_run_background

        run_id = job.get("run_id")
        if not run_id:
            await log.warning(f"Worker: malformed crawler job payload: {job}")
            return
        await log.info(f"Worker: processing crawler job run_id={run_id}")
        await execute_crawler_run_background(
            uuid.UUID(run_id),
            uuid.UUID(user_id),
        )
        return

    if kind == "seed":
        from app.api.routes.seed_tasks import (
            _run_seed_operation,
            resolve_seed_operation,
        )

        operation_name = job.get("operation_name")
        event_id = job.get("event_id")
        if not operation_name or not event_id:
            await log.warning(f"Worker: malformed seed job payload: {job}")
            return
        await log.info(
            "Worker: processing seed job operation=%s event_id=%s",
            operation_name,
            event_id,
        )
        await _run_seed_operation(
            resolve_seed_operation(operation_name),
            uuid.UUID(event_id),
            uuid.UUID(user_id),
        )
        return

    await log.warning(f"Worker: unknown job kind '{kind}', skipping")


async def worker_loop() -> None:
    """Main worker loop: dequeue and process jobs until shutdown."""
    await log.info(
        f"Crawler worker starting (queue={conf.settings.CRAWLER_QUEUE_NAME}, "
        f"redis={conf.settings.REDIS_URL})"
    )

    while not _shutdown:
        try:
            job = await dequeue_job(timeout=5)
            if job is None:
                continue  # timeout, loop again to check _shutdown
            await _process_job(job)
        except Exception as exc:
            sentry_sdk.capture_exception(exc)
            await log.error(f"Worker: unhandled error: {exc}")
            # Short back-off to avoid tight error loops
            await asyncio.sleep(2)

    await log.info("Crawler worker shutting down")


def main() -> None:  # pragma: no cover
    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)
    asyncio.run(worker_loop())


if __name__ == "__main__":  # pragma: no cover
    main()
