# Path: app/api/routes/companies.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.api.deps import (
    AsyncSession,
    create_extractor,
    get_async_session,
    get_company_by_id,
    get_current_user,
    get_extractor_by_name,
    logging,
    models,
    run_extractor,
    schemas,
)

router: APIRouter = APIRouter()

logger = logging.get_logger(__name__)


@router.get("/{id}", response_model=schemas.CompanyRead)
async def get_company(
    company: schemas.CompanyRead = Depends(get_company_by_id),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    return company


@router.get("/", response_model=list[schemas.CompanyRead])
async def get_companies(
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    companies = await db.execute(select(models.Company))
    return companies.scalars().all()


@router.post("/", response_model=schemas.CompanyRead)
async def create_company(
    payload: schemas.CompanyCreate,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    company = models.Company(**payload.dict())
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return company


@router.put("/{id}", response_model=schemas.CompanyRead)
async def update_company(
    payload: schemas.CompanyUpdate,
    company: models.Company = Depends(get_company_by_id),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(company, key, value)
    await db.commit()
    await db.refresh(company)
    return company


@router.delete("/{id}", status_code=204)
async def delete_company(
    company: schemas.CompanyRead = Depends(get_company_by_id),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    await db.delete(company)
    await db.commit()
    return {"message": "Company deleted successfully"}


@router.get("/{id}/leads", response_model=list[schemas.LeadRead])
async def get_company_leads(
    company: models.Company = Depends(get_company_by_id),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    # Fetch leads associated with the company using eager loading for companies
    result = await db.execute(
        select(models.Lead)
        .options(joinedload(models.Lead.companies))
        .join(models.LeadXCompany)
        .where(models.LeadXCompany.company_id == company.id)
    )
    leads = result.scalars().all()
    if not leads:
        raise HTTPException(status_code=404, detail="No leads found for the company")
    return leads


@router.post("/extract", response_model=schemas.CompanyRead)
async def extract_company(
    extraction_url: str = Query(..., description="URL for data extraction"),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    logger.warning(f"User {user.id} triggered company extraction for {extraction_url}")
    # Get extractor, create one if it doesn't exist
    try:
        extractor = await get_extractor_by_name("company", db)
    except HTTPException as e:
        if e.status_code == 404:
            extractor = await create_extractor(
                schemas.ExtractorCreate(
                    name="company",
                    description="Company data extraction",
                    instruction="Extract company JSON data from a given context",
                    json_schema=schemas.CompanyCreate.model_json_schema(),
                    extractor_examples=[],
                ),
                user,
                db,
            )
        else:
            raise e

    # Buld the payload and run the extractor
    payload = schemas.ExtractorRun(
        mode="entire_document",
        file=None,
        text=None,
        url=extraction_url,  # type: ignore
        llm=None,
    )

    # FIXME: Clean up the debugging code
    try:
        # A bit of a hack below to convert the extractor to a read schema
        res = await run_extractor(
            schemas.ExtractorRead(**extractor.__dict__), payload, user, db
        )
    except Exception as e:
        logger.error(f"Error running extractor: {extractor}")
        logger.error(e)
        raise HTTPException(status_code=500, detail="Error running extractor")

    logger.info(f"Successful Extraction, result: {res}")

    try:
        company = models.Company(**res.data[0])  # TOOD: Handle multiple results
        db.add(company)
        await db.commit()
        await db.refresh(company)
    except Exception as e:
        logger.error(f"Error saving company to database: {res.data[0]}")
        logger.error(e)
        raise HTTPException(status_code=500, detail="Error saving company to database")

    return company
