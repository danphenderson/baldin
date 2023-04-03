# app/main.py
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api import leads, searches, loader
from app.core.db import init_db
from app.logging import console_log as log

def include_routes(application: FastAPI) -> None:
    log.critical(f"Attaching Application Routes: {application.title}")
    application.include_router(leads.router, prefix="/leads", tags=["leads"])
    application.include_router(searches.router, prefix="/searches", tags=["searches"])
    application.include_router(loader.router, prefix="/loader", tags=["loader"])

def create_application() -> FastAPI:
    application = FastAPI(title="baldin", version="0.1.0", tags=["api"])
    include_routes(application)
    return application

app = create_application()

@app.on_event("startup")
async def startup_event():
    log.info("Starting up...")
    init_db(app)


@app.on_event("shutdown")
async def shutdown_event():
    log.info("Shutting down...")
