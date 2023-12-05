from fastapi import Depends, HTTPException
from pydantic import UUID4

from app import models, schemas  # noqa
from app.core.db import get_async_session
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
