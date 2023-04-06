from fastapi import Depends, HTTPException
from pydantic import UUID4
from app.core.security import fastapi_users, get_current_user, get_current_superuser
from app.core.db import get_async_session
from app.logging import console_log
from app import models, schemas


async def get_lead(id: UUID4, db = Depends(get_async_session)) -> models.Lead:
    lead = await db.get(models.Lead, id)
    if not lead:
        console_log.info(f"Lead with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Lead with {id} not found")
    return lead

async def get_search(id: UUID4, db = Depends(get_async_session)) -> models.Search:
    search = await db.get(models.Search, id)
    if not search:
        console_log.info(f"Search with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Search with {id} not found")
    return search

