# Path: app/main.py

"""
Main FastAPI app instance declaration and admin interface setup.
"""

import logging
import tracemalloc
from time import time

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette_admin.contrib.sqla import Admin
from starlette_admin.contrib.sqla.ext.pydantic import ModelView
from starlette_admin.views import DropDown, Link

from app.api.api import api_router
from app.core import conf
from app.core.db import async_engine, create_db_and_tables
from app.core.security import create_default_superuser
from app.logging import console_log, get_async_logger
from app.models import (
    Application,
    Certificate,
    Company,
    Contact,
    Experience,
    Extractor,
    ExtractorExample,
    Lead,
    OrchestrationEvent,
    OrchestrationPipeline,
    Resume,
    Skill,
    User,
)
from app.schemas import (
    ApplicationCreate,
    CertificateCreate,
    CompanyCreate,
    ContactCreate,
    ExperienceCreate,
    ExtractorCreate,
    ExtractorExampleCreate,
    LeadCreate,
    OrchestrationEventCreate,
    OrchestrationPipelineCreate,
    ResumeCreate,
    SkillCreate,
    UserCreate,
)

# Setup basic logging
logging.basicConfig()
logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)
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
    await logger.info(
        f"Request: {request.url} completed in {process_time}ms, status code: {response.status_code}"
    )
    return response


app.include_router(api_router)

# Admin setup
admin = Admin(async_engine, title="Baldin Admin Interface")
admin.add_view(ModelView(User, pydantic_model=UserCreate))
admin.add_view(
    ModelView(OrchestrationPipeline, pydantic_model=OrchestrationPipelineCreate)
)
admin.add_view(ModelView(Extractor, pydantic_model=ExtractorCreate))
admin.add_view(ModelView(Lead, pydantic_model=LeadCreate))
admin.add_view(ModelView(Company, pydantic_model=CompanyCreate))
admin.add_view(ModelView(Application, pydantic_model=ApplicationCreate))
admin.add_view(ModelView(Resume, pydantic_model=ResumeCreate))
admin.add_view(ModelView(Skill, pydantic_model=SkillCreate))
admin.add_view(ModelView(Experience, pydantic_model=ExperienceCreate))
admin.add_view(ModelView(OrchestrationEvent, pydantic_model=OrchestrationEventCreate))
admin.add_view(ModelView(ExtractorExample, pydantic_model=ExtractorExampleCreate))
admin.add_view(ModelView(Certificate, pydantic_model=CertificateCreate))
admin.add_view(ModelView(Contact, pydantic_model=ContactCreate))

# DropDown
admin.add_view(
    DropDown(
        "Useful Links",
        icon="fa fa-link",
        views=[
            Link("Swagger Docs", url="http://127.0.0.1:8004/docs", target="_blank"),
            Link("Baldin Frontend", url="http://localhost:3000/", target="_blank"),
        ],
    )
)
admin.mount_to(app)

# FIXME: The setup is currently for development, we need to add a production setup
# TODO: Abstract startup & shutdown event defs to conditionally act based on the conf.settings.ENVIRONMENT
@app.on_event("startup")  # noqa
async def startup_event():
    console_log.info("Starting up...")
    await create_db_and_tables()
    await create_default_superuser()
    tracemalloc.start()


@app.on_event("shutdown")
async def shutdown_event():
    console_log.info("Shutting down...")
    tracemalloc.stop()


@app.get("/")
async def root():
    console_log.info("Root!")
    return {"message": "Hello World!"}
