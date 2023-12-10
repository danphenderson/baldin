# app/api/deps.py
import json
from pathlib import Path
from typing import Any

from fastapi import Depends, HTTPException, Query
from pydantic import UUID4

from app import models, schemas, utils
from app.core import security  # noqa
from app.core.conf import settings
from app.core.db import AsyncSession, get_async_session, session_context
from app.core.openai import get_openai_client  # noqa
from app.core.security import (  # noqa
    fastapi_users,
    get_current_superuser,
    get_current_user,
)
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


async def _404(obj: Any, id: UUID4 | None) -> HTTPException:
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


async def get_etl_event(
    id: UUID4, db: AsyncSession = Depends(get_async_session)
) -> models.ETLEvent:
    etl_event = await db.get(models.ETLEvent, id)
    if not etl_event:
        raise await _404(etl_event, id)
    return etl_event


async def update_etl_event(
    id: UUID4,
    status: schemas.ETLStatusType,
    db: AsyncSession = Depends(get_async_session),
) -> models.ETLEvent:
    etl_event = await db.get(models.ETLEvent, id)

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


async def execute_leads_etl(etl_event_id: UUID4):
    async with session_context() as db:
        try:
            # Update ETLEvent status to running
            await update_etl_event(etl_event_id, schemas.ETLStatusType("running"), db)

            # Generate Leads from JSON documents in data lake
            async for valid_lead in utils.generate_pydantic_models_from_json(
                schemas.LeadCreate, Path(settings.PUBLIC_ASSETS_DIR) / "leads"
            ):
                await log.info(f"Inserting lead {valid_lead} into database")
                lead = models.Lead(**valid_lead.__dict__)
                db.add(lead)

            await db.commit()

            # Update ETLEvent status to success
            await update_etl_event(etl_event_id, schemas.ETLStatusType("success"), db)

        except Exception as e:
            await log.exception(f"Error executing leads ETL: {e}")
            await db.rollback()  # Rollback on exception
            # Update ETLEvent status to failed
            await update_etl_event(etl_event_id, schemas.ETLStatusType("failure"), db)
            raise e


async def _enrich_lead(lead):
    client = get_openai_client()

    unset_fields = [k for k, v in lead.__dict__.items() if v is None]

    description = lead.description

    if not description:
        raise ValueError("description field is required to enrich lead")

    messages = [
        {"role": "system", "content": "You excel at extracting information from text"},
        {
            "role": "user",
            "content": f"You will be given job lead's description and you will need to extract the following information: {unset_fields}",
        },
        {
            "role": "assistant",
            "content": f"After extracting the {unset_fields}, how should I present the information to you?",
        },
        {"role": "user", "content": "Please present the information in a JSON format"},
        {
            "role": "assistant",
            "content": f"Great, I will generate a JSON object containing {unset_fields} from the job lead's description",
        },
        {
            "role": "user",
            "content": f"Thank you! Here is the job lead's description: {description}",
        },
    ]

    # Generate a response from the OpenAI ChatCompletion API
    response = await client.chat.completions.create(
        model="gpt-3.5-turbo", messages=messages  # type: ignore
    )
    completion = response.choices.pop()
    # Parse the response into a dict
    completion_dict = json.loads(completion.message.content)

    # Update the lead's attributes
    for var, value in completion_dict.items():
        setattr(lead, var, value)

    return lead


async def get_enriched_lead(id: UUID4, db: AsyncSession = Depends(get_async_session)):
    """
    Enriches leads with OpenAI API using the description field
    """
    lead = await get_lead(id, db)
    return await _enrich_lead(lead)
