# app/api/routes/experiences.py
import json

from aiofiles import open as aopen
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import AsyncSession, conf
from app.api.deps import console_log as log
from app.api.deps import (
    create_experience,
    create_extractor,
    create_orchestration_event,
    create_orchestration_pipeline,
    get_async_session,
    get_current_user,
    get_experience,
    get_extractor_by_name,
    get_orchestration_pipeline_by_name,
    models,
    run_extractor,
    schemas,
)

router: APIRouter = APIRouter()


@router.get("/", response_model=list[schemas.ExperienceRead])
async def read_current_user_experiences(
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    result = await db.execute(
        select(models.Experience).where(models.Experience.user_id == user.id)
    )
    experiences = result.scalars().all()
    if not experiences:
        raise HTTPException(
            status_code=404, detail="No experiences found for the current user"
        )
    return experiences


@router.post("/", status_code=201, response_model=schemas.ExperienceRead)
async def create_user_experience(
    payload: schemas.ExperienceCreate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    experience = models.Experience(**payload.dict(), user_id=user.id)
    log.info(f"Creating experience: {experience.__dict__}")
    db.add(experience)
    await db.commit()
    await db.refresh(experience)
    return experience


@router.get("/{experience_id}", response_model=schemas.ExperienceRead)
async def read_user_experience(
    experience: schemas.ExperienceRead = Depends(get_experience),
):
    return experience


@router.put("/{experience_id}", response_model=schemas.ExperienceRead)
async def update_user_experience(
    payload: schemas.ExperienceUpdate,
    experience: schemas.ExperienceRead = Depends(get_experience),
    db: AsyncSession = Depends(get_async_session),
):
    experience_data = payload.dict(exclude_unset=True)
    for field in experience_data:
        setattr(experience, field, experience_data[field])
    await db.commit()
    await db.refresh(experience)
    return experience


@router.delete("/{experience_id}", status_code=204)
async def delete_user_experience(
    experience: schemas.ExperienceRead = Depends(get_experience),
    db: AsyncSession = Depends(get_async_session),
):
    await db.delete(experience)
    await db.commit()
    return None


@router.post("/extract", response_model=list[schemas.ExperienceRead])
async def extract_user_experiences(
    payload: schemas.ExtractorRun,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    try:
        extractor = await get_extractor_by_name("experiences", db)
    except HTTPException as e:
        if e.status_code == 404:
            extractor = await create_extractor(
                schemas.ExtractorCreate(
                    name="experiences",
                    description="Experience data extractor",
                    instruction="Extract experinces JSON data from a given context",
                    json_schema=schemas.ExperienceCreate.model_json_schema(),
                    extractor_examples=[],
                ),
                db=db,
                user=user,
            )
        else:
            raise e

    # Run the extractor with the given payload
    resp = await run_extractor(
        schemas.ExtractorRead(**extractor.__dict__), payload, user, db
    )

    # Save the extracted experiences to the database
    return [
        await create_experience(schemas.ExperienceCreate(**experience), db, user)
        for experience in resp.data
    ]


@router.post("/seed", response_model=str)
async def seed_experiences(
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> str:
    seed_path = conf.settings.SEEDS_PATH / "experiences.json"
    log.info(f"Seeding Experiences table with initial data from {seed_path}")

    # Fetch or create an orchestration pipeline
    try:
        pipeline = await get_orchestration_pipeline_by_name(
            "seed_experiences", db, user
        )
    except HTTPException as e:
        if e.status_code == 404:
            log.warning("Seed Experiences pipeline not found, creating a new one")
            pipeline = await create_orchestration_pipeline(
                schemas.OrchestrationPipelineCreate(
                    name="seed_experiences",
                    description="Seed Experiences table with initial data",
                    definition={"action": "Insert initial data into Experiences table"},
                ),
                user,
                db,
            )
        else:
            raise e

    # Create an orchestration event
    event = await create_orchestration_event(
        schemas.OrchestrationEventCreate(
            message="Seeding Experiences table with initial data",
            environment=conf.settings.ENVIRONMENT,
            pipeline_id=pipeline.id,
            status=schemas.OrchestrationEventStatusType.PENDING,
            payload={},
            source_uri=schemas.URI(name=str(seed_path), type=schemas.URIType.FILE),
            destination_uri=schemas.URI(
                name=f"{conf.settings.DEFAULT_SQLALCHEMY_DATABASE_URI}#experiences",
                type=schemas.URIType.DATABASE,
            ),
        ),
        db=db,
    )

    # Run the orchestration event
    try:
        async with aopen(seed_path, "r") as f:
            experience_data = json.loads(await f.read())
        for experience_entry in experience_data:
            await create_experience(
                schemas.ExperienceCreate(**experience_entry),
                db=db,
                user=user,
            )
    except Exception as e:
        log.error(f"Error seeding Experiences table: {e}")
        setattr(event, "status", schemas.OrchestrationEventStatusType.FAILED)
        setattr(event, "message", str(e))
        await db.commit()
        raise HTTPException(status_code=500, detail=str(e))

    setattr(event, "status", schemas.OrchestrationEventStatusType.SUCCESS)
    await db.commit()
    log.info(f"Seeded Experiences table with {len(experience_data)} records.")
    return f"Seeded Experiences table with {len(experience_data)} records."
