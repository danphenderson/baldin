# app/api/contacts.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import select

from app import models, schemas
from app.api.deps import get_async_session, get_contact

router: APIRouter = APIRouter()


@router.post("/", status_code=201, response_model=schemas.ContactRead)
async def create_contact(
    payload: schemas.ContactCreate,
    db=Depends(get_async_session),
):
    # Check if contact already exists for the given email
    existing_contact = await db.execute(
        select(models.Contact).where(models.Contact.email == payload.email)
    )
    existing_contact = existing_contact.scalars().first()

    if existing_contact:
        # Contact for this email already exists, return an error response
        raise HTTPException(
            status_code=400, detail="Contact for this email already exists"
        )

    # Create a new contact
    contact = models.Contact(**payload.dict())
    db.add(contact)
    await db.commit()
    await db.refresh(contact)

    return contact


@router.get("/{id}/", status_code=202, response_model=schemas.ContactRead)
async def get_contact_by_id(
    id: UUID4, contact=Depends(get_contact)
) -> schemas.ContactRead:
    """Get a contact by ID."""
    return contact


@router.get("/", status_code=200, response_model=schemas.ContactRead)
async def get_contact_by_email(
    email: str, db=Depends(get_async_session)
) -> schemas.ContactRead:
    """Get a contact by email."""
    result = await db.execute(
        select(models.Contact).where(models.Contact.email == email)
    )
    contact = result.scalars().first()

    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    return contact


@router.put("/{id}/", status_code=202, response_model=schemas.ContactRead)
async def update_contact(
    id: UUID4,
    payload: schemas.ContactUpdate,
    contact=Depends(get_contact),
    db=Depends(get_async_session),
) -> schemas.ContactRead:
    """Update a contact."""
    contact_data = payload.dict(exclude_unset=True)
    for field in contact_data:
        setattr(contact, field, contact_data[field])
    await db.commit()
    await db.refresh(contact)
    return contact


@router.delete("/{id}/", status_code=204)
async def delete_contact(
    id: UUID4,
    contact=Depends(get_contact),
    db=Depends(get_async_session),
):
    """Delete a contact."""
    db.delete(contact)
    await db.commit()
    return None
