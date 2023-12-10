# app/api/routes/etl.py

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import (
    AsyncSession,
    execute_leads_enrichment,
    execute_load_leads,
    get_async_session,
    get_etl_event,
    database_load,
    models,
    schemas,
    conf,
)
from app.models import OrchestrationEvent

router: APIRouter = APIRouter()


@router.get("/events/{id}", status_code=202, response_model=schemas.OrchestrationEventRead)
async def read_etl_event(etl_event: schemas.OrchestrationEventRead = Depends(get_etl_event)):
    return etl_event


@router.get("/events", response_model=list[schemas.OrchestrationEventRead])
async def read_etl_events(db: AsyncSession = Depends(get_async_session)):
    rows = await db.execute(select(models.OrchestrationEvent))
    result = rows.scalars().all()
    if not result:
        raise HTTPException(status_code=404, detail="No ETL events found")
    return result


@router.get("/events/success", response_model=list[schemas.OrchestrationEventRead])
async def read_successful_etl_events(db: AsyncSession = Depends(get_async_session)):
    rows = await db.execute(
        select(models.OrchestrationEvent).filter(models.OrchestrationEvent.status == "success")
    )
    result = rows.scalars().all()
    if not result:
        raise HTTPException(status_code=404, detail="No successful ETL events found")
    return result

@router.get("/events/failure", response_model=list[schemas.OrchestrationEventRead])
async def read_failed_etl_events(db: AsyncSession = Depends(get_async_session)):
    rows = await db.execute(
        select(models.OrchestrationEvent).filter(models.OrchestrationEvent.status == "failure")
    )
    result = rows.scalars().all()
    if not result:
        raise HTTPException(status_code=404, detail="No failed ETL events found")
    return result

@router.post("/database/load/{table}/{source_uri}", status_code=202, response_model=schemas.OrchestrationEventRead)
async def l(
    source_uri: str,
    table: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
):
    destination_uri = f"{conf.settings.DEFAULT_SQLALCHEMY_DATABASE_URI}/{table}"

    orchestration_event = schemas.OrchestrationEventCreate(
        **{"job_name": "load", "source_uri": source_uri, "destination_uri": destination_uri, "status": schemas.OrchestrationEventStatusType("pending")}
    )

    db.add(orchestration_event)

    await db.commit()

    await db.refresh(orchestration_event)

    # Use background_tasks to execute the ETL pipeline
    background_tasks.add_task(database_load, event_id = getattr(orchestration_event, "id"))

@router.post("/load_leads", status_code=202, response_model=schemas.OrchestrationEventRead)
async def load_leads_from_data_lake(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
):

    etl_event = models.OrchestrationEvent(**{"job_name": "load_leads", "status": "pending"})

    db.add(etl_event)
    await db.commit()
    await db.refresh(etl_event)

    # Use background_tasks to execute the ETL pipeline
    background_tasks.add_task(execute_load_leads, etl_event.id)  # type: ignore

    return etl_event


@router.post("/enrich_leads", status_code=202, response_model=schemas.OrchestrationEventRead)
async def enrich_lead(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
):
    etl_event = models.OrchestrationEvent(**{"job_name": "enrich_leads", "status": "pending"})
    db.add(etl_event)
    await db.commit()
    await db.refresh(etl_event)

    # Use background_tasks to execute the ETL pipeline
    background_tasks.add_task(execute_leads_enrichment, etl_event.id)

    return etl_event
