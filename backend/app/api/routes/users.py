# app/api/routes/users.py

import json

from aiofiles import open as aopen
from fastapi import Depends, HTTPException
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api.deps import AsyncSession, conf
from app.api.deps import console_log as log
from app.api.deps import (
    create_orchestration_event,
    create_orchestration_pipeline,
    create_user,
    fastapi_users,
    get_async_session,
    get_current_superuser,
    get_current_user,
    get_orchestration_pipeline_by_name,
    models,
    schemas,
)

router = fastapi_users.get_users_router(schemas.UserRead, schemas.UserUpdate)


@router.get("/me/profile", response_model=schemas.UserProfileRead)
async def read_profile(
    db: AsyncSession = Depends(get_async_session),
    current_user: models.User = Depends(get_current_user),
) -> schemas.UserProfileRead:

    # Use async loading of related objects
    result = await db.execute(
        select(models.User)
        .options(
            selectinload(models.User.skills),
            selectinload(models.User.experiences),
            selectinload(models.User.education),
            selectinload(models.User.certificates),
        )
        .where(models.User.id == current_user.id)  # type: ignore
    )  # type: ignore
    user_with_details = result.scalars().first()

    if not user_with_details:
        raise HTTPException(status_code=404, detail="User not found")

    return schemas.UserProfileRead.from_orm(user_with_details)


@router.post("/seed", response_model=str)
async def seed_users(
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_superuser),
) -> str:
    seed_path = conf.settings.SEEDS_PATH / "users.json"
    log.info(f"Seeding Users table with initial data from {seed_path}")
    # fetch orchestration pipeline, create a new one if not found
    try:
        pipeline = await get_orchestration_pipeline_by_name("seed_users", db, user)
    except HTTPException as e:
        if e.status_code == 404:
            log.warning("Seed Users pipeline not found, creating a new one")
            pipeline = await create_orchestration_pipeline(
                schemas.OrchestrationPipelineCreate(
                    name="seed_users",
                    description="Seed Users table with initial data",
                    definition={"action": "Insert initial data into Users table"},
                ),
                user,
                db,
            )
        else:
            raise e
    # create orchestration event
    event = await create_orchestration_event(
        schemas.OrchestrationEventCreate(
            message="Seeding Users table with initial data",
            environment=conf.settings.ENVIRONMENT,
            pipeline_id=pipeline.id,  # type: ignore
            status=schemas.OrchestrationEventStatusType.PENDING,
            payload={},
            source_uri=schemas.URI(name=str(seed_path), type=schemas.URIType.FILE),
            destination_uri=schemas.URI(
                name=f"{conf.settings.DEFAULT_SQLALCHEMY_DATABASE_URI}#users",
                type=schemas.URIType.DATABASE,
            ),
        ),
        db=db,
    )
    log.info(f"Orchestration event {event.id} created for seeding Users table")
    # Run the event (TODO: move to background_task)
    try:
        async with aopen(seed_path, "r") as f:
            users = json.loads(await f.read())
        for user in users:
            await create_user(schemas.UserCreate(**user))  # type: ignore
    except Exception as e:
        log.error(f"Error seeding Users table: {e}")
        setattr(event, "status", schemas.OrchestrationEventStatusType.FAILED)
        setattr(event, "message", str(e))
        await db.commit()
        raise e
    setattr(event, "status", schemas.OrchestrationEventStatusType.SUCCESS)
    await db.commit()
    log.info(f"Seeded Users table with {len(users)} records.")
    return f"Seeded Users table with {len(users)} records."
