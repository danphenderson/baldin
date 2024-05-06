# app/api/routes/resumes.py
import json
from asyncio import gather
from datetime import datetime
from pathlib import Path

from aiofiles import open as aopen
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import AsyncSession, conf
from app.api.deps import console_log as log
from app.api.deps import (
    create_orchestration_event,
    create_orchestration_pipeline,
    create_resume,
    get_async_session,
    get_current_user,
    get_orchestration_event,
    get_orchestration_pipeline_by_name,
    get_resume,
    models,
    schemas,
    session_context,
    update_orchestration_event,
    utils,
)

router: APIRouter = APIRouter()

# async def _load_resumes_into_database(orch_event_id, user_id):
#     async with session_context() as db:
#         try:
#             # get orchestration event and update its status
#             event = await get_orchestration_event(orch_event_id, db)
#             setattr(event, "status", "running")
#             await db.commit()

#             # get all resumes from the unmarshaled source_uri in the orchestration event
#             source_uri = schemas.URI.model_validate_json(getattr(event, "source_uri"))

#             for filepath in utils.generate_resourouces(source_uri.name):
#                 resume = await schemas.ResumeCreate.from_pdf(filepath)
#                 resume_model = models.Resume(**resume.dict(), user_id=user_id)
#                 db.add(resume_model)
#                 await db.commit()
#                 await db.refresh(resume_model)

#             # update orchestration event status to success
#             setattr(event, "status", "success")
#             await db.commit()

#         except Exception as e:
#             # handle exceptions, log errors, and set the event status to failure
#             await db.rollback()  # rollback the transaction in case of an error
#             setattr(event, "status", "failure")
#             setattr(event, "error_message", str(e))
#             await db.commit()  # commit the status update
#             raise HTTPException(status_code=500, detail=str(e))


# @router.post("/load_database", status_code=201)
# async def load_database(
#     background_tasks: BackgroundTasks,
#     user=Depends(get_current_user),
#     db: AsyncSession = Depends(get_async_session),
# ):
#     source_uri = schemas.URI(
#         name=str(Path(conf.settings.DATALAKE_URI) / "resumes"),
#         type=schemas.URIType.DATALAKE,
#     )

#     destination_uri = schemas.URI(
#         name=str(Path(str(conf.settings.DEFAULT_SQLALCHEMY_DATABASE_URI)) / "resumes"),
#         type=schemas.URIType.DATABASE,
#     )

#     # create orchestration event
#     payload = schemas.OrchestrationEventCreate(
#         job_name="load_database",
#         source_uri=source_uri,
#         destination_uri=destination_uri,
#         status=schemas.OrchestrationEventStatusType.PENDING,
#         error_message=None,
#     )

#     event = await create_orchestration_event(payload, db)

#     # load resumes into database as a background task
#     background_tasks.add_task(_load_resumes_into_database, event.id, user.id)

#     return events


@router.get("/", response_model=list[schemas.ResumeRead])
async def get_current_user_resumes(
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    result = await db.execute(
        select(models.Resume).where(models.Resume.user_id == user.id)
    )
    resumes = result.scalars().all()
    if not resumes:
        raise HTTPException(
            status_code=404, detail="No resumes found for the current user"
        )
    return resumes


@router.post("/", status_code=201, response_model=schemas.ResumeRead)
async def create_user_resume(
    payload: schemas.ResumeCreate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    resume = models.Resume(**payload.dict(), user_id=user.id)
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume


@router.get("/{resume_id}", response_model=schemas.ResumeRead)
async def get_user_resume(
    resume: schemas.ResumeRead = Depends(get_resume),
):
    return resume


@router.patch("/{resume_id}", response_model=schemas.ResumeRead)
async def update_user_resume(
    payload: schemas.ResumeUpdate,
    resume: schemas.ResumeRead = Depends(get_resume),
    db: AsyncSession = Depends(get_async_session),
):
    resume_data = payload.dict(exclude_unset=True)
    for field in resume_data:
        setattr(resume, field, resume_data[field])
    await db.commit()
    await db.refresh(resume)
    return resume


@router.delete("/{resume_id}", status_code=204)
async def delete_user_resume(
    resume: schemas.ResumeRead = Depends(get_resume),
    db: AsyncSession = Depends(get_async_session),
):
    await db.delete(resume)
    await db.commit()
    return None


@router.post("/seed", response_model=str)
async def seed_resumes(
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> str:
    seed_path = conf.settings.SEEDS_PATH / "resumes.json"
    log.info(f"Seeding Resumes table with initial data from {seed_path}")

    # Fetch orchestration pipeline, create a new one if not found
    try:
        pipeline = await get_orchestration_pipeline_by_name("seed_resumes", db, user)
    except HTTPException as e:
        if e.status_code == 404:
            log.warning("Seed Resumes pipeline not found, creating a new one")
            pipeline = await create_orchestration_pipeline(
                schemas.OrchestrationPipelineCreate(
                    name="seed_resumes",
                    description="Seed Resumes table with initial data",
                    definition={"action": "Insert initial data into Resumes table"},
                ),
                user,
                db,
            )
        else:
            raise e

    # Create orchestration event
    event = await create_orchestration_event(
        schemas.OrchestrationEventCreate(
            message="Seeding Resumes table with initial data",
            environment=conf.settings.ENVIRONMENT,
            pipeline_id=pipeline.id,
            status=schemas.OrchestrationEventStatusType.PENDING,
            payload={},
            source_uri=schemas.URI(name=str(seed_path), type=schemas.URIType.FILE),
            destination_uri=schemas.URI(
                name=f"{conf.settings.DEFAULT_SQLALCHEMY_DATABASE_URI}#resumes",
                type=schemas.URIType.DATABASE,
            ),
        ),
        db=db,
    )

    # Run the orchestration event
    try:
        async with aopen(seed_path, "r") as f:
            resumes_data = json.loads(await f.read())
        for cover_letter in resumes_data:
            await create_resume(
                schemas.ResumeCreate(**cover_letter),
                db=db,
                user=user,
            )
    except Exception as e:
        log.error(f"Error seeding Resumes table: {e}")
        setattr(event, "status", schemas.OrchestrationEventStatusType.FAILED)
        setattr(event, "message", str(e))
        await db.commit()
        raise HTTPException(status_code=500, detail=str(e))

    setattr(event, "status", schemas.OrchestrationEventStatusType.SUCCESS)
    await db.commit()
    log.info(f"Seeded Resumes table with {len(resumes_data)} records.")
    return f"Seeded Resumes table with {len(resumes_data)} records."
