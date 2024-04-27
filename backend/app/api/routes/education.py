# app/api/routes/education.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import (
    AsyncSession,
    create_education,
    create_extractor,
    get_async_session,
    get_current_user,
    get_education,
    get_extractor_by_name,
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
