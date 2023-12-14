# app/api/routes/resumes.py

from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import (
    AsyncSession,
    conf,
    create_orchestration_event,
    get_async_session,
    get_current_user,
    get_orchestration_event,
    get_resume,
    models,
    schemas,
    session_context,
    update_orchestration_event,
    utils,
)

router: APIRouter = APIRouter()


async def _load_resumes_into_database(orch_event_id, user_id):

    async with session_context() as db:
        # get orchestration event and update it's status
        event = await get_orchestration_event(orch_event_id, db)
        setattr(event, "status", "running")
        event = await update_orchestration_event(
            orch_event_id, schemas.OrchestrationEventUpdate(**event.__dict__), db
        )

        # get all resumes from the unmarsheled source_uri in the orchestration event
        # Unmarshal the source URI
        source_uri = schemas.URI.model_validate_json(getattr(event, "source_uri"))

        for filepath in utils.generate_resourouces(source_uri.name):
            try:
                resume = await schemas.ResumeCreate.from_pdf(filepath)
                resume_model = models.Resume(**resume.__dict__, user_id=user_id)
                db.add(resume_model)
                await db.commit()
                await db.refresh(resume_model)

            except Exception as e:
                await db.rollback()
                setattr(event, "status", "failure")
                setattr(event, "error_message", str(e))
                event = await update_orchestration_event(
                    orch_event_id,
                    schemas.OrchestrationEventUpdate(**event.__dict__),
                    db,
                )
                raise HTTPException(status_code=500, detail=str(e))

        # update orchestration event status
        setattr(event, "status", "success")
        event = await update_orchestration_event(
            orch_event_id, schemas.OrchestrationEventUpdate(**event.__dict__), db
        )


@router.post("/load_database", status_code=201)
async def load_database(
    background_tasks: BackgroundTasks,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    source_uri = schemas.URI(
        name=str(Path(conf.settings.DATALAKE_URI) / "resumes"),
        type=schemas.URIType.DATALAKE,
    )

    destination_uri = schemas.URI(
        name=str(Path(str(conf.settings.DEFAULT_SQLALCHEMY_DATABASE_URI)) / "resumes"),
        type=schemas.URIType.DATABASE,
    )

    # create orchestration event
    payload = schemas.OrchestrationEventCreate(
        job_name="load_database",
        source_uri=source_uri,
        destination_uri=destination_uri,
        status=schemas.OrchestrationEventStatusType.PENDING,
        error_message=None,
    )

    event = await create_orchestration_event(payload, db)

    # load resumes into database as a background task
    background_tasks.add_task(_load_resumes_into_database, event.id, user.id)

    return event


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
