# app/api/contacts.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import select

from app import models, schemas
from app.api.deps import get_async_session, get_contact, get_current_user

router: APIRouter = APIRouter()


@router.post("/", status_code=201, response_model=schemas.ContactRead)
async def create_user_contact(
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


@router.get("/{contact_id}", response_model=schemas.ContactRead)
async def get_user_contact(
    contact: models.Contact = Depends(get_contact),
):
    return contact
