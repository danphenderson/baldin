# app/api/routes/documents.py
import json
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import UUID4
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, SimpleDocTemplate
from sqlalchemy import func, select, update
from sqlalchemy.orm import joinedload

from app.api.deps import AsyncSession
from app.api.deps import console_log as log
from app.api.deps import (
    generate_cover_letter,
    generate_resume,
    get_async_session,
    get_current_user,
    get_document,
    get_lead,
    model_to_dict,
    models,
    schemas,
)

router: APIRouter = APIRouter()


# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------


def _document_read(doc: models.Document) -> schemas.DocumentRead:
    """Project a Document ORM instance into a DocumentRead schema."""
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


def _document_detail(doc: models.Document) -> schemas.DocumentDetailRead:
    """Project a Document ORM instance into a DocumentDetailRead schema."""
    return schemas.DocumentDetailRead(
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
        versions=[
            schemas.DocumentVersionRead.model_validate(v) for v in (doc.versions or [])
        ],
    )


# ---------------------------------------------------------------------------
#  CRUD
# ---------------------------------------------------------------------------


@router.get("/pinned", response_model=list[schemas.DocumentRead])
async def get_pinned_documents(
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Return the user's pinned (active/canonical) documents — at most one per kind."""
    result = await db.execute(
        select(models.Document).where(
            models.Document.user_id == user.id,
            models.Document.is_pinned.is_(True),
        )
    )
    docs = result.scalars().all()
    return [_document_read(d) for d in docs]


@router.get("/", response_model=list[schemas.DocumentRead])
async def list_documents(
    kind: schemas.DocumentKind | None = Query(None, description="Filter by kind"),
    status: schemas.DocumentStatus | None = Query(None, description="Filter by status"),
    is_pinned: bool | None = Query(None, description="Filter by pinned state"),
    search: str | None = Query(None, description="Search by title (case-insensitive)"),
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    q = select(models.Document).where(models.Document.user_id == user.id)
    if kind is not None:
        q = q.where(models.Document.kind == kind.value)
    if status is not None:
        q = q.where(models.Document.status == status.value)
    if is_pinned is not None:
        q = q.where(models.Document.is_pinned.is_(is_pinned))
    if search:
        q = q.where(models.Document.title.ilike(f"%{search}%"))
    q = q.order_by(models.Document.updated_at.desc())
    result = await db.execute(q)
    docs = result.scalars().all()
    return [_document_read(d) for d in docs]


# ---------------------------------------------------------------------------
#  Generation
# ---------------------------------------------------------------------------


@router.post("/generate", status_code=201, response_model=schemas.DocumentDetailRead)
async def generate_document(
    payload: schemas.DocumentGenerateRequest,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Generate document content via AI and persist as a Document + Version.

    Supported kinds: ``cover_letter``, ``resume``.  Others return 501.

    If ``document_id`` is provided the generated content is appended as a new
    version; otherwise a brand-new Document is created.
    """
    kind = payload.kind

    if kind not in (schemas.DocumentKind.COVER_LETTER, schemas.DocumentKind.RESUME):
        raise HTTPException(
            status_code=501,
            detail=f"Generation for kind '{kind.value}' is not yet supported",
        )

    # Load lead
    lead = await get_lead(payload.lead_id, db)

    # Load user profile with relations needed by the generator
    result = await db.execute(
        select(models.User)
        .options(
            joinedload(models.User.education),
            joinedload(models.User.certificates),
            joinedload(models.User.cover_letters),
            joinedload(models.User.experiences),
        )
        .filter(models.User.id == user.id)
    )
    user_profile = result.scalars().first()

    user_profile_json = json.dumps(model_to_dict(user_profile))
    lead_json = json.dumps(model_to_dict(lead))

    # Resolve optional template
    template_content = ""
    if payload.template_version_id:
        tmpl_version = await db.get(models.DocumentVersion, payload.template_version_id)
        if tmpl_version and tmpl_version.content:
            template_content = tmpl_version.content
    template_json = json.dumps({"content": template_content})

    # Dispatch to the appropriate generator
    if kind == schemas.DocumentKind.COVER_LETTER:
        generated_content = generate_cover_letter(
            profile=user_profile_json, job=lead_json, template=template_json
        )
    else:
        generated_content = generate_resume(
            profile=user_profile_json, job=lead_json, template=template_json
        )

    # Create or append
    if payload.document_id:
        doc = await get_document(payload.document_id, db, user)
        max_vn = max((v.version_number for v in doc.versions), default=0)
        version = models.DocumentVersion(
            document_id=doc.id,
            version_number=max_vn + 1,
            name=f"Generated v{max_vn + 1} for {lead.title}",
            content=generated_content,
            content_type="generated",
            change_summary=f"AI-generated from lead: {lead.title}",
        )
        db.add(version)
        await db.flush()
        doc.head_version_id = version.id
    else:
        kind_label = kind.value.replace("_", " ").title()
        doc = models.Document(
            user_id=user.id,
            kind=kind.value,
            title=f"{kind_label} for {lead.title}",
            status="active",
        )
        db.add(doc)
        await db.flush()

        version = models.DocumentVersion(
            document_id=doc.id,
            version_number=1,
            name=f"{kind_label} for {lead.title}",
            content=generated_content,
            content_type="generated",
            change_summary=f"AI-generated from lead: {lead.title}",
        )
        db.add(version)
        await db.flush()
        doc.head_version_id = version.id

    await db.commit()
    await db.refresh(doc)
    return _document_detail(doc)


@router.post("/", status_code=201, response_model=schemas.DocumentDetailRead)
async def create_document(
    payload: schemas.DocumentCreate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Create a document with its initial version (v1)."""
    doc = models.Document(
        user_id=user.id,
        kind=payload.kind.value,
        title=payload.title,
        status=payload.status.value,
    )
    db.add(doc)
    await db.flush()

    version = models.DocumentVersion(
        document_id=doc.id,
        version_number=1,
        name=payload.title,
        content=payload.content,
        content_type=payload.content_type.value if payload.content_type else None,
        change_summary="Initial version",
    )
    db.add(version)
    await db.flush()

    doc.head_version_id = version.id
    await db.commit()
    await db.refresh(doc)
    return _document_detail(doc)


@router.get("/{document_id}", response_model=schemas.DocumentDetailRead)
async def get_document_detail(
    document_id: UUID4,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    doc = await get_document(document_id, db, user)
    return _document_detail(doc)


@router.patch("/{document_id}", response_model=schemas.DocumentRead)
async def update_document(
    document_id: UUID4,
    payload: schemas.DocumentUpdate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    doc = await get_document(document_id, db, user)
    data = payload.dict(exclude_unset=True)
    for field, value in data.items():
        if isinstance(value, schemas.DocumentStatus):
            value = value.value
        setattr(doc, field, value)
    await db.commit()
    await db.refresh(doc)
    return _document_read(doc)


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: UUID4,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    doc = await get_document(document_id, db, user)
    await db.delete(doc)
    await db.commit()
    return None


# ---------------------------------------------------------------------------
#  Versions
# ---------------------------------------------------------------------------


@router.get("/{document_id}/versions", response_model=list[schemas.DocumentVersionRead])
async def list_versions(
    document_id: UUID4,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    doc = await get_document(document_id, db, user)
    return [schemas.DocumentVersionRead.model_validate(v) for v in doc.versions]


@router.post(
    "/{document_id}/versions",
    status_code=201,
    response_model=schemas.DocumentVersionRead,
)
async def create_version(
    document_id: UUID4,
    payload: schemas.DocumentVersionCreate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    doc = await get_document(document_id, db, user)

    # Determine next version_number
    max_vn = max((v.version_number for v in doc.versions), default=0)

    version = models.DocumentVersion(
        document_id=doc.id,
        version_number=max_vn + 1,
        name=payload.name,
        content=payload.content,
        content_type=payload.content_type.value if payload.content_type else None,
        change_summary=payload.change_summary,
    )
    db.add(version)
    await db.flush()

    doc.head_version_id = version.id
    await db.commit()
    await db.refresh(version)
    return schemas.DocumentVersionRead.model_validate(version)


@router.get(
    "/{document_id}/versions/{version_id}",
    response_model=schemas.DocumentVersionRead,
)
async def get_version(
    document_id: UUID4,
    version_id: UUID4,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    doc = await get_document(document_id, db, user)
    version = await db.get(models.DocumentVersion, version_id)
    if not version or version.document_id != doc.id:
        raise HTTPException(status_code=404, detail="Version not found")
    return schemas.DocumentVersionRead.model_validate(version)


# ---------------------------------------------------------------------------
#  Pinning
# ---------------------------------------------------------------------------


@router.post("/{document_id}/pin", response_model=schemas.DocumentRead)
async def pin_document(
    document_id: UUID4,
    payload: schemas.DocumentPinRequest | None = None,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Pin (or unpin) a document as the active/canonical for its kind.

    When pinning, all other documents of the same kind for this user are
    unpinned first.
    """
    doc = await get_document(document_id, db, user)
    pinned = payload.pinned if payload else True

    if pinned:
        # Unpin siblings of the same kind
        await db.execute(
            update(models.Document)
            .where(
                models.Document.user_id == user.id,
                models.Document.kind == doc.kind,
                models.Document.id != doc.id,
            )
            .values(is_pinned=False)
        )

    doc.is_pinned = pinned
    await db.commit()
    await db.refresh(doc)
    return _document_read(doc)


# ---------------------------------------------------------------------------
#  Download (PDF export)
# ---------------------------------------------------------------------------


@router.get("/{document_id}/download")
async def download_document(
    document_id: UUID4,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    doc = await get_document(document_id, db, user)
    if not doc.head_version or not doc.head_version.content:
        raise HTTPException(
            status_code=400, detail="Document has no content to download"
        )

    pdf_buffer = BytesIO()
    pdf_doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72,
    )
    style = ParagraphStyle(
        name="Custom",
        fontName="Helvetica",
        fontSize=12,
        leading=14,
        spaceAfter=0,
        spaceBefore=0,
    )
    content = doc.head_version.content.replace("\n", "<br />")
    pdf_doc.build([Paragraph(content, style)])
    pdf_buffer.seek(0)

    filename = f"{doc.title or 'document'}.pdf"
    response = StreamingResponse(pdf_buffer, media_type="application/pdf")
    response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
