from fastapi import APIRouter, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app import models, schemas
from app.api.deps import fastapi_users, get_async_session, get_current_user

router: APIRouter = APIRouter()

router.include_router(
    fastapi_users.get_users_router(schemas.UserRead, schemas.UserUpdate),
    tags=["users"],
)


@router.get(
    "/users/{user_id}/applications", response_model=list[schemas.ApplicationRead]
)
async def get_user_applications(user_id: UUID4, db=Depends(get_async_session)):
    result = await db.execute(
        select(models.Application).where(models.Application.user_id == user_id)
    )
    applications = result.scalars().all()
    return applications


@router.get("/users/{user_id}/skills", response_model=list[schemas.SkillRead])
async def get_user_skills(user_id: UUID4, db=Depends(get_async_session)):
    result = await db.execute(
        select(models.Skill).where(models.Skill.user_id == user_id)
    )
    skills = result.scalars().all()
    return skills


@router.get("/users/{user_id}/experiences", response_model=list[schemas.ExperienceRead])
async def get_user_experiences(user_id: UUID4, db=Depends(get_async_session)):
    result = await db.execute(
        select(models.Experience).where(models.Experience.user_id == user_id)
    )
    experiences = result.scalars().all()
    return experiences
