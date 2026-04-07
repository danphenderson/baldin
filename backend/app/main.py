# Path: app/main.py

"""
Main FastAPI app instance declaration and admin interface setup.
"""

import asyncio
import logging
import tracemalloc
from contextlib import asynccontextmanager
from time import time

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.types import Receive, Scope, Send

from app.admin import admin
from app.api.api import api_router
from app.core import conf
from app.core.correlation_id import (
    REQUEST_ID_HEADER,
    CorrelationIdMiddleware,
    correlation_id,
)
from app.core.db import create_db_and_tables
from app.core.document_collaboration import (
    ensure_document_collaboration_server_started,
    stop_document_collaboration_server,
)
from app.core.rate_limit import limiter, rate_limit_exceeded_handler
from app.core.security import create_default_superuser
from app.logging import console_log, get_async_logger

# Setup basic logging
logging.basicConfig()

logger = get_async_logger(__name__)


def _normalize_cors_origin(origin: object) -> str:
    return str(origin).rstrip("/")


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

    # Start crawler scheduler if enabled
    if conf.settings.SHOULD_RUN_CRAWLER_SCHEDULER:
        from app.crawler_scheduler import crawler_scheduler_loop

        app.state.crawler_scheduler_task = asyncio.create_task(crawler_scheduler_loop())
        console_log.info("Crawler scheduler started.")
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
        allow_origins=[
            _normalize_cors_origin(origin)
            for origin in conf.settings.BACKEND_CORS_ORIGINS
        ],
    )
