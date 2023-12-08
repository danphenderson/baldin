# app/api/deps.py
import json
from pathlib import Path

import aiofiles
from fastapi import Depends, HTTPException, Query
from pydantic import UUID4
from sqlalchemy.future import select

from app import models, schemas
from app.core import security  # noqa
from app.core.conf import settings
from app.core.db import AsyncSession, get_async_session, session_context
from app.core.openai import get_openai_client  # noqa
from app.core.security import (  # noqa
    fastapi_users,
    get_current_superuser,
    get_current_user,
)
from app.logging import console_log


async def get_pagination_params(
    page: int = Query(1, ge=1, description="Page number starting from 1"),
    page_size: int = Query(10, ge=1, description="Number of records per page"),
) -> schemas.Pagination:
    return schemas.Pagination(page=page, page_size=page_size)


async def get_lead(
    id: UUID4, db: AsyncSession = Depends(get_async_session)
) -> models.Lead:
    lead = await db.get(models.Lead, id)
    if not lead:
        console_log.info(f"Lead with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Lead with {id} not found")
    return lead


async def get_etl_event(
    id: UUID4, db: AsyncSession = Depends(get_async_session)
) -> models.ETLEvent:
    etl_event = await db.get(models.ETLEvent, id)
    if not etl_event:
        console_log.info(f"ETL event with id {id} not found")
        raise HTTPException(status_code=404, detail=f"ETL event with {id} not found")
    return etl_event


async def get_skill(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: models.User = Depends(get_current_user),
) -> models.Skill:
    skill = await db.get(models.Skill, id)
    if not skill:
        console_log.info(f"Skill with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Skill with {id} not found")
    if skill.user_id != user.id:  # type: ignore
        console_log.warning(
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
        console_log.info(f"Experience with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Experience with {id} not found")
    if experience.user_id != user.id:  # type: ignore
        console_log.warning(
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
        console_log.info(f"Resume with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Resume with {id} not found")
    if resume.user_id != user.id:  # type: ignore
        console_log.warning(
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
        console_log.info(f"Contact with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Contact with {id} not found")
    if contact.user_id != user.id:  # type: ignore
        console_log.warning(
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
        console_log.info(f"Cover letter with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Cover letter with {id} not found")
    if cover_letter.user_id != user.id:  # type: ignore
        console_log.warning(
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
        console_log.info(f"Application with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Application with {id} not found")
    if application.user_id != user.id:  # type: ignore
        console_log.warning(
            f"Unauthorized user {user.id} requested access to application with id {id}"
        )
        raise HTTPException(
            status_code=403, detail=f"Not authorized to access application with {id}"
        )
    return application


async def execute_leads_etl(etl_event_id: UUID4):
    async with session_context() as db:
        try:
            # Load JSON data and insert into the database
            async with aiofiles.open(
                Path(settings.PUBLIC_ASSETS_DIR) / "leads.json", "r"
            ) as json_file:
                leads_data = json.loads(await json_file.read())

            for lead_data in leads_data:
                # Check if lead exists or handle duplicates appropriately
                lead = models.Lead(**lead_data)
                await db.merge(lead)  # or handle duplicates appropriately

            await db.commit()

            # Update ETLEvent status
            result = await db.execute(
                select(models.ETLEvent).filter(models.ETLEvent.id == etl_event_id)
            )
            etl_event = result.scalars().first()
            etl_event.status = "success"  # type: ignore
            await db.commit()

        except Exception as e:
            await db.rollback()  # Rollback on exception
            # Handle failure scenario
            result = await db.execute(
                select(models.ETLEvent).filter(models.ETLEvent.id == etl_event_id)
            )
            etl_event = result.scalars().first()
            etl_event.status = "failure"  # type: ignore
            await db.commit()
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
