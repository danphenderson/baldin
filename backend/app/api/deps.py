# Path: app/api/deps.py
import json
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path  # noqa
from typing import Any, Sequence

from fastapi import (  # noqa
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
)
from fastapi.exceptions import RequestValidationError
from pydantic import UUID4, ValidationError
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload

from app import logging, models, schemas, utils  # noqa
from app.core import conf  # noqa
from app.core import security  # noqa
from app.core.db import (  # noqa
    AsyncSession,
    DataBaseManager,
    get_async_session,
    session_context,
)
from app.core.langchain import (  # noqa
    extract_text_from_url,
    generate_cover_letter,
    generate_resume,
)
from app.core.security import (  # noqa
    create_user,
    fastapi_users,
    get_current_superuser,
    get_current_user,
)
from app.extractor.extraction_runnable import extract_entire_document  # noqa
from app.extractor.parsing import (  # noqa
    MAX_FILE_SIZE_MB,
    SUPPORTED_MIMETYPES,
    parse_binary_input,
)
from app.extractor.retrieval import extract_from_content  # noqa
from app.logging import console_log, get_async_logger

__all__ = ["console_log"]

log = get_async_logger(__name__)

LEAD_SHARED_MUTABLE_FIELDS = (
    "title",
    "description",
    "location",
    "salary",
    "job_function",
    "employment_type",
    "seniority_level",
    "education_level",
    "hiring_manager",
)


@dataclass
class LeadCreateResult:
    lead: models.Lead
    disposition: schemas.LeadExtractDisposition
    normalized_url: str


async def _403(user_id: UUID4, obj: Any, id: UUID4 | str) -> HTTPException:
    await log.warning(
        f"Unauthorized user {user_id} requested access to {obj} with id {id}"
    )
    raise HTTPException(
        status_code=403,
        detail=f"User {user_id} is not authorized to access {obj} with {id}",
    )


async def _404(obj: Any, id: UUID4 | str | None = None) -> HTTPException:
    msg = f"Object with {id} not found" if id else "Unable to find object"
    await log.warning(msg)
    raise HTTPException(status_code=404, detail=f"Object with id {id} not found")


async def get_pagination_params(
    page: int = Query(1, ge=1, description="Page number starting from 1"),
    page_size: int = Query(10, ge=1, description="Number of records per page"),
    request_count: bool = Query(False, description="Return total count of records"),
) -> schemas.Pagination:
    return schemas.Pagination(
        page=page, page_size=page_size, request_count=request_count
    )


def _normalize_extractor_input_value(value: str | None) -> str | None:
    if value is None:
        return None

    normalized = value.strip()
    if not normalized or normalized.lower() in {"null", "undefined"}:
        return None

    return normalized


def _build_extractor_run_payload(payload: dict[str, Any]) -> schemas.ExtractorRun:
    try:
        return schemas.ExtractorRun(**payload)
    except ValidationError as exc:
        raise RequestValidationError(exc.errors()) from exc


async def get_extractor_run_payload(
    request: Request,
    file: UploadFile | None = File(default=None),
    mode: str | None = Form(default=None),
    text: str | None = Form(default=None),
    url: str | None = Form(default=None),
    llm: str | None = Form(default=None),
) -> schemas.ExtractorRun:
    content_type = request.headers.get("content-type", "")

    if content_type.startswith("application/json"):
        try:
            body = await request.json()
        except json.JSONDecodeError as exc:
            raise RequestValidationError(
                [
                    {
                        "loc": ("body",),
                        "msg": "Invalid JSON payload.",
                        "type": "value_error.jsondecode",
                    }
                ]
            ) from exc

        if not isinstance(body, dict):
            raise RequestValidationError(
                [
                    {
                        "loc": ("body",),
                        "msg": "Extractor payload must be a JSON object.",
                        "type": "type_error.dict",
                    }
                ]
            )

        return _build_extractor_run_payload(body)

    query = request.query_params
    return _build_extractor_run_payload(
        {
            "mode": _normalize_extractor_input_value(mode)
            or _normalize_extractor_input_value(query.get("mode"))
            or "entire_document",
            "file": file,
            "text": _normalize_extractor_input_value(text)
            or _normalize_extractor_input_value(query.get("text")),
            "url": _normalize_extractor_input_value(url)
            or _normalize_extractor_input_value(query.get("url")),
            "llm": _normalize_extractor_input_value(llm)
            or _normalize_extractor_input_value(query.get("llm")),
        }
    )


async def get_lead(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.Lead:
    del user
    result = await db.execute(
        select(models.Lead)
        .execution_options(populate_existing=True)
        .options(
            selectinload(models.Lead.companies),
            selectinload(models.Lead.registrations).selectinload(
                models.LeadRegistration.user
            ),
            selectinload(models.Lead.comments),
        )
        .where(models.Lead.id == id)
    )
    lead = result.scalars().unique().first()
    if not lead:
        raise HTTPException(status_code=404, detail=f"Lead not found: {id}")
    return lead


def _get_lead_registration(
    lead: models.Lead, user_id: UUID4 | uuid.UUID
) -> models.LeadRegistration | None:
    return next(
        (
            registration
            for registration in getattr(lead, "registrations", [])
            if registration.user_id == user_id
        ),
        None,
    )


def _is_empty_shared_value(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    return False


async def _apply_company_ids(
    lead: models.Lead,
    company_ids: Sequence[UUID4] | None,
    db: AsyncSession,
    *,
    replace: bool,
) -> bool:
    if company_ids is None:
        return False

    existing_company_ids_result = await db.execute(
        select(models.LeadXCompany.company_id).where(
            models.LeadXCompany.lead_id == lead.id
        )
    )
    existing_company_ids = set(existing_company_ids_result.scalars().all())

    valid_requested_ids: list[UUID4] = []
    seen_company_ids: set[UUID4] = set()
    for company_id in company_ids:
        if company_id in seen_company_ids:
            continue
        seen_company_ids.add(company_id)
        company = await db.get(models.Company, company_id)
        if company is not None:
            valid_requested_ids.append(company_id)

    requested_company_ids = set(valid_requested_ids)

    if replace:
        company_ids_to_remove = existing_company_ids - requested_company_ids
        company_ids_to_add = requested_company_ids - existing_company_ids

        if company_ids_to_remove:
            await db.execute(
                delete(models.LeadXCompany).where(
                    models.LeadXCompany.lead_id == lead.id,
                    models.LeadXCompany.company_id.in_(company_ids_to_remove),
                )
            )

        for company_id in valid_requested_ids:
            if company_id not in company_ids_to_add:
                continue
            db.add(models.LeadXCompany(lead_id=lead.id, company_id=company_id))

        return bool(company_ids_to_remove or company_ids_to_add)

    company_ids_to_add = requested_company_ids - existing_company_ids
    for company_id in valid_requested_ids:
        if company_id not in company_ids_to_add:
            continue
        db.add(models.LeadXCompany(lead_id=lead.id, company_id=company_id))

    return bool(company_ids_to_add)


def _fill_empty_shared_fields(lead: models.Lead, payload: schemas.LeadCreate) -> bool:
    changed = False
    for field, value in payload.model_dump(
        exclude={"company_ids", "url"}, exclude_none=True
    ).items():
        if not _is_empty_shared_value(getattr(lead, field)):
            continue
        setattr(lead, field, value)
        changed = True
    return changed


async def get_mutable_lead(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.Lead:
    lead = await get_lead(id, db, user)
    if getattr(user, "is_superuser", False):
        return lead
    if _get_lead_registration(lead, user.id) is not None:
        return lead
    raise await _403(user.id, lead, id)


async def create_lead(
    payload: schemas.LeadCreate,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> LeadCreateResult:
    normalized_url = utils.canonicalize_lead_url(payload.url)
    result = await db.execute(
        select(models.Lead)
        .options(
            selectinload(models.Lead.companies),
            selectinload(models.Lead.registrations).selectinload(
                models.LeadRegistration.user
            ),
            selectinload(models.Lead.comments),
        )
        .where(models.Lead.canonical_url == normalized_url)
    )
    lead = result.scalars().unique().first()
    current_user = await db.get(models.User, user.id)
    if current_user is None:
        raise HTTPException(status_code=404, detail=f"User not found: {user.id}")

    changed = False
    disposition = schemas.LeadExtractDisposition.CREATED
    if lead is None:
        lead = models.Lead(
            **payload.model_dump(exclude={"company_ids"}, exclude_none=True),
            canonical_url=normalized_url,
        )
        lead.registrations.append(models.LeadRegistration(user=current_user))
        db.add(lead)
        changed = True
    else:
        registration = _get_lead_registration(lead, user.id)
        if registration is None:
            lead.registrations.append(models.LeadRegistration(user=current_user))
            disposition = schemas.LeadExtractDisposition.MATCHED_EXISTING_JOINED
            changed = True
        else:
            disposition = (
                schemas.LeadExtractDisposition.MATCHED_EXISTING_ALREADY_REGISTERED
            )
        if _fill_empty_shared_fields(lead, payload):
            changed = True

    if await _apply_company_ids(lead, payload.company_ids, db, replace=False):
        changed = True

    if changed:
        await db.commit()

    return LeadCreateResult(
        lead=await get_lead(lead.id, db, user),
        disposition=disposition,
        normalized_url=normalized_url,
    )


async def get_company_by_id(
    id: UUID4, db: AsyncSession = Depends(get_async_session)
) -> models.Company:
    company = await db.get(models.Company, id)
    if not company:
        raise await _404(company, id)
    await log.info(f"get_company_by_id: {company}")
    return company


async def get_orchestration_event(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.OrchestrationEvent:
    query = (
        select(models.OrchestrationEvent)
        .where(models.OrchestrationEvent.id == id)
        .options(selectinload(models.OrchestrationEvent.orchestration_pipeline))
    )
    result = await db.execute(query)
    orch_event = result.scalars().first()
    if not orch_event:
        raise await _404(orch_event, id)
    if (
        not orch_event.orchestration_pipeline
        or orch_event.orchestration_pipeline.user_id != user.id  # type: ignore[union-attr]
    ):
        raise await _403(user.id, orch_event, id)
    await log.info(f"get_orchestration_event: {orch_event}")
    return orch_event


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
        raise await _404(event, id)
    if user is not None and (
        not event.orchestration_pipeline
        or event.orchestration_pipeline.user_id != user.id
    ):
        raise await _403(user.id, event, id)
    for var, value in payload.dict(exclude_unset=True).items():
        setattr(event, var, value)
    await db.commit()
    await db.refresh(event)
    await log.info(f"update_orchestration_event: {event}")
    return event


async def update_orchestration_event_for_current_user(
    id: UUID4,
    payload: schemas.OrchestrationEventUpdate,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.OrchestrationEvent:
    return await update_orchestration_event(id, payload, db, user)


async def create_orchestration_event(
    payload: schemas.OrchestrationEventCreate,
    db: AsyncSession = Depends(get_async_session),
) -> models.OrchestrationEvent:
    # Seralize URIS to JSON stings (for database)
    setattr(payload, "source_uri", payload.source_uri.json())
    setattr(payload, "destination_uri", payload.destination_uri.json())
    # Create new event record in database
    event = models.OrchestrationEvent(**payload.__dict__)
    db.add(event)
    await db.commit()
    await db.refresh(event)
    await log.info(f"create_orchestration_event: {event}")
    return event


async def get_skill(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.Skill:
    skill = await db.get(models.Skill, id)
    if not skill:
        raise await _404(skill, id)
    if skill.user_id != user.id:
        raise await _403(user.id, skill, id)
    await log.info(f"get_skill: {skill}")
    return skill


async def create_skill(
    payload: schemas.SkillCreate,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.Skill:
    skill = models.Skill(**payload.dict(), user_id=user.id)
    db.add(skill)
    await db.commit()
    await db.refresh(skill)
    await log.info(f"create_skill: {skill}")
    return skill


async def create_cover_letter(
    payload: schemas.CoverLetterCreate,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.CoverLetter:
    cover_letter = models.CoverLetter(**payload.dict(), user_id=user.id)
    db.add(cover_letter)
    await db.commit()
    await db.refresh(cover_letter)
    await log.info(f"create_cover_letter: {cover_letter}")
    return cover_letter


async def create_resume(
    payload: schemas.ResumeCreate,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.Resume:
    resume = models.Resume(**payload.dict(), user_id=user.id)
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    await log.info(f"create_resume: {resume}")
    return resume


async def get_experience(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.Experience:
    experience = await db.get(models.Experience, id)
    if not experience:
        raise await _404(experience, id)
    if experience.user_id != user.id:  # type: ignore
        raise await _403(user.id, experience, id)
    await log.info(f"get_experience: {experience}")
    return experience


async def create_experience(
    payload: schemas.ExperienceCreate,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.Experience:
    experience = models.Experience(**payload.dict(), user_id=user.id)
    db.add(experience)
    await db.commit()
    await db.refresh(experience)
    await log.info(f"create_experience: {experience}")
    return experience


async def get_resume(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.Resume:
    resume = await db.get(models.Resume, id)
    if not resume:
        raise await _404(resume, id)
    if resume.user_id != user.id:  # type: ignore
        raise await _403(user.id, resume, id)
    await log.info(f"get_resume: {resume}")
    return resume


async def get_contact(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.Contact:
    contact = await db.get(models.Contact, id)
    if not contact:
        raise await _404(contact, id)
    if contact.user_id != user.id:  # type: ignore
        raise await _403(user.id, contact, id)
    await log.info(f"get_contact: {contact}")
    return contact


async def create_contact(
    payload: schemas.ContactCreate,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.Contact:
    contact = models.Contact(**payload.dict(), user_id=user.id)
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    await log.info(f"create_contact: {contact}")
    return contact


async def get_cover_letter(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.CoverLetter:
    cover_letter = await db.get(models.CoverLetter, id)
    if not cover_letter:
        raise await _404(cover_letter, id)
    if cover_letter.user_id != user.id:  # type: ignore
        raise await _403(user.id, cover_letter, id)
    await log.info(f"get_cover_letter: {cover_letter}")
    return cover_letter


async def get_application(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.Application:
    application = await db.get(models.Application, id)
    if not application:
        raise await _404(application, id)
    if application.user_id != user.id:  # type: ignore
        raise await _403(user.id, application, id)
    await log.info(f"get_application: {application}")
    return application


async def get_education(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.Education:
    education = await db.get(models.Education, id)
    if not education:
        raise await _404(education, id)
    if education.user_id != user.id:  # type: ignore
        raise await _403(user.id, education, id)
    await log.info(f"get_education: {education}")
    return education


async def create_education(
    payload: schemas.EducationCreate,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.Education:
    education = models.Education(**payload.dict(), user_id=user.id)
    db.add(education)
    await db.commit()
    await db.refresh(education)
    await log.info(f"create_education: {education}")
    return education


async def get_certificate(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.Certificate:
    certificate = await db.get(models.Certificate, id)
    if not certificate:
        raise await _404(certificate, id)
    if certificate.user_id != user.id:  # type: ignore
        raise await _403(user.id, certificate, id)
    await log.info(f"get_certificate: {certificate}")
    return certificate


async def create_certificate(
    payload: schemas.CertificateCreate,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.Certificate:
    certificate = models.Certificate(**payload.dict(), user_id=user.id)
    db.add(certificate)
    await db.commit()
    await db.refresh(certificate)
    await log.info(f"create_certificate: {certificate}")
    return certificate


async def get_orchestration_pipeline(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.OrchestrationPipeline:
    query = (
        select(models.OrchestrationPipeline)
        .filter(models.OrchestrationPipeline.id == id)
        .options(selectinload(models.OrchestrationPipeline.orchestration_events))
    )
    pipeline = await db.execute(query)
    pipeline = pipeline.scalars().first()
    if not pipeline:
        raise await _404(pipeline, id)
    if pipeline.user_id != user.id:  # type: ignore
        raise await _403(user.id, pipeline, id)
    await log.info(f"get_orchestration_pipeline: {pipeline}")
    return pipeline  # type: ignore


async def get_orchestration_pipeline_by_name(
    name: str,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.OrchestrationPipeline:
    query = (
        select(models.OrchestrationPipeline)
        .where(
            models.OrchestrationPipeline.name == name,
            models.OrchestrationPipeline.user_id == user.id,
        )
        .options(selectinload(models.OrchestrationPipeline.orchestration_events))
    )
    result = await db.execute(query)
    pipeline = result.scalars().first()
    if not pipeline:
        raise await _404(pipeline, name)
    await log.info(f"get_orchestration_pipeline: {pipeline}")
    return pipeline


async def create_orchestration_pipeline(
    payload: schemas.OrchestrationPipelineCreate,
    user: schemas.UserRead,
    db: AsyncSession = Depends(get_async_session),
) -> models.OrchestrationPipeline:
    pipeline = models.OrchestrationPipeline(**payload.dict(), user_id=user.id)
    db.add(pipeline)
    await db.commit()
    await db.refresh(pipeline)
    await log.info(f"create_orchestration_pipeline: {pipeline}")
    return pipeline


async def get_extractor(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.Extractor:
    query = (
        select(models.Extractor)
        .where(models.Extractor.id == id)
        .options(selectinload(models.Extractor.extractor_examples))
    )
    extractor = await db.execute(query)
    extractor = extractor.scalars().first()
    if not extractor:
        raise await _404(extractor, id)
    if extractor.user_id != user.id:  # type: ignore
        raise await _403(user.id, extractor, id)
    await log.info(f"get_extractor: {extractor}")
    return extractor


async def get_extractor_by_name(
    name: str,
    db: AsyncSession = Depends(get_async_session),
) -> models.Extractor:
    query = (
        select(models.Extractor)
        .where(models.Extractor.name == name)
        .options(selectinload(models.Extractor.extractor_examples))
    )
    result = await db.execute(query)
    extractor = result.scalars().first()
    if not extractor:
        raise await _404(extractor, name)
    await log.info(f"get_extractor: {extractor}")
    return extractor


async def create_extractor(
    payload: schemas.ExtractorCreate,
    user: schemas.UserRead,
    db: AsyncSession = Depends(get_async_session),
) -> models.Extractor:
    extractor = models.Extractor(**payload.dict(), user_id=user.id)
    db.add(extractor)
    await db.commit()
    await db.refresh(extractor)
    await log.info(f"create_extractor: {extractor}")
    return extractor


async def run_extractor(
    extractor: schemas.ExtractorRead,
    payload: schemas.ExtractorRun,
    user: schemas.UserRead,
    db: AsyncSession = Depends(get_async_session),
) -> schemas.ExtractorResponse:

    await log.info(f"Running extractor {extractor.name} with payload {payload}")

    # Check if there is an orchestration pipeline registered for this extractor
    try:
        pipeline = await get_orchestration_pipeline_by_name(
            getattr(extractor, "name", ""), db, user
        )
    except HTTPException as _:  # noqa
        # Create a new pipeline for this extractor
        pipeline = models.OrchestrationPipeline(
            name=extractor.name,
            description=f"Extraction orchestration pipeline for {extractor.name}",
            definition=extractor.json_schema,
            user_id=user.id,
        )
        db.add(pipeline)
        await db.commit()
        await db.refresh(pipeline)

    # Load text to run extraction on
    text = payload.text
    if text:
        pass
    elif payload.url:
        text = await extract_text_from_url(str(payload.url))
    elif payload.file:
        documents = parse_binary_input(
            payload.file.file,
            file_name=payload.file.filename,
            content_type=payload.file.content_type,
        )
        text = "\n".join([document.page_content for document in documents])

    if not text:
        raise HTTPException(
            status_code=400,
            detail="No text to run extraction on. Provide either text, url or file.",
        )

    # Create a new event for this extraction run
    source_uri_name = str(payload.url) or str(payload.file)
    source_uri_type = (
        schemas.URIType.URL if "http" in source_uri_name else schemas.URIType.FILE
    )
    event = await create_orchestration_event(
        schemas.OrchestrationEventCreate(
            message=f"Running extractor {extractor.name} with payload {payload}",
            payload={
                "mode": payload.mode,
                "llm": payload.llm,
                "text": (
                    text[:200] if text else None
                ),  # FIXME: Add slicing to prevent very long text
                "file": payload.file.filename if payload.file else None,
            },
            # type: ignore
            environment=conf.settings.ENVIRONMENT,
            source_uri=schemas.URI(name=source_uri_name, type=source_uri_type),
            destination_uri=schemas.URI(
                name=f"{conf.settings.DEFAULT_SQLALCHEMY_DATABASE_URI}#leads",
                type=schemas.URIType.DATABASE,
            ),
            status=schemas.OrchestrationEventStatusType.RUNNING,
            pipeline_id=pipeline.id,  # type: ignore
        ),
        db=db,
    )
    # Run the extraction event, TODO, cleanup
    try:
        llm = payload.llm or conf.openai.COMPLETION_MODEL
        if payload.mode == "entire_document":
            res = await extract_entire_document(text, extractor, llm)
        elif payload.mode == "retrieval":
            res = await extract_from_content(text, extractor, llm)
        else:
            raise ValueError(
                f"Invalid mode {payload.mode}. Expected one of 'entire_document', 'retrieval'."
            )
    except Exception as e:
        error_message = (
            f"Failure running extractor {extractor.name}: " f"{type(e).__name__}: {e}"
        )
        await log.exception(error_message)
        await update_orchestration_event(
            event.id,
            payload=schemas.OrchestrationEventUpdate(
                message=error_message,
                status=schemas.OrchestrationEventStatusType.FAILED,
            ),
            db=db,  # type: ignore
        )
        raise HTTPException(status_code=500, detail=str(e)) from e

    await update_orchestration_event(
        event.id, payload=schemas.OrchestrationEventUpdate(message=f"Success! Extracted res: {res}", status=schemas.OrchestrationEventStatusType.SUCCESS), db=db  # type: ignore
    )
    return schemas.ExtractorResponse(**res)


async def get_extractor_example(
    example_id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.ExtractorExample:
    example = await db.get(models.ExtractorExample, example_id)
    if not example:
        raise HTTPException(
            status_code=404, detail=f"Example with id {example_id} not found"
        )
    # Further checks for user access to this example can be performed here
    await log.info(f"get_extractor_example: {example}")
    return example


async def get_extractor_examples(
    extractor_id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> Sequence[models.ExtractorExample]:
    examples = await db.execute(
        select(models.ExtractorExample)
        .filter(models.Extractor.user_id == user.id)
        .filter(models.ExtractorExample.extractor_id == extractor_id)
        .order_by(models.ExtractorExample.created_at)
    )
    return examples.scalars().all()


def model_to_dict(model_instance):
    """
    Convert SQLAlchemy model instance to dictionary, handling nested relationships
    and converting non-serializable types like UUID and datetime to strings.
    FIXME: Hack solution, langchain should be using my schemas instead of JSON strings
    - start by updating schemas.py to include a UserProfileRead type
    - modify the parameter types in generate_cover_letter to accept schemas.UserProfileRead, schemas.LeadRead, and schemas.CoverLetterRead
    - modify the return type of generate_cover_letter to return schemas.CoverLetterRead
    - update generate_cover_letter to use the schemas instead of JSON strings
    """
    if model_instance is None:
        return None
    if hasattr(model_instance, "__table__"):
        data = {}
        for c in model_instance.__table__.columns:
            value = getattr(model_instance, c.name)
            if isinstance(value, uuid.UUID):
                data[c.name] = str(value)
            elif isinstance(value, datetime):
                data[c.name] = value.isoformat()
            else:
                data[c.name] = value
        return data
    elif isinstance(model_instance, list):
        return [model_to_dict(item) for item in model_instance]
    return model_instance
