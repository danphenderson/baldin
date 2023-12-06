# app/api/etl.py

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import models, schemas
from app.api.deps import execute_leads_etl, get_async_session, get_etl_event

router: APIRouter = APIRouter()


@router.get("/events/{id}", status_code=202, response_model=schemas.ETLEventRead)
async def read_etl_event(id: UUID4, etl_event=Depends(get_etl_event)):
    """
    Read an ETL event.
    """
    return etl_event


@router.get("/events", response_model=list[schemas.ETLEventRead])
async def read_etl_events(db=Depends(get_async_session)):
    """
    Read all ETL events.
    """
    rows = await db.execute(select(models.ETLEvent))
    result = rows.scalars().all()
    if not result:
        raise HTTPException(status_code=404, detail="No ETL events found")
    return result


# Begin Region: ETL routes
#   Currently, the only ETL route loads leads from PUBLIC_ASSETS_DIR


@router.post("/leads", status_code=202, response_model=UUID4)
async def leads_etl_event(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
) -> UUID4:

    etl_event = models.ETLEvent(**{"job_name": "leads", "status": "posted"})

    db.add(etl_event)
    await db.commit()
    await db.refresh(etl_event)

    # Use background_tasks to execute the ETL pipeline
    background_tasks.add_task(execute_leads_etl, etl_event.id)  # type: ignore

    return etl_event.id  # type: ignore


# End Region: ETL routes
