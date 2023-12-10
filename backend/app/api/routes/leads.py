# app/api/routes/leads.py


from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import delete, func, select

from app.api.deps import (
    AsyncSession,
    execute_leads_etl,
    get_async_session,
    get_enriched_lead,
    get_lead,
    get_pagination_params,
    models,
    schemas,
)

router: APIRouter = APIRouter()


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


@router.post("/load", status_code=202, response_model=schemas.ETLEventRead)
async def load_leads_from_data_lake(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
):

    etl_event = models.ETLEvent(**{"job_name": "load_leads", "status": "pending"})

    db.add(etl_event)
    await db.commit()
    await db.refresh(etl_event)

    # Use background_tasks to execute the ETL pipeline
    background_tasks.add_task(execute_leads_etl, etl_event.id)  # type: ignore

    return etl_event


@router.patch("/{id}/enrich", status_code=202, response_model=schemas.ETLEventRead)
async def enrich_lead(
    lead: schemas.LeadRead = Depends(get_enriched_lead),
    db: AsyncSession = Depends(get_async_session),
):
    await db.commit()
    await db.refresh(lead)
    return lead
