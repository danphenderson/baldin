# app/api/routes/resumes.py
import json
from asyncio import gather
from datetime import datetime
from io import BytesIO
from pathlib import Path

from aiofiles import open as aopen
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import UUID4
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, SimpleDocTemplate
from sqlalchemy import select

from app.api.deps import AsyncSession, conf
from app.api.deps import console_log as log
from app.api.deps import (
    create_orchestration_event,
    create_orchestration_pipeline,
    create_resume,
    get_async_session,
    get_current_user,
    get_orchestration_event,
    get_orchestration_pipeline_by_name,
    get_resume,
    models,
    schemas,
    session_context,
    update_orchestration_event,
    utils,
)

router: APIRouter = APIRouter()


@router.get("/{resume_id}/download", response_class=FileResponse)
async def download_resume(
    resume_id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    log.info(f"Downloading cover letter {resume_id} for user {user.id}")

    # Fetch the cover letter by ID
    resume = await get_resume(resume_id, db, user)

    # Create a PDF buffer
    pdf_buffer = BytesIO()
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72,
    )

    # Create a custom style to ensure single spacing and new-line preservation
    resume_style = ParagraphStyle(
        name="Custom",
        fontName="Helvetica",
        fontSize=12,
        leading=14,
        spaceAfter=0,
        spaceBefore=0,
        leftIndent=0,
        rightIndent=0,
        firstLineIndent=0,
        alignment=0,
    )

    # Prepare document with custom style
    flowables = []
    resume_content = resume.content.replace(
        "\n", "<br />"
    )  # Replace new lines with HTML break
    flowables.append(Paragraph(resume_content, resume_style))

    # Build the PDF
    doc.build(flowables)

    # Move the buffer cursor to the beginning
    pdf_buffer.seek(0)

    # Create a StreamingResponse that streams the PDF file
    response = StreamingResponse(pdf_buffer, media_type="application/pdf")
    response.headers[
        "Content-Disposition"
    ] = f'attachment; filename="{resume.name}.pdf"'

    return response


@router.get("/", response_model=list[schemas.ResumeRead])
async def get_current_user_resumes(
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    result = await db.execute(
        select(models.Resume).where(models.Resume.user_id == user.id)
    )
    resumes = result.scalars().all()
    if not resumes:
        raise HTTPException(
            status_code=404, detail="No resumes found for the current user"
        )
    return resumes


@router.post("/", status_code=201, response_model=schemas.ResumeRead)
async def create_user_resume(
    payload: schemas.ResumeCreate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    resume = models.Resume(**payload.dict(), user_id=user.id)
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume


@router.get("/{resume_id}", response_model=schemas.ResumeRead)
async def get_user_resume(
    resume: schemas.ResumeRead = Depends(get_resume),
):
    return resume


@router.patch("/{resume_id}", response_model=schemas.ResumeRead)
async def update_user_resume(
    payload: schemas.ResumeUpdate,
    resume: schemas.ResumeRead = Depends(get_resume),
    db: AsyncSession = Depends(get_async_session),
):
    resume_data = payload.dict(exclude_unset=True)
    for field in resume_data:
        setattr(resume, field, resume_data[field])
    await db.commit()
    await db.refresh(resume)
    return resume


@router.delete("/{resume_id}", status_code=204)
async def delete_user_resume(
    resume: schemas.ResumeRead = Depends(get_resume),
    db: AsyncSession = Depends(get_async_session),
):
    await db.delete(resume)
    await db.commit()
    return None


@router.post("/seed", response_model=str)
async def seed_resumes(
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> str:
    seed_path = conf.settings.SEEDS_PATH / "resumes.json"
    log.info(f"Seeding Resumes table with initial data from {seed_path}")

    # Fetch orchestration pipeline, create a new one if not found
    try:
        pipeline = await get_orchestration_pipeline_by_name("seed_resumes", db, user)
    except HTTPException as e:
        if e.status_code == 404:
            log.warning("Seed Resumes pipeline not found, creating a new one")
            pipeline = await create_orchestration_pipeline(
                schemas.OrchestrationPipelineCreate(
                    name="seed_resumes",
                    description="Seed Resumes table with initial data",
                    definition={"action": "Insert initial data into Resumes table"},
                ),
                user,
                db,
            )
        else:
            raise e

    # Create orchestration event
    event = await create_orchestration_event(
        schemas.OrchestrationEventCreate(
            message="Seeding Resumes table with initial data",
            environment=conf.settings.ENVIRONMENT,
            pipeline_id=pipeline.id,
            status=schemas.OrchestrationEventStatusType.PENDING,
            payload={},
            source_uri=schemas.URI(name=str(seed_path), type=schemas.URIType.FILE),
            destination_uri=schemas.URI(
                name=f"{conf.settings.DEFAULT_SQLALCHEMY_DATABASE_URI}#resumes",
                type=schemas.URIType.DATABASE,
            ),
        ),
        db=db,
    )

    # Run the orchestration event
    try:
        async with aopen(seed_path, "r") as f:
            resumes_data = json.loads(await f.read())
        for cover_letter in resumes_data:
            await create_resume(
                schemas.ResumeCreate(**cover_letter),
                db=db,
                user=user,
            )
    except Exception as e:
        log.error(f"Error seeding Resumes table: {e}")
        setattr(event, "status", schemas.OrchestrationEventStatusType.FAILED)
        setattr(event, "message", str(e))
        await db.commit()
        raise HTTPException(status_code=500, detail=str(e))

    setattr(event, "status", schemas.OrchestrationEventStatusType.SUCCESS)
    await db.commit()
    log.info(f"Seeded Resumes table with {len(resumes_data)} records.")
    return f"Seeded Resumes table with {len(resumes_data)} records."
