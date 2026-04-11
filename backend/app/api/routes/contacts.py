# app/api/routes/contacts.py
from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import select

from app.api.deps import (
    AsyncSession,
    create_contact,
    extract_and_create_records,
    get_async_session,
    get_contact,
    get_current_user,
    models,
    schemas,
)
from app.api.routes.seed_tasks import (
    SeedOperation,
    build_user_seed_creator,
    schedule_seed_operation,
)

router: APIRouter = APIRouter()

CONTACT_SEED_OPERATION = SeedOperation(
    pipeline_name="seed_contacts",
    resource_name="Contacts",
    seed_filename="contacts.json",
    destination_table="contacts",
    creator=build_user_seed_creator(schemas.ContactCreate, create_contact),
)


@router.get("/", response_model=list[schemas.ContactRead])
async def get_current_user_contacts(
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    result = await db.execute(
        select(models.Contact).where(models.Contact.user_id == user.id)
    )
    contacts = result.scalars().all()
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


@router.get("/{id}", response_model=schemas.ContactRead)
async def get_user_contact(
    contact: schemas.ContactRead = Depends(get_contact),
):
    return contact


@router.patch("/{id}", response_model=schemas.ContactRead)
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


@router.delete("/{id}", status_code=204)
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
    return await extract_and_create_records(
        extractor_name="contacts",
        extractor_description="Contact data extractor",
        extractor_instruction="Extract contact JSON data from a given context",
        json_schema=schemas.ContactCreate.model_json_schema(),
        payload=payload,
        record_factory=lambda data: create_contact(
            schemas.ContactCreate(**data), db=db, user=user
        ),
        db=db,
        user=user,
    )


@router.post("/seed", status_code=202, response_model=schemas.SeedOperationAccepted)
async def seed_contacts(
    background_tasks: BackgroundTasks,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    return await schedule_seed_operation(
        background_tasks, db, user, CONTACT_SEED_OPERATION
    )
