# app/api/routes/data_orchestration.py

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import UUID4
from sqlalchemy import delete, desc, func, select
from sqlalchemy.orm import selectinload

from app.api.deps import (  # noqa
    AsyncSession,
    create_orchestration_pipeline,
    get_async_session,
    get_current_superuser,
    get_current_user,
    get_orchestration_event,
    get_orchestration_pipeline,
    models,
    schemas,
    update_orchestration_event_for_current_user,
)
from app.core.datetime_utils import now_utc_naive
from app.core.document_storage import remove_extractor_run_source_files
from app.core.extractor_retry import get_extractor_event_file_source_paths

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
    pipeline_model = await create_orchestration_pipeline(pipeline, user, db)
    return await get_orchestration_pipeline(pipeline_model.id, db, user)


@router.patch("/pipelines/{id}", response_model=schemas.OrchestrationPipelineRead)
async def update_orch_pipeline(
    payload: schemas.OrchestrationPipelineUpdate,
    pipeline: models.OrchestrationPipeline = Depends(get_orchestration_pipeline),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    for field, value in payload.model_dump(
        exclude_unset=True, exclude={"events"}
    ).items():
        setattr(pipeline, field, value)
    await db.commit()
    return await get_orchestration_pipeline(pipeline.id, db, user)


@router.delete("/pipelines/{id}", status_code=204)
async def delete_orch_pipeline(
    pipeline: models.OrchestrationPipeline = Depends(get_orchestration_pipeline),
    db: AsyncSession = Depends(get_async_session),
):
    event_count_result = await db.execute(
        select(func.count())
        .select_from(models.OrchestrationEvent)
        .where(models.OrchestrationEvent.pipeline_id == pipeline.id)
    )
    event_count = event_count_result.scalar() or 0
    if event_count > 0:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Cannot delete workflow with {event_count} existing "
                f"run{'s' if event_count != 1 else ''}. "
                "Delete all runs first."
            ),
        )
    await db.delete(pipeline)
    await db.commit()
    return None


@router.get("/events", response_model=schemas.OrchestrationEventPaginatedRead)
async def read_orch_events(
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
    status: schemas.OrchestrationEventStatusType | None = Query(
        None, description="Filter by run status"
    ),
    pipeline_id: str | None = Query(None, description="Filter by workflow ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
):
    base = (
        select(models.OrchestrationEvent)
        .join(models.OrchestrationPipeline)
        .where(models.OrchestrationPipeline.user_id == user.id)
    )

    if status is not None:
        base = base.where(models.OrchestrationEvent.status == status.value)
    if pipeline_id is not None:
        base = base.where(models.OrchestrationEvent.pipeline_id == pipeline_id)

    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar() or 0

    rows = await db.execute(
        base.order_by(desc(models.OrchestrationEvent.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .options(selectinload(models.OrchestrationEvent.orchestration_pipeline))
    )
    items = rows.scalars().all()

    return schemas.OrchestrationEventPaginatedRead(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.delete("/events/prune", dependencies=[Depends(get_current_superuser)])
async def prune_orchestration_events(
    older_than_days: int = Query(
        30, ge=1, description="Delete events older than N days"
    ),
    db: AsyncSession = Depends(get_async_session),
):
    """Delete completed/failed orchestration events older than the specified age."""
    cutoff = now_utc_naive() - timedelta(days=older_than_days)
    result = await db.execute(
        select(models.OrchestrationEvent).where(
            models.OrchestrationEvent.status.in_(["success", "failure"]),
            models.OrchestrationEvent.created_at < cutoff,
        )
    )
    events = result.scalars().all()
    event_ids = [event.id for event in events]
    stored_source_paths: list[str] = []
    for event in events:
        stored_source_paths.extend(get_extractor_event_file_source_paths(event.payload))

    deleted_count = 0
    if event_ids:
        delete_result = await db.execute(
            delete(models.OrchestrationEvent).where(
                models.OrchestrationEvent.id.in_(event_ids)
            )
        )
        deleted_count = delete_result.rowcount or 0

    await db.commit()
    remove_extractor_run_source_files(stored_source_paths)
    return {"deleted": deleted_count}


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
    event_model = models.OrchestrationEvent(**event.model_dump())
    db.add(event_model)
    await db.commit()
    await db.refresh(event_model)
    return event_model


@router.patch(
    "/events/{id}",
    status_code=202,
    response_model=schemas.OrchestrationEventRead,
)
async def update_orch_event(
    event: models.OrchestrationEvent = Depends(
        update_orchestration_event_for_current_user
    ),
):
    return event


@router.post(
    "/events/{event_id}/retry",
    status_code=202,
    response_model=schemas.OrchestrationEventRead,
)
async def retry_orch_event(
    event_id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    """Retry a failed orchestration event by creating a new event linked to the original."""
    event = await db.get(models.OrchestrationEvent, event_id)
    if not event:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")
    if event.status != "failure":
        raise HTTPException(
            status_code=409,
            detail=f"Cannot retry event with status '{event.status}'. Must be 'failure'.",
        )

    # Check ownership via pipeline
    if event.pipeline_id:
        pipeline = await db.get(models.OrchestrationPipeline, event.pipeline_id)
        if pipeline and str(pipeline.user_id) != str(user.id):
            raise HTTPException(status_code=403, detail="Not your pipeline")

    # Prevent double-retry
    existing = await db.execute(
        select(models.OrchestrationEvent).where(
            models.OrchestrationEvent.retry_of_id == event_id,
            models.OrchestrationEvent.status.in_(
                ["pending", "running", "pending_review"]
            ),
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="An active retry already exists.")

    new_event = models.OrchestrationEvent(
        status="pending",
        message=f"Retry of event {event_id}",
        payload=event.payload,
        environment=event.environment,
        source_uri=event.source_uri,
        destination_uri=event.destination_uri,
        pipeline_id=event.pipeline_id,
        version_hash=event.version_hash,
        retry_of_id=event.id,
    )
    db.add(new_event)
    await db.commit()
    await db.refresh(new_event)
    return new_event
