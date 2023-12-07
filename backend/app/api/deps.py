# app/api/deps.py

import json
from pathlib import Path

import aiofiles
from fastapi import Depends, HTTPException, status
from pydantic import UUID4
from sqlalchemy.future import select

from app import models, schemas
from app.core import security
from app.core.conf import settings
from app.core.db import get_async_session, session_context
from app.core.openai import get_openai_client
from app.core.security import (  # noqa
    fastapi_users,
    get_current_superuser,
    get_current_user,
)
from app.logging import console_log


async def get_lead(id: UUID4, db=Depends(get_async_session)) -> models.Lead:
    lead = await db.get(models.Lead, id)
    if not lead:
        console_log.info(f"Lead with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Lead with {id} not found")
    return lead


async def get_etl_event(id: UUID4, db=Depends(get_async_session)) -> models.ETLEvent:
    etl_event = await db.get(models.ETLEvent, id)
    if not etl_event:
        console_log.info(f"ETL event with id {id} not found")
        raise HTTPException(status_code=404, detail=f"ETL event with {id} not found")
    return etl_event


async def get_skill(id: UUID4, db=Depends(get_async_session)) -> models.Skill:
    skill = await db.get(models.Skill, id)
    if not skill:
        console_log.info(f"Skill with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Skill with {id} not found")
    return skill


async def get_experience(id: UUID4, db=Depends(get_async_session)) -> models.Experience:
    experience = await db.get(models.Experience, id)
    if not experience:
        console_log.info(f"Experience with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Experience with {id} not found")
    return experience


async def get_resume(id: UUID4, db=Depends(get_async_session)) -> models.Resume:
    resume = await db.get(models.Resume, id)
    if not resume:
        console_log.info(f"Resume with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Resume with {id} not found")
    return resume


async def get_contact(id: UUID4, db=Depends(get_async_session)) -> models.Contact:
    contact = await db.get(models.Contact, id)
    if not contact:
        console_log.info(f"Contact with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Contact with {id} not found")
    return contact


async def get_cover_letter(
    id: UUID4, db=Depends(get_async_session), user=Depends(get_current_user)
) -> models.CoverLetter:
    cover_letter = await db.get(models.CoverLetter, id)
    if not cover_letter:
        console_log.info(f"Cover letter with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Cover letter with {id} not found")

    if cover_letter.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Operation not permitted"
        )
    return cover_letter


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
            etl_event.status = "success"
            await db.commit()

        except Exception as e:
            await db.rollback()  # Rollback on exception
            # Handle failure scenario
            result = await db.execute(
                select(models.ETLEvent).filter(models.ETLEvent.id == etl_event_id)
            )
            etl_event = result.scalars().first()
            etl_event.status = "failure"
            await db.commit()
            raise e
