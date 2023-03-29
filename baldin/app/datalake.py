
# app/datalake.py


from app.models.tortoise import Lead, Loader
from app.logging import get_async_logger

from app.etl.models.job import Job
from app.etl.search import search_results

log = get_async_logger(__name__)

async def load(loader_id: int) -> None:
    """
    Load the database with datalake data. (This is executed as a background task on the API server.)
    """
    await log.info("Loading database with datalake data...")
    res = await search_results()
    for row in res:
        if not row.description or not isinstance(row, Job):
            continue
        try:
            lead = Lead(**row.dict(exclude_unset=True, exclude={"id"}))
            await lead.save()
            await log.debug(f"Created lead: {lead}")
        except Exception as e:
            await log.error(f"Error creating lead: {e} - {row}")
    await log.info("Loading complete.")
    await Loader.filter(id=loader_id).update(status="complete")
    