# app/api/deps.py

from pathlib import Path  # noqa
from typing import Any, Type

from fastapi import BackgroundTasks, Depends, HTTPException, Query  # noqa
from pydantic import UUID4

from app import models, schemas, utils  # noqa
from app.core import conf  # noqa
from app.core import security  # noqa
from app.core.db import AsyncSession, get_async_session, session_context  # noqa
from app.core.openai import get_openai_client  # noqa
from app.core.security import (  # noqa
    fastapi_users,
    get_current_superuser,
    get_current_user,
)
from app.etl.leads import enrich  # noqa
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
    msg = f"Object with {id} not found" if id else "Unable to find object"
    await log.info(msg)
    raise HTTPException(status_code=404, detail=f"Object with id {id} not found")


async def load_record_into_table(
    create_schema: schemas.BaseSchema,
    table_model: Type[models.Base],
    db: AsyncSession = Depends(get_async_session),
) -> None:
    """
    Inserts record into the table.
    """
    ...


async def load_user_record_into_table(
    user_id: UUID4,
    create_schema: schemas.BaseSchema,
    table_model: Type[models.Base],
    db: AsyncSession = Depends(get_async_session),
) -> None:
    """
    Inserts record into a table that has a foreign key to the user table.
    """
    # record_data = {**create_schema.dict(), "user_id": user_id}
    # record = table_model(**record_data)
    ...



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
    orch_event = await db.get(models.OrchestrationEvent, id)

    if not orch_event:
        raise await _404(orch_event, id)

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

    return event


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
