# app/api/routes/certificate.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import (
    AsyncSession,
    create_certificate,
    create_extractor,
    get_async_session,
    get_certificate,
    get_current_user,
    get_extractor_by_name,
    logging,
    models,
    run_extractor,
    schemas,
)

logger = logging.get_logger(__name__)

router: APIRouter = APIRouter()


@router.get("/", response_model=list[schemas.CertificateRead])
async def read_current_user_certificates(
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    result = await db.execute(
        select(models.Certificate).where(models.Certificate.user_id == user.id)
    )
    certificates = result.scalars().all()
    if not certificates:
        raise HTTPException(
            status_code=404, detail="No certificates found for the current user"
        )
    return certificates


@router.get("/{certificate_id}", response_model=schemas.CertificateRead)
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
    certificate = models.Certificate(**payload.dict(), user_id=user.id)
    db.add(certificate)
    await db.commit()
    await db.refresh(certificate)
    return certificate


@router.put("/{certificate_id}", response_model=schemas.CertificateRead)
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


@router.delete("/{certificate_id}", response_model=schemas.CertificateRead)
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
    try:
        extractor = await get_extractor_by_name("certificates", db)
    except HTTPException as e:
        if e.status_code == 404:
            extractor = await create_extractor(
                schemas.ExtractorCreate(
                    name="certificates",
                    description="Certificate data extractor",
                    instruction="Extract certificates JSON data from a given context",
                    json_schema=schemas.CertificateCreate.model_json_schema(),
                    extractor_examples=[],
                ),
                db=db,
                user=user,
            )
        else:
            raise e

    # Run the extractor with the given payload
    resp = await run_extractor(
        schemas.ExtractorRead(**extractor.__dict__), payload, user, db
    )

    # Save the extracted certificates to the database
    return [
        await create_certificate(schemas.CertificateCreate(**cert), db, user)
        for cert in resp.data
    ]
