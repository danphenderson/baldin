from __future__ import annotations

import uuid
from io import BytesIO

from fastapi import HTTPException
from pydantic import UUID4

from app import models, schemas
from app.core import conf
from app.core import orchestration as orchestration_core
from app.core.db import AsyncSession
from app.core.document_storage import (
    build_extractor_run_source_path,
    save_extractor_run_source_file,
)
from app.core.extractor_retry import (
    build_extractor_event_payload,
    build_extractor_source_uri,
)
from app.core.langchain import extract_text_from_url
from app.core.url_safety import UnsafeFetchUrlError
from app.extractor.extraction_runnable import extract_entire_document
from app.extractor.parsing import parse_binary_input
from app.extractor.retrieval import extract_from_content
from app.logging import get_async_logger
from app.utils import compute_version_hash

log = get_async_logger(__name__)

ExtractorLike = models.Extractor | schemas.ExtractorRead


async def _resolve_extractor_input_text(
    payload: schemas.ExtractorRun,
    *,
    user_id: UUID4,
) -> tuple[str | None, str | None]:
    if payload.text:
        return payload.text, None

    if payload.url:
        try:
            return await extract_text_from_url(str(payload.url)), None
        except UnsafeFetchUrlError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    if payload.file:
        file_bytes = await payload.file.read()
        documents = parse_binary_input(
            BytesIO(file_bytes),
            file_name=payload.file.filename,
            content_type=payload.file.content_type,
        )
        text = "\n".join(document.page_content for document in documents)
        if not text:
            return text, None

        file_source_path = build_extractor_run_source_path(
            user_id,
            uuid.uuid4(),
            file_name=payload.file.filename,
        )
        save_extractor_run_source_file(file_source_path, file_bytes)
        return text, file_source_path

    return None, None


async def _get_or_create_extractor_pipeline(
    extractor: ExtractorLike,
    user: schemas.UserRead,
    db: AsyncSession,
) -> models.OrchestrationPipeline:
    return await orchestration_core.get_or_create_orchestration_pipeline(
        getattr(extractor, "name", ""),
        db=db,
        user=user,
        description=(
            f"Extraction orchestration pipeline for {getattr(extractor, 'name', '')}"
        ),
        definition=getattr(extractor, "json_schema", None),
    )


async def _create_running_event(
    *,
    extractor: ExtractorLike,
    payload: schemas.ExtractorRun,
    pipeline_id: UUID4,
    file_source_path: str | None,
    db: AsyncSession,
) -> models.OrchestrationEvent:
    return await orchestration_core.create_orchestration_event(
        schemas.OrchestrationEventCreate(
            message=f"Running extractor {extractor.name} with payload {payload}",
            payload=build_extractor_event_payload(
                payload,
                file_source_path=file_source_path,
            ),
            environment=conf.settings.ENVIRONMENT,
            source_uri=build_extractor_source_uri(
                payload,
                file_source_path=file_source_path,
            ),
            destination_uri=schemas.URI(
                name=f"{conf.settings.DEFAULT_SQLALCHEMY_DATABASE_URI}#leads",
                type=schemas.URIType.DATABASE,
            ),
            status=schemas.OrchestrationEventStatusType.RUNNING,
            pipeline_id=pipeline_id,
        ),
        db=db,
    )


async def _stamp_event_traceability(
    *,
    event_id: UUID4,
    extractor: ExtractorLike,
    db: AsyncSession,
    retry_of_id: UUID4 | None,
) -> None:
    event = await db.get(models.OrchestrationEvent, event_id)
    if event is None:
        return

    event.version_hash = compute_version_hash(
        getattr(extractor, "instruction", None),
        getattr(extractor, "json_schema", None),
    )
    if retry_of_id is not None:
        event.retry_of_id = retry_of_id
    await db.flush()


async def _run_extraction(
    *,
    text: str,
    extractor: ExtractorLike,
    payload: schemas.ExtractorRun,
) -> schemas.ExtractorResponse:
    llm = payload.llm or conf.openai.COMPLETION_MODEL
    if payload.mode == "entire_document":
        return await extract_entire_document(text, extractor, llm)
    if payload.mode == "retrieval":
        return await extract_from_content(text, extractor, llm)
    raise ValueError(
        f"Invalid mode {payload.mode}. Expected one of 'entire_document', 'retrieval'."
    )


async def _finalize_success_event(
    *,
    event_id: UUID4,
    extractor: ExtractorLike,
    result: schemas.ExtractorResponse,
    db: AsyncSession,
) -> None:
    requires_approval = getattr(extractor, "requires_approval", False)
    final_status = (
        schemas.OrchestrationEventStatusType.PENDING_REVIEW
        if requires_approval
        else schemas.OrchestrationEventStatusType.SUCCESS
    )
    await orchestration_core.update_orchestration_event(
        event_id,
        payload=schemas.OrchestrationEventUpdate(
            message=(
                f"Extraction complete, held for review: {result}"
                if requires_approval
                else f"Success! Extracted res: {result}"
            ),
            status=final_status,
        ),
        db=db,
    )


async def _finalize_failure_event(
    *,
    event_id: UUID4,
    extractor: ExtractorLike,
    error: Exception,
    db: AsyncSession,
) -> None:
    error_message = (
        f"Failure running extractor {extractor.name}: {type(error).__name__}: {error}"
    )
    await log.exception(error_message)
    await orchestration_core.update_orchestration_event(
        event_id,
        payload=schemas.OrchestrationEventUpdate(
            message=error_message,
            status=schemas.OrchestrationEventStatusType.FAILED,
        ),
        db=db,
    )


async def run_extractor(
    extractor: ExtractorLike,
    payload: schemas.ExtractorRun,
    user: schemas.UserRead,
    db: AsyncSession,
    retry_of_id: UUID4 | None = None,
) -> schemas.ExtractorResponse:
    await log.info(f"Running extractor {extractor.name} with payload {payload}")
    conf.openai.require_enabled("Extractor execution")

    pipeline = await _get_or_create_extractor_pipeline(extractor, user, db)
    text, file_source_path = await _resolve_extractor_input_text(
        payload,
        user_id=user.id,
    )
    if not text:
        raise HTTPException(
            status_code=400,
            detail="No text to run extraction on. Provide either text, url or file.",
        )

    event = await _create_running_event(
        extractor=extractor,
        payload=payload,
        pipeline_id=pipeline.id,
        file_source_path=file_source_path,
        db=db,
    )
    await _stamp_event_traceability(
        event_id=event.id,
        extractor=extractor,
        db=db,
        retry_of_id=retry_of_id,
    )

    try:
        result = await _run_extraction(
            text=text,
            extractor=extractor,
            payload=payload,
        )
    except HTTPException as exc:
        await _finalize_failure_event(
            event_id=event.id,
            extractor=extractor,
            error=exc,
            db=db,
        )
        raise
    except Exception as exc:
        await _finalize_failure_event(
            event_id=event.id,
            extractor=extractor,
            error=exc,
            db=db,
        )
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    await _finalize_success_event(
        event_id=event.id,
        extractor=extractor,
        result=result,
        db=db,
    )
    return schemas.ExtractorResponse(**result)
