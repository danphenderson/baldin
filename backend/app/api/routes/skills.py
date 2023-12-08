# app/api/routes/skills.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import (
    AsyncSession,
    get_async_session,
    get_current_user,
    get_skill,
    models,
    schemas,
)

router: APIRouter = APIRouter()


@router.get("/", response_model=list[schemas.SkillRead])
async def get_current_user_skills(
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    result = await db.execute(
        select(models.Skill).where(models.Skill.user_id == user.id)
    )
    skills = result.scalars().all()

    if not skills:
        raise HTTPException(
            status_code=404, detail="No applications found for the current user"
        )

    return skills


@router.post("/", status_code=201, response_model=schemas.SkillRead)
async def create_user_skill(
    payload: schemas.SkillCreate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    skill = models.Skill(**payload.dict(), user_id=user.id)
    db.add(skill)
    await db.commit()
    await db.refresh(skill)
    return skill


@router.get("/{skill_id}", response_model=schemas.SkillRead)
async def get_user_skill(
    skill: schemas.SkillRead = Depends(get_skill),
):
    return skill


@router.put("/{skill_id}", response_model=schemas.SkillRead)
async def update_user_skill(
    payload: schemas.SkillUpdate,
    skill: schemas.SkillRead = Depends(get_skill),
    db: AsyncSession = Depends(get_async_session),
):
    skill_data = payload.dict(exclude_unset=True)
    for field in skill_data:
        setattr(skill, field, skill_data[field])
    await db.commit()
    await db.refresh(skill)
    return skill


@router.delete("/{skill_id}", status_code=204, response_model=None)
async def delete_user_skill(
    skill: schemas.SkillRead = Depends(get_skill),
    db: AsyncSession = Depends(get_async_session),
):
    await db.delete(skill)
    await db.commit()
    return None
