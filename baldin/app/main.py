# app/main.py

import logging


from fastapi import FastAPI
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.requests import Request

from app.api import leads, searches
from app.db import init_db, generate_schema
from app.utils import openfile

templates = Jinja2Templates(directory="templates")

log = logging.getLogger("uvicorn")


def include_routes(application: FastAPI) -> None:
    log.critical(f"Attaching Application Routes: {application.title}")
    application.include_router(leads.router, prefix="/leads", tags=["leads"])
    application.include_router(searches.router, prefix="/searches", tags=["searches"])

def mount_static_assets(application: FastAPI) -> None:
    log.critical(f"Mounting Application Assets: {application.title}")
    application.mount("/static", StaticFiles(directory="static", html=True), name="static")

def create_application() -> FastAPI:
    application = FastAPI(title="baldin", version="0.1.0")
    include_routes(application)
    mount_static_assets(application)
    return application


app = create_application()


@app.on_event("startup")
async def startup_event():
    log.info("Starting up...")
    init_db(app)


@app.on_event("shutdown")
async def shutdown_event():
    log.info("Shutting down...")


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    data = openfile("home.md")
    return templates.TemplateResponse("page.html", {"request": request, "data": data})


@app.get("/page/{page_name}", response_class=HTMLResponse)
async def show_page(request: Request, page_name: str):
    data = openfile(page_name+".md")
    return templates.TemplateResponse(f"page.html", {"request": request, "data": data})
