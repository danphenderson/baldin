# app/api/routes/certificate.py
from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy import func, select

from app.api.deps import (
    AsyncSession,
    create_certificate,
    extract_and_create_records,
    get_async_session,
    get_certificate,
    get_current_user,
    models,
    schemas,
)
from app.api.routes.seed_tasks import (
    SeedOperation,
    build_user_seed_creator,
    schedule_seed_operation,
)

router: APIRouter = APIRouter()

CERTIFICATE_SEED_OPERATION = SeedOperation(
    pipeline_name="seed_certificates",
    resource_name="Certificates",
    seed_filename="certificates.json",
    destination_table="certificates",
    creator=build_user_seed_creator(schemas.CertificateCreate, create_certificate),
)


@router.get("/", response_model=schemas.PaginatedResponse[schemas.CertificateRead])
async def read_current_user_certificates(
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=schemas.PAGINATION_MAX_PAGE_SIZE),
):
    base = select(models.Certificate).where(models.Certificate.user_id == user.id)
    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar_one()
    offset = (page - 1) * page_size
    result = await db.execute(base.offset(offset).limit(page_size))
    return schemas.PaginatedResponse[schemas.CertificateRead](
        items=result.scalars().all(),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{id}", response_model=schemas.CertificateRead)
async def read_user_certificate(
    certificate: schemas.CertificateRead = Depends(get_certificate),
):
    return certificate


@router.post("/", status_code=201, response_model=schemas.CertificateRead)
async def create_user_certificate(
    payload: schemas.CertificateCreate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    certificate = models.Certificate(**payload.model_dump(), user_id=user.id)
    db.add(certificate)
    await db.commit()
    await db.refresh(certificate)
    return certificate


@router.patch("/{id}", response_model=schemas.CertificateRead)
async def update_user_certificate(
    payload: schemas.CertificateUpdate,
    certificate: schemas.CertificateRead = Depends(get_certificate),
    db: AsyncSession = Depends(get_async_session),
):
    for field, value in payload:
        setattr(certificate, field, value)
    await db.commit()
    await db.refresh(certificate)
    return certificate


@router.delete("/{id}", response_model=schemas.CertificateRead)
async def delete_user_certificate(
    certificate: schemas.CertificateRead = Depends(get_certificate),
    db: AsyncSession = Depends(get_async_session),
):
    await db.delete(certificate)
    await db.commit()
    return certificate


@router.post("/extract", response_model=list[schemas.CertificateRead])
async def extract_certificates(
    payload: schemas.ExtractorRun,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    return await extract_and_create_records(
        extractor_name="certificates",
        extractor_description="Certificate data extractor",
        extractor_instruction="Extract certificates JSON data from a given context",
        json_schema=schemas.CertificateCreate.model_json_schema(),
        payload=payload,
        record_factory=lambda data: create_certificate(
            schemas.CertificateCreate(**data), db=db, user=user
        ),
        db=db,
        user=user,
    )


@router.post("/seed", status_code=202, response_model=schemas.SeedOperationAccepted)
async def seed_certificates(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    return await schedule_seed_operation(
        background_tasks, db, user, CERTIFICATE_SEED_OPERATION
    )
