from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
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
from app.core.url_safety import validate_url_safe_for_fetch

router: APIRouter = APIRouter()

logger = logging.get_logger(__name__)


def _can_manage_company(
    company: models.Company,
    user: schemas.UserRead,
) -> bool:
    return bool(
        getattr(user, "is_superuser", False) or company.creator_user_id == user.id
    )


def _company_read(
    company: models.Company,
    user: schemas.UserRead,
) -> schemas.CompanyRead:
    if company.id is None or company.created_at is None or company.updated_at is None:
        raise ValueError("Company must be persisted before serialization.")
    return schemas.CompanyRead(
        id=company.id,
        created_at=company.created_at,
        updated_at=company.updated_at,
        name=company.name,
        industry=company.industry,
        size=company.size,
        location=company.location,
        description=company.description,
        creator_user_id=company.creator_user_id,
        can_manage=_can_manage_company(company, user),
    )


def _require_company_manager(
    company: models.Company,
    user: schemas.UserRead,
) -> None:
    if _can_manage_company(company, user):
        return
    raise HTTPException(
        status_code=403,
        detail="You do not have permission to modify this company.",
    )


@router.get("/{id}", response_model=schemas.CompanyRead)
async def get_company(
    company: models.Company = Depends(get_company_by_id),
    user: schemas.UserRead = Depends(get_current_user),
):
    return _company_read(company, user)


@router.get("/", response_model=schemas.PaginatedResponse[schemas.CompanyRead])
async def get_companies(
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=schemas.PAGINATION_MAX_PAGE_SIZE),
):
    count_result = await db.execute(select(func.count()).select_from(models.Company))
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    companies = await db.execute(
        select(models.Company)
        .order_by(func.lower(models.Company.name), models.Company.id)
        .offset(offset)
        .limit(page_size)
    )
    return schemas.PaginatedResponse[schemas.CompanyRead](
        items=[_company_read(company, user) for company in companies.scalars().all()],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/", response_model=schemas.CompanyRead)
async def create_company(
    payload: schemas.CompanyCreate,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    company = models.Company(**payload.model_dump(), creator_user_id=user.id)
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return _company_read(company, user)


@router.patch("/{id}", response_model=schemas.CompanyRead)
async def update_company(
    payload: schemas.CompanyUpdate,
    company: models.Company = Depends(get_company_by_id),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    _require_company_manager(company, user)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(company, key, value)
    await db.commit()
    await db.refresh(company)
    return _company_read(company, user)


@router.delete("/{id}", status_code=204)
async def delete_company(
    company: models.Company = Depends(get_company_by_id),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    _require_company_manager(company, user)
    await db.delete(company)
    await db.commit()
    return None


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
    return leads


@router.post("/extract", response_model=schemas.CompanyRead)
async def extract_company(
    extraction_url: str = Query(..., description="URL for data extraction"),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    try:
        validate_url_safe_for_fetch(extraction_url)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

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

    # Build the payload and run the extractor
    payload = schemas.ExtractorRun(
        mode="entire_document",
        file=None,
        text=None,
        url=extraction_url,  # type: ignore
        llm=None,
    )

    try:
        res = await run_extractor(
            schemas.ExtractorRead.model_validate(extractor, from_attributes=True),
            payload,
            user,
            db,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error running extractor: {extractor}")
        logger.error(e)
        raise HTTPException(status_code=500, detail="Error running extractor")

    logger.info(f"Successful Extraction, result: {res}")

    try:
        company = models.Company(
            **res.data[0],
            creator_user_id=user.id,
        )  # TODO: Handle multiple results
        db.add(company)
        await db.commit()
        await db.refresh(company)
    except Exception as e:
        logger.error(f"Error saving company to database: {res.data[0]}")
        logger.error(e)
        raise HTTPException(status_code=500, detail="Error saving company to database")

    return _company_read(company, user)
