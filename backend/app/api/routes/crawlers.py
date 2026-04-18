# app/api/routes/crawlers.py

from datetime import timedelta

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from pydantic import UUID4
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import (
    get_async_session,
    get_capped_pagination_params,
    get_current_superuser,
    models,
    schemas,
)
from app.core import conf
from app.core.datetime_utils import now_utc_naive
from app.core.rate_limit import limiter
from app.crawler_queue import get_queue_backlog, get_queue_health
from app.run_reaper import STALE_TIMEOUT_MINUTES

router = APIRouter(dependencies=[Depends(get_current_superuser)])


async def _get_etl_service_health() -> tuple[bool, str | None]:
    url = f"{conf.settings.ETL_SERVICE_URL.rstrip('/')}/health"
    timeout = min(conf.settings.ETL_SERVICE_TIMEOUT_SECONDS, 5.0)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url)
        if response.status_code != 200:
            return False, f"ETL healthcheck returned {response.status_code}"
        return True, None
    except Exception as exc:
        return False, str(exc)


@router.post("/pipelines", response_model=schemas.CrawlerPipelineRead)
@limiter.limit("10/minute")
async def create_crawler_pipeline(
    request: Request,
    payload: schemas.CrawlerPipelineCreate,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_superuser),
):
    del request
    from app.api.deps import create_crawler_pipeline as _create

    return await _create(payload, user, db)


@router.get(
    "/pipelines", response_model=schemas.PaginatedResponse[schemas.CrawlerPipelineRead]
)
async def list_crawler_pipelines(
    db: AsyncSession = Depends(get_async_session),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=schemas.PAGINATION_MAX_PAGE_SIZE),
):
    count_result = await db.execute(
        select(func.count()).select_from(models.CrawlerPipeline)
    )
    total = count_result.scalar_one()
    offset = (page - 1) * page_size
    result = await db.execute(
        select(models.CrawlerPipeline)
        .options(selectinload(models.CrawlerPipeline.runs))
        .order_by(models.CrawlerPipeline.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    return schemas.PaginatedResponse[schemas.CrawlerPipelineRead](
        items=list(result.scalars().all()),
        total=total,
        page=page,
        page_size=page_size,
    )


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
@limiter.limit("3/minute")
async def trigger_crawler_run(
    pipeline_id: UUID4,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_superuser),
):
    del request
    from app.api.deps import create_crawler_run as _create_run
    from app.api.deps import get_crawler_pipeline as _get
    from app.api.deps import schedule_crawler_run_execution

    pipeline = await _get(pipeline_id, db)
    run = await _create_run(pipeline, "manual", db)
    await schedule_crawler_run_execution(
        run.id,
        user.id,
        background_tasks=background_tasks,
    )
    return run


@router.get("/runs", response_model=schemas.CrawlerRunsPaginatedRead)
async def list_crawler_runs(
    db: AsyncSession = Depends(get_async_session),
    pagination: schemas.Pagination = Depends(get_capped_pagination_params),
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

    total_result = await db.execute(
        select(func.count()).select_from(query.order_by(None).subquery())
    )
    total = total_result.scalar_one()

    offset = (pagination.page - 1) * pagination.page_size
    result = await db.execute(
        query.order_by(models.CrawlerRun.created_at.desc())
        .offset(offset)
        .limit(pagination.page_size)
    )
    return schemas.CrawlerRunsPaginatedRead(
        items=result.scalars().all(),
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/runtime-status", response_model=schemas.CrawlerRuntimeStatusRead)
async def get_crawler_runtime_status(
    db: AsyncSession = Depends(get_async_session),
):
    queue_configured, queue_reachable, queue_detail = await get_queue_health()
    queue_backlog = None
    if queue_reachable:
        try:
            queue_backlog = await get_queue_backlog()
        except Exception:
            queue_detail = queue_detail or "Backlog inspection failed"
    etl_reachable, etl_detail = await _get_etl_service_health()

    stale_cutoff = now_utc_naive() - timedelta(minutes=STALE_TIMEOUT_MINUTES)
    stale_runs_result = await db.execute(
        select(func.count())
        .select_from(models.CrawlerRun)
        .where(
            models.CrawlerRun.status.in_(
                [models.CrawlerRunStatus.PENDING, models.CrawlerRunStatus.RUNNING]
            ),
            models.CrawlerRun.created_at < stale_cutoff,
        )
    )
    stale_events_result = await db.execute(
        select(func.count())
        .select_from(models.OrchestrationEvent)
        .where(
            models.OrchestrationEvent.status.in_(["pending", "running"]),
            models.OrchestrationEvent.created_at < stale_cutoff,
        )
    )
    recent_events_result = await db.execute(
        select(models.OrchestrationEvent)
        .where(models.OrchestrationEvent.payload.is_not(None))
        .order_by(models.OrchestrationEvent.created_at.desc())
        .limit(100)
    )

    recent_enqueue_failures: list[schemas.CrawlerEnqueueFailureSampleRead] = []
    enqueue_failure_count = 0
    for event in recent_events_result.scalars():
        payload = event.payload or {}
        failures = payload.get("enqueue_failures") or []
        if not failures:
            continue
        enqueue_failure_count += int(
            payload.get("enqueue_failure_count", len(failures))
        )
        run_id = payload.get("crawler_run_id")
        for failure in failures:
            recorded_at = failure.get("recorded_at") or event.created_at
            recent_enqueue_failures.append(
                schemas.CrawlerEnqueueFailureSampleRead(
                    run_id=run_id,
                    created_at=recorded_at,
                    fallback_mode=failure.get("fallback_mode", "unknown"),
                    error_summary=failure.get(
                        "error_summary", "Unknown enqueue failure"
                    ),
                )
            )

    recent_enqueue_failures.sort(key=lambda item: item.created_at, reverse=True)

    return schemas.CrawlerRuntimeStatusRead(
        execution_mode=conf.settings.CRAWLER_EXECUTION_MODE,
        scheduler_enabled=conf.settings.SHOULD_RUN_CRAWLER_SCHEDULER,
        reaper_enabled=conf.settings.SHOULD_RUN_REAPER,
        redis=schemas.CrawlerRuntimeDependencyRead(
            configured=queue_configured,
            reachable=queue_reachable,
            detail=queue_detail,
        ),
        etl_service=schemas.CrawlerRuntimeDependencyRead(
            configured=True,
            reachable=etl_reachable,
            detail=etl_detail,
        ),
        queue_backlog=queue_backlog,
        stale_run_count=int(stale_runs_result.scalar_one()),
        stale_event_count=int(stale_events_result.scalar_one()),
        enqueue_failure_count=enqueue_failure_count,
        recent_enqueue_failures=recent_enqueue_failures[:5],
    )


@router.delete("/runs/prune", dependencies=[Depends(get_current_superuser)])
async def prune_crawler_runs(
    older_than_days: int = Query(30, ge=1, description="Delete runs older than N days"),
    db: AsyncSession = Depends(get_async_session),
):
    """Delete completed or terminal crawler runs older than the specified age."""
    cutoff = now_utc_naive() - timedelta(days=older_than_days)
    result = await db.execute(
        delete(models.CrawlerRun).where(
            models.CrawlerRun.status.in_(["success", "failed", "cancelled"]),
            models.CrawlerRun.created_at < cutoff,
        )
    )
    await db.commit()
    return {"deleted": result.rowcount}


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
        run.finished_at = now_utc_naive()
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
    user: schemas.UserRead = Depends(get_current_superuser),
):
    from app.api.deps import get_crawler_run as _get
    from app.api.deps import schedule_crawler_run_execution

    run = await _get(run_id, db)
    if run.status != "paused":
        raise HTTPException(
            status_code=409,
            detail=f"Cannot resume run with status '{run.status}'. Must be 'paused'.",
        )
    run.status = "running"
    await db.commit()
    await db.refresh(run)
    await schedule_crawler_run_execution(
        run.id,
        user.id,
        background_tasks=background_tasks,
    )
    return run


@router.post("/runs/{run_id}/retry", response_model=schemas.CrawlerRunRead)
async def retry_crawler_run(
    run_id: UUID4,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_superuser),
):
    from app.api.deps import create_crawler_run as _create_run
    from app.api.deps import get_crawler_run as _get
    from app.api.deps import schedule_crawler_run_execution

    run = await _get(run_id, db)
    if run.status not in ("failed", "cancelled"):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot retry run with status '{run.status}'. Must be 'failed' or 'cancelled'.",
        )

    existing_retry = await db.execute(
        select(models.CrawlerRun).where(
            models.CrawlerRun.retry_of_id == run_id,
            models.CrawlerRun.status.in_(["pending", "running", "pending_review"]),
        )
    )
    if existing_retry.scalars().first():
        raise HTTPException(
            status_code=409,
            detail="An active retry of this run already exists.",
        )

    pipeline = await db.get(models.CrawlerPipeline, run.crawler_pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Parent pipeline not found")

    new_run = await _create_run(pipeline, "manual", db)
    new_run.retry_of_id = run.id
    await db.commit()
    await db.refresh(new_run)

    await schedule_crawler_run_execution(
        new_run.id,
        user.id,
        background_tasks=background_tasks,
    )
    return new_run
