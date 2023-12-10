# app/api/deps.py
import json
from pathlib import Path

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
        await log.info(f"Lead with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Lead with {id} not found")
    return lead


async def get_etl_event(
    id: UUID4, db: AsyncSession = Depends(get_async_session)
) -> models.ETLEvent:
    etl_event = await db.get(models.ETLEvent, id)
    if not etl_event:
        await log.info(f"ETL event with id {id} not found")
        raise HTTPException(status_code=404, detail=f"ETL event with {id} not found")
    return etl_event


async def update_etl_event(
    id: UUID4,
    status: schemas.ETLStatusType,
    db: AsyncSession = Depends(get_async_session),
) -> models.ETLEvent:
    etl_event = await db.get(models.ETLEvent, id)
    if not etl_event:
        await log.info(f"ETL event with id {id} not found")
        raise HTTPException(status_code=404, detail=f"ETL event with {id} not found")
    return etl_event


async def get_skill(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: models.User = Depends(get_current_user),
) -> models.Skill:
    skill = await db.get(models.Skill, id)
    if not skill:
        await log.info(f"Skill with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Skill with {id} not found")
    if skill.user_id != user.id:  # type: ignore
        await log.warning(
            f"Unauthorized user {user.id} requested access to skill with id {id}"
        )
        raise HTTPException(
            status_code=403, detail=f"Not authorized to access skill with {id}"
        )
    return skill


async def get_experience(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.Experience:
    experience = await db.get(models.Experience, id)
    if not experience:
        await log.info(f"Experience with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Experience with {id} not found")
    if experience.user_id != user.id:  # type: ignore
        await log.warning(
            f"Unauthorized user {user.id} requested access to experience with id {id}"
        )
        raise HTTPException(
            status_code=403, detail=f"Not authorized to access experience with {id}"
        )
    return experience


async def get_resume(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.Resume:
    resume = await db.get(models.Resume, id)
    if not resume:
        await log.info(f"Resume with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Resume with {id} not found")
    if resume.user_id != user.id:  # type: ignore
        await log.warning(
            f"Unauthorized user {user.id} requested access to resume with id {id}"
        )
        raise HTTPException(
            status_code=403, detail=f"Not authorized to access resume with {id}"
        )
    return resume


async def get_contact(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.Contact:
    contact = await db.get(models.Contact, id)
    if not contact:
        await log.info(f"Contact with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Contact with {id} not found")
    if contact.user_id != user.id:  # type: ignore
        await log.warning(
            f"Unauthorized user {user.id} requested access to contact with id {id}"
        )
        raise HTTPException(
            status_code=403, detail=f"Not authorized to acces contact with {id}"
        )
    return contact


async def get_cover_letter(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.CoverLetter:
    cover_letter = await db.get(models.CoverLetter, id)
    if not cover_letter:
        await log.info(f"Cover letter with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Cover letter with {id} not found")
    if cover_letter.user_id != user.id:  # type: ignore
        await log.warning(
            f"Unauthorized user {user.id} requested access to cover letter with id {id}"
        )
        raise HTTPException(
            status_code=403, detail=f"Not authorized to access cover letter with {id}"
        )
    return cover_letter


async def get_application(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.Application:
    application = await db.get(models.Application, id)
    if not application:
        await log.info(f"Application with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Application with {id} not found")
    if application.user_id != user.id:  # type: ignore
        await log.warning(
            f"Unauthorized user {user.id} requested access to application with id {id}"
        )
        raise HTTPException(
            status_code=403, detail=f"Not authorized to access application with {id}"
        )
    return application


async def execute_leads_etl(etl_event_id: UUID4):
    async with session_context() as db:
        try:
            # Update ETLEvent status to running
            await update_etl_event(etl_event_id, schemas.ETLStatusType("running"), db)

            # Generate Leads from JSON documents in data lake
            async for lead_dict in utils.generate_json_documents(
                Path(settings.PUBLIC_ASSETS_DIR) / "leads"
            ):
                await log.info(f"Inserting lead {lead_dict['url']} into database")
                lead = models.Lead(**lead_dict)
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


def _convert_lead_public_assets():
    # Load JSON data from ./public/leads/* and insert into the database
    # Specify the directory path containing JSON files
    json_directory = Path(settings.PUBLIC_ASSETS_DIR) / "leads"

    leads = []
    # Iterate over all files in the directory
    for json_file in json_directory.iterdir():
        if json_file.is_file() and json_file.suffix.lower() == ".json":
            # Check if it's a file and has a .json extension
            try:
                with open(json_file, "r") as file:
                    json_data = json.load(file)
                    leads.append(json_data)
                # Now you can work with the JSON data in json_data
                print(json_data)

            except Exception as e:
                print(f"Error reading JSON file {json_file}: {e}")

    return leads
