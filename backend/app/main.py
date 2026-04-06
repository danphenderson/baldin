# Path: app/main.py

"""
Main FastAPI app instance declaration and admin interface setup.
"""

import asyncio
import logging
import tracemalloc
from time import time

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app.admin import admin
from app.api.api import api_router
from app.core import conf
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

app = FastAPI(
    title=conf.settings.PROJECT_NAME.title(),
    version=conf.settings.VERSION,
    description=conf.settings.DESCRIPTION,
    openapi_url="/openapi.json",
    docs_url="/docs",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Set all CORS enabled origins
if conf.settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in conf.settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Log to console if in development
if conf.settings.ENVIRONMENT == "DEV":

    @app.middleware("http")
    async def console_log_requests(request: Request, call_next):
        start_time = time()
        response: Response = await call_next(request)
        process_time = (time() - start_time) * 1000
        console_log.info(f"\tcompleted in {process_time}ms")
        return response


# Log all requests to the application asychronously
# else: Not neccesarry to log in developement, alllowing us to check in public assets dir to github
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time()
    response: Response = await call_next(request)
    process_time = (time() - start_time) * 1000
    await logger.info(
        f"Request: {request.url} completed in {process_time}ms, status code: {response.status_code}"
    )
    return response


app.include_router(api_router)

admin.mount_to(app)


# FIXME: The setup is currently for development, we need to add a production setup
# TODO: Abstract startup & shutdown event defs to conditionally act based on the conf.settings.ENVIRONMENT
@app.on_event("startup")  # noqa
async def startup_event():
    console_log.info("Starting up...")
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


@app.on_event("shutdown")
async def shutdown_event():
    # Cancel crawler scheduler if running
    scheduler_task = getattr(app.state, "crawler_scheduler_task", None)
    if scheduler_task is not None:
        scheduler_task.cancel()
        try:
            await scheduler_task
        except asyncio.CancelledError:
            pass
        console_log.info("Crawler scheduler stopped.")

    # Cancel reaper if running
    reaper_task = getattr(app.state, "reaper_task", None)
    if reaper_task is not None:
        reaper_task.cancel()
        try:
            await reaper_task
        except asyncio.CancelledError:
            pass
        console_log.info("Run reaper stopped.")

    await stop_document_collaboration_server()
    tracemalloc.stop()
    console_log.info("Shutting down...")


@app.get("/")
async def root():
    console_log.info("Root!")
    return {"message": "Hello World!"}
