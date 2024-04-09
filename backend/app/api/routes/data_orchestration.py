# app/api/routes/data_orchestration.py
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
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


@router.delete("/pipelines/{id}")
async def delete_orch_pipeline(
    pipeline: schemas.OrchestrationPipelineRead = Depends(get_orchestration_pipeline),
    db: AsyncSession = Depends(get_async_session),
):
    await db.delete(pipeline)
    await db.commit()
    return {"message": "Pipeline deleted"}


@router.get("/events", response_model=list[schemas.OrchestrationEventRead])
async def read_orch_events(db: AsyncSession = Depends(get_async_session)):
    rows = await db.execute(select(models.OrchestrationEvent))
    result = rows.scalars().all()
    if not result:
        raise HTTPException(status_code=404, detail="No ETL events found")

    processed_result = []
    for event in result:
        # Parse source_uri and destination_uri from JSON string to dictionary
        source_uri = json.loads(event.source_uri) if event.source_uri else None
        destination_uri = (
            json.loads(event.destination_uri) if event.destination_uri else None
        )

        event_data = jsonable_encoder(event)
        # Update the event_data with parsed URIs
        event_data.update(
            {"source_uri": source_uri, "destination_uri": destination_uri}
        )

        processed_event = schemas.OrchestrationEventRead(**event_data)
        processed_result.append(processed_event)

    return processed_result


@router.get(
    "/events/{id}", status_code=202, response_model=schemas.OrchestrationEventRead
)
async def read_orch_event(
    event: schemas.OrchestrationEventRead = Depends(get_orchestration_event),
):
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


@router.put(
    "/events/{id}",
    status_code=202,
    response_model=schemas.OrchestrationEventRead,
)
async def update_orch_event(
    id: UUID4,
    event: schemas.OrchestrationEventUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    async with db as session:
        existing_event = await session.get(models.OrchestrationEvent, id)
        if not existing_event:
            raise HTTPException(status_code=404, detail="Event not found")
        for field, value in event:
            setattr(existing_event, field, value)
        await session.commit()
        await session.refresh(existing_event)
        return existing_event
