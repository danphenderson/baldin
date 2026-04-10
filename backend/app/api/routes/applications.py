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
from app.core.datetime_utils import format_utc_datetime, normalize_utc_datetime, now_utc
from app.core.document_storage import resolve_document_source_path

router: APIRouter = APIRouter()

_ACTIVE_APPLICATION_STATUSES = {status.value for status in models.ApplicationStage}
_CLOSED_APPLICATION_STATUSES = {status.value for status in models.ApplicationOutcome}


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


def _status_to_value(status: str | models.ApplicationStatus | None) -> str | None:
    if status is None:
        return None
    return status.value if isinstance(status, models.ApplicationStatus) else status


def _is_closed_to_active_transition(
    previous_status: str | models.ApplicationStatus | None,
    next_status: str | models.ApplicationStatus | None,
) -> bool:
    previous_value = _status_to_value(previous_status)
    next_value = _status_to_value(next_status)
    return (
        previous_value in _CLOSED_APPLICATION_STATUSES
        and next_value in _ACTIVE_APPLICATION_STATUSES
    )


def _is_terminal_status(status: str | models.ApplicationStatus | None) -> bool:
    return _status_to_value(status) in _CLOSED_APPLICATION_STATUSES


def _apply_outcome_reason_update(
    application: models.Application,
    payload: schemas.ApplicationUpdate,
    *,
    previous_status: str | models.ApplicationStatus | None,
    resulting_status: str | models.ApplicationStatus | None,
    status_change_requested: bool,
) -> None:
    reason_requested = "outcome_reason" in payload.model_fields_set
    normalized_reason = payload.outcome_reason

    if not _is_terminal_status(resulting_status):
        if reason_requested and normalized_reason is not None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "outcome_reason can only be set for rejected or withdrawn applications"
                ),
            )
        application.outcome_reason = None
        return

    if reason_requested:
        application.outcome_reason = normalized_reason
        return

    previous_value = _status_to_value(previous_status)
    resulting_value = _status_to_value(resulting_status)
    if (
        status_change_requested
        and previous_value in _CLOSED_APPLICATION_STATUSES
        and previous_value != resulting_value
    ):
        application.outcome_reason = None


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
        **payload.model_dump(
            exclude_unset=True, exclude={"document_ids", "stage", "outcome"}
        ),
        "user_id": user.id,
    }
    application_data["status_history"] = [
        _build_status_history_entry(None, payload.status)
    ]
    if not _is_terminal_status(payload.status):
        application_data["outcome_reason"] = None

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

    if application is not None:
        await _populate_document_counts([application], db=db, user_id=user.id)

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
    await _populate_document_counts(applications, db=db, user_id=user.id)
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
    previous_status = application.status
    status_change_requested = bool(
        {"status", "stage", "outcome"} & payload.model_fields_set
    )
    new_status = payload.status if status_change_requested else None
    if status_change_requested and new_status != application.status:
        if _is_closed_to_active_transition(application.status, new_status):
            if payload.reopen is not True:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Closed applications require reopen=true before moving back to an active stage"
                    ),
                )

        if new_status is not None:
            history = _normalize_status_history(application.status_history)
            history.append(_build_status_history_entry(application.status, new_status))
            application.status_history = history

        application.status = new_status

    _apply_outcome_reason_update(
        application,
        payload,
        previous_status=previous_status,
        resulting_status=new_status if status_change_requested else application.status,
        status_change_requested=status_change_requested,
    )

    update_data = payload.model_dump(
        exclude_unset=True,
        exclude={"status", "stage", "outcome", "reopen", "outcome_reason"},
    )
    for var, value in update_data.items():
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

    if application is not None:
        await _populate_document_counts([application], db=db, user_id=user.id)

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
        await _populate_document_counts([application], db=db, user_id=user.id)

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


async def _populate_document_counts(
    applications: list[models.Application],
    *,
    db: AsyncSession,
    user_id: UUID4,
) -> None:
    if not applications:
        return

    application_ids = [application.id for application in applications]
    count_rows = await db.execute(
        select(
            models.DocumentXApplication.application_id,
            func.count(models.Document.id).label("document_count"),
        )
        .join(
            models.Document,
            models.Document.id == models.DocumentXApplication.document_id,
        )
        .where(
            models.DocumentXApplication.application_id.in_(application_ids),
            _document_access_filter(user_id),
        )
        .group_by(models.DocumentXApplication.application_id)
    )
    count_map = {
        application_id: document_count
        for application_id, document_count in count_rows.all()
    }
    for application in applications:
        application.document_count = count_map.get(application.id, 0)


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
