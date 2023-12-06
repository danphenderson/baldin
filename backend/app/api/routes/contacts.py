# app/api/contacts.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app import models, schemas
from app.api.deps import get_async_session, get_contact

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


@router.get("/", response_model=list[schemas.ContactRead])
async def get_all_contacts(
    db=Depends(get_async_session),
):
    rows = await db.execute(select(models.Contact))
    result = rows.scalars().all()
    if not result:
        raise HTTPException(status_code=404, detail="No contacts found")
    return result


@router.get("/{contact_id}", response_model=schemas.ContactRead)
async def get_contact_by_id(
    contact: models.Contact = Depends(get_contact),
):
    return contact


@router.patch("/{contact_id}", response_model=schemas.ContactRead)
async def update_contact_by_id(
    payload: schemas.ContactUpdate,
    contact: models.Contact = Depends(get_contact),
    db=Depends(get_async_session),
):
    # Update the contact's attributes
    for var, value in payload.dict(exclude_unset=True).items():
        setattr(contact, var, value)

    await db.commit()
    await db.refresh(contact)

    return contact


@router.delete("/{contact_id}", status_code=204)
async def delete_contact_by_id(
    contact: models.Contact = Depends(get_contact),
    db=Depends(get_async_session),
):
    db.delete(contact)
    await db.commit()
    return None
