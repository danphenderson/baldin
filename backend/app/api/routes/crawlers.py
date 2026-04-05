# app/api/routes/crawlers.py

from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import UUID4
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_async_session, get_current_superuser, models, schemas

router = APIRouter(dependencies=[Depends(get_current_superuser)])


@router.post("/pipelines", response_model=schemas.CrawlerPipelineRead)
async def create_crawler_pipeline(
    payload: schemas.CrawlerPipelineCreate,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_superuser),
):
    from app.api.deps import create_crawler_pipeline as _create

    pipeline = await _create(payload, user, db)
    return pipeline


@router.get("/pipelines", response_model=list[schemas.CrawlerPipelineRead])
async def list_crawler_pipelines(
    db: AsyncSession = Depends(get_async_session),
):
    from app.api.deps import list_crawler_pipelines as _list

    return await _list(db)


@router.get("/pipelines/{pipeline_id}", response_model=schemas.CrawlerPipelineRead)
async def get_crawler_pipeline(
    pipeline_id: UUID4,
    db: AsyncSession = Depends(get_async_session),
):
    from app.api.deps import get_crawler_pipeline as _get

    return await _get(pipeline_id, db)


@router.patch("/pipelines/{pipeline_id}", response_model=schemas.CrawlerPipelineRead)
async def update_crawler_pipeline(
    pipeline_id: UUID4,
    payload: schemas.CrawlerPipelineUpdate,
    db: AsyncSession = Depends(get_async_session),
):
    from app.api.deps import get_crawler_pipeline as _get
    from app.api.deps import update_crawler_pipeline as _update

    pipeline = await _get(pipeline_id, db)
    return await _update(pipeline, payload, db)


@router.post("/pipelines/{pipeline_id}/runs", response_model=schemas.CrawlerRunRead)
async def trigger_crawler_run(
    pipeline_id: UUID4,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
    user=Depends(get_current_superuser),
):
    from app.api.deps import create_crawler_run as _create_run
    from app.api.deps import execute_crawler_run_background
    from app.api.deps import get_crawler_pipeline as _get

    pipeline = await _get(pipeline_id, db)
    run = await _create_run(pipeline, "manual", db)
    background_tasks.add_task(execute_crawler_run_background, run.id, user.id)
    return run


@router.get("/runs", response_model=list[schemas.CrawlerRunRead])
async def list_crawler_runs(
    db: AsyncSession = Depends(get_async_session),
    source: str | None = Query(None, description="Filter by pipeline source"),
    status: str | None = Query(None, description="Filter by run status"),
    pipeline_id: UUID4 | None = Query(None, description="Filter by pipeline ID"),
    trigger_type: str | None = Query(None, description="Filter by trigger type"),
):
    query = select(models.CrawlerRun)

    if pipeline_id is not None:
        query = query.where(models.CrawlerRun.crawler_pipeline_id == pipeline_id)
    if status is not None:
        query = query.where(models.CrawlerRun.status == status)
    if trigger_type is not None:
        query = query.where(models.CrawlerRun.trigger_type == trigger_type)
    if source is not None:
        query = query.join(models.CrawlerPipeline).where(
            models.CrawlerPipeline.source == source
        )

    query = query.order_by(models.CrawlerRun.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/runs/{run_id}", response_model=schemas.CrawlerRunDetailRead)
async def get_crawler_run(
    run_id: UUID4,
    db: AsyncSession = Depends(get_async_session),
):
    from app.api.deps import _find_orchestration_event_for_run
    from app.api.deps import get_crawler_run as _get

    run = await _get(run_id, db)
    event = await _find_orchestration_event_for_run(run_id, db)
    events = []
    if event is not None:
        events.append(
            schemas.OrchestrationEventSummary(
                status=event.status,
                message=event.message,
                created_at=event.created_at,
            )
        )
    # Build the detail response by converting the ORM run and attaching events
    run_data = schemas.CrawlerRunRead.model_validate(run, from_attributes=True)
    return schemas.CrawlerRunDetailRead(**run_data.model_dump(), events=events)


@router.post("/runs/{run_id}/cancel", response_model=schemas.CrawlerRunRead)
async def cancel_crawler_run(
    run_id: UUID4,
    db: AsyncSession = Depends(get_async_session),
):
    from app.api.deps import get_crawler_run as _get

    run = await _get(run_id, db)
    if run.status not in ("pending", "running"):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot cancel run with status '{run.status}'. Must be 'pending' or 'running'.",
        )
    run.status = "cancelled"
    if not run.finished_at:
        run.finished_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(run)
    return run


@router.post("/runs/{run_id}/pause", response_model=schemas.CrawlerRunRead)
async def pause_crawler_run(
    run_id: UUID4,
    db: AsyncSession = Depends(get_async_session),
):
    from app.api.deps import get_crawler_run as _get

    run = await _get(run_id, db)
    if run.status != "running":
        raise HTTPException(
            status_code=409,
            detail=f"Cannot pause run with status '{run.status}'. Must be 'running'.",
        )
    run.status = "paused"
    await db.commit()
    await db.refresh(run)
    return run


@router.post("/runs/{run_id}/resume", response_model=schemas.CrawlerRunRead)
async def resume_crawler_run(
    run_id: UUID4,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
    user=Depends(get_current_superuser),
):
    from app.api.deps import execute_crawler_run_background
    from app.api.deps import get_crawler_run as _get

    run = await _get(run_id, db)
    if run.status != "paused":
        raise HTTPException(
            status_code=409,
            detail=f"Cannot resume run with status '{run.status}'. Must be 'paused'.",
        )
    run.status = "running"
    await db.commit()
    await db.refresh(run)
    background_tasks.add_task(execute_crawler_run_background, run.id, user.id)
    return run
