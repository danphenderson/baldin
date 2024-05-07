# app/api/routes/contacts.py
import json

from aiofiles import open as aopen
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import AsyncSession, conf
from app.api.deps import console_log as log
from app.api.deps import (
    create_contact,
    create_extractor,
    create_orchestration_event,
    create_orchestration_pipeline,
    get_async_session,
    get_contact,
    get_current_user,
    get_extractor_by_name,
    get_orchestration_pipeline_by_name,
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


@router.post("/seed", response_model=str)
async def seed_contacts(
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    seed_path = conf.settings.SEEDS_PATH / "contacts.json"
    log.info(f"Seeding Contacts table with initial data from {seed_path}")

    # Fetch or create an orchestration pipeline
    try:
        pipeline = await get_orchestration_pipeline_by_name("seed_contacts", db, user)
    except HTTPException as e:
        if e.status_code == 404:
            pipeline = await create_orchestration_pipeline(
                schemas.OrchestrationPipelineCreate(
                    name="seed_contacts",
                    description="Seed contacts table with initial data",
                    definition={"action": "Insert initial data into Contacts table"},
                ),
                db=db,
                user=user,
            )
        else:
            raise e

    # Create an orchestration event
    event = await create_orchestration_event(
        schemas.OrchestrationEventCreate(
            message="Seed Contacts table with initial data",
            environment=conf.settings.ENVIRONMENT,
            pipeline_id=pipeline.id,  # type: ignore
            status=schemas.OrchestrationEventStatusType.PENDING,
            payload={"seed_path": str(seed_path)},
            source_uri=schemas.URI(name=str(seed_path), type=schemas.URIType.FILE),
            destination_uri=schemas.URI(
                name=f"{conf.settings.DEFAULT_SQLALCHEMY_DATABASE_URI}#contacts",
                type=schemas.URIType.DATABASE,
            ),
        ),
        db=db,
    )

    # Run the orchestration event
    try:
        async with aopen(seed_path, mode="r") as f:
            data = json.loads(await f.read())
        for contact in data:
            await create_contact(schemas.ContactCreate(**contact), db=db, user=user)
    except Exception as e:
        log.error(f"Error seeding Contacts table: {e}")
        setattr(event, "status", "failed")
        setattr(event, "message", f"Error seeding Contacts table: {e}")
        await db.commit()
        return f"Error seeding Contacts table: {e}"

    setattr(event, "status", "success")
    await db.commit()
    log.info(f"Contacts table seeded successfully with {len(data)} records")
    return f"Contacts table seeded successfully with {len(data)} records"
