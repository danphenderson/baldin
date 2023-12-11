# app/api/routes/etl.py
import json
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import UUID4
from sqlalchemy import select

from app.api.deps import (  # noqa
    AsyncSession,
    conf,
    get_async_session,
    get_orchestration_event,
    models,
    schemas,
)
from app.logging import console_log

router: APIRouter = APIRouter()


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
    for row in result:
        row.source_uri = json.loads(getattr(row, "source_uri"))
        row.destination_uri = json.loads(getattr(row, "destination_uri"))

    if not result:
        raise HTTPException(status_code=404, detail="No ETL events found")
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


@router.get(
    "/events/{id}", status_code=202, response_model=schemas.OrchestrationEventRead
)
async def read_orch_event(id: UUID4, db: AsyncSession = Depends(get_async_session)):
    event = await get_orchestration_event(id, db)
    event.source_uri = json.loads(
        getattr(event, "source_uri")
    )  # Deserialize into URI object
    event.destination_uri = json.loads(
        getattr(event, "destination_uri")
    )  # Deserialize into URI object
    return event
