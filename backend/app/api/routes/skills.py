# app/api/skills.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import select

from app import models, schemas
from app.api.deps import get_async_session

router: APIRouter = APIRouter()


@router.post("/", status_code=201, response_model=schemas.SkillRead)
async def create_skill(
    payload: schemas.SkillCreate,
    db=Depends(get_async_session),
):
    skill = models.Skill(**payload.dict())
    db.add(skill)
    await db.commit()
    await db.refresh(skill)
    return skill


@router.get("/{skill_id}", response_model=schemas.SkillRead)
async def get_skill(
    skill_id: UUID4,
    db=Depends(get_async_session),
):
    result = await db.execute(select(models.Skill).where(models.Skill.id == skill_id))
    skill = result.scalars().first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return skill


@router.get("/", response_model=list[schemas.SkillRead])
async def get_skills(
    db=Depends(get_async_session),
):
    result = await db.execute(select(models.Skill))
    skills = result.scalars().all()
    return skills


@router.put("/{skill_id}", response_model=schemas.SkillRead)
async def update_skill(
    skill_id: UUID4,
    payload: schemas.SkillUpdate,
    db=Depends(get_async_session),
):
    result = await db.execute(select(models.Skill).where(models.Skill.id == skill_id))
    skill = result.scalars().first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    skill_data = payload.dict(exclude_unset=True)
    for field in skill_data:
        setattr(skill, field, skill_data[field])
    await db.commit()
    await db.refresh(skill)
    return skill


@router.delete("/{skill_id}", response_model=schemas.SkillRead)
async def delete_skill(
    skill_id: UUID4,
    db=Depends(get_async_session),
):
    result = await db.execute(select(models.Skill).where(models.Skill.id == skill_id))
    skill = result.scalars().first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    await db.delete(skill)
    await db.commit()
    return skill
