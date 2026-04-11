# app/api/routes/documents.py
import json
import re
import uuid
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape as html_escape

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
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import delete, func, or_, select, update
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
from app.core.document_blocks import (
    block_ids_by_tiptap_path,
    block_snapshot_to_blocks,
    blocks_to_block_snapshot,
    tiptap_json_to_blocks,
    validate_block_tree,
)
from app.core.document_storage import (
    MAX_DOCUMENT_UPLOAD_BYTES,
    build_document_source_path,
    remove_document_source_files,
    resolve_document_source_path,
    save_document_source_file,
)

router: APIRouter = APIRouter()

_DEFAULT_CELL_DOC_TIPTAP_CONTENT = {
    "type": "doc",
    "content": [{"type": "paragraph"}],
}

_RESTORE_CHANGE_SUMMARY_PATTERNS = (
    re.compile(r"^\s*restored\s+from\s+v(?P<version_number>\d+)\s*$", re.IGNORECASE),
    re.compile(r"^\s*reverted\s+to\s+v(?P<version_number>\d+)\s*$", re.IGNORECASE),
)

_UNICODE_PDF_FONT_CANDIDATES = (
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    Path("/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"),
    Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
    Path("/Library/Fonts/Arial Unicode.ttf"),
)

_CALLOUT_PALETTES = {
    "info": {
        "background": colors.HexColor("#dbeafe"),
        "text": colors.HexColor("#1d4ed8"),
    },
    "warning": {
        "background": colors.HexColor("#fef3c7"),
        "text": colors.HexColor("#92400e"),
    },
    "tip": {
        "background": colors.HexColor("#dcfce7"),
        "text": colors.HexColor("#166534"),
    },
    "danger": {
        "background": colors.HexColor("#fee2e2"),
        "text": colors.HexColor("#b91c1c"),
    },
}


# ---------------------------------------------------------------------------
#  Tiptap → PDF helpers
# ---------------------------------------------------------------------------


@lru_cache(maxsize=1)
def _resolve_unicode_pdf_font_name() -> str:
    for candidate in _UNICODE_PDF_FONT_CANDIDATES:
        if not candidate.is_file():
            continue

        font_name = f"BaldinPdf{candidate.stem}"
        try:
            pdfmetrics.getFont(font_name)
        except KeyError:
            pdfmetrics.registerFont(TTFont(font_name, str(candidate)))
        return font_name

    return "Helvetica"


def _pdf_font_name_for_tiptap(raw_content: str) -> str:
    if '"taskItem"' in raw_content or '"taskList"' in raw_content:
        return _resolve_unicode_pdf_font_name()
    return "Helvetica"


def _tiptap_extract_text(node: dict) -> str:
    """Recursively extract styled HTML text from a Tiptap JSON node."""
    if node.get("type") == "text":
        text = html_escape(node.get("text", ""))
        for mark in node.get("marks", []):
            mt = mark.get("type")
            if mt == "bold":
                text = f"<b>{text}</b>"
            elif mt == "italic":
                text = f"<i>{text}</i>"
            elif mt == "underline":
                text = f"<u>{text}</u>"
        return text

    if node.get("type") == "hardBreak":
        return "<br />"

    parts: list[str] = []
    for child in _tiptap_node_children(node):
        parts.append(_tiptap_extract_text(child))
    return "".join(parts)


def _tiptap_node_children(node: dict) -> list[dict]:
    raw_children = node.get("content", [])
    if not isinstance(raw_children, list):
        return []
    return [child for child in raw_children if isinstance(child, dict)]


def _style_with_indent(
    base_style: ParagraphStyle,
    name: str,
    *,
    left_indent: int = 0,
    **overrides,
) -> ParagraphStyle:
    style_kwargs = {"leftIndent": left_indent, **overrides}
    return ParagraphStyle(name, parent=base_style, **style_kwargs)


def _paragraph_with_style(
    text_html: str,
    base_style: ParagraphStyle,
    *,
    name: str,
    left_indent: int = 0,
    **style_overrides,
) -> Paragraph:
    return Paragraph(
        text_html or "&nbsp;",
        _style_with_indent(
            base_style,
            name,
            left_indent=left_indent,
            **style_overrides,
        ),
    )


def _split_wrapped_node_children(node: dict) -> tuple[str, list[dict]]:
    children = _tiptap_node_children(node)
    if children and children[0].get("type") == "paragraph":
        return _tiptap_extract_text(children[0]), children[1:]
    return "", children


def _split_details_children(node: dict) -> tuple[str, list[dict]]:
    summary_html = ""
    body_nodes: list[dict] = []

    for child in _tiptap_node_children(node):
        child_type = child.get("type")
        if child_type == "detailsSummary" and not summary_html:
            summary_html = _tiptap_extract_text(child)
            continue
        if child_type == "detailsContent":
            body_nodes.extend(_tiptap_node_children(child))
            continue
        body_nodes.append(child)

    return summary_html, body_nodes


def _render_list_node(
    node: dict,
    base_style: ParagraphStyle,
    *,
    left_indent: int = 0,
    ordered: bool = False,
) -> list:
    flowables: list = []
    for index, item in enumerate(_tiptap_node_children(node)):
        prefix = f"{index + 1}. " if ordered else "\u2022 "
        flowables.extend(
            _render_list_item_node(
                item,
                base_style,
                prefix=prefix,
                left_indent=left_indent,
            )
        )
    return flowables


def _render_list_item_node(
    node: dict,
    base_style: ParagraphStyle,
    *,
    prefix: str,
    left_indent: int = 0,
) -> list:
    lead_html, nested_nodes = _split_wrapped_node_children(node)
    flowables: list = []

    if lead_html or not nested_nodes:
        flowables.append(
            _paragraph_with_style(
                f"{prefix}{lead_html or '&nbsp;'}",
                base_style,
                name="ListItem",
                left_indent=left_indent + 24,
                spaceBefore=1,
                spaceAfter=1,
            )
        )

    if nested_nodes:
        flowables.extend(
            _render_tiptap_nodes(
                nested_nodes,
                base_style,
                left_indent=left_indent + 36,
            )
        )

    return flowables


def _render_task_list_node(
    node: dict,
    base_style: ParagraphStyle,
    *,
    left_indent: int = 0,
) -> list:
    flowables: list = []
    for item in _tiptap_node_children(node):
        flowables.extend(
            _render_task_item_node(
                item,
                base_style,
                left_indent=left_indent,
            )
        )
    return flowables


def _render_task_item_node(
    node: dict,
    base_style: ParagraphStyle,
    *,
    left_indent: int = 0,
) -> list:
    lead_html, nested_nodes = _split_wrapped_node_children(node)
    attrs = node.get("attrs") if isinstance(node.get("attrs"), dict) else {}
    checkbox = "\u2611 " if attrs.get("checked") else "\u2610 "
    flowables: list = []

    if lead_html or not nested_nodes:
        flowables.append(
            _paragraph_with_style(
                f"{checkbox}{lead_html or '&nbsp;'}",
                base_style,
                name="TaskItem",
                left_indent=left_indent + 24,
                spaceBefore=1,
                spaceAfter=1,
            )
        )

    if nested_nodes:
        flowables.extend(
            _render_tiptap_nodes(
                nested_nodes,
                base_style,
                left_indent=left_indent + 36,
            )
        )

    return flowables


def _render_callout_node(
    node: dict,
    base_style: ParagraphStyle,
    *,
    left_indent: int = 0,
) -> list:
    attrs = node.get("attrs") if isinstance(node.get("attrs"), dict) else {}
    callout_type = attrs.get("callout_type")
    if not isinstance(callout_type, str) or not callout_type:
        callout_type = "info"
    palette = _CALLOUT_PALETTES.get(callout_type, _CALLOUT_PALETTES["info"])
    flowables = [
        _paragraph_with_style(
            f"<b>{html_escape(callout_type.upper())}</b>",
            base_style,
            name=f"CalloutLabel{callout_type.title()}",
            left_indent=left_indent + 12,
            fontSize=max(10, base_style.fontSize - 1),
            leading=max(12, base_style.leading),
            spaceBefore=6,
            spaceAfter=3,
            textColor=palette["text"],
            backColor=palette["background"],
            borderPadding=4,
        )
    ]

    flowables.extend(
        _render_tiptap_nodes(
            _tiptap_node_children(node),
            base_style,
            left_indent=left_indent + 24,
        )
    )
    flowables.append(Spacer(1, 4))
    return flowables


def _render_details_node(
    node: dict,
    base_style: ParagraphStyle,
    *,
    left_indent: int = 0,
) -> list:
    summary_html, body_nodes = _split_details_children(node)
    flowables: list = []

    if summary_html:
        flowables.append(
            _paragraph_with_style(
                f"<b>{summary_html}</b>",
                base_style,
                name="DetailsSummary",
                left_indent=left_indent + 12,
                spaceBefore=4,
                spaceAfter=2,
            )
        )

    flowables.extend(
        _render_tiptap_nodes(
            body_nodes,
            base_style,
            left_indent=left_indent + 24,
        )
    )
    return flowables


def _table_cell_html(node: dict) -> str:
    parts: list[str] = []
    for child in _tiptap_node_children(node):
        child_html = _tiptap_extract_text(child)
        if child_html:
            parts.append(child_html)

    if parts:
        return "<br />".join(parts)

    return _tiptap_extract_text(node) or "&nbsp;"


def _render_table_node(
    node: dict,
    base_style: ParagraphStyle,
    *,
    left_indent: int = 0,
) -> list:
    rows: list[list[Paragraph]] = []
    header_rows: set[int] = set()
    max_columns = 0
    default_cell_style = _style_with_indent(
        base_style,
        "TableCell",
        fontSize=max(10, base_style.fontSize - 1),
        leading=max(12, base_style.leading),
        spaceBefore=0,
        spaceAfter=0,
    )

    for row_index, row_node in enumerate(_tiptap_node_children(node)):
        if row_node.get("type") != "tableRow":
            continue

        rendered_row: list[Paragraph] = []
        row_has_header = False
        for cell_node in _tiptap_node_children(row_node):
            cell_type = cell_node.get("type")
            if cell_type not in {"tableCell", "tableHeader"}:
                continue

            cell_html = _table_cell_html(cell_node)
            if cell_type == "tableHeader":
                row_has_header = True
                cell_html = f"<b>{cell_html}</b>"

            rendered_row.append(Paragraph(cell_html or "&nbsp;", default_cell_style))

        if not rendered_row:
            continue

        if row_has_header:
            header_rows.add(len(rows))

        max_columns = max(max_columns, len(rendered_row))
        rows.append(rendered_row)

    if not rows or max_columns == 0:
        return []

    for row in rows:
        while len(row) < max_columns:
            row.append(Paragraph("&nbsp;", default_cell_style))

    available_width = max(144, letter[0] - 144 - left_indent)
    table = Table(
        rows,
        colWidths=[available_width / max_columns] * max_columns,
        repeatRows=1 if 0 in header_rows else 0,
        hAlign="LEFT",
    )
    table.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
            + [
                (
                    "BACKGROUND",
                    (0, row_index),
                    (-1, row_index),
                    colors.HexColor("#e2e8f0"),
                )
                for row_index in sorted(header_rows)
            ]
        )
    )
    return [table, Spacer(1, 6)]


def _render_tiptap_node(
    node: dict,
    base_style: ParagraphStyle,
    *,
    left_indent: int = 0,
) -> list:
    ntype = node.get("type", "")
    text_html = _tiptap_extract_text(node)

    if ntype == "heading":
        level = node.get("attrs", {}).get("level", 1)
        font_size = max(12, 24 - (level - 1) * 3)
        return [
            _paragraph_with_style(
                text_html,
                base_style,
                name=f"Heading{level}",
                left_indent=left_indent,
                fontSize=font_size,
                leading=font_size + 4,
                spaceBefore=6,
                spaceAfter=4,
            )
        ]

    if ntype == "bulletList":
        return _render_list_node(
            node,
            base_style,
            left_indent=left_indent,
            ordered=False,
        )

    if ntype == "orderedList":
        return _render_list_node(
            node,
            base_style,
            left_indent=left_indent,
            ordered=True,
        )

    if ntype == "taskList":
        return _render_task_list_node(node, base_style, left_indent=left_indent)

    if ntype == "callout":
        return _render_callout_node(node, base_style, left_indent=left_indent)

    if ntype == "details":
        return _render_details_node(node, base_style, left_indent=left_indent)

    if ntype == "table":
        return _render_table_node(node, base_style, left_indent=left_indent)

    if ntype == "paragraph":
        return [
            _paragraph_with_style(
                text_html,
                base_style,
                name="Paragraph",
                left_indent=left_indent,
            )
        ]

    if ntype in {"detailsContent", "tableRow", "tableCell", "tableHeader"}:
        return _render_tiptap_nodes(
            _tiptap_node_children(node),
            base_style,
            left_indent=left_indent,
        )

    if text_html:
        return [
            _paragraph_with_style(
                text_html,
                base_style,
                name="FallbackParagraph",
                left_indent=left_indent,
            )
        ]

    return _render_tiptap_nodes(
        _tiptap_node_children(node),
        base_style,
        left_indent=left_indent,
    )


def _render_tiptap_nodes(
    nodes: list[dict],
    base_style: ParagraphStyle,
    *,
    left_indent: int = 0,
) -> list:
    flowables: list = []
    for node in nodes:
        flowables.extend(
            _render_tiptap_node(
                node,
                base_style,
                left_indent=left_indent,
            )
        )
    return flowables


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

    top_level_nodes = _tiptap_node_children(data)
    flowables = _render_tiptap_nodes(top_level_nodes, base_style)

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
            schemas.DocumentVersionDetailRead.model_validate(v)
            for v in (doc.versions or [])
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
        block_id=activity.block_id,
        activity_type=schemas.DocumentActivityType(activity.activity_type),
        message=activity.message,
        details=activity.details or {},
        actor_user_id=activity.actor_user_id,
        actor_full_name=_user_full_name(actor),
        actor_email=getattr(actor, "email", None),
    )


def _default_cell_doc_content() -> str:
    return json.dumps(_DEFAULT_CELL_DOC_TIPTAP_CONTENT)


def _parse_cell_doc_tiptap_content(raw_content: str) -> dict[str, object]:
    try:
        tiptap_json = json.loads(raw_content)
    except (json.JSONDecodeError, TypeError) as exc:
        raise ValueError("Cell-doc content must be valid TipTap JSON") from exc

    if not isinstance(tiptap_json, dict):
        raise ValueError("Cell-doc content must be valid TipTap JSON")
    return tiptap_json


def _build_cell_doc_blocks_from_content(
    document_id: UUID4,
    *,
    raw_content: str,
    preserve_ids: dict[tuple[int, ...], uuid.UUID] | None = None,
) -> list[models.DocumentBlock]:
    return tiptap_json_to_blocks(
        document_id,
        _parse_cell_doc_tiptap_content(raw_content),
        preserve_ids=preserve_ids,
    )


async def _replace_document_blocks(
    db: AsyncSession,
    *,
    document_id: UUID4,
    blocks: list[models.DocumentBlock],
) -> None:
    await db.execute(
        delete(models.DocumentBlock).where(
            models.DocumentBlock.document_id == document_id
        )
    )
    await db.flush()
    for block in blocks:
        db.add(block)
    await db.flush()


def _validate_document_blocks(
    blocks: list[models.DocumentBlock],
    *,
    status_code: int = 400,
    detail_prefix: str | None = None,
) -> None:
    try:
        validate_block_tree(blocks)
    except ValueError as exc:
        detail = str(exc)
        if detail_prefix:
            detail = f"{detail_prefix}: {detail}"
        raise HTTPException(status_code=status_code, detail=detail) from exc


def _restore_version_number_from_change_summary(
    change_summary: str | None,
) -> int | None:
    if not change_summary:
        return None

    stripped_summary = change_summary.strip()
    for pattern in _RESTORE_CHANGE_SUMMARY_PATTERNS:
        match = pattern.match(stripped_summary)
        if match is not None:
            return int(match.group("version_number"))
    return None


def _resolve_cell_doc_restore_source(
    doc: models.Document,
    payload: schemas.DocumentVersionCreate,
    *,
    version_content: str,
) -> models.DocumentVersion | None:
    if payload.restore_version_id is not None:
        restore_source = next(
            (
                version
                for version in doc.versions
                if version.id == payload.restore_version_id
            ),
            None,
        )
        if restore_source is None:
            raise HTTPException(status_code=404, detail="Restore version not found")
        if restore_source.block_snapshot is None:
            raise HTTPException(
                status_code=409,
                detail="Restore version has no stored block snapshot",
            )
        if restore_source.content != version_content:
            raise HTTPException(
                status_code=409,
                detail="Restore version content does not match the submitted cell-doc content",
            )
        return restore_source

    restore_version_number = _restore_version_number_from_change_summary(
        payload.change_summary
    )
    if restore_version_number is None:
        return None

    restore_source = next(
        (
            version
            for version in doc.versions
            if version.version_number == restore_version_number
        ),
        None,
    )
    if restore_source is None or restore_source.block_snapshot is None:
        return None
    if restore_source.content != version_content:
        return None
    return restore_source


def _require_cell_doc(doc: models.Document) -> None:
    if doc.kind != schemas.DocumentKind.CELL_DOC.value:
        raise HTTPException(
            status_code=400,
            detail="Block operations are only supported for cell_doc documents",
        )


def _block_sort_key(block: models.DocumentBlock) -> tuple[int, object, str]:
    return (block.position, block.created_at, str(block.id))


async def _load_document_blocks(
    db: AsyncSession,
    *,
    document_id: UUID4,
) -> list[models.DocumentBlock]:
    result = await db.execute(
        select(models.DocumentBlock)
        .where(models.DocumentBlock.document_id == document_id)
        .order_by(
            models.DocumentBlock.position.asc(),
            models.DocumentBlock.created_at.asc(),
            models.DocumentBlock.id.asc(),
        )
    )
    return result.scalars().all()


def _group_document_blocks_by_parent(
    blocks: list[models.DocumentBlock],
) -> dict[uuid.UUID | None, list[models.DocumentBlock]]:
    children_by_parent: dict[uuid.UUID | None, list[models.DocumentBlock]] = {}
    for block in blocks:
        children_by_parent.setdefault(block.parent_block_id, []).append(block)

    for siblings in children_by_parent.values():
        siblings.sort(key=_block_sort_key)

    return children_by_parent


def _normalize_reordered_document_blocks(
    blocks: list[models.DocumentBlock],
    *,
    touched_parent_ids: set[uuid.UUID | None],
    requested_ids: set[uuid.UUID],
    reorder_specs_by_parent: dict[
        uuid.UUID | None,
        list[tuple[int, models.DocumentBlock]],
    ],
) -> None:
    for parent_id in touched_parent_ids:
        untouched_siblings = [
            block
            for block in blocks
            if block.parent_block_id == parent_id and block.id not in requested_ids
        ]
        untouched_siblings.sort(key=_block_sort_key)

        moved_specs = reorder_specs_by_parent.get(parent_id, [])
        sibling_count = len(untouched_siblings) + len(moved_specs)
        if sibling_count == 0:
            continue

        moved_blocks_by_position: dict[int, list[models.DocumentBlock]] = {}
        max_position = sibling_count - 1
        for target_position, moved_block in moved_specs:
            clamped_position = min(target_position, max_position)
            moved_blocks_by_position.setdefault(clamped_position, []).append(
                moved_block
            )

        ordered_siblings: list[models.DocumentBlock] = []
        untouched_index = 0
        for position in range(sibling_count):
            moved_blocks = moved_blocks_by_position.get(position)
            if moved_blocks:
                ordered_siblings.extend(moved_blocks)
                continue
            if untouched_index < len(untouched_siblings):
                ordered_siblings.append(untouched_siblings[untouched_index])
                untouched_index += 1

        for new_position, sibling in enumerate(ordered_siblings):
            sibling.position = new_position


def _serialize_document_block(
    block: models.DocumentBlock,
    children_by_parent: dict[uuid.UUID | None, list[models.DocumentBlock]],
) -> schemas.DocumentBlockRead:
    return schemas.DocumentBlockRead(
        id=block.id,
        created_at=block.created_at,
        updated_at=block.updated_at,
        document_id=block.document_id,
        parent_block_id=block.parent_block_id,
        block_type=schemas.DocumentBlockType(block.block_type),
        content=block.content,
        properties=block.properties or {},
        position=block.position,
        children=[
            _serialize_document_block(child, children_by_parent)
            for child in children_by_parent.get(block.id, [])
        ],
    )


def _serialize_document_block_tree(
    blocks: list[models.DocumentBlock],
) -> list[schemas.DocumentBlockRead]:
    children_by_parent = _group_document_blocks_by_parent(blocks)
    return [
        _serialize_document_block(block, children_by_parent)
        for block in children_by_parent.get(None, [])
    ]


def _collect_document_block_descendant_ids(
    block_id: uuid.UUID,
    children_by_parent: dict[uuid.UUID | None, list[models.DocumentBlock]],
) -> set[uuid.UUID]:
    descendants: set[uuid.UUID] = set()
    stack = list(children_by_parent.get(block_id, []))
    while stack:
        child = stack.pop()
        descendants.add(child.id)
        stack.extend(children_by_parent.get(child.id, []))
    return descendants


def _count_document_block_descendants(
    block_id: uuid.UUID,
    children_by_parent: dict[uuid.UUID | None, list[models.DocumentBlock]],
) -> int:
    return len(_collect_document_block_descendant_ids(block_id, children_by_parent))


async def _record_document_activity(
    db: AsyncSession,
    *,
    document_id: UUID4,
    block_id: UUID4 | None = None,
    activity_type: schemas.DocumentActivityType,
    message: str,
    actor: models.User | schemas.UserRead | None = None,
    details: dict[str, object | None] | None = None,
) -> None:
    db.add(
        models.DocumentActivity(
            document_id=document_id,
            block_id=block_id,
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
    version_content = payload.content
    version_content_format = payload.content_format.value
    initial_blocks: list[models.DocumentBlock] = []
    version_block_snapshot: list[dict[str, object]] | None = None

    doc = models.Document(
        user_id=user.id,
        kind=payload.kind.value,
        title=payload.title,
        status=payload.status.value,
    )
    db.add(doc)
    await db.flush()

    if payload.kind == schemas.DocumentKind.CELL_DOC:
        version_content = version_content or _default_cell_doc_content()
        version_content_format = schemas.ContentFormat.TIPTAP_JSON.value
        try:
            initial_blocks = _build_cell_doc_blocks_from_content(
                doc.id,
                raw_content=version_content,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        _validate_document_blocks(initial_blocks)
        version_block_snapshot = blocks_to_block_snapshot(initial_blocks)

    version = models.DocumentVersion(
        document_id=doc.id,
        version_number=1,
        name=payload.title,
        content=version_content,
        content_type=payload.content_type.value if payload.content_type else None,
        content_format=version_content_format,
        block_snapshot=version_block_snapshot,
        change_summary="Initial version",
    )
    db.add(version)
    for block in initial_blocks:
        db.add(block)
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
    "/{document_id}/blocks",
    response_model=list[schemas.DocumentBlockRead],
)
async def list_document_blocks(
    document_id: UUID4,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    doc = await get_document(document_id, db, user)
    _require_cell_doc(doc)

    blocks = await _load_document_blocks(db, document_id=doc.id)
    return _serialize_document_block_tree(blocks)


@router.post(
    "/{document_id}/blocks",
    response_model=schemas.DocumentBlockRead,
    status_code=201,
)
async def create_document_block(
    document_id: UUID4,
    payload: schemas.DocumentBlockCreate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    doc = await get_document(document_id, db, user)
    _require_cell_doc(doc)
    _require_role(doc, {"owner", "editor"})

    blocks = await _load_document_blocks(db, document_id=doc.id)
    block_by_id = {block.id: block for block in blocks}
    if (
        payload.parent_block_id is not None
        and payload.parent_block_id not in block_by_id
    ):
        raise HTTPException(status_code=404, detail="Parent block not found")

    siblings = [
        block for block in blocks if block.parent_block_id == payload.parent_block_id
    ]
    target_position = (
        payload.position if payload.position is not None else len(siblings)
    )
    target_position = min(target_position, len(siblings))

    block = models.DocumentBlock(
        id=uuid.uuid4(),
        document_id=doc.id,
        parent_block_id=payload.parent_block_id,
        block_type=payload.block_type.value,
        content=payload.content,
        properties=payload.properties,
        position=target_position,
    )
    _validate_document_blocks(blocks + [block])

    for sibling in siblings:
        if sibling.position >= target_position:
            sibling.position += 1

    db.add(block)
    await db.flush()
    await _record_document_activity(
        db,
        document_id=doc.id,
        block_id=block.id,
        activity_type=schemas.DocumentActivityType.BLOCK_CREATED,
        message=f"Created {block.block_type} block",
        actor=user,
        details={
            "block_type": block.block_type,
            "parent_block_id": (
                str(block.parent_block_id)
                if block.parent_block_id is not None
                else None
            ),
            "position": block.position,
        },
    )
    await db.commit()
    await db.refresh(block)
    return _serialize_document_block(block, {})


@router.patch(
    "/{document_id}/blocks/reorder",
    response_model=list[schemas.DocumentBlockRead],
)
async def reorder_document_blocks(
    document_id: UUID4,
    payload: schemas.DocumentBlockReorderRequest,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    doc = await get_document(document_id, db, user)
    _require_cell_doc(doc)
    _require_role(doc, {"owner", "editor"})

    blocks = await _load_document_blocks(db, document_id=doc.id)
    block_by_id = {block.id: block for block in blocks}
    requested_ids: set[uuid.UUID] = set()

    for item in payload.items:
        if item.block_id in requested_ids:
            raise HTTPException(status_code=400, detail="Duplicate block_id in reorder")
        requested_ids.add(item.block_id)

        block = block_by_id.get(item.block_id)
        if block is None:
            raise HTTPException(status_code=404, detail="Block not found")
        if item.parent_block_id is not None and item.parent_block_id not in block_by_id:
            raise HTTPException(status_code=404, detail="Parent block not found")
        if item.parent_block_id == block.id:
            raise HTTPException(
                status_code=400,
                detail="A block cannot be reparented to itself",
            )

    touched_parent_ids: set[uuid.UUID | None] = set()
    reorder_specs_by_parent: dict[
        uuid.UUID | None,
        list[tuple[int, models.DocumentBlock]],
    ] = {}
    reordered_items: list[dict[str, object | None]] = []
    for item in payload.items:
        block = block_by_id[item.block_id]
        touched_parent_ids.add(block.parent_block_id)
        touched_parent_ids.add(item.parent_block_id)
        block.parent_block_id = item.parent_block_id
        block.position = item.position
        reorder_specs_by_parent.setdefault(item.parent_block_id, []).append(
            (item.position, block)
        )
        reordered_items.append(
            {
                "block_id": str(block.id),
                "parent_block_id": (
                    str(item.parent_block_id)
                    if item.parent_block_id is not None
                    else None
                ),
                "position": item.position,
            }
        )

    _validate_document_blocks(blocks)

    _normalize_reordered_document_blocks(
        blocks,
        touched_parent_ids=touched_parent_ids,
        requested_ids=requested_ids,
        reorder_specs_by_parent=reorder_specs_by_parent,
    )

    await db.flush()
    await _record_document_activity(
        db,
        document_id=doc.id,
        activity_type=schemas.DocumentActivityType.BLOCK_REORDERED,
        message=(
            f"Reordered {len(payload.items)} block"
            f"{'s' if len(payload.items) != 1 else ''}"
        ),
        actor=user,
        details={
            "items": reordered_items,
            "moved_block_count": len(payload.items),
        },
    )
    await db.commit()

    blocks = await _load_document_blocks(db, document_id=doc.id)
    return _serialize_document_block_tree(blocks)


@router.post(
    "/{document_id}/blocks/sync",
    response_model=list[schemas.DocumentBlockRead],
)
async def sync_document_blocks(
    document_id: UUID4,
    payload: schemas.DocumentBlockSyncRequest,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    doc = await get_document(document_id, db, user)
    _require_cell_doc(doc)
    _require_role(doc, {"owner", "editor"})

    existing_blocks = await _load_document_blocks(db, document_id=doc.id)
    preserve_id_map = (
        block_ids_by_tiptap_path(existing_blocks) if payload.preserve_ids else None
    )

    try:
        blocks = tiptap_json_to_blocks(
            doc.id,
            payload.tiptap_json,
            preserve_ids=preserve_id_map,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    _validate_document_blocks(blocks)

    await _replace_document_blocks(db, document_id=doc.id, blocks=blocks)
    await db.commit()

    blocks = await _load_document_blocks(db, document_id=doc.id)
    return _serialize_document_block_tree(blocks)


@router.patch(
    "/{document_id}/blocks/{block_id}",
    response_model=schemas.DocumentBlockRead,
)
async def update_document_block(
    document_id: UUID4,
    block_id: UUID4,
    payload: schemas.DocumentBlockUpdate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    doc = await get_document(document_id, db, user)
    _require_cell_doc(doc)
    _require_role(doc, {"owner", "editor"})

    blocks = await _load_document_blocks(db, document_id=doc.id)
    block = next((candidate for candidate in blocks if candidate.id == block_id), None)
    if block is None:
        raise HTTPException(status_code=404, detail="Block not found")

    data = payload.model_dump(exclude_unset=True)
    updated_fields: list[str] = []
    previous_block_type = block.block_type

    if "block_type" in data and data["block_type"] is not None:
        next_block_type = data["block_type"].value
        if block.block_type != next_block_type:
            block.block_type = next_block_type
            updated_fields.append("block_type")

    if "content" in data and block.content != data["content"]:
        block.content = data["content"]
        updated_fields.append("content")

    if "properties" in data:
        next_properties = data["properties"] or {}
        if block.properties != next_properties:
            block.properties = next_properties
            updated_fields.append("properties")

    if updated_fields:
        _validate_document_blocks(blocks)
        await db.flush()
        if previous_block_type != block.block_type:
            await _record_document_activity(
                db,
                document_id=doc.id,
                block_id=block.id,
                activity_type=schemas.DocumentActivityType.BLOCK_TYPE_CHANGED,
                message=(
                    f"Changed block type from {previous_block_type} to {block.block_type}"
                ),
                actor=user,
                details={
                    "previous_block_type": previous_block_type,
                    "block_type": block.block_type,
                    "position": block.position,
                },
            )
        await _record_document_activity(
            db,
            document_id=doc.id,
            block_id=block.id,
            activity_type=schemas.DocumentActivityType.BLOCK_UPDATED,
            message=f"Updated {block.block_type} block",
            actor=user,
            details={
                "block_type": block.block_type,
                "position": block.position,
                "updated_fields": updated_fields,
            },
        )
        await db.commit()
        await db.refresh(block)

    return _serialize_document_block(block, {})


@router.delete("/{document_id}/blocks/{block_id}", status_code=204)
async def delete_document_block(
    document_id: UUID4,
    block_id: UUID4,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    doc = await get_document(document_id, db, user)
    _require_cell_doc(doc)
    _require_role(doc, {"owner", "editor"})

    blocks = await _load_document_blocks(db, document_id=doc.id)
    block = next((candidate for candidate in blocks if candidate.id == block_id), None)
    if block is None:
        raise HTTPException(status_code=404, detail="Block not found")

    children_by_parent = _group_document_blocks_by_parent(blocks)
    descendant_count = _count_document_block_descendants(block.id, children_by_parent)
    for sibling in blocks:
        if (
            sibling.parent_block_id == block.parent_block_id
            and sibling.id != block.id
            and sibling.position > block.position
        ):
            sibling.position -= 1

    await _record_document_activity(
        db,
        document_id=doc.id,
        block_id=block.id,
        activity_type=schemas.DocumentActivityType.BLOCK_DELETED,
        message=f"Deleted {block.block_type} block",
        actor=user,
        details={
            "block_type": block.block_type,
            "children_deleted": descendant_count,
        },
    )
    await db.delete(block)
    await db.commit()
    return None


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


@router.get(
    "/{document_id}/versions",
    response_model=list[schemas.DocumentVersionDetailRead],
)
async def list_versions(
    document_id: UUID4,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    doc = await get_document(document_id, db, user)
    return [schemas.DocumentVersionDetailRead.model_validate(v) for v in doc.versions]


@router.post(
    "/{document_id}/versions",
    status_code=201,
    response_model=schemas.DocumentVersionDetailRead,
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

    version_content = payload.content
    version_content_format = payload.content_format.value
    version_block_snapshot: list[dict[str, object]] | None = None
    if doc.kind == schemas.DocumentKind.CELL_DOC.value:
        if payload.restore_version_id is not None and version_content is None:
            restore_source = next(
                (
                    version
                    for version in doc.versions
                    if version.id == payload.restore_version_id
                ),
                None,
            )
            if restore_source is None:
                raise HTTPException(status_code=404, detail="Restore version not found")
            version_content = restore_source.content

        version_content = version_content or _default_cell_doc_content()
        version_content_format = schemas.ContentFormat.TIPTAP_JSON.value

        restore_source = _resolve_cell_doc_restore_source(
            doc,
            payload,
            version_content=version_content,
        )
        if restore_source is not None:
            try:
                version_blocks = block_snapshot_to_blocks(
                    doc.id,
                    restore_source.block_snapshot,
                )
            except ValueError as exc:
                raise HTTPException(
                    status_code=409,
                    detail=f"Restore version has an invalid block snapshot: {exc}",
                ) from exc
            _validate_document_blocks(
                version_blocks,
                status_code=409,
                detail_prefix="Restore version has an invalid block snapshot",
            )
            doc.yjs_state = None
        else:
            existing_blocks = await _load_document_blocks(db, document_id=doc.id)
            try:
                version_blocks = _build_cell_doc_blocks_from_content(
                    doc.id,
                    raw_content=version_content,
                    preserve_ids=block_ids_by_tiptap_path(existing_blocks),
                )
            except ValueError as exc:
                raise HTTPException(status_code=400, detail=str(exc)) from exc

        _validate_document_blocks(version_blocks)

        version_block_snapshot = blocks_to_block_snapshot(version_blocks)
        await _replace_document_blocks(db, document_id=doc.id, blocks=version_blocks)

    version = models.DocumentVersion(
        document_id=doc.id,
        version_number=max_vn + 1,
        name=payload.name,
        content=version_content,
        content_type=payload.content_type.value if payload.content_type else None,
        content_format=version_content_format,
        block_snapshot=version_block_snapshot,
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
    return schemas.DocumentVersionDetailRead.model_validate(version)


@router.get(
    "/{document_id}/versions/{version_id}",
    response_model=schemas.DocumentVersionDetailRead,
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
    return schemas.DocumentVersionDetailRead.model_validate(version)


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
    raw_content = doc.head_version.content
    content_format = getattr(doc.head_version, "content_format", None) or "plain_text"

    style = ParagraphStyle(
        name="Custom",
        fontName=(
            _pdf_font_name_for_tiptap(raw_content)
            if content_format == "tiptap_json"
            else "Helvetica"
        ),
        fontSize=12,
        leading=14,
        spaceAfter=0,
        spaceBefore=0,
    )

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
