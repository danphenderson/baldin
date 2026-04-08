# app/api/routes/skills.py
from asyncio import gather

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy import select

from app.api.deps import (
    AsyncSession,
    create_extractor,
    create_skill,
    get_async_session,
    get_current_user,
    get_extractor_by_name,
    get_extractor_run_payload,
    get_skill,
    models,
    run_extractor,
    schemas,
)
from app.api.deps import console_log as log
from app.api.routes.seed_tasks import (
    SeedOperation,
    build_user_seed_creator,
    schedule_seed_operation,
)
from app.core.rate_limit import limiter

router: APIRouter = APIRouter()

SKILL_SEED_OPERATION = SeedOperation(
    pipeline_name="seed_skills",
    resource_name="Skills",
    seed_filename="skills.json",
    destination_table="skills",
    creator=build_user_seed_creator(schemas.SkillCreate, create_skill),
)


async def extract_user_skills_task(
    extractor: models.Extractor,
    payload: schemas.ExtractorRun,
    user: schemas.UserRead,
    db: AsyncSession,
) -> dict[str, str]:

    resp = await run_extractor(
        schemas.ExtractorRead(**extractor.__dict__), payload, user, db
    )

    # Collect the extracted skills asynchronously in parallel
    await gather(
        *[
            create_skill(schemas.SkillCreate(**skill), db=db, user=user)
            for skill in getattr(resp, "data", [])
        ]
    )
    return {"message": "Skills extraction task completed"}


@router.post("/extract", response_model=dict[str, str])
@limiter.limit("5/minute")
async def extract_user_skills(
    request: Request,
    background_tasks: BackgroundTasks,
    payload: schemas.ExtractorRun = Depends(get_extractor_run_payload),
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

    background_tasks.add_task(extract_user_skills_task, extractor, payload, user, db)

    return {"message": "Skills extraction task started"}


@router.get("/", response_model=list[schemas.SkillRead])
async def get_current_user_skills(
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    result = await db.execute(
        select(models.Skill).where(models.Skill.user_id == user.id)
    )
    skills = result.scalars().all()
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


@router.post("/seed", status_code=202, response_model=schemas.SeedOperationAccepted)
async def seed_skills(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    return await schedule_seed_operation(
        background_tasks, db, user, SKILL_SEED_OPERATION
    )
