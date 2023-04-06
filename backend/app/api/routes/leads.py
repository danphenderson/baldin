# app/api/leads.py
from fastapi import APIRouter, HTTPException, Depends

from app.logging import console_log
from app.api.deps import get_async_session
from app import schemas, models
from pydantic import UUID4
from sqlalchemy import select

router = APIRouter()

async def get_lead(id: UUID4, db = Depends(get_async_session)) -> models.Lead:
    lead = await db.get(models.Lead, id)
    if not lead:
        console_log.info(f"Lead with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Lead with {id.__dict__} not found")
    return lead


@router.post("/", status_code=201, response_model=UUID4) 
async def create_lead(payload: schemas.LeadCreate, db = Depends(get_async_session)):
    lead = models.Lead(**payload.dict())
    db.add(lead)
    await db.commit() 
    await db.refresh(lead)
    return lead.id


@router.get("/{id}/", status_code=202, response_model=schemas.LeadRead)
async def read_lead(id: UUID4, lead = Depends(get_lead)):
    console_log.warning(f"Lead with id {id} found {lead}")
    return schemas.LeadRead.from_orm(lead)

@router.get("/", response_model=list[schemas.LeadRead])
async def read_leads(db = Depends(get_async_session)):
    rows = await db.execute(select(models.Lead))
    result = rows.scalars().all()
    if not result:
       raise HTTPException(status_code=404, detail="No leads found")
    return result

@router.delete("/{id}/", status_code=202)
async def delete_lead(id: UUID4, db = Depends(get_async_session)):
    lead = await db.get(models.Lead, id)
    await db.delete(lead)
    await db.commit()