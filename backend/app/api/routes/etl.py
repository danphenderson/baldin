# app/api/routes/etl.py

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import select

from app.api.deps import (
    AsyncSession,
    get_async_session,
    get_etl_event,
    models,
    schemas,
)

router: APIRouter = APIRouter()

@router.get("/events/{id}", status_code=202, response_model=schemas.ETLEventRead)
async def read_etl_event(
    etl_event: schemas.ETLEventRead = Depends(get_etl_event)
):
    return etl_event


@router.get("/events", response_model=list[schemas.ETLEventRead])
async def read_etl_events(
    db: AsyncSession = Depends(get_async_session)
):
    rows = await db.execute(select(models.ETLEvent))
    result = rows.scalars().all()
    if not result:
        raise HTTPException(status_code=404, detail="No ETL events found")
    return result


# TODO: this will be a service.
@router.post("/leads", status_code=202, response_model=UUID4)
async def load_leads_from_data_lake(
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

