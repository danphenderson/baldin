# Path: app/api/routes/leads.py

import json

from aiofiles import open as aopen
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, distinct, func, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import AsyncSession, conf
from app.api.deps import console_log
from app.api.deps import console_log as log
from app.api.deps import (
    create_extractor,
    create_lead,
    create_orchestration_event,
    create_orchestration_pipeline,
    get_async_session,
    get_current_superuser,
    get_current_user,
    get_extractor_by_name,
    get_lead,
    get_mutable_lead,
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
    return await create_lead(payload, db=db, user=user)


@router.get("/{id}", status_code=200, response_model=schemas.LeadRead)
async def read_lead(
    lead: models.Lead = Depends(get_lead),
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
    lead_query = (
        select(models.Lead)
        .options(
            selectinload(models.Lead.companies),
            selectinload(models.Lead.users),
        )
        .offset(offset)
        .limit(pagination.page_size)
    )
    total_count_query = select(func.count(distinct(models.Lead.id))).select_from(
        models.Lead
    )

    if not getattr(user, "is_superuser", False):
        visibility_filter = or_(models.User.id == user.id, models.User.id.is_(None))
        lead_query = lead_query.outerjoin(models.Lead.users).where(visibility_filter)
        total_count_query = total_count_query.outerjoin(models.Lead.users).where(
            visibility_filter
        )

    leads = await db.execute(lead_query)

    lead_list = leads.scalars().unique().all()
    total_count_result = await db.execute(total_count_query)
    total_count = total_count_result.scalar_one()

    return schemas.LeadsPaginatedRead(
        leads=[schemas.LeadRead.model_validate(lead) for lead in lead_list],
        pagination=pagination,
        total_count=total_count,
    )


@router.patch("/{id}", status_code=200, response_model=schemas.LeadRead)
async def update_lead(
    payload: schemas.LeadUpdate,
    lead: models.Lead = Depends(get_mutable_lead),
    db: AsyncSession = Depends(get_async_session),
):
    payload_data = payload.model_dump()
    console_log.info(f"Updating lead {lead.id} with data: {payload_data}")
    if "companies" in payload_data:
        console_log.info(f"Updating companies for lead {lead.id}")

    # Update the lead
    for field, value in payload.model_dump(
        exclude_unset=True, exclude={"company_ids"}
    ).items():
        setattr(lead, field, value)

    # Handle company associations
    if "company_ids" in payload.model_fields_set:
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
    user: schemas.UserRead = Depends(get_current_superuser),
):
    """
    Drops all leads records in the table.
    """
    lead_ids = select(models.Lead.id)
    application_ids = select(models.Application.id).where(
        models.Application.lead_id.in_(lead_ids)
    )

    await db.execute(
        delete(models.ResumeXApplication).where(
            models.ResumeXApplication.application_id.in_(application_ids)
        )
    )
    await db.execute(
        delete(models.CoverLetterXApplication).where(
            models.CoverLetterXApplication.application_id.in_(application_ids)
        )
    )
    await db.execute(
        delete(models.Application).where(models.Application.lead_id.in_(lead_ids))
    )
    await db.execute(delete(models.LeadXUser))
    await db.execute(delete(models.LeadXCompany))
    await db.execute(delete(models.Lead))
    await db.commit()
    return {"message": "All leads have been purged successfully"}


@router.delete("/{id}", status_code=204)
async def delete_lead(
    lead: models.Lead = Depends(get_mutable_lead),
    db: AsyncSession = Depends(get_async_session),
):
    await db.delete(lead)
    await db.commit()
    return None


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
        company_ids = result.data[0].pop("company_ids", None)
        logger.warning("Company IDs: " + str(company_ids))
        logger.warning("result.data[0]: " + str(result.data[0]))
        lead = await create_lead(
            schemas.LeadCreate(**result.data[0], company_ids=company_ids),
            db=db,
            user=user,
        )
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
            destination_uri=schemas.URI(
                name=f"{conf.settings.DEFAULT_SQLALCHEMY_DATABASE_URI}#leads",
                type=schemas.URIType.DATABASE,
            ),
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
