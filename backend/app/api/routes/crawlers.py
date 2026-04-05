# app/api/routes/crawlers.py
"""
Crawler run management endpoints.

POST   /crawlers/runs           – create and trigger a new crawler run
GET    /crawlers/runs           – list the current user's crawler runs
GET    /crawlers/runs/{id}      – fetch a single crawler run
POST   /crawlers/runs/{id}/resume – retry a failed/pending run
"""

from typing import Sequence

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import select

from app.api.deps import (
    AsyncSession,
    execute_crawler_run,
    get_async_session,
    get_current_user,
    models,
    schemas,
)
from app.crawler_queue import enqueue_crawler_job

router: APIRouter = APIRouter()


async def _trigger_run(
    run: models.CrawlerRun,
    background_tasks: BackgroundTasks,
    db: AsyncSession,
) -> None:
    """Enqueue or inline-execute a crawler run depending on settings."""
    if await enqueue_crawler_job(str(run.id), str(run.user_id)):
        return  # handed off to worker
    # Inline fallback: execute inside the API process via BackgroundTasks
    background_tasks.add_task(
        _run_inline,
        run_id=run.id,
        user_id=run.user_id,
    )


async def _run_inline(run_id: UUID4, user_id: UUID4) -> None:
    """Thin wrapper that opens its own DB session for inline execution."""
    from app.core.db import session_context

    async with session_context() as db:
        await execute_crawler_run(run_id, user_id, db)


@router.post("/runs", response_model=schemas.CrawlerRunRead, status_code=201)
async def create_crawler_run(
    payload: schemas.CrawlerRunCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.CrawlerRun:
    """Create a crawler run and immediately enqueue or start it."""
    run = models.CrawlerRun(
        url=payload.url,
        user_id=user.id,
        status=schemas.CrawlerRunStatus.PENDING,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)
    await _trigger_run(run, background_tasks, db)
    return run


@router.get("/runs", response_model=list[schemas.CrawlerRunRead])
async def list_crawler_runs(
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> Sequence[models.CrawlerRun]:
    """Return all crawler runs belonging to the current user."""
    result = await db.execute(
        select(models.CrawlerRun).where(models.CrawlerRun.user_id == user.id)
    )
    return result.scalars().all()


@router.get("/runs/{id}", response_model=schemas.CrawlerRunRead)
async def get_crawler_run(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.CrawlerRun:
    """Fetch a single crawler run owned by the current user."""
    run = await db.get(models.CrawlerRun, id)
    if not run:
        raise HTTPException(status_code=404, detail=f"CrawlerRun {id} not found")
    if run.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorised")
    return run


@router.post("/runs/{id}/resume", response_model=schemas.CrawlerRunRead)
async def resume_crawler_run(
    id: UUID4,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.CrawlerRun:
    """Re-trigger a failed or pending crawler run."""
    run = await db.get(models.CrawlerRun, id)
    if not run:
        raise HTTPException(status_code=404, detail=f"CrawlerRun {id} not found")
    if run.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorised")
    if run.status == schemas.CrawlerRunStatus.RUNNING:
        raise HTTPException(status_code=409, detail="Run is already in progress")
    # Reset to pending so execute_crawler_run will pick it up
    run.status = schemas.CrawlerRunStatus.PENDING
    await db.commit()
    await db.refresh(run)
    await _trigger_run(run, background_tasks, db)
    return run
