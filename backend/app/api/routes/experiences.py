# app/api/routes/experiences.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import select

from app.api.deps import (
    AsyncSession,
    get_async_session,
    get_current_user,
    get_experience,
    models,
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
