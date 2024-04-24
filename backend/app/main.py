# app/main.py

"""
Main FastAPI app instance declaration
"""


import tracemalloc
from time import time
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.api.api import api_router
from app.core import conf
from app.core.db import create_db_and_tables
from app.core.security import create_default_superuser
from app.logging import get_async_logger, console_log

logger = get_async_logger(__name__)

app = FastAPI(
    title=conf.settings.PROJECT_NAME,
    version=conf.settings.VERSION,
    description=conf.settings.DESCRIPTION,
    openapi_url="/openapi.json",
    docs_url="/docs",
)

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
    await logger.info(f"Request: {request.url} completed in {process_time}ms, status code: {response.status_code}")
    return response

app.include_router(api_router)



# FIXME: The setup is currently for development, we need to add a production setup
# TODO: Abstract startup & shutdown event defs to conditionally act based on the conf.settings.ENVIRONMENT
@app.on_event("startup")
async def startup_event():
    console_log.info("Starting up...")
    await create_db_and_tables()
    await create_default_superuser()
    tracemalloc.start()


@app.on_event("shutdown")
async def shutdown_event():
    console_log.info("Shutting down...")
    tracemalloc.stop()


@app.get("/ping")
async def pong():
    console_log.info("Pong!")
    return {"message": "success!"}


@app.get("/")
async def root():
    console_log.info("Root!")
    return {"message": "Hello World!"}
