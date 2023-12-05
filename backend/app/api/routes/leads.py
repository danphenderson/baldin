# app/api/leads.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import select

from app import models, schemas
from app.api.deps import get_lead
from app.core.db import get_async_session

router: APIRouter = APIRouter()


@router.post("/", status_code=201, response_model=UUID4)
async def create_lead(payload: schemas.LeadCreate, db=Depends(get_async_session)):
    # Check if a lead with the same URL already exists
    existing_lead = await db.execute(
        select(models.Lead).where(models.Lead.url == payload.url)
    )
    existing_lead = existing_lead.scalars().first()

    if existing_lead:
        # Lead with the same URL already exists, return an error response
        raise HTTPException(status_code=400, detail="Lead with this URL already exists")

    # Create a new lead if it doesn't exist
    lead = models.Lead(**payload.dict())
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return lead.id  # Consider returning the full lead object


@router.get("/{id}/", status_code=202, response_model=schemas.LeadRead)
async def read_lead(id: UUID4, lead=Depends(get_lead)):
    return lead


@router.get("/", response_model=list[schemas.LeadRead])
async def read_leads(db=Depends(get_async_session)):
    rows = await db.execute(select(models.Lead))
    result = rows.scalars().all()
    if not result:
        raise HTTPException(status_code=404, detail="No leads found")
    return result


@router.delete("/{id}/", status_code=202)
async def delete_lead(id: UUID4, db=Depends(get_async_session)):
    lead = await db.get(models.Lead, id)
    await db.delete(lead)
    await db.commit()
