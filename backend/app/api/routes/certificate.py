# app/api/routes/certificate.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import (
    AsyncSession,
    get_async_session,
    get_certificate,
    get_current_user,
    models,
    schemas,
)

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
