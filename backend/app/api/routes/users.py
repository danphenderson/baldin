from fastapi import APIRouter, Depends
from sqlalchemy import select

from app import models, schemas
from app.api.deps import fastapi_users, get_async_session, get_current_user

router: APIRouter = APIRouter()


router.include_router(
    fastapi_users.get_users_router(schemas.UserRead, schemas.UserUpdate),
    tags=["users"],
)


@router.get("/applications", response_model=list[schemas.ApplicationRead])
async def get_current_user_applications(
    user=Depends(get_current_user), db=Depends(get_async_session)
):
    result = await db.execute(
        select(models.Application).where(models.Application.user_id == user.id)
    )
    applications = result.scalars().all()
    return applications


@router.get("/skills", response_model=list[schemas.SkillRead])
async def get_current_user_skills(
    user=Depends(get_current_user), db=Depends(get_async_session)
):
    result = await db.execute(
        select(models.Skill).where(models.Skill.user_id == user.id)
    )
    skills = result.scalars().all()
    return skills


@router.get("/experiences", response_model=list[schemas.ExperienceRead])
async def get_current_user_experiences(
    user=Depends(get_current_user), db=Depends(get_async_session)
):
    result = await db.execute(
        select(models.Experience).where(models.Experience.user_id == user.id)
    )
    experiences = result.scalars().all()
    return experiences
