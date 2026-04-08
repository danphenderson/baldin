# app/api/routes/experiences.py
from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import select

from app.api.deps import (
    AsyncSession,
    create_experience,
    extract_and_create_records,
    get_async_session,
    get_current_user,
    get_experience,
    models,
    schemas,
)
from app.api.deps import console_log as log
from app.api.routes.seed_tasks import (
    SeedOperation,
    build_user_seed_creator,
    schedule_seed_operation,
)

router: APIRouter = APIRouter()

EXPERIENCE_SEED_OPERATION = SeedOperation(
    pipeline_name="seed_experiences",
    resource_name="Experiences",
    seed_filename="experiences.json",
    destination_table="experiences",
    creator=build_user_seed_creator(schemas.ExperienceCreate, create_experience),
)


@router.get("/", response_model=list[schemas.ExperienceRead])
async def read_current_user_experiences(
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    result = await db.execute(
        select(models.Experience).where(models.Experience.user_id == user.id)
    )
    experiences = result.scalars().all()
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
    return await extract_and_create_records(
        extractor_name="experiences",
        extractor_description="Experience data extractor",
        extractor_instruction="Extract experiences JSON data from a given context",
        json_schema=schemas.ExperienceCreate.model_json_schema(),
        payload=payload,
        record_factory=lambda data: create_experience(
            schemas.ExperienceCreate(**data), db=db, user=user
        ),
        db=db,
        user=user,
    )


@router.post("/seed", status_code=202, response_model=schemas.SeedOperationAccepted)
async def seed_experiences(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    return await schedule_seed_operation(
        background_tasks, db, user, EXPERIENCE_SEED_OPERATION
    )
