"""
Human review queue for automation outputs.

Provides a unified API for listing, approving, and rejecting items
that are held in `pending_review` status across crawlers, extractors,
and leads.
"""

from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import UUID4
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_async_session, get_current_superuser, models, schemas

router = APIRouter(dependencies=[Depends(get_current_superuser)])


@router.get("/items", response_model=list[schemas.ReviewItemRead])
async def list_review_items(
    db: AsyncSession = Depends(get_async_session),
    item_type: schemas.ReviewItemType | None = Query(
        None, description="Filter by item type"
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """List all items pending human review."""
    offset = (page - 1) * page_size

    if item_type == schemas.ReviewItemType.CRAWLER_RUN:
        result = await db.execute(
            select(models.CrawlerRun)
            .where(models.CrawlerRun.status == "pending_review")
            .order_by(models.CrawlerRun.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        return [
            schemas.ReviewItemRead(
                item_type=schemas.ReviewItemType.CRAWLER_RUN,
                item_id=run.id,
                created_at=run.created_at,
                summary=f"Crawler run ({run.trigger_type}) for pipeline {run.crawler_pipeline_id}",
                detail=run.stats,
            )
            for run in result.scalars().all()
        ]

    if item_type == schemas.ReviewItemType.EXTRACTION_EVENT:
        result = await db.execute(
            select(models.OrchestrationEvent)
            .where(models.OrchestrationEvent.status == "pending_review")
            .order_by(models.OrchestrationEvent.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        return [
            schemas.ReviewItemRead(
                item_type=schemas.ReviewItemType.EXTRACTION_EVENT,
                item_id=event.id,
                created_at=event.created_at,
                summary=event.message,
                detail=event.payload,
            )
            for event in result.scalars().all()
        ]

    if item_type == schemas.ReviewItemType.LEAD:
        result = await db.execute(
            select(models.Lead)
            .where(models.Lead.review_status == "pending_review")
            .order_by(models.Lead.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        return [
            schemas.ReviewItemRead(
                item_type=schemas.ReviewItemType.LEAD,
                item_id=lead.id,
                created_at=lead.created_at,
                summary=lead.title or lead.url,
                detail={"url": lead.url, "location": lead.location},
            )
            for lead in result.scalars().all()
        ]

    fetch_limit = offset + page_size
    items: list[schemas.ReviewItemRead] = []

    crawler_result = await db.execute(
        select(models.CrawlerRun)
        .where(models.CrawlerRun.status == "pending_review")
        .order_by(models.CrawlerRun.created_at.desc())
        .limit(fetch_limit)
    )
    items.extend(
        schemas.ReviewItemRead(
            item_type=schemas.ReviewItemType.CRAWLER_RUN,
            item_id=run.id,
            created_at=run.created_at,
            summary=f"Crawler run ({run.trigger_type}) for pipeline {run.crawler_pipeline_id}",
            detail=run.stats,
        )
        for run in crawler_result.scalars().all()
    )

    extraction_result = await db.execute(
        select(models.OrchestrationEvent)
        .where(models.OrchestrationEvent.status == "pending_review")
        .order_by(models.OrchestrationEvent.created_at.desc())
        .limit(fetch_limit)
    )
    items.extend(
        schemas.ReviewItemRead(
            item_type=schemas.ReviewItemType.EXTRACTION_EVENT,
            item_id=event.id,
            created_at=event.created_at,
            summary=event.message,
            detail=event.payload,
        )
        for event in extraction_result.scalars().all()
    )

    lead_result = await db.execute(
        select(models.Lead)
        .where(models.Lead.review_status == "pending_review")
        .order_by(models.Lead.created_at.desc())
        .limit(fetch_limit)
    )
    items.extend(
        schemas.ReviewItemRead(
            item_type=schemas.ReviewItemType.LEAD,
            item_id=lead.id,
            created_at=lead.created_at,
            summary=lead.title or lead.url,
            detail={"url": lead.url, "location": lead.location},
        )
        for lead in lead_result.scalars().all()
    )

    # Deterministic merge for the mixed feed, then paginate in memory
    # over the bounded result set rather than over full table scans.
    items.sort(
        key=lambda x: (x.created_at, x.item_type.value, str(x.item_id)),
        reverse=True,
    )
    return items[offset : offset + page_size]


async def _approve_item(
    item_type: schemas.ReviewItemType,
    item_id: UUID4,
    db: AsyncSession,
    background_tasks: BackgroundTasks | None = None,
) -> str:
    """Approve a single review item. Returns a status message."""
    if item_type == schemas.ReviewItemType.CRAWLER_RUN:
        run = await db.get(models.CrawlerRun, item_id)
        if not run or run.status != "pending_review":
            raise HTTPException(
                404, f"Crawler run {item_id} not found or not pending review"
            )
        run.status = "pending"
        await db.commit()
        # Launch execution
        from app.api.deps import schedule_crawler_run_execution

        pipeline = await db.get(models.CrawlerPipeline, run.crawler_pipeline_id)
        user_id = pipeline.created_by_user_id if pipeline else None
        if user_id:
            schedule_crawler_run_execution(
                run.id,
                user_id,
                background_tasks=background_tasks,
            )
        return f"Crawler run {item_id} approved and execution started"

    elif item_type == schemas.ReviewItemType.EXTRACTION_EVENT:
        event = await db.get(models.OrchestrationEvent, item_id)
        if not event or event.status != "pending_review":
            raise HTTPException(
                404, f"Extraction event {item_id} not found or not pending review"
            )
        event.status = "success"
        await db.commit()
        return f"Extraction event {item_id} approved"

    elif item_type == schemas.ReviewItemType.LEAD:
        lead = await db.get(models.Lead, item_id)
        if not lead or lead.review_status != "pending_review":
            raise HTTPException(404, f"Lead {item_id} not found or not pending review")
        lead.review_status = "approved"
        await db.commit()
        return f"Lead {item_id} approved"

    raise HTTPException(400, f"Unknown item type: {item_type}")


async def _reject_item(
    item_type: schemas.ReviewItemType,
    item_id: UUID4,
    db: AsyncSession,
) -> str:
    """Reject a single review item."""
    if item_type == schemas.ReviewItemType.CRAWLER_RUN:
        run = await db.get(models.CrawlerRun, item_id)
        if not run or run.status != "pending_review":
            raise HTTPException(
                404, f"Crawler run {item_id} not found or not pending review"
            )
        run.status = "cancelled"
        run.finished_at = datetime.utcnow()
        run.error_summary = "Rejected during human review"
        await db.commit()
        return f"Crawler run {item_id} rejected"

    elif item_type == schemas.ReviewItemType.EXTRACTION_EVENT:
        event = await db.get(models.OrchestrationEvent, item_id)
        if not event or event.status != "pending_review":
            raise HTTPException(
                404, f"Extraction event {item_id} not found or not pending review"
            )
        event.status = "failure"
        event.message = "Rejected during human review"
        await db.commit()
        return f"Extraction event {item_id} rejected"

    elif item_type == schemas.ReviewItemType.LEAD:
        lead = await db.get(models.Lead, item_id)
        if not lead or lead.review_status != "pending_review":
            raise HTTPException(404, f"Lead {item_id} not found or not pending review")
        lead.review_status = "rejected"
        await db.commit()
        return f"Lead {item_id} rejected"

    raise HTTPException(400, f"Unknown item type: {item_type}")


@router.post("/items/{item_type}/{item_id}/approve")
async def approve_item(
    item_type: schemas.ReviewItemType,
    item_id: UUID4,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
):
    msg = await _approve_item(item_type, item_id, db, background_tasks)
    return {"message": msg}


@router.post("/items/{item_type}/{item_id}/reject")
async def reject_item(
    item_type: schemas.ReviewItemType,
    item_id: UUID4,
    db: AsyncSession = Depends(get_async_session),
):
    msg = await _reject_item(item_type, item_id, db)
    return {"message": msg}


@router.post("/items/batch", response_model=schemas.ReviewBatchResponse)
async def batch_review(
    payload: schemas.ReviewBatchRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
):
    processed = 0
    errors = []
    for item in payload.items:
        try:
            if item.action == schemas.ReviewAction.APPROVE:
                await _approve_item(item.item_type, item.item_id, db, background_tasks)
            else:
                await _reject_item(item.item_type, item.item_id, db)
            processed += 1
        except HTTPException as e:
            errors.append(f"{item.item_type}/{item.item_id}: {e.detail}")
        except Exception as e:
            errors.append(f"{item.item_type}/{item.item_id}: {str(e)}")
    return schemas.ReviewBatchResponse(processed=processed, errors=errors)
