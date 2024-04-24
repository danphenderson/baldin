# Path: app/api/routes/companies.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.api.deps import (
    AsyncSession,
    get_async_session,
    get_company_by_id,
    get_current_user,
    models,
    schemas,
)

router: APIRouter = APIRouter()


@router.get("/{id}", response_model=schemas.CompanyRead)
async def get_company(
    company: schemas.CompanyRead = Depends(get_company_by_id),
    db: AsyncSession = Depends(get_async_session),
    user: models.User = Depends(get_current_user),
):
    return company


@router.get("/", response_model=list[schemas.CompanyRead])
async def get_companies(
    db: AsyncSession = Depends(get_async_session),
    user: models.User = Depends(get_current_user),
):
    companies = await db.execute(select(models.Company))
    return companies.scalars().all()


@router.post("/", response_model=schemas.CompanyRead)
async def create_company(
    payload: schemas.CompanyCreate,
    db: AsyncSession = Depends(get_async_session),
    user: models.User = Depends(get_current_user),
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
    user: models.User = Depends(get_current_user),
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
    user: models.User = Depends(get_current_user),
):
    await db.delete(company)
    await db.commit()
    return {"message": "Company deleted successfully"}


@router.get("/{id}/leads", response_model=list[schemas.LeadRead])
async def get_company_leads(
    company: models.Company = Depends(get_company_by_id),
    db: AsyncSession = Depends(get_async_session),
    user: models.User = Depends(get_current_user),
):
    # Fetch leads associated with the company using eager loading for companies
    result = await db.execute(
        select(models.Lead)
        .options(joinedload(models.Lead.companies))
        .join(models.leads_x_companies)
        .where(models.leads_x_companies.company_id == company.id)
    )
    leads = result.scalars().all()
    if not leads:
        raise HTTPException(status_code=404, detail="No leads found for the company")
    return leads
