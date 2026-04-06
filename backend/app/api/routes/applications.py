# Path: app/api/routes/applications.py
import json
import zipfile
from html import escape as html_escape
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from pydantic import UUID4
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, SimpleDocTemplate
from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload

from app.api.deps import (
    AsyncSession,
    generate_cover_letter,
    get_application,
    get_async_session,
    get_cover_letter,
    get_current_user,
    get_document,
    get_resume,
    model_to_dict,
    models,
    schemas,
)
from app.api.routes.documents import _tiptap_to_flowables
from app.core.datetime_utils import format_utc_datetime, normalize_utc_datetime, now_utc
from app.core.document_storage import resolve_document_source_path

router: APIRouter = APIRouter()


async def _inject_legacy_deprecation_headers(response: Response) -> None:
    """Inject RFC 8594 Deprecation + Sunset headers on legacy resume/cover-letter sub-routes."""
    response.headers["Deprecation"] = "true"
    response.headers["Sunset"] = "2026-06-01"


def _normalize_status_history(history: list[dict] | None) -> list[dict]:
    """Normalize status-history timestamps to UTC Z strings when they parse cleanly."""
    normalized_history: list[dict] = []
    for entry in history or []:
        normalized_entry = dict(entry)
        changed_at = normalized_entry.get("changed_at")
        if changed_at is not None:
            normalized_changed_at = normalize_utc_datetime(changed_at)
            if normalized_changed_at is not None:
                normalized_entry["changed_at"] = normalized_changed_at
        normalized_history.append(normalized_entry)
    return normalized_history


def _build_status_history_entry(
    previous_status: str | None, next_status: str | None
) -> dict:
    return {
        "from": previous_status,
        "to": next_status,
        "changed_at": format_utc_datetime(now_utc()),
    }


@router.post("/", status_code=201, response_model=schemas.ApplicationRead)
async def create_application(
    payload: schemas.ApplicationCreate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    # Check if application already exists for the given lead_id and user
    existing_application = await db.execute(
        select(models.Application).where(
            models.Application.lead_id == payload.lead_id,
            models.Application.user_id == user.id,
        )
    )
    existing_application = existing_application.scalars().first()  # type: ignore

    if existing_application:
        # Application for this lead already exists for the user, return an error response
        raise HTTPException(
            status_code=400, detail="Application for this lead already exists"
        )

    # Create a new application
    application_data = {
        **payload.dict(exclude_unset=True, exclude={"document_ids"}),
        "user_id": user.id,
    }
    application_data["status_history"] = [
        _build_status_history_entry(None, payload.status)
    ]

    application = models.Application(**application_data)
    db.add(application)
    await db.commit()
    await db.refresh(application)

    # Bulk-attach documents when IDs are provided
    if payload.document_ids:
        result = await db.execute(
            select(models.Document).where(
                models.Document.id.in_(payload.document_ids),
                models.Document.user_id == user.id,
            )
        )
        valid_document_ids = {doc.id for doc in result.scalars().all()}

        links = [
            models.DocumentXApplication(
                document_id=doc_id, application_id=application.id
            )
            for doc_id in payload.document_ids
            if doc_id in valid_document_ids
        ]
        if links:
            db.add_all(links)
        await db.commit()

    # Eagerly load related objects (lead and user) for serialization
    result = await db.execute(
        select(models.Application)
        .options(
            joinedload(models.Application.lead).options(
                joinedload(models.Lead.companies)
            ),
            joinedload(models.Application.user),
        )
        .where(models.Application.id == application.id)
    )
    application = result.scalars().first()  # type: ignore

    return application


@router.get("/", response_model=list[schemas.ApplicationRead])
async def get_applications(
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Get all applications for the current user."""
    result = await db.execute(
        select(models.Application)
        .where(models.Application.user_id == user.id)  # Filter by current user's ID
        .options(
            joinedload(models.Application.lead).options(
                joinedload(models.Lead.companies)
            ),
            joinedload(models.Application.user),
        )
    )
    # Ensure that unique rows are considered to avoid duplicates due to joinedload
    applications = result.scalars().unique().all()
    return applications


@router.patch("/{id}", response_model=schemas.ApplicationRead)
async def update_application(
    id: UUID4,  # Ensure 'id' is extracted from the path parameter and is of the correct type
    payload: schemas.ApplicationUpdate,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    # Fetch the application to be updated using 'id'
    result = await db.execute(
        select(models.Application).where(models.Application.id == id)
    )
    application = result.scalars().first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Check if the user owns the application
    if application.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update this application",
        )

    # Update the application's attributes
    update_data = payload.dict(exclude_unset=True)
    new_status = update_data.get("status")
    if new_status is not None and new_status != application.status:
        history = _normalize_status_history(application.status_history)
        history.append(_build_status_history_entry(application.status, new_status))
        application.status_history = history

    for var, value in update_data.items():
        if var != "status_history":
            setattr(application, var, value)

    await db.commit()
    await db.refresh(application)

    # Eagerly load related objects (lead and user) for serialization
    result = await db.execute(
        select(models.Application)
        .options(
            joinedload(models.Application.lead), joinedload(models.Application.user)
        )
        .where(models.Application.id == id)
    )
    application = result.scalars().first()

    return application


@router.delete("/{id}", status_code=204)
async def delete_application(
    application: schemas.ApplicationRead = Depends(get_application),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    # Confirm that the user owns the application
    if application.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete this application",
        )

    # Delete the application
    await db.delete(application)
    await db.commit()
    return {"message": "Application deleted successfully"}


@router.get(
    "/{id}/resumes",
    response_model=list[schemas.ResumeRead],
    deprecated=True,
    dependencies=[Depends(_inject_legacy_deprecation_headers)],
)
async def get_application_resumes(
    app: schemas.ApplicationRead = Depends(get_application),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):

    # Confirm that the user owns the application
    if app.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view this application",
        )

    # Fetch resumes associated with the application
    result = await db.execute(
        select(models.Resume)
        .join(models.ResumeXApplication)
        .where(models.ResumeXApplication.application_id == app.id)
    )
    resumes = result.scalars().all()
    return resumes


@router.get(
    "/{id}/cover_letters",
    response_model=list[schemas.CoverLetterRead],
    deprecated=True,
    dependencies=[Depends(_inject_legacy_deprecation_headers)],
)
async def get_application_cover_letters(
    app: schemas.ApplicationRead = Depends(get_application),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):

    # Confirm that the user owns the application
    if app.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view this application",
        )

    # Fetch cover letters associated with the application
    result = await db.execute(
        select(models.CoverLetter)
        .join(models.CoverLetterXApplication)
        .where(models.CoverLetterXApplication.application_id == app.id)
    )
    cover_letters = result.scalars().all()
    return cover_letters


@router.post(
    "/{id}/resumes",
    status_code=201,
    response_model=schemas.ResumeRead,
    deprecated=True,
    dependencies=[Depends(_inject_legacy_deprecation_headers)],
)
async def add_resume_to_application(
    payload: schemas.ApplicationResumeAttach,
    application: models.Application = Depends(get_application),
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    resume = await get_resume(payload.resume_id, db, user)

    association = await db.get(
        models.ResumeXApplication,
        (application.id, resume.id),
    )
    if not association:
        association = models.ResumeXApplication(
            application_id=application.id,
            resume_id=resume.id,
        )
        db.add(association)
        await db.commit()

    return resume


@router.post(
    "/{id}/cover_letters",
    status_code=201,
    response_model=schemas.CoverLetterRead,
    deprecated=True,
    dependencies=[Depends(_inject_legacy_deprecation_headers)],
)
async def add_cover_letter_to_application(
    payload: schemas.ApplicationCoverLetterAttach,
    application: models.Application = Depends(get_application),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    cover_letter = await get_cover_letter(payload.cover_letter_id, db, user)

    association = await db.get(
        models.CoverLetterXApplication,
        (application.id, cover_letter.id),
    )
    if not association:
        association = models.CoverLetterXApplication(
            application_id=application.id,
            cover_letter_id=cover_letter.id,
        )
        db.add(association)
        await db.commit()

    return cover_letter


@router.post(
    "/{id}/cover_letters/generate",
    status_code=201,
    response_model=schemas.CoverLetterRead,
    deprecated=True,
    dependencies=[Depends(_inject_legacy_deprecation_headers)],
)
async def generate_cover_letter_for_application(
    id: UUID4,
    template_id: str | None = Query(
        None, description="Template ID for cover letter generation"
    ),
    db: AsyncSession = Depends(get_async_session),  # noqa
    user: schemas.UserRead = Depends(get_current_user),
):

    # Eagerly load the lead with the application
    app = await db.execute(
        select(models.Application)
        .options(joinedload(models.Application.lead))
        .where(models.Application.id == id)
    )
    app = app.scalars().first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if app.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to generate a cover letter for this application",
        )

    # Fetch the user profile details
    user_details = await db.execute(
        select(models.User)
        .options(
            joinedload(models.User.education),
            joinedload(models.User.certificates),
            joinedload(models.User.skills),
            joinedload(models.User.experiences),
        )
        .filter(models.User.id == user.id)  # type: ignore
    )
    user_profile = user_details.scalars().first()

    # Convert user_profile and lead to JSON
    user_profile_json = json.dumps(model_to_dict(user_profile))
    lead_json = json.dumps(model_to_dict(app.lead))

    # Get the cover letter template if a template_id is provided
    template_content = ""
    if template_id:
        template = await db.get(models.CoverLetter, template_id)
        if template and template.content_type == "template":
            template_content = template.content

    # Ensure template_content is a JSON string
    template_json = json.dumps({"content": template_content})

    # Generate the cover letter
    generated_content = generate_cover_letter(
        profile=user_profile_json, job=lead_json, template=template_json
    )

    # Create a new cover letter entry in the database
    cover_letter = models.CoverLetter(
        name=f"Cover Letter for {app.lead.title}",
        content=generated_content,
        content_type="generated",
        user_id=user.id,
    )
    db.add(cover_letter)
    await db.commit()
    await db.refresh(cover_letter)

    # Create an association between the cover letter and the application
    association = models.CoverLetterXApplication(
        application_id=app.id, cover_letter_id=cover_letter.id
    )
    db.add(association)
    await db.commit()
    return cover_letter


@router.get("/{id}", response_model=schemas.ApplicationRead)
async def get_application_by_id(
    application: schemas.ApplicationRead = Depends(get_application),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    # Fetch user and lead details for the application
    result = await db.execute(
        select(models.Application)
        .options(
            joinedload(models.Application.lead).options(
                joinedload(models.Lead.companies)
            ),
            joinedload(models.Application.user),
        )
        .where(models.Application.id == application.id)
    )

    application = result.scalars().first()  # type: ignore

    # Fetch company details for the application

    return application


# ---------------------------------------------------------------------------
#  Materials export
# ---------------------------------------------------------------------------

_PDF_STYLE = ParagraphStyle(
    name="ExportDefault",
    fontName="Helvetica",
    fontSize=12,
    leading=14,
    spaceAfter=0,
    spaceBefore=0,
)


def _text_to_pdf(text: str) -> bytes:
    """Render plain text content into a minimal PDF and return the bytes."""
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72,
    )
    doc.build([Paragraph(html_escape(text).replace("\n", "<br />"), _PDF_STYLE)])
    buf.seek(0)
    return buf.read()


def _document_version_to_pdf(version: models.DocumentVersion) -> bytes:
    """Render a document version to PDF, honoring its content format."""
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72,
    )
    raw_content = version.content or ""
    if getattr(version, "content_format", None) == "tiptap_json":
        flowables = _tiptap_to_flowables(raw_content, _PDF_STYLE)
    else:
        flowables = [
            Paragraph(html_escape(raw_content).replace("\n", "<br />"), _PDF_STYLE)
        ]
    doc.build(flowables)
    buf.seek(0)
    return buf.read()


def _safe_filename(name: str) -> str:
    """Strip characters that are problematic inside ZIP entry names."""
    return name.replace("/", "_").replace("\\", "_").replace("\0", "")


@router.get("/{id}/export")
async def export_application_materials(
    app: models.Application = Depends(get_application),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    """Export all materials linked to an application as a ZIP archive.

    The archive contains up to three subdirectories — ``resumes/``,
    ``cover_letters/``, and ``documents/`` — each holding PDF files for
    the linked records.
    """
    if app.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to export this application",
        )

    # -- Fetch linked resumes ----------------------------------------------
    resumes = (
        (
            await db.execute(
                select(models.Resume)
                .join(models.ResumeXApplication)
                .where(models.ResumeXApplication.application_id == app.id)
            )
        )
        .scalars()
        .all()
    )

    # -- Fetch linked cover letters ----------------------------------------
    cover_letters = (
        (
            await db.execute(
                select(models.CoverLetter)
                .join(models.CoverLetterXApplication)
                .where(models.CoverLetterXApplication.application_id == app.id)
            )
        )
        .scalars()
        .all()
    )

    # -- Fetch linked document attachments ---------------------------------
    document_links = (
        (
            await db.execute(
                select(models.DocumentXApplication).where(
                    models.DocumentXApplication.application_id == app.id
                )
            )
        )
        .scalars()
        .all()
    )

    documents_by_id: dict = {}
    if document_links:
        document_ids = [link.document_id for link in document_links]
        documents = (
            (
                await db.execute(
                    select(models.Document)
                    .options(
                        selectinload(models.Document.versions),
                        selectinload(models.Document.head_version),
                    )
                    .where(models.Document.id.in_(document_ids))
                )
            )
            .scalars()
            .all()
        )
        documents_by_id = {document.id: document for document in documents}

    if not resumes and not cover_letters and not document_links:
        raise HTTPException(
            status_code=404,
            detail="No materials linked to this application",
        )

    # -- Build ZIP in memory -----------------------------------------------
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for resume in resumes:
            if resume.content:
                fname = _safe_filename(resume.name or "resume") + ".pdf"
                zf.writestr(f"resumes/{fname}", _text_to_pdf(resume.content))

        for cl in cover_letters:
            if cl.content:
                fname = _safe_filename(cl.name or "cover_letter") + ".pdf"
                zf.writestr(f"cover_letters/{fname}", _text_to_pdf(cl.content))

        for link in document_links:
            doc = documents_by_id.get(link.document_id)
            if not doc:
                continue

            version = doc.head_version
            if link.version_id:
                version = next(
                    (
                        candidate
                        for candidate in doc.versions
                        if candidate.id == link.version_id
                    ),
                    None,
                )

            if not version:
                continue

            fname = _safe_filename(doc.title or "document") + ".pdf"

            # Prefer the original uploaded PDF when available on disk.
            if version.source_file:
                try:
                    abs_path = resolve_document_source_path(version.source_file)
                    if abs_path.is_file():
                        zf.write(abs_path, f"documents/{fname}")
                        continue
                except ValueError:
                    pass  # path outside uploads root — fall through

            # Fall back to generating a PDF from the linked version content.
            if version.content:
                zf.writestr(
                    f"documents/{fname}",
                    _document_version_to_pdf(version),
                )

    zip_buffer.seek(0)

    response = StreamingResponse(zip_buffer, media_type="application/zip")
    response.headers["Content-Disposition"] = (
        'attachment; filename="application_materials.zip"'
    )
    return response


# ---------------------------------------------------------------------------
#  Application ↔ Document attachment
# ---------------------------------------------------------------------------


@router.get("/{id}/documents", response_model=list[schemas.DocumentRead])
async def get_application_documents(
    app: models.Application = Depends(get_application),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    if app.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view this application",
        )
    result = await db.execute(
        select(models.Document)
        .join(models.DocumentXApplication)
        .where(models.DocumentXApplication.application_id == app.id)
    )
    docs = result.scalars().all()
    return [
        schemas.DocumentRead(
            id=d.id,
            created_at=d.created_at,
            updated_at=d.updated_at,
            kind=d.kind,
            title=d.title,
            status=d.status,
            is_pinned=d.is_pinned,
            head_version=(
                schemas.DocumentVersionRead.model_validate(d.head_version)
                if d.head_version
                else None
            ),
            version_count=len(d.versions) if d.versions else 0,
        )
        for d in docs
    ]


@router.post("/{id}/documents", status_code=201, response_model=schemas.DocumentRead)
async def add_document_to_application(
    payload: schemas.ApplicationDocumentAttach,
    application: models.Application = Depends(get_application),
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    doc = await get_document(payload.document_id, db, user)

    existing = await db.execute(
        select(models.DocumentXApplication).where(
            models.DocumentXApplication.application_id == application.id,
            models.DocumentXApplication.document_id == doc.id,
        )
    )
    if existing.scalars().first():
        raise HTTPException(
            status_code=400, detail="Document already attached to this application"
        )

    assoc = models.DocumentXApplication(
        application_id=application.id,
        document_id=doc.id,
        version_id=payload.version_id,
    )
    db.add(assoc)
    await db.commit()

    return schemas.DocumentRead(
        id=doc.id,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        kind=doc.kind,
        title=doc.title,
        status=doc.status,
        is_pinned=doc.is_pinned,
        head_version=(
            schemas.DocumentVersionRead.model_validate(doc.head_version)
            if doc.head_version
            else None
        ),
        version_count=len(doc.versions) if doc.versions else 0,
    )


@router.delete("/{id}/documents/{document_id}", status_code=204)
async def detach_document_from_application(
    document_id: UUID4,
    application: models.Application = Depends(get_application),
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    result = await db.execute(
        select(models.DocumentXApplication).where(
            models.DocumentXApplication.application_id == application.id,
            models.DocumentXApplication.document_id == document_id,
        )
    )
    assoc = result.scalars().first()
    if not assoc:
        raise HTTPException(
            status_code=404, detail="Document not attached to this application"
        )
    await db.delete(assoc)
    await db.commit()
    return None
