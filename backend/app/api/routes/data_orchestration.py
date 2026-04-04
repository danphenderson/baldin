# app/api/routes/data_orchestration.py

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import (  # noqa
    AsyncSession,
    get_async_session,
    get_current_user,
    get_orchestration_event,
    get_orchestration_pipeline,
    models,
    schemas,
)

router: APIRouter = APIRouter()


@router.get("/pipelines", response_model=list[schemas.OrchestrationPipelineRead])
async def read_orch_pipelines(
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    rows = await db.execute(
        select(models.OrchestrationPipeline)
        .where(models.OrchestrationPipeline.user_id == user.id)
        .options(selectinload(models.OrchestrationPipeline.orchestration_events))
    )
    result = rows.scalars().all()
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
    pipeline_model = models.OrchestrationPipeline(**pipeline.dict(), user_id=user.id)
    db.add(pipeline_model)
    await db.commit()
    return await get_orchestration_pipeline(pipeline_model.id, db, user)


@router.put("/pipelines/{id}", response_model=schemas.OrchestrationPipelineRead)
async def update_orch_pipeline(
    payload: schemas.OrchestrationPipelineUpdate,
    pipeline: models.OrchestrationPipeline = Depends(get_orchestration_pipeline),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    for field, value in payload.dict(exclude_unset=True, exclude={"events"}).items():
        setattr(pipeline, field, value)
    await db.commit()
    return await get_orchestration_pipeline(pipeline.id, db, user)


@router.delete("/pipelines/{id}", status_code=204)
async def delete_orch_pipeline(
    pipeline: schemas.OrchestrationPipelineRead = Depends(get_orchestration_pipeline),
    db: AsyncSession = Depends(get_async_session),
):
    await db.delete(pipeline)
    await db.commit()
    return None


@router.get("/events", response_model=list[schemas.OrchestrationEventRead])
async def read_orch_events(
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    rows = await db.execute(
        select(models.OrchestrationEvent)
        .join(models.OrchestrationPipeline)
        .where(models.OrchestrationPipeline.user_id == user.id)
        .options(selectinload(models.OrchestrationEvent.orchestration_pipeline))
    )
    result = rows.scalars().all()
    return result


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
    user: schemas.UserRead = Depends(get_current_user),
):
    await get_orchestration_pipeline(event.pipeline_id, db, user)
    event_model = models.OrchestrationEvent(**event.dict())
    db.add(event_model)
    await db.commit()
    await db.refresh(event_model)
    return event_model


@router.put(
    "/events/{id}",
    status_code=202,
    response_model=schemas.OrchestrationEventRead,
)
async def update_orch_event(
    payload: schemas.OrchestrationEventUpdate,
    event: schemas.OrchestrationEventRead = Depends(get_orchestration_event),
    db: AsyncSession = Depends(get_async_session),
):
    for field, value in payload.dict(exclude_unset=True, exclude_defaults=True).items():
        setattr(event, field, value)
    await db.commit()
    await db.refresh(event)
    return event
