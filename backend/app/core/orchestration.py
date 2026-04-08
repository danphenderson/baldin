from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from pydantic import UUID4
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app import models, schemas
from app.core.db import AsyncSession
from app.logging import get_async_logger

log = get_async_logger(__name__)


def build_status_message(
    workflow_name: str,
    status: str,
    detail: str | None = None,
) -> str:
    base = f"{workflow_name} {status}"
    if detail:
        return f"{base}: {detail}"
    return base


def _serialize_uri(uri: schemas.URI | None) -> str | None:
    if uri is None:
        return None
    return uri.model_dump_json()


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _parse_utc_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _merge_failure_payload(
    payload: dict[str, Any] | None,
    *,
    error_code: str,
    error_summary: str,
    http_status: int,
) -> dict[str, Any]:
    merged = dict(payload or {})

    request = dict(merged.get("request") or {})
    finished_at = _utc_now_iso()
    request["finished_at"] = finished_at
    started_at = _parse_utc_iso(request.get("started_at"))
    finished_at_dt = _parse_utc_iso(finished_at)
    if (
        started_at is not None
        and finished_at_dt is not None
        and request.get("duration_ms") is None
    ):
        request["duration_ms"] = max(
            int((finished_at_dt - started_at).total_seconds() * 1000),
            0,
        )
    merged["request"] = request

    outcome = dict(merged.get("outcome") or {})
    outcome.update(
        {
            "result": "failure",
            "http_status": http_status,
            "error_code": error_code,
            "error_summary": error_summary,
        }
    )
    merged["outcome"] = outcome

    trace = list(merged.get("trace") or [])
    trace.append(
        {
            "node": "workflow_service",
            "status": "failure",
            "attempt": 1,
            "duration_ms": 0,
            "warning_codes": [error_code],
        }
    )
    merged["trace"] = trace

    return merged


async def get_orchestration_pipeline_by_name(
    name: str,
    db: AsyncSession,
    user: schemas.UserRead,
) -> models.OrchestrationPipeline:
    query = select(models.OrchestrationPipeline).where(
        models.OrchestrationPipeline.name == name,
        models.OrchestrationPipeline.user_id == user.id,
    )
    result = await db.execute(query)
    pipeline = result.scalars().first()
    if not pipeline:
        raise HTTPException(status_code=404, detail=f"Object with id {name} not found")
    await log.info(f"get_orchestration_pipeline_by_name: {pipeline}")
    return pipeline


async def get_or_create_orchestration_pipeline(
    name: str,
    *,
    db: AsyncSession,
    user: schemas.UserRead,
    description: str | None = None,
    definition: dict[str, Any] | None = None,
) -> models.OrchestrationPipeline:
    try:
        return await get_orchestration_pipeline_by_name(name, db, user)
    except HTTPException as exc:
        if exc.status_code != 404:
            raise

    pipeline = models.OrchestrationPipeline(
        name=name,
        description=description,
        definition=definition or {},
        user_id=user.id,
    )
    db.add(pipeline)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        return await get_orchestration_pipeline_by_name(name, db, user)
    await db.refresh(pipeline)
    await log.info(f"create_orchestration_pipeline: {pipeline}")
    return pipeline


async def create_orchestration_pipeline(
    payload: schemas.OrchestrationPipelineCreate,
    user: schemas.UserRead,
    db: AsyncSession,
) -> models.OrchestrationPipeline:
    pipeline = models.OrchestrationPipeline(**payload.model_dump(), user_id=user.id)
    db.add(pipeline)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"Workflow named '{payload.name}' already exists.",
        ) from exc
    await db.refresh(pipeline)
    await log.info(f"create_orchestration_pipeline: {pipeline}")
    return pipeline


async def create_orchestration_event(
    payload: schemas.OrchestrationEventCreate,
    db: AsyncSession,
) -> models.OrchestrationEvent:
    event_data = payload.model_dump()
    event_data["source_uri"] = _serialize_uri(payload.source_uri)
    event_data["destination_uri"] = _serialize_uri(payload.destination_uri)
    event = models.OrchestrationEvent(**event_data)
    db.add(event)
    await db.commit()
    await db.refresh(event)
    await log.info(f"create_orchestration_event: {event}")
    return event


async def update_orchestration_event(
    id: UUID4,
    payload: schemas.OrchestrationEventUpdate,
    db: AsyncSession,
    user: schemas.UserRead | None = None,
) -> models.OrchestrationEvent:
    if user is None:
        event = await db.get(models.OrchestrationEvent, id)
    else:
        query = (
            select(models.OrchestrationEvent)
            .where(models.OrchestrationEvent.id == id)
            .options(selectinload(models.OrchestrationEvent.orchestration_pipeline))
        )
        result = await db.execute(query)
        event = result.scalars().first()

    if not event:
        raise HTTPException(status_code=404, detail=f"Object with id {id} not found")

    if user is not None and (
        not event.orchestration_pipeline
        or event.orchestration_pipeline.user_id != user.id
    ):
        raise HTTPException(
            status_code=403,
            detail=(f"User {user.id} is not authorized to access {event} with {id}"),
        )

    update_data = payload.model_dump(exclude_unset=True)
    if "source_uri" in update_data:
        update_data["source_uri"] = _serialize_uri(payload.source_uri)
    if "destination_uri" in update_data:
        update_data["destination_uri"] = _serialize_uri(payload.destination_uri)

    for field_name, value in update_data.items():
        setattr(event, field_name, value)

    await db.commit()
    await db.refresh(event)
    await log.info(f"update_orchestration_event: {event}")
    return event


async def mark_orchestration_event_failed_if_running(
    id: UUID4 | str,
    *,
    workflow_name: str,
    detail: str,
    db: AsyncSession,
    error_code: str = "workflow_exception",
    http_status: int = 500,
) -> models.OrchestrationEvent | None:
    event = await db.get(models.OrchestrationEvent, id)
    if event is None or event.status not in {"pending", "running"}:
        return event

    payload = _merge_failure_payload(
        event.payload if isinstance(event.payload, dict) else None,
        error_code=error_code,
        error_summary=detail,
        http_status=http_status,
    )

    return await update_orchestration_event(
        event.id,
        schemas.OrchestrationEventUpdate(
            message=build_status_message(workflow_name, "failure", detail),
            payload=payload,
            status=schemas.OrchestrationEventStatusType.FAILED,
        ),
        db,
    )
