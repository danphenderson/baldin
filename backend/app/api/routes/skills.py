# app/api/routes/skills.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import AsyncSession
from app.api.deps import console_log as log
from app.api.deps import (
    create_extractor,
    create_skill,
    get_async_session,
    get_current_user,
    get_extractor_by_name,
    get_skill,
    models,
    run_extractor,
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


@router.post("/extract", response_model=list[schemas.SkillRead])
async def extract_user_skills(
    payload: schemas.ExtractorRun,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    log.info(f"Skills run extraction request: {payload.dict()}")
    try:
        extractor = await get_extractor_by_name("skills", db)
    except HTTPException as e:
        if e.status_code == 404:
            log.warning("No skills extractor found, creating a new one")
            extractor = await create_extractor(
                schemas.ExtractorCreate(
                    name="skills",
                    description="Skill data extractor",
                    instruction="Extract skill JSON data from a given context",
                    json_schema=schemas.SkillCreate.model_json_schema(),
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

    log.info(f"Skills extraction response: {resp.dict()}")

    return [
        await create_skill(schemas.SkillCreate(**skill), db=db, user=user)
        for skill in resp.data
    ]
