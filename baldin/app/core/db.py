# app/db.py

from app.core.conf import settings
from app.logging import console_log as log
from fastapi import FastAPI
from tortoise import Tortoise, run_async
from tortoise.contrib.fastapi import register_tortoise
from app.models.tortoise import Lead
from app.etl.models.job import Job
from app.etl.search import search_results



def init_db(app: FastAPI) -> None:
    """
    Initialize the database connection, and register the application with Tortoise ORM.
    """
    log.critical(f"Initializing Tortoise ORM... for {app.title}")
    register_tortoise(
        app,
        db_url=settings.database_url,
        modules={"models": ["app.models.tortoise"]},
        generate_schemas=True,
        add_exception_handlers=True,
    )
    

async def generate_schema() -> None:
    """
    Generate the database schema via Tortoise.
    """
    log.critical("Initializing Tortoise...")
    await Tortoise.init(
        db_url=settings.database_url,
        modules={"models": ["app.models.tortoise"]},
    )
    log.critical("Generating database schema via Tortoise...")
    await Tortoise.generate_schemas()
    await Tortoise.close_connections()


async def load_public_assets() -> None:
    """
    Load the database with datalake data. (This is executed as a background task on the API server.)
    """
    log.info("Loading database with datalake data...")
    res = await search_results()
    for row in res:
        if not row.description or not isinstance(row, Job):
            continue
        try:
            lead = Lead(**row.dict(exclude_unset=True, exclude={"id"}))
            await lead.save()
        except Exception as e:
            log.exception(f"Error creating lead: {e} - {row}")
    log.info("Loading complete.")
    


if __name__ == "__main__":
    log.critical("Running Tortoise schema generator... (__main__))")
    run_async(generate_schema())