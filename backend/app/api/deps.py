# app/api/deps.py

from pathlib import Path
from typing import Any

from fastapi import Depends, HTTPException, Query
from pydantic import UUID4

from app import models, schemas, utils
from app.core import security  # noqa
from app.core import conf
from app.core.db import AsyncSession, get_async_session, session_context
from app.core.openai import get_openai_client  # noqa
from app.core.security import (  # noqa
    fastapi_users,
    get_current_superuser,
    get_current_user,
)
from app.etl.leads import enrich
from app.logging import get_async_logger  # noqa

log = get_async_logger(__name__)



async def _403(user_id: UUID4, obj: Any, obj_id: UUID4) -> HTTPException:
    await log.warning(
        f"Unauthorized user {user_id} requested access to {obj} with id {obj_id}"
    )
    raise HTTPException(
        status_code=403,
        detail=f"User {user_id} is not authorized to access {obj} with {obj_id}",
    )


async def _404(obj: Any, id: UUID4 | None = None) -> HTTPException:
    msg = (
        f"{obj.__name__} with id {id} not found" if id else f"{obj.__name__} not found"
    )
    await log.info(msg)
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
    lead = await db.get(models.Lead, id)
    if not lead:
        raise await _404(lead, id)
    return lead


async def get_orchestration_event(
    id: UUID4, db: AsyncSession = Depends(get_async_session)
) -> models.OrchestrationEvent:
    etl_event = await db.get(models.OrchestrationEvent, id)
    if not etl_event:
        raise await _404(etl_event, id)
    return etl_event


async def update_orchestration_event_status(
    id: UUID4,
    status: schemas.OrchestrationEventStatusType,
    db: AsyncSession = Depends(get_async_session),
) -> models.OrchestrationEvent:
    etl_event = await db.get(models.OrchestrationEvent, id)

    if not etl_event:
        raise await _404(etl_event, id)
    setattr(etl_event, "status", status)
    await db.commit()
    return etl_event


async def get_skill(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: models.User = Depends(get_current_user),
) -> models.Skill:
    skill = await db.get(models.Skill, id)
    if not skill:
        raise await _404(skill, id)
    if skill.user_id != user.id:  # type: ignore
        raise await _403(user.id, skill, id)
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
    return experience


async def get_resume(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.Resume:
    resume = await db.get(models.Resume, id)
    if not resume:
        await _404(resume, id)
    if resume.user_id != user.id:  # type: ignore
        raise await _403(user.id, resume, id)
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
    return application


async def execute_load_leads(etl_event_id: UUID4):
    async with session_context() as db:
        try:
            # Update ETLEvent status to running
            await update_orchestration_event_status(
                etl_event_id, schemas.OrchestrationEventStatusType("running"), db
            )

            file_path = Path(conf.settings.PUBLIC_ASSETS_DIR) / "leads" / "enriched"

            # Generate Leads from JSON documents in data lake
            async for valid_lead in utils.generate_pydantic_models_from_json(
                schemas.LeadCreate, file_path
            ):
                await log.info(f"Inserting lead {valid_lead} into database")
                lead = models.Lead(**valid_lead.__dict__)
                db.add(lead)

            await db.commit()

            # Update ETLEvent status to success
            await update_orchestration_event_status(
                etl_event_id, schemas.OrchestrationEventStatusType("success"), db
            )

        except Exception as e:
            await log.exception(f"Error executing leads ETL: {e}")
            await db.rollback()  # Rollback on exception
            # Update ETLEvent status to failed
            await update_orchestration_event_status(
                etl_event_id, schemas.OrchestrationEventStatusType("failure"), db
            )
            raise e


async def execute_leads_enrichment(etl_event_id):
    async with session_context() as db:
        try:
            # Update ETLEvent status to running
            await update_orchestration_event_status(
                etl_event_id, schemas.OrchestrationEventStatusType("running"), db
            )

            # Enrich leads
            await enrich.enrich_leads()

            # Update ETLEvent status to success
            await update_orchestration_event_status(
                etl_event_id, schemas.OrchestrationEventStatusType("success"), db
            )

        except Exception as e:
            await log.exception(f"Error executing leads enrichment: {e}")
            await db.rollback()  # Rollback on exception
            # Update ETLEvent status to failed
            await update_orchestration_event_status(
                etl_event_id, schemas.OrchestrationEventStatusType("failure"), db
            )
            raise e



async def database_load(event_id):
    async with session_context() as db:
        try:
            # Update ETLEvent status to running
            event = await update_orchestration_event_status(
                event_id, schemas.OrchestrationEventStatusType("running"), db
            )

            # Deserialize URIs
            source_uri = schemas.URI.parse_raw(getattr(event, "source_uri"))
            destination_uri = schemas.URI.parse_raw(getattr(event, "destination_uri"))

            # Get model class and schema
            model_class = globals().get(getattr(models, destination_uri.name))
            model_schema = globals().get(getattr(schemas, f"{destination_uri.name}Create"))

            # Validate model class and schema
            if model_class is None or model_schema is None:
                raise await _404(model_class)


            # Load data into database
            async for doc in utils.generate_pydantic_models_from_json(
                model_schema, event.source_uri.name
            ):
                await log.info(f"Inserting {doc} into database")
                db.add(model_class(**doc.__dict__))
                await db.commit()  # TODO: wrap in try-catch-finally: commit after itterating? or chunk it?

            # Update ETLEvent status to success
            await update_orchestration_event_status(
                event_id, schemas.OrchestrationEventStatusType("success"), db
            )

        except Exception as e:
            await log.exception(f"Error executing database load: {e}")
            await db.rollback()
            # Update ETLEvent status to failed
            await update_orchestration_event_status(
                event_id, schemas.OrchestrationEventStatusType("failure"), db
            )
