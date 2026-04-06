# app/api/routes/resumes.py
from io import BytesIO

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import UUID4
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, SimpleDocTemplate
from sqlalchemy import select

from app.api.deps import AsyncSession
from app.api.deps import console_log as log
from app.api.deps import (
    create_resume,
    get_async_session,
    get_current_user,
    get_resume,
    models,
    schemas,
)
from app.api.routes.seed_tasks import (
    SeedOperation,
    build_user_seed_creator,
    schedule_seed_operation,
)

router: APIRouter = APIRouter()

RESUME_SEED_OPERATION = SeedOperation(
    pipeline_name="seed_resumes",
    resource_name="Resumes",
    seed_filename="resumes.json",
    destination_table="resumes",
    creator=build_user_seed_creator(schemas.ResumeCreate, create_resume),
)


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
    response.headers["Content-Disposition"] = (
        f'attachment; filename="{resume.name}.pdf"'
    )

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


@router.post("/seed", status_code=202, response_model=schemas.SeedOperationAccepted)
async def seed_resumes(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    return await schedule_seed_operation(background_tasks, db, user, RESUME_SEED_OPERATION)
