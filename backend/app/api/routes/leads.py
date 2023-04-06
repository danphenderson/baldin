# app/api/leads.py
from fastapi import APIRouter, HTTPException, Depends

from app.core.db import get_async_session
from app.api.deps import get_lead
from app import schemas, models
from pydantic import UUID4
from sqlalchemy import select

router : APIRouter = APIRouter()


@router.post("/", status_code=201, response_model=UUID4) 
async def create_lead(payload: schemas.LeadCreate, db = Depends(get_async_session)):
    lead = models.Lead(**payload.dict())
    db.add(lead)
    await db.commit() 
    await db.refresh(lead)
    return lead.id


@router.get("/{id}/", status_code=202, response_model=schemas.LeadRead)
async def read_lead(id: UUID4, lead = Depends(get_lead)):
    return schemas.LeadRead.from_orm(lead) # Is it necessary to use from_orm here?

@router.get("/url/{url}/", status_code=202, response_model=schemas.LeadRead)
async def read_lead_by_url(url: str, db = Depends(get_async_session)):
    rows = await db.execute(select(models.Lead).where(models.Lead.url == url))
    result = rows.scalars().first()
    if not result:
        raise HTTPException(status_code=404, detail="Lead not found")
    return schemas.LeadRead.from_orm(result)


@router.get("/{id}/searches/", response_model=list[schemas.SearchRead])
async def read_searches_by_lead(id: UUID4, lead = Depends(get_lead)):
    # TODO: This is a hack. I need to use a query param in get_lead to have full data optional
    return lead.searches


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
