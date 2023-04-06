# app/api/leads.py
from fastapi import APIRouter, HTTPException, Path, Depends

from app.logging import console_log
from app.api.deps import get_async_session
from app import schemas, models
from pydantic import UUID4
from sqlalchemy import select

router = APIRouter()

async def get_lead(id: UUID4, db = Depends(get_async_session)) -> UUID4:
    lead = await db.get(models.Lead, id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.post("/", status_code=201, response_model=UUID4) 
async def create_lead(payload: schemas.LeadCreate, db = Depends(get_async_session)):
    lead = models.Lead(**payload.dict())
    db.add(lead)
    await db.commit() 
    await db.refresh(lead)
    return lead.id


@router.get("/{id}/", response_model=schemas.LeadRead)
async def read_lead(id: str, lead = Depends(get_lead)):
    return lead

@router.get("/", response_model=list[schemas.LeadRead])
async def read_leads(db = Depends(get_async_session)):
   rows = await db.execute(select(models.Lead))
   return rows.scalars().all()