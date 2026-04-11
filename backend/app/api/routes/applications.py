# Path: app/api/routes/applications.py
import zipfile
from html import escape as html_escape
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import UUID4
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, SimpleDocTemplate
from sqlalchemy import func, or_, select
from sqlalchemy.orm import joinedload, selectinload

from app.api.deps import (
    AsyncSession,
    get_application,
    get_async_session,
    get_current_user,
    get_document,
    models,
    schemas,
)
from app.api.routes.documents import _tiptap_to_flowables
from app.core.document_storage import resolve_document_source_path

router: APIRouter = APIRouter()


def _is_terminal(app: models.Application) -> bool:
    """Return True when the application has a terminal outcome."""
    return app.outcome is not None


def _record_history(
    db: AsyncSession,
    application: models.Application,
    *,
    user_id,
    note: str | None = None,
) -> None:
    """Append a new ApplicationStatusHistory row for the current stage/outcome."""
    entry = models.ApplicationStatusHistory(
        application_id=application.id,
        stage=application.stage,
        outcome=application.outcome,
        changed_by_user_id=user_id,
        note=note,
    )
    db.add(entry)


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
        raise HTTPException(
            status_code=400, detail="Application for this lead already exists"
        )

    # Create a new application
    application_data = {
        **payload.model_dump(exclude_unset=True, exclude={"document_ids"}),
        "user_id": user.id,
    }
    if payload.outcome is None:
        application_data["outcome_reason"] = None

    application = models.Application(**application_data)
    db.add(application)
    await db.flush()

    # Record initial status history entry
    _record_history(db, application, user_id=user.id)
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

    if application is not None:
        await _populate_document_metadata([application], db=db, user_id=user.id)

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
    await _populate_document_metadata(applications, db=db, user_id=user.id)
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
    prev_outcome = application.outcome
    stage_requested = "stage" in payload.model_fields_set
    outcome_requested = "outcome" in payload.model_fields_set
    status_changed = False

    # Handle stage change
    if (
        stage_requested
        and payload.stage is not None
        and payload.stage != application.stage
    ):
        # Reopening from a terminal outcome to an active stage
        if application.outcome is not None:
            if payload.reopen is not True:
                raise HTTPException(
                    status_code=400,
                    detail="Closed applications require reopen=true before moving back to an active stage",
                )
            application.outcome = None
        application.stage = payload.stage
        status_changed = True

    # Handle outcome change
    if outcome_requested:
        if payload.outcome is not None and payload.outcome != application.outcome:
            application.outcome = payload.outcome
            status_changed = True
        elif payload.outcome is None and application.outcome is not None:
            # Clearing outcome (reopening)
            if payload.reopen is not True:
                raise HTTPException(
                    status_code=400,
                    detail="Closed applications require reopen=true before clearing outcome",
                )
            application.outcome = None
            status_changed = True

    # Handle outcome_reason
    reason_requested = "outcome_reason" in payload.model_fields_set
    if application.outcome is None:
        if reason_requested and payload.outcome_reason is not None:
            raise HTTPException(
                status_code=400,
                detail="outcome_reason can only be set for rejected or withdrawn applications",
            )
        application.outcome_reason = None
    elif reason_requested:
        application.outcome_reason = payload.outcome_reason
    elif (
        status_changed
        and prev_outcome is not None
        and prev_outcome != application.outcome
    ):
        # Outcome changed between two terminal values — clear stale reason
        application.outcome_reason = None

    update_data = payload.model_dump(
        exclude_unset=True,
        exclude={"stage", "outcome", "reopen", "outcome_reason"},
    )
    for var, value in update_data.items():
        setattr(application, var, value)

    if status_changed:
        _record_history(db, application, user_id=user.id)

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

    if application is not None:
        await _populate_document_metadata([application], db=db, user_id=user.id)

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

    if application is not None:
        await _populate_document_metadata([application], db=db, user_id=user.id)

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


def _document_access_filter(user_id: UUID4):
    shared_document_ids = select(models.DocumentShare.document_id).where(
        models.DocumentShare.shared_with_user_id == user_id
    )
    return or_(
        models.Document.user_id == user_id,
        models.Document.id.in_(shared_document_ids),
    )


async def _populate_document_metadata(
    applications: list[models.Application],
    *,
    db: AsyncSession,
    user_id: UUID4,
) -> None:
    if not applications:
        return

    application_ids = [application.id for application in applications]
    metadata_rows = await db.execute(
        select(
            models.DocumentXApplication.application_id,
            models.Document.kind,
            func.count(models.Document.id).label("kind_count"),
        )
        .join(
            models.Document,
            models.Document.id == models.DocumentXApplication.document_id,
        )
        .where(
            models.DocumentXApplication.application_id.in_(application_ids),
            _document_access_filter(user_id),
        )
        .group_by(models.DocumentXApplication.application_id, models.Document.kind)
    )

    metadata_map: dict[UUID4, dict[str, object]] = {}
    for application_id, raw_kind, kind_count in metadata_rows.all():
        entry = metadata_map.setdefault(
            application_id,
            {"total_count": 0, "kinds": set()},
        )
        entry["total_count"] = int(entry["total_count"]) + kind_count
        cast_kinds = entry["kinds"]
        if isinstance(cast_kinds, set):
            cast_kinds.add(schemas.DocumentKind(raw_kind))

    for application in applications:
        entry = metadata_map.get(application.id)
        total_count = int(entry["total_count"]) if entry is not None else 0
        kinds = entry["kinds"] if entry is not None else set()
        ordered_kinds = [
            kind
            for kind in schemas.DocumentKind
            if isinstance(kinds, set) and kind in kinds
        ]
        application.document_metadata = schemas.ApplicationDocumentMetadata(
            total_count=total_count,
            has_resume=schemas.DocumentKind.RESUME in ordered_kinds,
            has_cover_letter=schemas.DocumentKind.COVER_LETTER in ordered_kinds,
            kinds=ordered_kinds,
        )


@router.get("/{id}/export")
async def export_application_materials(
    app: models.Application = Depends(get_application),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    """Export all materials linked to an application as a ZIP archive.

    The archive contains up to three subdirectories — ``resumes/``,
    ``cover_letters/``, and ``documents/`` — each holding PDF files derived
    from the application's attached documents.
    """
    if app.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to export this application",
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
                    .where(
                        models.Document.id.in_(document_ids),
                        _document_access_filter(user.id),
                    )
                )
            )
            .scalars()
            .all()
        )
        documents_by_id = {document.id: document for document in documents}

    accessible_document_links = [
        link for link in document_links if link.document_id in documents_by_id
    ]

    if not accessible_document_links:
        raise HTTPException(
            status_code=404,
            detail="No materials linked to this application",
        )

    # -- Build ZIP in memory -----------------------------------------------
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for link in accessible_document_links:
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
            if doc.kind == schemas.DocumentKind.RESUME.value:
                target_dir = "resumes"
            elif doc.kind == schemas.DocumentKind.COVER_LETTER.value:
                target_dir = "cover_letters"
            else:
                target_dir = "documents"
            archive_path = f"{target_dir}/{fname}"

            # Prefer the original uploaded PDF when available on disk.
            if version.source_file:
                try:
                    abs_path = resolve_document_source_path(version.source_file)
                    if abs_path.is_file():
                        zf.write(abs_path, archive_path)
                        continue
                except ValueError:
                    pass  # path outside uploads root — fall through

            # Fall back to generating a PDF from the linked version content.
            if version.content:
                zf.writestr(archive_path, _document_version_to_pdf(version))

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
        .options(
            selectinload(models.Document.versions),
            selectinload(models.Document.head_version),
        )
        .join(models.DocumentXApplication)
        .where(
            models.DocumentXApplication.application_id == app.id,
            _document_access_filter(user.id),
        )
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
