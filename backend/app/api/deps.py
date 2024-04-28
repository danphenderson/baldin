# Path: app/api/deps.py
import json
import uuid
from datetime import datetime
from pathlib import Path  # noqa
from typing import Any, Sequence

from fastapi import BackgroundTasks, Depends, HTTPException, Query  # noqa
from pydantic import UUID4
from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload

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
from app.logging import console_log, get_async_logger  # noqa

log = get_async_logger(__name__)


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


async def get_lead(
    id: UUID4, db: AsyncSession = Depends(get_async_session)
) -> models.Lead:
    lead = await db.execute(
        select(models.Lead)
        .options(joinedload(models.Lead.companies))
        .where(models.Lead.id == id)
    )
    if not lead:
        raise HTTPException(status_code=404, detail=f"Lead not found: {id}")
    return lead.scalars().first()


async def get_company_by_id(
    id: UUID4, db: AsyncSession = Depends(get_async_session)
) -> models.Company:
    company = await db.get(models.Company, id)
    if not company:
        raise await _404(company, id)
    await log.info(f"get_company_by_id: {company}")
    return company


async def get_orchestration_event(
    id: UUID4, db: AsyncSession = Depends(get_async_session)
) -> models.OrchestrationEvent:
    orch_event = await db.get(models.OrchestrationEvent, id)
    if not orch_event:
        raise await _404(orch_event, id)
    await log.info(f"get_orchestration_event: {orch_event}")
    return orch_event


async def update_orchestration_event(
    id: UUID4,
    payload: schemas.OrchestrationEventUpdate,
    db: AsyncSession = Depends(get_async_session),
) -> models.OrchestrationEvent:
    event = await get_orchestration_event(id, db)
    for var, value in payload.dict(exclude_unset=True).items():
        setattr(event, var, value)
    await db.commit()
    await db.refresh(event)
    await log.info(f"update_orchestration_event: {event}")
    return event


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

    # Load text to run extraction on
    if payload.text:
        pass
    elif payload.url:
        text = await extract_text_from_url(str(payload.url))
    elif payload.file:
        documents = parse_binary_input(payload.file.file)  # type: ignore
        text = "\n".join([document.page_content for document in documents])

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

    # Create a new event for this extraction run
    event = models.OrchestrationEvent(
        pipeline_id=pipeline.id,
        status="pending",
        source_uri=json.dumps(
            {"name": "default", "type": "datalake"}
        ),  # Example values
        destination_uri=json.dumps(
            {"name": "default", "type": "datalake"}
        ),  # Example values
        payload=json.dumps(
            {
                "mode": payload.mode,
                "llm": payload.llm,
                "text": text[:200]
                if text
                else None,  # FIXME: Add slicing to prevent very long text
                "file": payload.file.filename if payload.file else None,
            }
        ),
        environment=conf.settings.ENVIRONMENT,  # Ensure this is a dictionary
    )
    db.add(event)
    await db.commit()

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
        event.status = "success"
        event.message = "Extraction completed successfully."
    except Exception as e:
        event.status = "failure"
        event.message = f"Extraction failed: {str(e)}"
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await db.refresh(event)
        await db.commit()

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
