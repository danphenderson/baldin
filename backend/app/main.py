# Path: app/main.py

"""
Main FastAPI app instance declaration and admin interface setup.
"""

import asyncio
import logging
import tracemalloc
from contextlib import asynccontextmanager
from time import time
from urllib.parse import urlsplit, urlunsplit

import httpx
import sentry_sdk
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text
from starlette.types import Receive, Scope, Send

from app.admin import admin
from app.api.api import api_router
from app.core import conf
from app.core.correlation_id import (
    REQUEST_ID_HEADER,
    CorrelationIdMiddleware,
    correlation_id,
)
from app.core.db import async_engine, create_db_and_tables
from app.core.document_collaboration import (
    ensure_document_collaboration_server_started,
    stop_document_collaboration_server,
)
from app.core.rate_limit import limiter, rate_limit_exceeded_handler
from app.core.security import create_default_superuser
from app.core.sentry import init_sentry
from app.logging import console_log, get_async_logger

# Sentry must be initialised before the FastAPI app is created so the SDK
# can instrument all auto-detected integrations.
init_sentry()

# Setup basic logging
logging.basicConfig()

logger = get_async_logger(__name__)


def _normalize_cors_origin(origin: object) -> str:
    return str(origin).rstrip("/")


def _expand_loopback_cors_origins(origins: list[object]) -> list[str]:
    expanded: list[str] = []
    seen: set[str] = set()

    for origin in origins:
        normalized_origin = _normalize_cors_origin(origin)
        parsed_origin = urlsplit(normalized_origin)
        hostname = parsed_origin.hostname

        candidates = [normalized_origin]
        if hostname in {"localhost", "127.0.0.1"}:
            for alias in ("localhost", "127.0.0.1"):
                netloc = alias
                if parsed_origin.port is not None:
                    netloc = f"{netloc}:{parsed_origin.port}"
                candidates.append(
                    urlunsplit((parsed_origin.scheme, netloc, "", "", ""))
                )

        for candidate in candidates:
            if candidate in seen:
                continue
            seen.add(candidate)
            expanded.append(candidate)

    return expanded


class _OuterCORSMiddlewareApp:
    def __init__(self, app: FastAPI, *, allow_origins: list[str]) -> None:
        self._app = app
        self._wrapped_app = CORSMiddleware(
            app,
            allow_origins=allow_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        self.state = app.state

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        await self._wrapped_app(scope, receive, send)

    def __getattr__(self, name: str):
        return getattr(self._app, name)


def _internal_server_error_detail(exc: Exception) -> str:
    if conf.settings.ENVIRONMENT in {"DEV", "PYTEST"}:
        detail = str(exc).strip()
        return detail or exc.__class__.__name__
    return "Internal server error"


async def _check_database_ready() -> tuple[bool, str | None]:
    try:
        async with async_engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        return True, None
    except Exception as exc:
        return False, str(exc)


async def _check_redis_ready() -> tuple[bool, bool, str | None]:
    redis_url = conf.settings.REDIS_URL
    if not redis_url:
        return False, False, "REDIS_URL is not configured"

    import redis.asyncio as aioredis

    client = aioredis.from_url(redis_url)
    try:
        result = await client.ping()
        return True, bool(result), None if result else "Redis ping returned false"
    except Exception as exc:
        return True, False, str(exc)
    finally:
        await client.aclose()


async def _check_etl_service_ready() -> tuple[bool, str | None]:
    url = f"{conf.settings.ETL_SERVICE_URL.rstrip('/')}/health"
    timeout = min(conf.settings.ETL_SERVICE_TIMEOUT_SECONDS, 5.0)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url)
        if response.status_code != 200:
            return False, f"ETL healthcheck returned {response.status_code}"
        return True, None
    except Exception as exc:
        return False, str(exc)


def _sanitize_readiness_detail(
    detail: object,
    *,
    ok: bool,
    configured: bool = True,
) -> str | None:
    if ok:
        return None
    if configured is False:
        return "not configured"
    if not detail:
        return "unreachable"

    detail_text = str(detail).strip().lower()
    if "returned false" in detail_text or "healthcheck returned" in detail_text:
        return "unhealthy"
    return "unreachable"


def _sanitize_readiness_checks(
    checks: dict[str, dict[str, object]],
) -> dict[str, dict[str, object]]:
    public_checks: dict[str, dict[str, object]] = {}
    for name, check in checks.items():
        configured = bool(check.get("configured", True))
        ok = bool(check.get("ok"))
        public_check = dict(check)
        public_check["detail"] = _sanitize_readiness_detail(
            check.get("detail"),
            ok=ok,
            configured=configured,
        )
        public_checks[name] = public_check
    return public_checks


async def _collect_readiness_checks() -> dict[str, dict[str, object]]:
    database_ok, database_detail = await _check_database_ready()
    checks: dict[str, dict[str, object]] = {
        "database": {
            "ok": database_ok,
            "detail": database_detail,
        }
    }

    if conf.settings.CRAWLER_EXECUTION_MODE == "worker":
        redis_configured, redis_ok, redis_detail = await _check_redis_ready()
        etl_ok, etl_detail = await _check_etl_service_ready()
        checks["redis"] = {
            "configured": redis_configured,
            "ok": redis_ok,
            "detail": redis_detail,
        }
        checks["etl_service"] = {
            "configured": True,
            "ok": etl_ok,
            "detail": etl_detail,
        }

    return checks


async def _startup(app: FastAPI) -> None:
    console_log.info("Starting up...")
    if conf.settings.ENVIRONMENT != "PYTEST":
        tracemalloc.start()
        await ensure_document_collaboration_server_started()
    if getattr(app.state, "bootstrap_completed", False):
        console_log.info("Startup bootstrap already completed for this process.")
        return
    if conf.settings.SHOULD_BOOTSTRAP_ON_STARTUP:
        await create_db_and_tables()
        await create_default_superuser()
        app.state.bootstrap_completed = True
        console_log.info("Development bootstrap completed.")
    else:
        console_log.info(
            "Skipping automatic schema creation and default superuser bootstrap outside DEV/PYTEST."
        )

    # Local-first preview keeps the scheduler in-process. Each tick takes
    # a Postgres advisory leader lock in app.crawler_scheduler so multiple
    # web processes do not dispatch the same scheduled run twice.
    if conf.settings.SHOULD_RUN_CRAWLER_SCHEDULER:
        from app.crawler_scheduler import crawler_scheduler_loop

        app.state.crawler_scheduler_task = asyncio.create_task(crawler_scheduler_loop())
        console_log.info(
            "Crawler scheduler started in-process for the local-first preview; scheduled dispatches are coordinated by a Postgres leader lock."
        )
    else:
        console_log.info("Crawler scheduler disabled for this environment.")

    # Start run reaper if enabled
    if conf.settings.SHOULD_RUN_REAPER:
        from app.run_reaper import run_reaper_loop

        app.state.reaper_task = asyncio.create_task(run_reaper_loop())
        console_log.info("Run reaper started.")
    else:
        console_log.info("Run reaper disabled for this environment.")


async def _cancel_background_task(
    app: FastAPI, task_name: str, stop_message: str
) -> None:
    task = getattr(app.state, task_name, None)
    if task is None:
        return

    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    console_log.info(stop_message)


async def _shutdown(app: FastAPI) -> None:
    await _cancel_background_task(
        app,
        "crawler_scheduler_task",
        "Crawler scheduler stopped.",
    )
    await _cancel_background_task(
        app,
        "reaper_task",
        "Run reaper stopped.",
    )

    if conf.settings.ENVIRONMENT != "PYTEST":
        await stop_document_collaboration_server()
    if tracemalloc.is_tracing():
        tracemalloc.stop()
    console_log.info("Shutting down...")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await _startup(app)
    try:
        yield
    finally:
        await _shutdown(app)


app = FastAPI(
    title=conf.settings.PROJECT_NAME.title(),
    version=conf.settings.VERSION,
    description=conf.settings.DESCRIPTION,
    openapi_url="/openapi.json",
    docs_url="/docs",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


@app.get("/health", tags=["infra"])
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready", tags=["infra"])
async def readinesscheck() -> JSONResponse:
    checks = await _collect_readiness_checks()
    is_ready = all(bool(check.get("ok")) for check in checks.values())
    public_checks = _sanitize_readiness_checks(checks)
    return JSONResponse(
        status_code=200 if is_ready else 503,
        content={
            "status": "ready" if is_ready else "degraded",
            "checks": public_checks,
        },
    )


# Keep unhandled route errors inside FastAPI's response pipeline so browser
# clients still receive CORS and request-id headers on 500 responses.
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = request.scope.get("request_id", "") or correlation_id.get("")
    console_log.exception(
        "Unhandled exception during %s %s [%s]",
        request.method,
        request.url.path,
        request_id,
    )
    # The custom handler consumes the exception before Sentry's ASGI
    # middleware sees it, so forward it explicitly.
    sentry_sdk.capture_exception(exc)

    content: dict[str, str] = {"detail": _internal_server_error_detail(exc)}
    headers: dict[str, str] | None = None
    if request_id:
        content["request_id"] = request_id
        headers = {REQUEST_ID_HEADER: request_id}
    return JSONResponse(status_code=500, content=content, headers=headers)


# Correlation ID middleware (outermost — runs first on every request)
app.add_middleware(CorrelationIdMiddleware)


# Log to console if configured for development
if conf.settings.SHOULD_LOG_API_TO_CONSOLE:

    @app.middleware("http")
    async def console_log_requests(request: Request, call_next):
        start_time = time()
        response: Response = await call_next(request)
        process_time = (time() - start_time) * 1000
        req_id = correlation_id.get("")
        console_log.info(
            "%s %s -> %s (%.1fms) [%s]",
            request.method,
            request.url.path,
            response.status_code,
            process_time,
            req_id,
        )
        return response


# Log all requests to the application asynchronously when file logging is enabled
if conf.settings.SHOULD_LOG_API_TO_FILE:

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        start_time = time()
        response: Response = await call_next(request)
        process_time = (time() - start_time) * 1000
        await logger.info(
            "%s %s completed in %.1fms, status=%s",
            request.method,
            request.url.path,
            process_time,
            response.status_code,
        )
        return response


app.include_router(api_router)

admin.mount_to(app)


@app.get("/")
async def root():
    console_log.info("Root!")
    return {"message": "Hello World!"}


if conf.settings.BACKEND_CORS_ORIGINS:
    app = _OuterCORSMiddlewareApp(
        app,
        allow_origins=_expand_loopback_cors_origins(conf.settings.BACKEND_CORS_ORIGINS),
    )
