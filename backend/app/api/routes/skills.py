# app/api/routes/skills.py
import json
from asyncio import gather

from aiofiles import open as aopen
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import AsyncSession, conf
from app.api.deps import console_log as log
from app.api.deps import (
    create_extractor,
    create_orchestration_event,
    create_orchestration_pipeline,
    create_skill,
    get_async_session,
    get_current_user,
    get_extractor_by_name,
    get_orchestration_pipeline_by_name,
    get_skill,
    models,
    run_extractor,
    schemas,
)

router: APIRouter = APIRouter()


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
async def extract_user_skills(
    background_tasks: BackgroundTasks,
    payload: schemas.ExtractorRun = Depends(),
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


@router.post("/seed", response_model=str)
async def seed_skills(
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> str:
    seed_path = conf.settings.SEEDS_PATH / "skills.json"
    log.info(f"Seeding Skills table with initial data from {seed_path}")

    # Fetch orchestration pipeline, create a new one if not found
    try:
        pipeline = await get_orchestration_pipeline_by_name("seed_skills", db, user)
    except HTTPException as e:
        if e.status_code == 404:
            log.warning("Seed Skills pipeline not found, creating a new one")
            pipeline = await create_orchestration_pipeline(
                schemas.OrchestrationPipelineCreate(
                    name="seed_skills",
                    description="Seed Skills table with initial data",
                    definition={"action": "Insert initial data into Skills table"},
                ),
                user,
                db,
            )
        else:
            raise e

    # Create orchestration event
    event = await create_orchestration_event(
        schemas.OrchestrationEventCreate(
            message="Seeding Skills table with initial data",
            environment=conf.settings.ENVIRONMENT,
            pipeline_id=pipeline.id,
            status=schemas.OrchestrationEventStatusType.PENDING,
            payload={},
            source_uri=schemas.URI(name=str(seed_path), type=schemas.URIType.FILE),
            destination_uri=schemas.URI(
                name=f"{conf.settings.DEFAULT_SQLALCHEMY_DATABASE_URI}#skills",
                type=schemas.URIType.DATABASE,
            ),
        ),
        db=db,
    )

    # Run the orchestration event
    try:
        async with aopen(seed_path, "r") as f:
            skills_data = json.loads(await f.read())
        for skill_data in skills_data:
            await create_skill(
                schemas.SkillCreate(**skill_data),
                db=db,
                user=user,
            )
    except Exception as e:
        log.error(f"Error seeding Skills table: {e}")
        setattr(event, "status", schemas.OrchestrationEventStatusType.FAILED)
        setattr(event, "message", str(e))
        await db.commit()
        raise HTTPException(status_code=500, detail=str(e))

    setattr(event, "status", schemas.OrchestrationEventStatusType.SUCCESS)
    await db.commit()
    log.info(f"Seeded Skills table with {len(skills_data)} records.")
    return f"Seeded Skills table with {len(skills_data)} records."
