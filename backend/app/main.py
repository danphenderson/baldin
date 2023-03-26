# project/app/main.py


import logging

from fastapi import FastAPI

from app.api import leads
from app.db import init_db


log = logging.getLogger("uvicorn")


def create_application() -> FastAPI:
    application = FastAPI()
    application.include_router(leads.router, prefix="/leads", tags=["leads"])

    return application


app = create_application()


@app.on_event("startup")
async def startup_event():
    log.info("Starting up...")
    init_db(app)


@app.on_event("shutdown")
async def shutdown_event():
    log.info("Shutting down...")