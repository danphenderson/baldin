# Path: app/api/routes/leads.py

import json

from aiofiles import open as aopen
from fastapi import APIRouter, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import delete, func, select
from sqlalchemy.orm import joinedload

from app.api.deps import AsyncSession, conf
from app.api.deps import console_log
from app.api.deps import console_log as log
from app.api.deps import (
    create_extractor,
    create_lead,
    create_orchestration_event,
    create_orchestration_pipeline,
    get_async_session,
    get_current_user,
    get_extractor_by_name,
    get_lead,
    get_orchestration_pipeline_by_name,
    get_pagination_params,
    logging,
    models,
    run_extractor,
    schemas,
)

logger = logging.get_logger(__name__)

router: APIRouter = APIRouter()


@router.post("/", status_code=201, response_model=schemas.LeadRead)
async def create_job_lead(
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
    lead = models.Lead(**payload.dict(exclude={"company_ids"}))

    # If companies are provided, associate them with the lead
    for company_id in payload.company_ids:
        company = await db.get(models.Company, company_id)
        if company:
            lead.companies.append(company)

    db.add(lead)
    await db.commit()
    # Retrieve the lead with companies eagerly loaded
    lead = await db.execute(
        select(models.Lead)
        .where(models.Lead.id == lead.id)
        .options(joinedload(models.Lead.companies))
    )  # type: ignore
    lead = lead.scalars().first()

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
    payload: schemas.LeadUpdate,
    lead: schemas.LeadRead = Depends(get_lead),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    console_log.info(f"Updating lead {id} with data: {payload.dict()}")
    if "companies" in payload.dict():
        console_log.info(f"Updating companies for lead {id}")

    # Update the lead
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(lead, field, value)

    # Handle company associations
    if payload.company_ids is not None:
        # Clear existing companies and add new ones
        lead.companies = []
        for company_id in payload.company_ids:
            company = await db.get(models.Company, company_id)
            if company:
                lead.companies.append(company)
            else:
                console_log.info(
                    f"Company ID {company_id} not found and will not be added."
                )

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


@router.post("/extract", response_model=schemas.LeadRead)
async def extract_lead(
    extraction_url: str,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    logger.info(f"User {user.id} triggered lead extraction for {extraction_url}")
    # Get extractor, create one if it doesn't exist
    try:
        extractor = await get_extractor_by_name("lead", db)
    except HTTPException as e:
        if e.status_code == 404:
            extractor = await create_extractor(
                schemas.ExtractorCreate(
                    name="lead",
                    description="Extract lead data from URL",
                    instruction="Extract lead information from the given URL",
                    json_schema=schemas.LeadCreate.model_json_schema(),  # Ensure this method is defined in your schema
                    extractor_examples=[],  # Add some examples if possible
                ),
                user,
                db,
            )
        else:
            raise e

    # Build the payload and run the extractor
    payload = schemas.ExtractorRun(
        mode="entire_document",
        file=None,
        text=None,
        url=extraction_url,  # type: ignore
        llm=None,
    )

    # Run the extraction
    result = await run_extractor(
        schemas.ExtractorRead(**extractor.__dict__), payload, user, db
    )

    # Process and save the extracted data
    try:
        # FIXME: Hack to remove company_ids
        company_ids = result.data[0].pop("company_ids", None)
        logger.warning("Company IDs: " + str(company_ids))
        logger.warning("result.data[0]: " + str(result.data[0]))
        lead = models.Lead(**result.data[0])
        db.add(lead)
        await db.commit()
        # Retrieve the lead with companies eagerly loaded
        lead = await db.execute(
            select(models.Lead)
            .where(models.Lead.id == lead.id)
            .options(joinedload(models.Lead.companies))
        )  # type: ignore
        lead = lead.scalars().first()
    except Exception as e:
        logger.error(f"Error saving lead to database: {e}")
        logger.warning(f"Result was {result.data[0]}")
        raise HTTPException(status_code=500, detail="Error saving lead to database")

    return lead


@router.post("/seed")
async def seed_leads(
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    seed_path = conf.settings.SEEDS_PATH / "leads.json"
    logger.info(f"Seeding Leads table with initial data from {seed_path}")
    # fetch orchestration pipeline, create a new one if not found
    try:
        pipeline = await get_orchestration_pipeline_by_name("seed_leads", db, user)
    except HTTPException as e:
        if e.status_code == 404:
            logger.warning("Seed Leads pipeline not found, creating a new one")
            pipeline = await create_orchestration_pipeline(
                schemas.OrchestrationPipelineCreate(
                    name="seed_leads",
                    description="Seed Leads table with initial data",
                    definition={"action": "Insert initial data into Leads table"},
                ),
                user,
                db,
            )

    # create_orchestration_event
    event = await create_orchestration_event(
        schemas.OrchestrationEventCreate(
            message="Seeding Leads table with initial data",
            environment=conf.settings.ENVIRONMENT,
            pipeline_id=pipeline.id,  # type: ignore
            status=schemas.OrchestrationEventStatusType.PENDING,
            payload={},
            source_uri=schemas.URI(name=str(seed_path), type=schemas.URIType.FILE),
            destination_uri=schemas.URI(name="users", type=schemas.URIType.DATABASE),
        ),
        db=db,
    )

    # Run the orchestration event (TODO: Move this to a background task)
    try:
        async with aopen(seed_path, "r") as f:
            seed_data = json.loads(await f.read())
            log.info(f"Seeding Leads table with {len(seed_data)} records")
        for lead_data in seed_data:
            await create_lead(
                schemas.LeadCreate(**lead_data),
                db=db,
                user=user,
            )
    except Exception as e:
        log.exception(f"Error seeding Leads table: {e}")
        setattr(event, "status", schemas.OrchestrationEventStatusType.FAILED)
        setattr(event, "message", str(e))
        await db.commit()
        raise HTTPException(status_code=500, detail=str(e))

    setattr(event, "status", schemas.OrchestrationEventStatusType.SUCCESS)
    await db.commit()

    return {"message": "Leads table seeded successfully"}
