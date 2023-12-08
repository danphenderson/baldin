# app/api/routes/leads.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import select

from app.api.deps import (
    AsyncSession,
    get_async_session,
    get_lead,
    models,
    schemas,
)

router: APIRouter = APIRouter()


@router.post("/", status_code=201, response_model=UUID4)
async def create_lead(
    payload: schemas.LeadCreate,
    db: AsyncSession = Depends(get_async_session)
):
    # Check if a lead with the same URL already exists
    existing_lead = await db.execute(
        select(models.Lead).where(models.Lead.url == payload.url)
    )
    existing_lead = existing_lead.scalars().first() # type: ignore

    if existing_lead:
        # Lead with the same URL already exists, return an error response
        raise HTTPException(status_code=400, detail="Lead with this URL already exists")

    # Create a new lead if it doesn't exist
    lead = models.Lead(**payload.dict())
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return lead.id  # Consider returning the full lead object


@router.get("/{id}", status_code=202, response_model=schemas.LeadRead)
async def read_lead(
    lead: schemas.LeadRead = Depends(get_lead)
):
    return lead


@router.get("/", response_model=list[schemas.LeadRead])
async def read_leads(
    db: AsyncSession = Depends(get_async_session)
):
    rows = await db.execute(select(models.Lead))
    result = rows.scalars().all()
    if not result:
        raise HTTPException(status_code=404, detail="No leads found")
    return result


@router.patch("/{id}", status_code=200, response_model=schemas.LeadRead)
async def update_lead(
    id: UUID4,
    payload: schemas.LeadUpdate,
    db: AsyncSession = Depends(get_async_session)
):
    # Retrieve the existing lead
    result = await db.execute(select(models.Lead).where(models.Lead.id == id))
    lead = result.scalars().first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Update the lead's attributes
    for var, value in payload.dict(exclude_unset=True).items():
        setattr(lead, var, value)

    await db.commit()
    await db.refresh(lead)
    return lead


@router.delete("/{id}", status_code=202, response_model=dict)
async def delete_lead(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session)
):
    lead = await db.get(models.Lead, id)
    await db.delete(lead)
    await db.commit()
    return {"message": "Lead deleted successfully"}
