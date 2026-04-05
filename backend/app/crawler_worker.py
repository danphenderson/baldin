#!/usr/bin/env python
# Path: app/crawler_worker.py
"""
Crawler worker process.

Consumes crawler jobs from the Redis queue and executes them via
``execute_crawler_run`` from app/api/deps.py.

Run with:
    python -m app.crawler_worker

The worker exits cleanly on SIGINT / SIGTERM.
"""

import asyncio
import signal

from app.core import conf
from app.crawler_queue import dequeue_crawler_job
from app.logging import get_async_logger

log = get_async_logger(__name__)

_shutdown: bool = False


def _handle_signal(sig, frame) -> None:  # pragma: no cover
    global _shutdown
    _shutdown = True


async def _process_job(job: dict) -> None:
    """Load run and user from Postgres then call the shared execution logic."""
    from app.api.deps import execute_crawler_run
    from app.core.db import session_context

    run_id = job.get("run_id")
    user_id = job.get("user_id")

    if not run_id or not user_id:
        await log.warning(f"Worker: malformed job payload, skipping: {job}")
        return

    await log.info(f"Worker: processing job run_id={run_id}")

    async with session_context() as db:
        await execute_crawler_run(run_id, user_id, db)


async def worker_loop() -> None:
    """Main worker loop: dequeue and process jobs until shutdown."""
    await log.info(
        f"Crawler worker starting (queue={conf.settings.CRAWLER_QUEUE_NAME}, "
        f"redis={conf.settings.REDIS_URL})"
    )

    while not _shutdown:
        try:
            job = await dequeue_crawler_job(timeout=5)
            if job is None:
                continue  # timeout, loop again to check _shutdown
            await _process_job(job)
        except Exception as exc:
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
