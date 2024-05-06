# app/api/routes/education.py

import json

from aiofiles import open as aopen
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import AsyncSession, conf
from app.api.deps import console_log as log
from app.api.deps import (
    create_education,
    create_extractor,
    create_orchestration_event,
    create_orchestration_pipeline,
    get_async_session,
    get_current_user,
    get_education,
    get_extractor_by_name,
    get_orchestration_pipeline_by_name,
    models,
    run_extractor,
    schemas,
)

router: APIRouter = APIRouter()


@router.get("/", response_model=list[schemas.EducationRead])
async def read_current_user_educations(
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    result = await db.execute(
        select(models.Education).where(models.Education.user_id == user.id)
    )
    educations = result.scalars().all()
    if not educations:
        raise HTTPException(
            status_code=404, detail="No educations found for the current user"
        )
    return educations


@router.get("/{education_id}", response_model=schemas.EducationRead)
async def read_user_education(
    education: schemas.EducationRead = Depends(get_education),
):
    return education


@router.post("/", status_code=201, response_model=schemas.EducationRead)
async def create_user_education(
    payload: schemas.EducationCreate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    education = models.Education(**payload.dict(), user_id=user.id)
    db.add(education)
    await db.commit()
    await db.refresh(education)
    return education


@router.put("/{education_id}", response_model=schemas.EducationRead)
async def update_user_education(
    payload: schemas.EducationUpdate,
    education: schemas.EducationRead = Depends(get_education),
    db: AsyncSession = Depends(get_async_session),
):
    for field, value in payload:
        setattr(education, field, value)
    await db.commit()
    await db.refresh(education)
    return education


@router.delete("/{education_id}", response_model=schemas.EducationRead)
async def delete_user_education(
    education: schemas.EducationRead = Depends(get_education),
    db: AsyncSession = Depends(get_async_session),
):
    await db.delete(education)
    await db.commit()
    return education


@router.post("/extract", response_model=list[schemas.EducationRead])
async def extract_education(
    payload: schemas.ExtractorRun,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    try:
        extractor = await get_extractor_by_name("educations", db)
    except HTTPException as e:
        if e.status_code == 404:
            extractor = await create_extractor(
                schemas.ExtractorCreate(
                    name="educations",
                    description="Education data extractor",
                    instruction="Extract education JSON data from a given context",
                    json_schema=schemas.EducationCreate.model_json_schema(),
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
        await create_education(schemas.EducationCreate(**contact), db=db, user=user)
        for contact in resp.data
    ]


@router.post("/seed", response_model=str)
async def seed_education(
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> str:
    seed_path = conf.settings.SEEDS_PATH / "education.json"
    log.info(f"Seeding Education table with initial data from {seed_path}")

    # Fetch or create an orchestration pipeline
    try:
        pipeline = await get_orchestration_pipeline_by_name("seed_education", db, user)
    except HTTPException as e:
        if e.status_code == 404:
            log.warning("Seed Education pipeline not found, creating a new one")
            pipeline = await create_orchestration_pipeline(
                schemas.OrchestrationPipelineCreate(
                    name="seed_education",
                    description="Seed Education table with initial data",
                    definition={"action": "Insert initial data into Education table"},
                ),
                user,
                db,
            )
        else:
            raise e

    # Create an orchestration event
    event = await create_orchestration_event(
        schemas.OrchestrationEventCreate(
            message="Seeding Education table with initial data",
            environment=conf.settings.ENVIRONMENT,
            pipeline_id=pipeline.id,
            status=schemas.OrchestrationEventStatusType.PENDING,
            payload={},
            source_uri=schemas.URI(name=str(seed_path), type=schemas.URIType.FILE),
            destination_uri=schemas.URI(
                name=f"{conf.settings.DEFAULT_SQLALCHEMY_DATABASE_URI}#education",
                type=schemas.URIType.DATABASE,
            ),
        ),
        db=db,
    )

    # Run the orchestration event
    try:
        async with aopen(seed_path, "r") as f:
            education_data = json.loads(await f.read())
        for education_entry in education_data:
            await create_education(
                schemas.EducationCreate(**education_entry),
                db=db,
                user=user,
            )
    except Exception as e:
        log.error(f"Error seeding Education table: {e}")
        setattr(event, "status", schemas.OrchestrationEventStatusType.FAILED)
        setattr(event, "message", str(e))
        await db.commit()
        raise HTTPException(status_code=500, detail=str(e))

    setattr(event, "status", schemas.OrchestrationEventStatusType.SUCCESS)
    await db.commit()
    log.info(f"Seeded Education table with {len(education_data)} records.")
    return f"Seeded Education table with {len(education_data)} records."
