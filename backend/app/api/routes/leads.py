# app/api/routes/leads.py

import json
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import delete, func, select

from app.api.deps import (
    AsyncSession,
    conf,
    create_orchestration_event,
    get_async_session,
    get_lead,
    get_orchestration_event,
    get_pagination_params,
    models,
    schemas,
    session_context,
    update_orchestration_event,
    utils,
)

router: APIRouter = APIRouter()


async def _load_leads_into_database(orch_event_id):
    """
    Loads the database with leads from the data lake.
    """
    async with session_context() as db:
        # Get the orchestration event record
        event = await get_orchestration_event(orch_event_id, db)
        event_id = getattr(event, "id")

        # Update the orchestration event status to "running"
        setattr(event, "status", schemas.OrchestrationEventStatusType("running"))

        event = await update_orchestration_event(
            event_id, schemas.OrchestrationEventUpdate(**event.__dict__), db
        )

        # Unmarshal the source URI
        source_uri = schemas.URI.model_validate_json(getattr(event, "source_uri"))

        # Load the database
        async for lead in utils.generate_pydantic_models_from_json(
            schemas.LeadCreate, source_uri.name
        ):
            try:
                # Create a new lead if it doesn't exist
                lead = models.Lead(**lead.__dict__)
                db.add(lead)
                await db.commit()
                await db.refresh(lead)
            except Exception as e:
                # Rollback on exception and update the orchestration event status to "failure" with error message
                await db.rollback()
                setattr(event, "error_message", str(e))
                setattr(
                    event, "status", schemas.OrchestrationEventStatusType("failure")
                )
                event = await update_orchestration_event(
                    event_id, schemas.OrchestrationEventUpdate(**event.__dict__), db
                )
                raise HTTPException(status_code=500, detail=str(e))

        # Update the orchestration event status to "success"
        setattr(event, "status", schemas.OrchestrationEventStatusType("success"))
        event = await update_orchestration_event(
            event_id, schemas.OrchestrationEventUpdate(**event.__dict__), db
        )


@router.post(
    "/load_database", status_code=202, response_model=schemas.OrchestrationEventRead
)
async def load_database(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
):
    """
    Loads the database with leads from the data lake.
    """
    # Determine URI location of the data lake and database from settings
    source_uri = schemas.URI(
        name=str(Path(str(conf.settings.DATALAKE_URI)) / "leads" / "leads.json"),
        type=schemas.URIType("datalake"),
    )
    destination_uri = schemas.URI(
        name=str(Path(str(conf.settings.DEFAULT_SQLALCHEMY_DATABASE_URI)) / "leads"),
        type=schemas.URIType("database"),
    )

    # Create an orchestration event
    payload = schemas.OrchestrationEventCreate(
        job_name="load_database",
        source_uri=source_uri,
        destination_uri=destination_uri,
        status=schemas.OrchestrationEventStatusType("pending"),
        error_message=None,
    )

    # Post orchestration event and wait for model to be created
    orch_event = await create_orchestration_event(payload, db)

    # Add the load_database_task to the background tasks
    background_tasks.add_task(_load_leads_into_database, orch_event.id)

    # Deserialize into URI object
    setattr(orch_event, "source_uri", json.loads(getattr(orch_event, "source_uri")))
    setattr(
        orch_event,
        "destination_uri",
        json.loads(getattr(orch_event, "destination_uri")),
    )
    return orch_event


# async def _enrich_datalake(orch_event_id):
#     """
#     Enriches the leads in the database.

#     FIXME - This is hacky
#     """
#     async with session_context() as db:
#         # Get the orchestration event record
#         event = await get_orchestration_event(orch_event_id, db)
#         event_id = getattr(event, "id")

#         # Update the orchestration event status to "running"
#         setattr(event, "status", schemas.OrchestrationEventStatusType("running"))

#         event = await update_orchestration_event(
#             event_id, schemas.OrchestrationEventUpdate(**event.__dict__), db
#         )

#         # Unmarshal the source URI
#         source_uri = schemas.URI.model_validate_json(getattr(event, "source_uri"))
#         destination_uri = schemas.URI.model_validate_json(
#             getattr(event, "destination_uri")
#         )

#         # Enrich the leads
#         async for lead in utils.generate_pydantic_models_from_json(
#             schemas.LeadCreate, source_uri.name
#         ):
#             try:
#                 # Enrich lead
#                 enriched_lead = await enrich.enrich_lead(lead)
#                 # Dump the enriched lead to the data lake
#                 await utils.dump_pydantic_model_to_json(
#                     enriched_lead, Path(destination_uri.name) / "leads.json"
#                 )

#             except Exception as e:
#                 # Update the orchestration event status to "failure" with error message
#                 setattr(event, "error_message", str(e))
#                 setattr(
#                     event, "status", schemas.OrchestrationEventStatusType("failure")
#                 )
#                 event = await update_orchestration_event(
#                     event_id, schemas.OrchestrationEventUpdate(**event.__dict__), db
#                 )
#                 raise e

#         # Update the orchestration event status to "success"
#         setattr(event, "status", schemas.OrchestrationEventStatusType("success"))
#         event = await update_orchestration_event(
#             event_id, schemas.OrchestrationEventUpdate(**event.__dict__), db
#         )


# @router.post(
#     "/enrich_datalake", status_code=202, response_model=schemas.OrchestrationEventRead
# )
# async def enrich_datalake(
#     background_tasks: BackgroundTasks,
#     db: AsyncSession = Depends(get_async_session),
# ):
#     """
#     Loads the datalake with enriched leads from the data lake.
#     """
#     # Determin URI location of the data lake and database from settings
#     source_uri = schemas.URI(
#         name=str(Path(conf.settings.DATALAKE_URI) / "leads"),
#         type=schemas.URIType("datalake"),
#     )
#     destination_uri = schemas.URI(
#         name=str(Path(source_uri.name) / "enriched"), type=schemas.URIType("datalake")
#     )

#     # Create an orchestration event
#     payload = schemas.OrchestrationEventCreate(
#         job_name="enrich_datalake",
#         source_uri=source_uri,
#         destination_uri=destination_uri,
#         status=schemas.OrchestrationEventStatusType("pending"),
#         error_message=None,
#     )

#     # Post orchestration event and wait for model to be created
#     orch_event = await create_orchestration_event(payload, db)

#     # Add the load_database_task to the background tasks
#     background_tasks.add_task(_enrich_datalake, orch_event.id)

#     return orch_event


@router.post("/", status_code=201, response_model=UUID4)
async def create_lead(
    payload: schemas.LeadCreate, db: AsyncSession = Depends(get_async_session)
):
    # Check if a lead with the same URL already exists
    existing_lead = await db.execute(
        select(models.Lead).where(models.Lead.url == payload.url)
    )
    existing_lead = existing_lead.scalars().first()  # type: ignore

    if existing_lead:
        # Lead with the same URL already exists, return an error response
        raise HTTPException(status_code=400, detail="Lead with this URL already exists")

    # Create a new lead if it doesn't exist
    lead = models.Lead(**payload.dict())
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return lead.id  # Consider returning the full lead object


@router.get("/{id}", status_code=202, response_model=schemas.LeadRead)
async def read_lead(lead: schemas.LeadRead = Depends(get_lead)):
    return lead


@router.get("/", response_model=schemas.LeadsPaginatedRead)
async def read_leads(
    db: AsyncSession = Depends(get_async_session),
    pagination: schemas.Pagination = Depends(get_pagination_params),
):
    # Calculate offset
    offset = (pagination.page - 1) * pagination.page_size

    # Execute the paginated query
    lead_query = select(models.Lead).offset(offset).limit(pagination.page_size)
    leads = await db.execute(lead_query)

    lead_list = leads.scalars().all()
    # total_count = None

    # # Get the total count
    # if pagination.request_count:
    #     total_count_query = select(func.count(models.Lead.id))
    #     total_count_result = await db.execute(total_count_query)
    #     total_count = total_count_result.scalar_one()
    # HACK: This is a hack to get the total count
    total_count_query = select(func.count(models.Lead.id))
    total_count_result = await db.execute(total_count_query)
    total_count = total_count_result.scalar_one()

    if not lead_list:  # TODO: Should this be above the total_count check?
        raise HTTPException(status_code=404, detail="No leads found")

    return schemas.LeadsPaginatedRead(
        leads=[schemas.LeadRead(**lead.__dict__) for lead in lead_list],
        pagination=pagination,
        total_count=total_count,
    )


@router.patch("/{id}", status_code=200, response_model=schemas.LeadRead)
async def update_lead(
    payload: schemas.LeadUpdate,
    lead: schemas.LeadRead = Depends(get_lead),
    db: AsyncSession = Depends(get_async_session),
):
    # Update the lead's attributes
    for var, value in payload.dict(exclude_unset=True).items():
        setattr(lead, var, value)

    await db.commit()
    await db.refresh(lead)
    return lead


@router.delete("/purge", status_code=202, response_model=dict)
async def purge_leads(db: AsyncSession = Depends(get_async_session)):
    """
    Drops all leads records in the table.
    """
    # Execute a bulk delete query
    await db.execute(delete(models.Lead))
    await db.commit()
    return {"message": "All leads have been purged successfully"}


@router.delete("/{id}", status_code=202, response_model=dict)
async def delete_lead(id: UUID4, db: AsyncSession = Depends(get_async_session)):
    lead = await db.get(models.Lead, id)
    await db.delete(lead)
    await db.commit()
    return {"message": "Lead deleted successfully"}
