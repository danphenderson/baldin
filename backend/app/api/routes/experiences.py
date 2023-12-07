# app/api/experiences.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import select

from app import models, schemas
from app.api.deps import get_async_session

router: APIRouter = APIRouter()


@router.post("/", status_code=201, response_model=schemas.ExperienceRead)
async def create_experience(
    payload: schemas.ExperienceCreate,
    db=Depends(get_async_session),
):
    experience = models.Experience(**payload.dict())
    db.add(experience)
    await db.commit()
    await db.refresh(experience)
    return experience


@router.get("/{experience_id}", response_model=schemas.ExperienceRead)
async def get_experience(
    experience_id: UUID4,
    db=Depends(get_async_session),
):
    result = await db.execute(
        select(models.Experience).where(models.Experience.id == experience_id)
    )
    experience = result.scalars().first()
    if not experience:
        raise HTTPException(status_code=404, detail="Experience not found")
    return experience


@router.get("/", response_model=list[schemas.ExperienceRead])
async def get_experiences(
    db=Depends(get_async_session),
):
    result = await db.execute(select(models.Experience))
    experiences = result.scalars().all()
    return experiences


@router.put("/{experience_id}", response_model=schemas.ExperienceRead)
async def update_experience(
    experience_id: UUID4,
    payload: schemas.ExperienceUpdate,
    db=Depends(get_async_session),
):
    result = await db.execute(
        select(models.Experience).where(models.Experience.id == experience_id)
    )
    experience = result.scalars().first()
    if not experience:
        raise HTTPException(status_code=404, detail="Experience not found")
    experience_data = payload.dict(exclude_unset=True)
    for field in experience_data:
        setattr(experience, field, experience_data[field])
    await db.commit()
    await db.refresh(experience)
    return experience
