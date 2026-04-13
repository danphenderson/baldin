"""
Internal-only FastAPI app for the ETL crawler execution service.
"""

from fastapi import FastAPI

from app.core import conf
from app.core.sentry import init_sentry
from app.etl_service.router import router as etl_service_router

init_sentry()

app = FastAPI(
    title=f"{conf.settings.PROJECT_NAME.title()} ETL Service",
    version=conf.settings.VERSION,
    description="Internal crawler execution boundary for Baldin ETL jobs.",
    docs_url="/docs",
)


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(etl_service_router)
