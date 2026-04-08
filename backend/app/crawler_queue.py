# Path: app/crawler_queue.py
"""Async queue abstraction for background crawler and seed jobs.

Uses a Redis list (RPUSH / BLPOP) when Redis is configured and
CRAWLER_EXECUTION_MODE is set to "worker". In PYTEST or when Redis is
unavailable the helpers return immediately so the caller can fall back to
inline execution in the API process.
"""

import json
from typing import Any, Optional

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
    """Push a crawler job onto the Redis queue."""
    return await enqueue_job(
        {
            "kind": "crawler",
            "run_id": str(run_id),
            "user_id": str(user_id),
        }
    )


async def enqueue_seed_job(
    operation_name: str,
    event_id: str,
    user_id: str,
) -> bool:
    """Push a seed job onto the Redis queue."""
    return await enqueue_job(
        {
            "kind": "seed",
            "operation_name": operation_name,
            "event_id": str(event_id),
            "user_id": str(user_id),
        }
    )


async def enqueue_job(job: dict[str, Any]) -> bool:
    """Push a generic background job onto the Redis queue."""
    if not _queue_enabled():
        return False

    import redis.asyncio as aioredis  # lazy import so PYTEST never needs Redis

    client = aioredis.from_url(conf.settings.REDIS_URL)
    try:
        payload = json.dumps(job)
        await client.rpush(conf.settings.CRAWLER_QUEUE_NAME, payload)
        await log.info("Enqueued background job kind=%s", job.get("kind", "unknown"))
        return True
    except Exception:
        await log.exception(
            "Failed to enqueue background job kind=%s",
            job.get("kind", "unknown"),
        )
        return False
    finally:
        await client.aclose()


async def dequeue_job(timeout: int = 5) -> Optional[dict[str, Any]]:
    """Block until a job arrives or *timeout* seconds elapse."""
    if not _queue_enabled():
        raise RuntimeError(
            "dequeue_job called but queue is not enabled. "
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


async def dequeue_crawler_job(timeout: int = 5) -> Optional[dict[str, Any]]:
    """Compatibility wrapper for callers that still use the crawler-specific name."""
    return await dequeue_job(timeout=timeout)
