# app/api/routes/education.py

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy import func, select

from app.api.deps import (
    AsyncSession,
    create_education,
    extract_and_create_records,
    get_async_session,
    get_current_user,
    get_education,
    models,
    schemas,
)
from app.api.routes.seed_tasks import (
    SeedOperation,
    build_user_seed_creator,
    schedule_seed_operation,
)

router: APIRouter = APIRouter()

EDUCATION_SEED_OPERATION = SeedOperation(
    pipeline_name="seed_education",
    resource_name="Education",
    seed_filename="education.json",
    destination_table="education",
    creator=build_user_seed_creator(schemas.EducationCreate, create_education),
)


@router.get("/", response_model=schemas.PaginatedResponse[schemas.EducationRead])
async def read_current_user_educations(
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
):
    base = select(models.Education).where(models.Education.user_id == user.id)
    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar_one()
    offset = (page - 1) * page_size
    result = await db.execute(base.offset(offset).limit(page_size))
    return schemas.PaginatedResponse[schemas.EducationRead](
        items=result.scalars().all(),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{id}", response_model=schemas.EducationRead)
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


@router.patch("/{id}", response_model=schemas.EducationRead)
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


@router.delete("/{id}", response_model=schemas.EducationRead)
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
    return await extract_and_create_records(
        extractor_name="education",
        extractor_description="Education data extractor",
        extractor_instruction="Extract education JSON data from a given context",
        json_schema=schemas.EducationCreate.model_json_schema(),
        payload=payload,
        record_factory=lambda data: create_education(
            schemas.EducationCreate(**data), db=db, user=user
        ),
        db=db,
        user=user,
    )


@router.post("/seed", status_code=202, response_model=schemas.SeedOperationAccepted)
async def seed_education(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    return await schedule_seed_operation(
        background_tasks, db, user, EDUCATION_SEED_OPERATION
    )
