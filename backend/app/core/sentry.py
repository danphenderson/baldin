# Path: app/core/sentry.py
"""Sentry SDK bootstrap for the baldin-api project.

Call ``init_sentry()`` once at process startup — before the FastAPI app or
any asyncio worker loop is created — so the SDK can instrument all
auto-detected integrations (FastAPI, Starlette, SQLAlchemy, asyncpg, Redis,
httpx, LangChain, etc.).

When ``SENTRY_DSN`` is empty the call is a no-op and no data is sent.
"""

from __future__ import annotations

import sentry_sdk

from app.core.conf import settings


def init_sentry() -> None:
    if not settings.SENTRY_DSN:
        return

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        release=settings.VERSION,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        send_default_pii=settings.ENVIRONMENT in {"DEV", "PYTEST"},
        # Avoid capturing expected cancellations during shutdown.
        before_send=_before_send,
    )


def _before_send(event: dict, hint: dict) -> dict | None:
    if "exc_info" in hint:
        _, exc_value, _ = hint["exc_info"]
        # asyncio.CancelledError during shutdown is expected, not an error.
        if isinstance(exc_value, (KeyboardInterrupt, SystemExit)):
            return None
    return event
