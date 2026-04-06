# Path: app/crawler_queue.py
"""
Async queue abstraction for crawler jobs.

Uses a Redis list (RPUSH / BLPOP) when Redis is configured and
CRAWLER_EXECUTION_MODE is set to "worker".  In PYTEST or when
Redis is unavailable the helpers return immediately so the caller
can fall back to inline (in-process) execution.
"""

import json
from typing import Optional

from app.core import conf
from app.logging import get_async_logger

log = get_async_logger(__name__)


def _queue_enabled() -> bool:
    """Return True when the Redis-backed queue should be used."""
    if conf.settings.ENVIRONMENT == "PYTEST":
        return False
    if not conf.settings.REDIS_URL:
        return False
    if conf.settings.CRAWLER_EXECUTION_MODE != "worker":
        return False
    return True


async def enqueue_crawler_job(run_id: str, user_id: str) -> bool:
    """Push a crawler job onto the Redis queue.

    Returns True when the job was successfully enqueued, False when
    the queue is disabled and the caller should execute inline.
    """
    if not _queue_enabled():
        return False

    import redis.asyncio as aioredis  # lazy import so PYTEST never needs Redis

    client = aioredis.from_url(conf.settings.REDIS_URL)
    try:
        job = json.dumps({"run_id": str(run_id), "user_id": str(user_id)})
        await client.rpush(conf.settings.CRAWLER_QUEUE_NAME, job)
        await log.info(f"Enqueued crawler job run_id={run_id}")
        return True
    finally:
        await client.aclose()


async def dequeue_crawler_job(timeout: int = 5) -> Optional[dict]:
    """Block until a job arrives or *timeout* seconds elapse.

    Returns a dict with ``run_id`` and ``user_id`` keys, or ``None``
    on timeout.  Raises ``RuntimeError`` if the queue is not enabled.
    """
    if not _queue_enabled():
        raise RuntimeError(
            "dequeue_crawler_job called but queue is not enabled. "
            "Set REDIS_URL and CRAWLER_EXECUTION_MODE=worker."
        )

    import redis.asyncio as aioredis

    client = aioredis.from_url(conf.settings.REDIS_URL)
    try:
        result = await client.blpop(conf.settings.CRAWLER_QUEUE_NAME, timeout=timeout)
        if result is None:
            return None
        _, data = result
        return json.loads(data)
    finally:
        await client.aclose()
