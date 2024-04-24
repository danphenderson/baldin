# Path: app/api/routes/leads.py

import json
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import delete, func, select

from app.api.deps import (
    AsyncSession,
    conf,
    console_log,
    create_orchestration_event,
    get_async_session,
    get_current_user,
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
    async with session_context() as db:
        # Get the orchestration event record
        event = await get_orchestration_event(orch_event_id, db)
        event_id = getattr(event, "id")

        # Update the orchestration event status to "running"
        event_dict = event.__dict__
        event_dict["status"] = schemas.OrchestrationEventStatusType("running").value

        def _update_event_dict(event_dict):
            # Correctly parse source_uri and destination_uri before updating
            if isinstance(event_dict.get("source_uri"), str):
                event_dict["source_uri"] = json.loads(event_dict["source_uri"])
            if isinstance(event_dict.get("destination_uri"), str):
                event_dict["destination_uri"] = json.loads(
                    event_dict["destination_uri"]
                )
            return event_dict

        event_dict = _update_event_dict(event_dict)

        # Update the event
        event = await update_orchestration_event(
            event_id, schemas.OrchestrationEventUpdate(**event_dict), db
        )

        # Unmarshal the source URI
        source_uri = schemas.URI.model_validate_json(event.source_uri)

        # Load the database
        async for lead in utils.generate_pydantic_models_from_json(
            schemas.LeadCreate, source_uri.name
        ):
            try:
                # Create a new lead if it doesn't exist
                lead = models.Lead(**lead.dict())
                db.add(lead)
                await db.commit()
                await db.refresh(lead)
            except Exception as e:
                # Rollback on exception and update the orchestration event status to "failure" with error message
                await db.rollback()
                event_dict["error_message"] = str(e)
                event_dict["status"] = schemas.OrchestrationEventStatusType(
                    "failure"
                ).value
                await update_orchestration_event(
                    event_id, schemas.OrchestrationEventUpdate(**event_dict), db
                )
                raise HTTPException(status_code=500, detail=str(e))

        # Update the orchestration event status to "success"
        event_dict["status"] = schemas.OrchestrationEventStatusType("success").value

        event_dict = _update_event_dict(event_dict)
        await update_orchestration_event(
            event_id, schemas.OrchestrationEventUpdate(**event_dict), db
        )


@router.post(
    "/load_database", status_code=202, response_model=schemas.OrchestrationEventRead
)
async def load_database(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
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

    # Get orchestration pipeline record, if it doesn't exist, create it
    pipeline = await db.execute(
        select(models.OrchestrationPipeline).where(
            models.OrchestrationPipeline.name == "load_database"
        )
    )

    pipeline = pipeline.scalars().first()  # type: ignore

    if not pipeline:
        pipeline = models.OrchestrationPipeline(
            name="load_database",
            description="Loads the database with leads from the data lake",
            user_id=user.id,  # type: ignore
        )
        db.add(pipeline)
        await db.commit()
        await db.refresh(pipeline)

    # Create an orchestration event
    payload = schemas.OrchestrationEventCreate(
        name="load_database",
        source_uri=source_uri,
        destination_uri=destination_uri,
        status=schemas.OrchestrationEventStatusType("pending"),
        message=f"Triggered by pipeline {getattr(pipeline, 'name')}",
        pipeline_id=getattr(pipeline, "id"),
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


@router.post("/", status_code=201, response_model=schemas.LeadRead)
async def create_lead(
    payload: schemas.LeadCreate,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
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
    lead = models.Lead(**payload.dict(exclude={"companies"}))
    db.add(lead)
    await db.commit()
    await db.refresh(lead)

    # Link companies to the new lead
    if payload.companies:
        for company_id in payload.companies:
            company = await db.get(models.Company, company_id)
            if company:
                lead.companies.append(company)
        await db.commit()
        await db.refresh(lead)

    return lead


@router.get("/{id}", status_code=200, response_model=schemas.LeadRead)
async def read_lead(
    lead: models.Lead = Depends(get_lead),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    console_log.warning(f"Lead: {lead.__dict__.get('companies', 'No Companies')}")
    return lead


@router.get("/", response_model=schemas.LeadsPaginatedRead)
async def read_leads(
    db: AsyncSession = Depends(get_async_session),
    pagination: schemas.Pagination = Depends(get_pagination_params),
    user: schemas.UserRead = Depends(get_current_user),
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
    id: UUID4,
    payload: schemas.LeadUpdate,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    lead = await db.get(models.Lead, id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Update attributes
    for var, value in payload.dict(exclude_unset=True).items():
        setattr(lead, var, value)

    # Update companies if provided
    if "companies" in payload.dict():
        lead.companies = []
        for company_id in payload.companies:
            company = await db.get(models.Company, company_id)
            if company:
                lead.companies.append(company)

    await db.commit()
    await db.refresh(lead)
    return lead


@router.delete("/purge", status_code=202, response_model=dict)
async def purge_leads(
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    """
    Drops all leads records in the table.
    """
    # Execute a bulk delete query
    await db.execute(delete(models.Lead))
    await db.commit()
    return {"message": "All leads have been purged successfully"}


@router.delete("/{id}", status_code=204)
async def delete_lead(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
):
    lead = await db.get(models.Lead, id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    await db.delete(lead)
    await db.commit()
    return {"message": "Lead deleted successfully"}


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
