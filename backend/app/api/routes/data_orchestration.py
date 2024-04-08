# app/api/routes/data_orchestration.py
import json
from pathlib import Path

import pip
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.responses import RedirectResponse
from pydantic import UUID4
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import (  # noqa
    AsyncSession,
    conf,
    get_async_session,
    get_current_user,
    get_orchestration_event,
    get_orchestration_pipeline,
    models,
    schemas,
)
from app.logging import console_log

router: APIRouter = APIRouter()


@router.get("/pipelines", response_model=list[schemas.OrchestrationPipelineRead])
async def read_orch_pipelines(db: AsyncSession = Depends(get_async_session)):
    rows = await db.execute(select(models.OrchestrationPipeline))
    result = rows.scalars().all()

    if not result:
        raise HTTPException(status_code=404, detail="No ETL pipelines found")
    return result


@router.get("/pipelines/{id}", response_model=schemas.OrchestrationPipelineRead)
async def read_orch_pipeline(
    pipeline: schemas.OrchestrationPipelineRead = Depends(get_orchestration_pipeline),
):
    return pipeline


@router.post("/pipelines", response_model=schemas.OrchestrationPipelineRead)
async def create_orch_pipeline(
    pipeline: schemas.OrchestrationPipelineCreate,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    pipeline_model = models.OrchestrationPipeline(**pipeline.dict())
    db.add(pipeline_model)
    await db.commit()
    await db.refresh(pipeline_model)
    return pipeline_model


@router.put("/pipelines/{id}", response_model=schemas.OrchestrationPipelineRead)
async def update_orch_pipeline(
    id: UUID4,
    pipeline: schemas.OrchestrationPipelineUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    existing_pipeline = await db.get(models.OrchestrationPipeline, id)
    if not existing_pipeline:
        raise HTTPException(status_code=404, detail="No ETL pipeline found")
    for field, value in pipeline:
        setattr(existing_pipeline, field, value)
    await db.commit()
    await db.refresh(existing_pipeline)
    return existing_pipeline


@router.get("/events", response_model=list[schemas.OrchestrationEventRead])
async def read_orch_events(db: AsyncSession = Depends(get_async_session)):
    rows = await db.execute(select(models.OrchestrationEvent))
    result = rows.scalars().all()
    if not result:
        raise HTTPException(status_code=404, detail="No ETL events found")

    processed_result = []
    for event in result:
        # Prepare source_uri and destination_uri
        # Set them to None or provide a default valid object matching the URI schema
        event.source_uri = (
            event.source_uri or None
        )  # Adjust according to your schema requirements
        event.destination_uri = (
            event.destination_uri or None
        )  # Adjust according to your schema requirements
        event.status = (
            event.status or "pending"
        )  # Ensure status is set to a valid string
        # Convert SQLAlchemy model to dictionary and ensure it conforms to the schema
        event_data = jsonable_encoder(event)
        processed_event = schemas.OrchestrationEventRead(**event_data)
        processed_result.append(processed_event)

    return processed_result
    return processed_result


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


@router.post(
    "/events",
    status_code=202,
    response_model=schemas.OrchestrationEventRead,
)
async def create_orch_event(
    event: schemas.OrchestrationEventCreate,
    db: AsyncSession = Depends(get_async_session),
):
    async with db as session:
        event_model = models.OrchestrationEvent(
            **event.dict(), status="pending"  # Ensure status is set to a valid string
        )
        session.add(event_model)
        await session.commit()
        await session.refresh(event_model)

        # Load the pipeline with selectinload to ensure related objects are loaded properly
        pipeline = await session.execute(
            select(models.OrchestrationPipeline)
            .options(selectinload(models.OrchestrationPipeline.orchestration_events))
            .filter_by(id=event.pipeline_id)
        )
        pipeline = pipeline.scalars().first()

        if not pipeline:
            raise HTTPException(status_code=404, detail="Pipeline not found")

        pipeline.orchestration_events.append(event_model)
        await session.commit()

    return event_model
