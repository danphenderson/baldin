# app/api/routes/etl.py
import json
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import select

from app.api.deps import (
    AsyncSession,
    conf,
    database_load,
    execute_leads_enrichment,
    execute_load_leads,
    get_async_session,
    get_orchestration_event,
    models,
    schemas,
)

from app.logging import console_log

router: APIRouter = APIRouter()

@router.post("/run", status_code=202, response_model=schemas.OrchestrationEventRead)
async def create_orch_event(
    orch_event: schemas.OrchestrationEventCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
):
    # Serialization when creating a new event
    event_dict = orch_event.dict()
    event_dict['source_uri'] = json.dumps(event_dict['source_uri'])
    event_dict['destination_uri'] = json.dumps(event_dict['destination_uri'])
    event = models.OrchestrationEvent(**event_dict)

    # Create orchestration event
    db.add(event)
    await db.commit()
    await db.refresh(event)

    # Determine which ETL process to run
    pipeline = globals().get(getattr(event, "job_name"))

    if pipeline is None or not callable(pipeline):
        raise HTTPException(
            status_code=404, detail=f"Job name {orch_event.job_name} not found"
        )

    console_log.info(f"Running {orch_event.job_name} ETL pipeline: {event.id}")

    # # Run orchestration pipeline in the background
    background_tasks.add_task(pipeline, event.id)

    event.source_uri = json.loads(getattr(event, "source_uri"))  # Deserialize into URI object
    event.destination_uri = json.loads(getattr(event, "destination_uri"))
    return event

@router.get(
    "/events/{id}", status_code=202, response_model=schemas.OrchestrationEventRead
)
async def read_orch_event(
    id: UUID4, db: AsyncSession = Depends(get_async_session)
):
    event = await get_orchestration_event(id, db)
    event.source_uri = json.loads(getattr(event, "source_uri"))  # Deserialize into URI object
    event.destination_uri = json.loads(getattr(event, "destination_uri"))  # Deserialize into URI object
    return event

@router.get("/events", response_model=list[schemas.OrchestrationEventRead])
async def read_orch_events(db: AsyncSession = Depends(get_async_session)):
    rows = await db.execute(select(models.OrchestrationEvent))
    result = rows.scalars().all()

    for row in result:
        row.source_uri = json.loads(getattr(row, "source_uri"))
        row.destination_uri = json.loads(getattr(row, "destination_uri"))

    if not result:
        raise HTTPException(status_code=404, detail="No ETL events found")
    return result


@router.get("/events/success", response_model=list[schemas.OrchestrationEventRead])
async def read_successful_orch_events(db: AsyncSession = Depends(get_async_session)):
    rows = await db.execute(
        select(models.OrchestrationEvent).filter(
            models.OrchestrationEvent.status == "success"
        )
    )
    result = rows.scalars().all()
    if not result:
        raise HTTPException(status_code=404, detail="No successful ETL events found")

    for event in result:
        event.source_uri = json.loads(getattr(event, "source_uri"))
        event.destination_uri = json.loads(getattr(event, "destination_uri"))
    return result


@router.get("/events/failure", response_model=list[schemas.OrchestrationEventRead])
async def read_failed_orch_events(db: AsyncSession = Depends(get_async_session)):
    rows = await db.execute(
        select(models.OrchestrationEvent).filter(
            models.OrchestrationEvent.status == "failure"
        )
    )
    result = rows.scalars().all()
    if not result:
        raise HTTPException(status_code=404, detail="No failed ETL events found")
    return result
