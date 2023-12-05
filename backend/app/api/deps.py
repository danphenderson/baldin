import json
import aiofiles
from fastapi import Depends, HTTPException
from pydantic import UUID4

from app import models, schemas  # noqa
from app.core.db import get_async_session
from app.core.security import (  # noqa
    fastapi_users,
    get_current_superuser,
    get_current_user,
)
from app.core.conf import settings
from app.logging import console_log
from sqlalchemy.orm import selectinload
from pathlib import Path


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


def _convert_lead_public_assets():
    # Load JSON data from ./public/leads/* and insert into the database
    # Specify the directory path containing JSON files
    json_directory = Path(settings.PUBLIC_ASSETS_DIR) / 'leads'

    leads = []
    # Iterate over all files in the directory
    for json_file in json_directory.iterdir():
        if json_file.is_file() and json_file.suffix.lower() == '.json':
            # Check if it's a file and has a .json extension
            try:
                with open(json_file, 'r') as file:
                    json_data = json.load(file)
                    leads.append(json_data)
                # Now you can work with the JSON data in json_data
                print(json_data)
                
            except Exception as e:
                print(f"Error reading JSON file {json_file}: {e}")

    return leads


async def execute_leads_etl(
        etl_event_id: UUID4, db = Depends(get_async_session)
):
    try:
        # Load JSON data from ./public/leads.json and insert into the database
       
        async with aiofiles.open(Path(settings.PUBLIC_ASSETS_DIR)/ 'leads.json', 'r') as json_file:
            leads_data = json.loads(await json_file.read())
        
        
        for lead_data in leads_data:
            lead = models.Lead(**lead_data)
            db.add(lead)
        
        # Update the ETL event status to success
        etl_event = await db.execute(selectinload(models.ETLEvent).filter(models.ETLEvent.id == etl_event_id)) # type: ignore
        etl_event.status = "success"
        
        await db.commit()
    except Exception as e:
        # Update the ETL event status to failure if an exception occurs
        etl_event = await db.execute(selectinload(models.ETLEvent).filter(models.ETLEvent.id == etl_event_id)) # type: ignore
        etl_event.status = "failure"
        
        await db.commit()
        raise e
    