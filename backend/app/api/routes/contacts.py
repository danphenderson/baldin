# app/api/routes/contacts.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import (
    AsyncSession,
    create_contact,
    create_extractor,
    get_async_session,
    get_contact,
    get_current_user,
    get_extractor_by_name,
    models,
    run_extractor,
    schemas,
)

router: APIRouter = APIRouter()


@router.get("/", response_model=list[schemas.ContactRead])
async def get_current_user_contacts(
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    result = await db.execute(
        select(models.Contact).where(models.Contact.user_id == user.id)
    )
    contacts = result.scalars().all()
    if not contacts:
        raise HTTPException(
            status_code=404, detail="No contacts found for the current user"
        )
    return contacts


@router.post("/", status_code=201, response_model=schemas.ContactRead)
async def create_user_contact(
    payload: schemas.ContactCreate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    contact = models.Contact(**payload.dict(), user_id=user.id)
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return contact


@router.get("/{contact_id}", response_model=schemas.ContactRead)
async def get_user_contact(
    contact: schemas.ContactRead = Depends(get_contact),
):
    return contact


@router.put("/{contact_id}", response_model=schemas.ContactRead)
async def update_user_contact(
    payload: schemas.ContactUpdate,
    contact: schemas.ContactRead = Depends(get_contact),
    db: AsyncSession = Depends(get_async_session),
):
    contact_data = payload.dict(exclude_unset=True)
    for field in contact_data:
        setattr(contact, field, contact_data[field])
    await db.commit()
    await db.refresh(contact)
    return contact


@router.delete("/{contact_id}", status_code=204)
async def delete_user_contact(
    contact: schemas.ContactRead = Depends(get_contact),
    db: AsyncSession = Depends(get_async_session),
):
    await db.delete(contact)
    await db.commit()
    return None


@router.post("/extract", response_model=list[schemas.ContactRead])
async def extract_contacts(
    payload: schemas.ExtractorRun,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    try:
        extractor = await get_extractor_by_name("contacts", db)
    except HTTPException as e:
        if e.status_code == 404:
            extractor = await create_extractor(
                schemas.ExtractorCreate(
                    name="contacts",
                    description="Contact data extractor",
                    instruction="Extract contact JSON data from a given context",
                    json_schema=schemas.ContactCreate.model_json_schema(),
                    extractor_examples=[],
                ),
                db=db,
                user=user,
            )
        else:
            raise e

    resp = await run_extractor(
        schemas.ExtractorRead(**extractor.__dict__), payload, user, db
    )

    return [
        await create_contact(schemas.ContactCreate(**contact), db=db, user=user)
        for contact in resp.data
    ]
