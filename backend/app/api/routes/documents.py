# app/api/routes/documents.py
import json
from io import BytesIO

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
)
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import UUID4
from PyPDF2 import PdfReader
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, SimpleDocTemplate
from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload, selectinload

from app.api.deps import (
    AsyncSession,
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
from app.api.routes.seed_tasks import (
    SeedOperation,
    build_user_seed_creator,
    schedule_seed_operation,
)
from app.core.document_storage import (
    MAX_DOCUMENT_UPLOAD_BYTES,
    build_document_source_path,
    remove_document_source_files,
    resolve_document_source_path,
    save_document_source_file,
)

router: APIRouter = APIRouter()


# ---------------------------------------------------------------------------
#  Tiptap → PDF helpers
# ---------------------------------------------------------------------------


def _tiptap_extract_text(node: dict) -> str:
    """Recursively extract styled HTML text from a Tiptap JSON node."""
    if node.get("type") == "text":
        text = node.get("text", "")
        for mark in node.get("marks", []):
            mt = mark.get("type")
            if mt == "bold":
                text = f"<b>{text}</b>"
            elif mt == "italic":
                text = f"<i>{text}</i>"
            elif mt == "underline":
                text = f"<u>{text}</u>"
        return text

    parts: list[str] = []
    for child in node.get("content", []):
        parts.append(_tiptap_extract_text(child))
    return "".join(parts)


def _tiptap_to_flowables(raw_content: str, base_style: ParagraphStyle) -> list:
    """Convert Tiptap JSON content string to a list of reportlab flowables.

    Falls back to plain-text rendering if the JSON is unparseable.
    """
    try:
        data = json.loads(raw_content)
    except (json.JSONDecodeError, TypeError):
        return [Paragraph(raw_content.replace("\n", "<br />"), base_style)]

    if not isinstance(data, dict) or "content" not in data:
        return [Paragraph(raw_content.replace("\n", "<br />"), base_style)]

    flowables: list = []
    for node in data.get("content", []):
        ntype = node.get("type", "")
        text_html = _tiptap_extract_text(node)

        if ntype == "heading":
            level = node.get("attrs", {}).get("level", 1)
            font_size = max(12, 24 - (level - 1) * 3)
            h_style = ParagraphStyle(
                f"Heading{level}",
                parent=base_style,
                fontSize=font_size,
                leading=font_size + 4,
                spaceBefore=6,
                spaceAfter=4,
            )
            flowables.append(Paragraph(text_html or "&nbsp;", h_style))

        elif ntype in ("bulletList", "orderedList"):
            items = node.get("content", [])
            indent_style = ParagraphStyle(
                "ListItem",
                parent=base_style,
                leftIndent=24,
                spaceBefore=1,
                spaceAfter=1,
            )
            for idx, item in enumerate(items):
                item_text = _tiptap_extract_text(item)
                prefix = f"{idx + 1}. " if ntype == "orderedList" else "\u2022 "
                flowables.append(Paragraph(f"{prefix}{item_text}", indent_style))

        elif ntype == "paragraph":
            flowables.append(Paragraph(text_html or "&nbsp;", base_style))

        else:
            # Unknown node type — render as plain paragraph
            if text_html:
                flowables.append(Paragraph(text_html, base_style))

    if not flowables:
        flowables.append(Paragraph("&nbsp;", base_style))

    return flowables


# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------


def _require_role(document, allowed: set[str]):
    """Raise 403 if the effective role on the document is not in *allowed*."""
    role = getattr(document, "_effective_role", "owner")
    if role not in allowed:
        raise HTTPException(status_code=403, detail="Insufficient permissions")


def _user_full_name(user: models.User | schemas.UserRead | None) -> str | None:
    if user is None:
        return None

    parts = [
        name
        for name in (
            getattr(user, "first_name", None),
            getattr(user, "last_name", None),
        )
        if name
    ]
    if parts:
        return " ".join(parts)
    return getattr(user, "email", None)


def _user_avatar_uri(user: models.User | schemas.UserRead | None) -> str | None:
    avatar = getattr(user, "avatar_uri", None)
    if avatar and hasattr(avatar, "name"):
        avatar = avatar.name
    return str(avatar) if avatar else None


def _document_share_metadata(
    doc: models.Document,
    share: models.DocumentShare | None,
) -> dict[str, object | None]:
    if share is None:
        return {}

    owner = getattr(doc, "user", None)
    shared_by = getattr(share, "shared_by_user", None)
    return {
        "owner_user_id": doc.user_id,
        "owner_full_name": _user_full_name(owner),
        "owner_email": getattr(owner, "email", None),
        "shared_by_user_id": share.shared_by_user_id,
        "shared_by_full_name": _user_full_name(shared_by),
        "shared_by_email": getattr(shared_by, "email", None),
        "shared_at": share.created_at,
        "share_updated_at": share.updated_at,
    }


def _document_read(
    doc: models.Document,
    share: models.DocumentShare | None = None,
) -> schemas.DocumentRead:
    """Project a Document ORM instance into a DocumentRead schema."""
    share = share or getattr(doc, "_share_context", None)
    effective = getattr(doc, "_effective_role", "owner")
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
        viewer_role=(
            None if effective == "owner" else schemas.DocumentShareRole(effective)
        ),
        **_document_share_metadata(doc, share),
    )


def _document_summary_read(
    doc: models.Document,
    share: models.DocumentShare | None = None,
) -> schemas.DocumentSummaryRead:
    """Project a Document ORM instance into a DocumentSummaryRead schema."""
    share = share or getattr(doc, "_share_context", None)
    effective = getattr(doc, "_effective_role", "owner")
    return schemas.DocumentSummaryRead(
        id=doc.id,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        kind=doc.kind,
        title=doc.title,
        status=doc.status,
        is_pinned=doc.is_pinned,
        head_version=(
            schemas.DocumentVersionSummaryRead.model_validate(doc.head_version)
            if doc.head_version
            else None
        ),
        version_count=len(doc.versions) if doc.versions else 0,
        viewer_role=(
            None if effective == "owner" else schemas.DocumentShareRole(effective)
        ),
        **_document_share_metadata(doc, share),
    )


def _document_detail(
    doc: models.Document,
    share: models.DocumentShare | None = None,
) -> schemas.DocumentDetailRead:
    """Project a Document ORM instance into a DocumentDetailRead schema."""
    share = share or getattr(doc, "_share_context", None)
    effective = getattr(doc, "_effective_role", "owner")
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
        viewer_role=(
            None if effective == "owner" else schemas.DocumentShareRole(effective)
        ),
        **_document_share_metadata(doc, share),
        versions=[
            schemas.DocumentVersionRead.model_validate(v) for v in (doc.versions or [])
        ],
    )


def _serialize_share(share: models.DocumentShare) -> schemas.DocumentShareRead:
    shared_with = share.shared_with_user
    shared_by = share.shared_by_user
    return schemas.DocumentShareRead(
        id=share.id,
        created_at=share.created_at,
        updated_at=share.updated_at,
        document_id=share.document_id,
        shared_with_user_id=share.shared_with_user_id,
        shared_by_user_id=share.shared_by_user_id,
        role=schemas.DocumentShareRole(share.role),
        shared_with_full_name=_user_full_name(shared_with)
        or str(share.shared_with_user_id),
        shared_with_email=getattr(shared_with, "email", str(share.shared_with_user_id)),
        shared_with_headline=getattr(shared_with, "headline", None),
        shared_by_full_name=_user_full_name(shared_by) or str(share.shared_by_user_id),
        shared_by_email=getattr(shared_by, "email", str(share.shared_by_user_id)),
    )


def _serialize_share_candidate(user: models.User) -> schemas.DocumentShareCandidateRead:
    return schemas.DocumentShareCandidateRead(
        id=user.id,
        full_name=_user_full_name(user) or str(user.id),
        email=user.email,
        headline=user.headline,
        avatar_uri=_user_avatar_uri(user),
    )


def _serialize_activity(
    activity: models.DocumentActivity,
) -> schemas.DocumentActivityRead:
    actor = activity.actor
    return schemas.DocumentActivityRead(
        id=activity.id,
        created_at=activity.created_at,
        updated_at=activity.updated_at,
        document_id=activity.document_id,
        activity_type=schemas.DocumentActivityType(activity.activity_type),
        message=activity.message,
        details=activity.details or {},
        actor_user_id=activity.actor_user_id,
        actor_full_name=_user_full_name(actor),
        actor_email=getattr(actor, "email", None),
    )


async def _record_document_activity(
    db: AsyncSession,
    *,
    document_id: UUID4,
    activity_type: schemas.DocumentActivityType,
    message: str,
    actor: models.User | schemas.UserRead | None = None,
    details: dict[str, object | None] | None = None,
) -> None:
    db.add(
        models.DocumentActivity(
            document_id=document_id,
            actor_user_id=getattr(actor, "id", None),
            activity_type=activity_type.value,
            message=message,
            details=details or {},
        )
    )
    await db.flush()


async def _get_share(
    db: AsyncSession,
    *,
    document_id: UUID4,
    share_id: UUID4,
) -> models.DocumentShare | None:
    result = await db.execute(
        select(models.DocumentShare)
        .where(
            models.DocumentShare.id == share_id,
            models.DocumentShare.document_id == document_id,
        )
        .options(
            selectinload(models.DocumentShare.shared_with_user),
            selectinload(models.DocumentShare.shared_by_user),
        )
    )
    return result.scalar_one_or_none()


# ---------------------------------------------------------------------------
#  PDF Upload
# ---------------------------------------------------------------------------


@router.post("/upload", response_model=schemas.DocumentDetailRead, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    kind: str = Form("freeform"),
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Upload a PDF file, extract its text, and create a new Document + v1."""

    try:
        document_kind = schemas.DocumentKind(kind)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid document kind") from exc

    # --- validate content type ------------------------------------------
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    file_bytes = await file.read()

    # --- validate magic bytes -------------------------------------------
    if not file_bytes[:5].startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    # --- validate size --------------------------------------------------
    if len(file_bytes) > MAX_DOCUMENT_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")

    # --- extract text ---------------------------------------------------
    reader = PdfReader(BytesIO(file_bytes))
    pages_text = [page.extract_text() or "" for page in reader.pages]
    extracted_text = "\n\n".join(pages_text).strip()

    if not extracted_text:
        raise HTTPException(
            status_code=400,
            detail="Could not extract text from PDF. The file may be scanned/image-based.",
        )

    # --- persist document -----------------------------------------------
    doc = models.Document(
        user_id=user.id,
        kind=document_kind.value,
        title=title,
        status="draft",
    )
    db.add(doc)
    await db.flush()

    # --- save file to disk ----------------------------------------------
    relative_path = build_document_source_path(user.id, doc.id, 1)
    save_document_source_file(relative_path, file_bytes)

    # --- create version -------------------------------------------------
    version = models.DocumentVersion(
        document_id=doc.id,
        version_number=1,
        name="v1 (PDF Import)",
        content=extracted_text,
        content_type="custom",
        content_format="plain_text",
        source_file=relative_path,
    )
    db.add(version)
    await db.flush()

    doc.head_version_id = version.id
    await _record_document_activity(
        db,
        document_id=doc.id,
        activity_type=schemas.DocumentActivityType.DOCUMENT_UPLOADED,
        message="Imported a PDF source file",
        actor=user,
        details={
            "version_number": version.version_number,
            "source_file": relative_path,
            "content_format": version.content_format,
        },
    )
    await db.commit()
    await db.refresh(doc)
    return _document_detail(doc)


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


@router.get("/", response_model=schemas.PaginatedResponse[schemas.DocumentSummaryRead])
async def list_documents(
    kind: schemas.DocumentKind | None = Query(None, description="Filter by kind"),
    status: schemas.DocumentStatus | None = Query(None, description="Filter by status"),
    is_pinned: bool | None = Query(None, description="Filter by pinned state"),
    search: str | None = Query(None, description="Search by title (case-insensitive)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
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

    count_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = count_result.scalar_one()

    q = q.order_by(models.Document.updated_at.desc())
    offset = (page - 1) * page_size
    result = await db.execute(q.offset(offset).limit(page_size))
    docs = result.scalars().all()
    return schemas.PaginatedResponse[schemas.DocumentSummaryRead](
        items=[_document_summary_read(d) for d in docs],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/shared-with-me", response_model=list[schemas.DocumentRead])
async def list_shared_with_me(
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """List documents that other users have shared with the current user."""
    result = await db.execute(
        select(models.DocumentShare)
        .where(models.DocumentShare.shared_with_user_id == user.id)
        .options(
            selectinload(models.DocumentShare.shared_by_user),
            selectinload(models.DocumentShare.document).selectinload(
                models.Document.head_version
            ),
            selectinload(models.DocumentShare.document).selectinload(
                models.Document.versions
            ),
            selectinload(models.DocumentShare.document).selectinload(
                models.Document.user
            ),
        )
        .order_by(models.DocumentShare.created_at.desc())
    )
    shares = result.scalars().all()
    out: list[schemas.DocumentRead] = []
    for share in shares:
        doc = share.document
        if doc is None:
            continue
        doc._effective_role = share.role  # type: ignore[attr-defined]
        out.append(_document_read(doc, share))
    return out


@router.get(
    "/{document_id}/share-candidates",
    response_model=list[schemas.DocumentShareCandidateRead],
)
async def list_share_candidates(
    document_id: UUID4,
    q: str = Query("", description="Search by name, email, or headline"),
    limit: int = Query(10, ge=1, le=25, description="Maximum candidates to return"),
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Look up authenticated share candidates for a specific document."""
    doc = await get_document(document_id, db, user)
    _require_role(doc, {"owner"})

    query_text = q.strip()
    if len(query_text) < 2:
        return []

    already_shared = select(models.DocumentShare.shared_with_user_id).where(
        models.DocumentShare.document_id == doc.id
    )
    pattern = f"%{query_text}%"
    result = await db.execute(
        select(models.User)
        .where(models.User.is_active.is_(True))
        .where(models.User.id != doc.user_id)
        .where(~models.User.id.in_(already_shared))
        .where(
            or_(
                models.User.email.ilike(pattern),
                models.User.first_name.ilike(pattern),
                models.User.last_name.ilike(pattern),
                models.User.headline.ilike(pattern),
            )
        )
        .order_by(
            models.User.first_name.asc().nulls_last(),
            models.User.last_name.asc().nulls_last(),
            models.User.email.asc(),
        )
        .limit(limit)
    )
    return [
        _serialize_share_candidate(candidate) for candidate in result.scalars().all()
    ]


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
        await _record_document_activity(
            db,
            document_id=doc.id,
            activity_type=schemas.DocumentActivityType.VERSION_SAVED,
            message=f"Saved generated version v{version.version_number}",
            actor=user,
            details={
                "version_number": version.version_number,
                "content_type": version.content_type,
                "lead_id": str(lead.id),
            },
        )
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
        await _record_document_activity(
            db,
            document_id=doc.id,
            activity_type=schemas.DocumentActivityType.DOCUMENT_CREATED,
            message="Created a generated document",
            actor=user,
            details={
                "version_number": version.version_number,
                "content_type": version.content_type,
                "lead_id": str(lead.id),
            },
        )

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
        content_format=payload.content_format.value,
        change_summary="Initial version",
    )
    db.add(version)
    await db.flush()

    doc.head_version_id = version.id
    await _record_document_activity(
        db,
        document_id=doc.id,
        activity_type=schemas.DocumentActivityType.DOCUMENT_CREATED,
        message="Created a document",
        actor=user,
        details={
            "version_number": version.version_number,
            "content_format": version.content_format,
        },
    )
    await db.commit()
    await db.refresh(doc)
    return _document_detail(doc)


DOCUMENT_SEED_OPERATION = SeedOperation(
    pipeline_name="seed_documents",
    resource_name="Documents",
    seed_filename="documents.json",
    destination_table="documents",
    creator=build_user_seed_creator(schemas.DocumentCreate, create_document),
)


@router.post(
    "/seed",
    status_code=202,
    response_model=schemas.SeedOperationAccepted,
)
async def seed_documents(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    return await schedule_seed_operation(
        background_tasks, db, user, DOCUMENT_SEED_OPERATION
    )


@router.get("/{document_id}", response_model=schemas.DocumentDetailRead)
async def get_document_detail(
    document_id: UUID4,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    doc = await get_document(document_id, db, user)
    return _document_detail(doc)


@router.get(
    "/{document_id}/activity",
    response_model=list[schemas.DocumentActivityRead],
)
async def list_document_activity(
    document_id: UUID4,
    limit: int = Query(50, ge=1, le=200, description="Maximum activity rows to return"),
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Read audit-style activity history for a document."""
    doc = await get_document(document_id, db, user)
    result = await db.execute(
        select(models.DocumentActivity)
        .where(models.DocumentActivity.document_id == doc.id)
        .options(selectinload(models.DocumentActivity.actor))
        .order_by(models.DocumentActivity.created_at.desc())
        .limit(limit)
    )
    return [_serialize_activity(activity) for activity in result.scalars().all()]


@router.patch("/{document_id}", response_model=schemas.DocumentRead)
async def update_document(
    document_id: UUID4,
    payload: schemas.DocumentUpdate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    doc = await get_document(document_id, db, user)
    _require_role(doc, {"owner"})
    previous_status = doc.status
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        if isinstance(value, schemas.DocumentStatus):
            value = value.value
        setattr(doc, field, value)

    if doc.status != previous_status:
        if doc.status == schemas.DocumentStatus.ARCHIVED.value:
            await _record_document_activity(
                db,
                document_id=doc.id,
                activity_type=schemas.DocumentActivityType.DOCUMENT_ARCHIVED,
                message="Archived the document",
                actor=user,
            )
        elif previous_status == schemas.DocumentStatus.ARCHIVED.value:
            await _record_document_activity(
                db,
                document_id=doc.id,
                activity_type=schemas.DocumentActivityType.DOCUMENT_UNARCHIVED,
                message="Restored the document from the archive",
                actor=user,
            )

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
    _require_role(doc, {"owner"})
    source_files = [version.source_file for version in doc.versions]
    await db.delete(doc)
    await db.commit()
    remove_document_source_files(source_files)
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
    _require_role(doc, {"owner", "editor"})

    # Determine next version_number
    max_vn = max((v.version_number for v in doc.versions), default=0)

    version = models.DocumentVersion(
        document_id=doc.id,
        version_number=max_vn + 1,
        name=payload.name,
        content=payload.content,
        content_type=payload.content_type.value if payload.content_type else None,
        content_format=payload.content_format.value,
        change_summary=payload.change_summary,
    )
    db.add(version)
    await db.flush()

    doc.head_version_id = version.id
    await _record_document_activity(
        db,
        document_id=doc.id,
        activity_type=schemas.DocumentActivityType.VERSION_SAVED,
        message=f"Saved version v{version.version_number}",
        actor=user,
        details={
            "version_number": version.version_number,
            "content_format": version.content_format,
        },
    )
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
    _require_role(doc, {"owner"})
    pinned = payload.pinned if payload else True
    previous_pin_state = doc.is_pinned

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
    if previous_pin_state != pinned:
        await _record_document_activity(
            db,
            document_id=doc.id,
            activity_type=(
                schemas.DocumentActivityType.DOCUMENT_PINNED
                if pinned
                else schemas.DocumentActivityType.DOCUMENT_UNPINNED
            ),
            message=("Pinned the document" if pinned else "Unpinned the document"),
            actor=user,
        )
    await db.commit()
    await db.refresh(doc)
    return _document_read(doc)


# ---------------------------------------------------------------------------
#  Download original (uploaded PDF)
# ---------------------------------------------------------------------------


@router.get("/{document_id}/original")
async def download_original(
    document_id: UUID4,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Download the original uploaded PDF for the head version."""
    doc = await get_document(document_id, db, user)
    head = doc.head_version
    if not head or not head.source_file:
        raise HTTPException(status_code=404, detail="No uploaded source file available")

    try:
        absolute_path = resolve_document_source_path(head.source_file)
    except ValueError as exc:
        raise HTTPException(
            status_code=404, detail="No uploaded source file available"
        ) from exc

    if not absolute_path.is_file():
        raise HTTPException(status_code=404, detail="No uploaded source file available")

    filename = f"{doc.title or 'document'}.pdf"
    return FileResponse(
        path=absolute_path,
        media_type="application/pdf",
        filename=filename,
    )


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

    raw_content = doc.head_version.content
    content_format = getattr(doc.head_version, "content_format", None) or "plain_text"

    if content_format == "tiptap_json":
        flowables = _tiptap_to_flowables(raw_content, style)
    else:
        flowables = [Paragraph(raw_content.replace("\n", "<br />"), style)]

    pdf_doc.build(flowables)
    pdf_buffer.seek(0)

    filename = f"{doc.title or 'document'}.pdf"
    response = StreamingResponse(pdf_buffer, media_type="application/pdf")
    response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


# ---------------------------------------------------------------------------
#  Sharing
# ---------------------------------------------------------------------------


@router.post(
    "/{document_id}/shares",
    response_model=schemas.DocumentShareRead,
    status_code=201,
)
async def create_share(
    document_id: UUID4,
    share_in: schemas.DocumentShareCreate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Grant another user access to this document (owner only)."""
    doc = await get_document(document_id, db, user)
    _require_role(doc, {"owner"})
    if share_in.shared_with_user_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot share with yourself")

    target_user = await db.get(models.User, share_in.shared_with_user_id)
    if not target_user or not target_user.is_active:
        raise HTTPException(status_code=404, detail="Target user not found")

    share = models.DocumentShare(
        document_id=doc.id,
        shared_with_user_id=share_in.shared_with_user_id,
        shared_by_user_id=user.id,
        role=share_in.role.value,
    )
    db.add(share)
    try:
        await db.flush()
        share = await _get_share(db, document_id=document_id, share_id=share.id)
        assert share is not None
        await _record_document_activity(
            db,
            document_id=doc.id,
            activity_type=schemas.DocumentActivityType.SHARE_CREATED,
            message=f"Granted {share.role} access",
            actor=user,
            details={
                "role": share.role,
                "shared_with_user_id": str(share.shared_with_user_id),
                "shared_with_full_name": _user_full_name(share.shared_with_user),
            },
        )
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409, detail="Document is already shared with this user"
        )
    return _serialize_share(share)


@router.get("/{document_id}/shares", response_model=list[schemas.DocumentShareRead])
async def list_shares(
    document_id: UUID4,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """List all shares for a document (owner only)."""
    doc = await get_document(document_id, db, user)
    _require_role(doc, {"owner"})

    result = await db.execute(
        select(models.DocumentShare)
        .where(models.DocumentShare.document_id == doc.id)
        .options(
            selectinload(models.DocumentShare.shared_with_user),
            selectinload(models.DocumentShare.shared_by_user),
        )
        .order_by(models.DocumentShare.created_at.desc())
    )
    shares = result.scalars().all()
    return [_serialize_share(share) for share in shares]


@router.patch(
    "/{document_id}/shares/{share_id}", response_model=schemas.DocumentShareRead
)
async def update_share(
    document_id: UUID4,
    share_id: UUID4,
    share_update: schemas.DocumentShareUpdate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Update a share's role (owner only)."""
    doc = await get_document(document_id, db, user)
    _require_role(doc, {"owner"})

    share = await _get_share(db, document_id=document_id, share_id=share_id)
    if share is None:
        raise HTTPException(status_code=404, detail="Share not found")

    previous_role = share.role
    share.role = share_update.role.value
    if previous_role != share.role:
        await _record_document_activity(
            db,
            document_id=doc.id,
            activity_type=schemas.DocumentActivityType.SHARE_UPDATED,
            message=f"Changed access from {previous_role} to {share.role}",
            actor=user,
            details={
                "previous_role": previous_role,
                "role": share.role,
                "shared_with_user_id": str(share.shared_with_user_id),
                "shared_with_full_name": _user_full_name(share.shared_with_user),
            },
        )
    await db.commit()
    share = await _get_share(db, document_id=document_id, share_id=share_id)
    assert share is not None
    return _serialize_share(share)


@router.delete("/{document_id}/shares/{share_id}", status_code=204)
async def delete_share(
    document_id: UUID4,
    share_id: UUID4,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Revoke a share (owner only)."""
    doc = await get_document(document_id, db, user)
    _require_role(doc, {"owner"})

    share = await _get_share(db, document_id=document_id, share_id=share_id)
    if share is None:
        raise HTTPException(status_code=404, detail="Share not found")

    await _record_document_activity(
        db,
        document_id=doc.id,
        activity_type=schemas.DocumentActivityType.SHARE_REVOKED,
        message=f"Revoked {share.role} access",
        actor=user,
        details={
            "role": share.role,
            "shared_with_user_id": str(share.shared_with_user_id),
            "shared_with_full_name": _user_full_name(share.shared_with_user),
        },
    )
    await db.delete(share)
    await db.commit()
    return None


# ---------------------------------------------------------------------------
#  Document embedding & semantic search
# ---------------------------------------------------------------------------


@router.post(
    "/search",
    response_model=schemas.DocumentSearchResponse,
    summary="Semantic search across user documents",
)
async def search_documents(
    body: schemas.DocumentSearchRequest,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """
    Perform a semantic similarity search across the authenticated user's
    embedded documents using pgvector cosine distance.
    """
    from app.core.vector_store import PGVectorStore

    store = PGVectorStore(db)
    results = await store.similarity_search(body.query, user_id=user.id, k=body.k)
    return schemas.DocumentSearchResponse(
        query=body.query,
        results=[schemas.DocumentSearchResult(**r) for r in results],
    )


@router.post(
    "/{document_id}/embed",
    response_model=schemas.DocumentEmbedResponse,
    summary="Generate embeddings for a document",
)
async def embed_document(
    document_id: UUID4,
    body: schemas.DocumentEmbedRequest | None = None,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """
    Chunk and embed a document's text content, storing the resulting vectors
    in pgvector for later semantic search.  Replaces any existing embeddings
    for the same document.
    """
    from app.core.langchain import chunk_text
    from app.core.vector_store import PGVectorStore

    doc = await get_document(document_id, db, user)
    _require_role(doc, {"owner", "editor"})

    version_id = (body.version_id if body else None) or (
        doc.head_version_id if doc.head_version_id else None
    )
    if version_id is None:
        raise HTTPException(status_code=400, detail="Document has no version to embed")

    version = await db.get(models.DocumentVersion, version_id)
    if version is None or str(version.document_id) != str(doc.id):
        raise HTTPException(status_code=404, detail="Document version not found")

    text_content = version.content or ""
    if not text_content.strip():
        raise HTTPException(
            status_code=400, detail="Document version has no text content"
        )

    store = PGVectorStore(db)
    await store.delete_by_document(doc.id)

    chunks = chunk_text(text_content)
    if not chunks:
        raise HTTPException(
            status_code=400,
            detail="Document text is too short or malformed to generate embeddings",
        )

    await store.add_texts(
        chunks,
        document_id=doc.id,
        document_version_id=version.id,
        user_id=user.id,
    )
    await db.commit()

    return schemas.DocumentEmbedResponse(
        document_id=doc.id,
        document_version_id=version.id,
        chunks_embedded=len(chunks),
    )


# ---------------------------------------------------------------------------
#  RAG-powered endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/rag/enrich-lead",
    response_model=schemas.LeadEnrichResponse,
    summary="Enrich a lead using document context",
)
async def enrich_lead_endpoint(
    body: schemas.LeadEnrichRequest,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """
    Retrieve relevant document chunks and use them to enrich a job lead
    description with personalized analysis.
    """
    from app.core.rag.service import RagWorkflowService

    service = RagWorkflowService(db)
    return await service.enrich_lead(body, user)


@router.post(
    "/rag/rank-leads",
    response_model=schemas.LeadRankResponse,
    summary="Rank leads by relevance to user profile",
)
async def rank_leads_endpoint(
    body: schemas.LeadRankRequest,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Rank job leads based on the user's embedded document context."""
    from app.core.rag.service import RagWorkflowService

    service = RagWorkflowService(db)
    return await service.rank_leads(body, user)


@router.post(
    "/rag/summarize-company",
    response_model=schemas.CompanySummarizeResponse,
    summary="Summarize a company website",
)
async def summarize_company_endpoint(
    body: schemas.CompanySummarizeRequest,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Load a company website, extract text, and return an AI summary."""
    from app.core.rag.service import RagWorkflowService

    service = RagWorkflowService(db)
    return await service.summarize_company(body, user)
