# app/api/routes/certificate.py
import json

from aiofiles import open as aopen
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import AsyncSession, conf
from app.api.deps import console_log as log
from app.api.deps import (
    create_certificate,
    create_extractor,
    create_orchestration_event,
    create_orchestration_pipeline,
    get_async_session,
    get_certificate,
    get_current_user,
    get_extractor_by_name,
    get_orchestration_pipeline_by_name,
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


@router.post("/seed", response_model=str)
async def seed_certificates(
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> str:
    seed_path = conf.settings.SEEDS_PATH / "certificates.json"
    log.info(f"Seeding Certificates table with initial data from {seed_path}")

    # Fetch or create an orchestration pipeline
    try:
        pipeline = await get_orchestration_pipeline_by_name(
            "seed_certificates", db, user
        )
    except HTTPException as e:
        if e.status_code == 404:
            log.warning("Seed Certificates pipeline not found, creating a new one")
            pipeline = await create_orchestration_pipeline(
                schemas.OrchestrationPipelineCreate(
                    name="seed_certificates",
                    description="Seed Certificates table with initial data",
                    definition={
                        "action": "Insert initial data into Certificates table"
                    },
                ),
                user,
                db,
            )
        else:
            raise e

    # Create an orchestration event
    event = await create_orchestration_event(
        schemas.OrchestrationEventCreate(
            message="Seeding Certificates table with initial data",
            environment=conf.settings.ENVIRONMENT,
            pipeline_id=pipeline.id,
            status=schemas.OrchestrationEventStatusType.PENDING,
            payload={},
            source_uri=schemas.URI(name=str(seed_path), type=schemas.URIType.FILE),
            destination_uri=schemas.URI(
                name=f"{conf.settings.DEFAULT_SQLALCHEMY_DATABASE_URI}#certificates",
                type=schemas.URIType.DATABASE,
            ),
        ),
        db=db,
    )

    # Run the orchestration event
    try:
        async with aopen(seed_path, "r") as f:
            certificates_data = json.loads(await f.read())
        for certificate_entry in certificates_data:
            await create_certificate(
                schemas.CertificateCreate(**certificate_entry),
                db=db,
                user=user,
            )
    except Exception as e:
        log.error(f"Error seeding Certificates table: {e}")
        setattr(event, "status", schemas.OrchestrationEventStatusType.FAILED)
        setattr(event, "message", str(e))
        await db.commit()
        raise HTTPException(status_code=500, detail=str(e))

    setattr(event, "status", schemas.OrchestrationEventStatusType.SUCCESS)
    await db.commit()
    log.info(f"Seeded Certificates table with {len(certificates_data)} records.")
    return f"Seeded Certificates table with {len(certificates_data)} records."
