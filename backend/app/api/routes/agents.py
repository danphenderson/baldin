import base64
import binascii
import json
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any
from uuid import UUID

import mistune
import tiktoken
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from langchain_core.messages import (
    AIMessage,
    AIMessageChunk,
    BaseMessage,
    HumanMessage,
    SystemMessage,
)
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.api.deps import (
    AsyncSession,
    get_agent,
    get_async_session,
    get_current_user,
    model_to_dict,
    models,
    schemas,
)
from app.api.routes.documents import (
    _load_document_blocks,
    _serialize_document_block_tree,
    create_document,
    create_version,
)
from app.core import conf
from app.core.db import session_context
from app.core.langchain import generate_cover_letter

router: APIRouter = APIRouter()

_AGENT_CHAT_TITLE_MAX_LENGTH = 80
_AGENT_CHAT_RESPONSE_TOKEN_RESERVE_RATIO = 0.25
_AGENT_CHAT_ESTIMATED_TOKENS_PER_CHAR_NUMERATOR = 1
_AGENT_CHAT_ESTIMATED_TOKENS_PER_CHAR_DENOMINATOR = 4
_AGENT_CHAT_MESSAGE_TOKEN_OVERHEAD = 8
_AGENT_CHAT_HISTORY_CURSOR_VERSION = 1


def _json_dumps(data: Any) -> str:
    return json.dumps(data, default=str)


def _normalize_agent_configuration(configuration: Any) -> dict[str, Any]:
    if configuration is None or not isinstance(configuration, dict):
        return {}

    normalized_configuration = dict(configuration)
    model_name = normalized_configuration.get("model_name")
    if model_name is None:
        return normalized_configuration
    if not isinstance(model_name, str):
        raise HTTPException(
            status_code=400,
            detail="Agent configuration model_name must be a string",
        )

    normalized_model_name = model_name.strip()
    if not normalized_model_name:
        normalized_configuration.pop("model_name", None)
        return normalized_configuration

    try:
        conf.openai.get_model(normalized_model_name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    normalized_configuration["model_name"] = normalized_model_name
    return normalized_configuration


def _compact_error_summary(detail: Any, *, max_length: int = 500) -> str:
    if isinstance(detail, str):
        message = detail
    else:
        message = _json_dumps(detail)
    return message[:max_length]


def _inline_content_from_text(text: str) -> list[dict[str, Any]]:
    stripped = text.strip()
    if not stripped:
        return []

    content: list[dict[str, Any]] = []
    parts = stripped.split("\n")
    for index, part in enumerate(parts):
        if part:
            content.append({"type": "text", "text": part})
        if index < len(parts) - 1:
            content.append({"type": "hardBreak"})
    return content


def _section_attrs(run_id: str, section: str, **extra: Any) -> dict[str, Any]:
    attrs = {
        "agent_run_id": run_id,
        "agent_section": section,
    }
    attrs.update(extra)
    return attrs


def _heading_node(
    text: str,
    *,
    level: int,
    run_id: str,
    section: str,
) -> dict[str, Any]:
    node: dict[str, Any] = {
        "type": "heading",
        "attrs": _section_attrs(run_id, section, level=level),
    }
    inline_content = _inline_content_from_text(text)
    if inline_content:
        node["content"] = inline_content
    return node


def _paragraph_node(
    text: str,
    *,
    run_id: str,
    section: str,
) -> dict[str, Any]:
    node: dict[str, Any] = {
        "type": "paragraph",
        "attrs": _section_attrs(run_id, section),
    }
    inline_content = _inline_content_from_text(text)
    if inline_content:
        node["content"] = inline_content
    return node


def _callout_node(
    text: str,
    *,
    run_id: str,
    section: str,
    callout_type: str = "info",
) -> dict[str, Any]:
    paragraph: dict[str, Any] = {"type": "paragraph"}
    inline_content = _inline_content_from_text(text)
    if inline_content:
        paragraph["content"] = inline_content
    return {
        "type": "callout",
        "attrs": _section_attrs(run_id, section, callout_type=callout_type),
        "content": [paragraph],
    }


def _task_item_node(
    text: str,
    *,
    run_id: str,
    section: str,
    checked: bool = False,
) -> dict[str, Any]:
    paragraph: dict[str, Any] = {"type": "paragraph"}
    inline_content = _inline_content_from_text(text)
    if inline_content:
        paragraph["content"] = inline_content
    return {
        "type": "taskItem",
        "attrs": _section_attrs(run_id, section, checked=checked),
        "content": [paragraph],
    }


def _task_list_node(
    items: list[str],
    *,
    run_id: str,
    section: str,
) -> dict[str, Any]:
    return {
        "type": "taskList",
        "attrs": _section_attrs(run_id, section),
        "content": [
            _task_item_node(item, run_id=run_id, section=section) for item in items
        ],
    }


def _table_cell_node(
    text: str,
    *,
    run_id: str,
    section: str,
    header: bool = False,
) -> dict[str, Any]:
    paragraph: dict[str, Any] = {"type": "paragraph"}
    inline_content = _inline_content_from_text(text)
    if inline_content:
        paragraph["content"] = inline_content
    return {
        "type": "tableHeader" if header else "tableCell",
        "attrs": _section_attrs(run_id, section),
        "content": [paragraph],
    }


def _table_node(
    rows: list[tuple[str, str]],
    *,
    run_id: str,
    section: str,
) -> dict[str, Any]:
    return {
        "type": "table",
        "attrs": _section_attrs(run_id, section),
        "content": [
            {
                "type": "tableRow",
                "attrs": _section_attrs(run_id, section),
                "content": [
                    _table_cell_node(
                        label, run_id=run_id, section=section, header=True
                    ),
                    _table_cell_node(value, run_id=run_id, section=section),
                ],
            }
            for label, value in rows
        ],
    }


def _build_agent_session_tiptap(
    *,
    agent: models.Agent,
    application: models.Application,
    draft_text: str,
    run_id: str,
    pinned_resume_title: str | None,
) -> str:
    lead = application.lead
    company_names = ", ".join(
        company.name
        for company in getattr(lead, "companies", [])
        if getattr(company, "name", None)
    )

    task_items = [
        "Review the generated draft against your pinned resume.",
        f"Verify role details for {lead.title or 'this application'} before sending.",
        (
            f"Complete next step: {application.next_step}"
            if application.next_step
            else "Choose and complete the next application step."
        ),
    ]

    tiptap_json = {
        "type": "doc",
        "content": [
            _heading_node(
                f"{agent.name} Workspace: {lead.title or 'Application'}",
                level=1,
                run_id=run_id,
                section="title",
            ),
            _callout_node(
                agent.instructions
                or "Structured workspace generated from application context.",
                run_id=run_id,
                section="overview",
                callout_type="info",
            ),
            _table_node(
                [
                    ("Role", lead.title or ""),
                    ("Companies", company_names),
                    (
                        "Stage",
                        getattr(application.stage, "value", str(application.stage)),
                    ),
                    ("Pinned Resume", pinned_resume_title or "None pinned"),
                ],
                run_id=run_id,
                section="application_context",
            ),
            _heading_node(
                "Generated Draft",
                level=2,
                run_id=run_id,
                section="draft_heading",
            ),
            _paragraph_node(
                draft_text,
                run_id=run_id,
                section="draft",
            ),
            _heading_node(
                "Next Steps",
                level=2,
                run_id=run_id,
                section="next_steps_heading",
            ),
            _task_list_node(
                task_items,
                run_id=run_id,
                section="next_steps",
            ),
        ],
    }
    return _json_dumps(tiptap_json)


def _simple_paragraph_node_from_inline(
    inline_content: list[dict[str, Any]],
) -> dict[str, Any]:
    node: dict[str, Any] = {"type": "paragraph"}
    if inline_content:
        node["content"] = inline_content
    return node


def _simple_heading_node(text: str, *, level: int) -> dict[str, Any]:
    node: dict[str, Any] = {
        "type": "heading",
        "attrs": {"level": level},
    }
    inline_content = _inline_content_from_text(text)
    if inline_content:
        node["content"] = inline_content
    return node


def _simple_paragraph_node(text: str) -> dict[str, Any]:
    return _simple_paragraph_node_from_inline(_inline_content_from_text(text))


def _simple_callout_node(
    text: str,
    *,
    callout_type: str = "info",
) -> dict[str, Any]:
    return {
        "type": "callout",
        "attrs": {"callout_type": callout_type},
        "content": [_simple_paragraph_node(text)],
    }


def _simple_blockquote_node(text: str) -> dict[str, Any]:
    return {
        "type": "blockquote",
        "content": [_simple_paragraph_node(text)],
    }


@lru_cache(maxsize=1)
def _get_agent_chat_markdown_parser():
    return mistune.create_markdown(renderer="ast")


def _clone_marks(marks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [dict(mark) for mark in marks]


def _append_text_with_marks(
    content: list[dict[str, Any]],
    text: str,
    *,
    marks: list[dict[str, Any]] | None = None,
) -> None:
    if not text:
        return

    node: dict[str, Any] = {"type": "text", "text": text}
    if marks:
        node["marks"] = _clone_marks(marks)
    content.append(node)


def _markdown_inline_children(token: dict[str, Any]) -> list[dict[str, Any]]:
    raw_children = token.get("children")
    if not isinstance(raw_children, list):
        return []
    return [child for child in raw_children if isinstance(child, dict)]


def _markdown_text_from_token(token: Any) -> str:
    if isinstance(token, list):
        return "".join(_markdown_text_from_token(child) for child in token)
    if not isinstance(token, dict):
        return ""

    token_type = token.get("type")
    if token_type in {"text", "codespan", "inline_html", "block_code", "block_html"}:
        raw = token.get("raw")
        return raw if isinstance(raw, str) else ""
    if token_type in {"softbreak", "linebreak"}:
        return "\n"

    children = _markdown_inline_children(token)
    if children:
        return "".join(_markdown_text_from_token(child) for child in children)

    raw = token.get("raw")
    return raw if isinstance(raw, str) else ""


def _markdown_inline_to_tiptap(
    tokens: list[dict[str, Any]],
    *,
    marks: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    active_marks = marks or []
    content: list[dict[str, Any]] = []

    for token in tokens:
        token_type = token.get("type")
        if token_type == "text":
            _append_text_with_marks(
                content,
                token.get("raw") if isinstance(token.get("raw"), str) else "",
                marks=active_marks,
            )
            continue
        if token_type in {"softbreak", "linebreak"}:
            content.append({"type": "hardBreak"})
            continue
        if token_type == "codespan":
            _append_text_with_marks(
                content,
                token.get("raw") if isinstance(token.get("raw"), str) else "",
                marks=[*active_marks, {"type": "code"}],
            )
            continue
        if token_type == "strong":
            content.extend(
                _markdown_inline_to_tiptap(
                    _markdown_inline_children(token),
                    marks=[*active_marks, {"type": "bold"}],
                )
            )
            continue
        if token_type == "emphasis":
            content.extend(
                _markdown_inline_to_tiptap(
                    _markdown_inline_children(token),
                    marks=[*active_marks, {"type": "italic"}],
                )
            )
            continue
        if token_type == "link":
            attrs = token.get("attrs") if isinstance(token.get("attrs"), dict) else {}
            href = attrs.get("url")
            link_mark = (
                {"type": "link", "attrs": {"href": href}}
                if isinstance(href, str) and href
                else None
            )
            nested_marks = [*active_marks]
            if link_mark is not None:
                nested_marks.append(link_mark)
            content.extend(
                _markdown_inline_to_tiptap(
                    _markdown_inline_children(token),
                    marks=nested_marks,
                )
            )
            continue

        fallback_text = _markdown_text_from_token(token)
        if fallback_text:
            _append_text_with_marks(content, fallback_text, marks=active_marks)

    return content


def _markdown_block_tokens(token: dict[str, Any]) -> list[dict[str, Any]]:
    raw_children = token.get("children")
    if not isinstance(raw_children, list):
        return []
    return [child for child in raw_children if isinstance(child, dict)]


def _markdown_list_item_to_tiptap(token: dict[str, Any]) -> dict[str, Any]:
    child_nodes: list[dict[str, Any]] = []

    for child in _markdown_block_tokens(token):
        child_type = child.get("type")
        if child_type == "block_text":
            child_nodes.append(
                _simple_paragraph_node_from_inline(
                    _markdown_inline_to_tiptap(_markdown_inline_children(child))
                )
            )
            continue
        child_nodes.extend(_markdown_block_to_tiptap(child))

    if not child_nodes:
        child_nodes.append(_simple_paragraph_node(_markdown_text_from_token(token)))
    elif child_nodes[0].get("type") != "paragraph":
        child_nodes.insert(0, _simple_paragraph_node(""))

    return {"type": "listItem", "content": child_nodes}


def _markdown_block_to_tiptap(token: dict[str, Any]) -> list[dict[str, Any]]:
    token_type = token.get("type")

    if token_type == "blank_line":
        return []
    if token_type == "paragraph":
        return [
            _simple_paragraph_node_from_inline(
                _markdown_inline_to_tiptap(_markdown_inline_children(token))
            )
        ]
    if token_type == "block_text":
        return [
            _simple_paragraph_node_from_inline(
                _markdown_inline_to_tiptap(_markdown_inline_children(token))
            )
        ]
    if token_type == "heading":
        attrs = token.get("attrs") if isinstance(token.get("attrs"), dict) else {}
        level = attrs.get("level")
        if not isinstance(level, int):
            level = 1
        node: dict[str, Any] = {"type": "heading", "attrs": {"level": level}}
        inline_content = _markdown_inline_to_tiptap(_markdown_inline_children(token))
        if inline_content:
            node["content"] = inline_content
        return [node]
    if token_type == "list":
        attrs = token.get("attrs") if isinstance(token.get("attrs"), dict) else {}
        node_type = "orderedList" if attrs.get("ordered") else "bulletList"
        items = [
            _markdown_list_item_to_tiptap(child)
            for child in _markdown_block_tokens(token)
            if child.get("type") == "list_item"
        ]
        if not items:
            fallback_text = _markdown_text_from_token(token)
            return [_simple_paragraph_node(fallback_text)] if fallback_text else []
        return [{"type": node_type, "content": items}]
    if token_type == "block_quote":
        children = []
        for child in _markdown_block_tokens(token):
            children.extend(_markdown_block_to_tiptap(child))
        if not children:
            children = [_simple_paragraph_node(_markdown_text_from_token(token))]
        return [{"type": "blockquote", "content": children}]
    if token_type == "block_code":
        raw = token.get("raw")
        node: dict[str, Any] = {"type": "codeBlock"}
        if isinstance(raw, str) and raw:
            node["content"] = [{"type": "text", "text": raw.rstrip("\n")}]
        return [node]
    if token_type == "thematic_break":
        return [{"type": "horizontalRule"}]

    fallback_text = _markdown_text_from_token(token).strip()
    return [_simple_paragraph_node(fallback_text)] if fallback_text else []


def _assistant_markdown_to_tiptap_nodes(markdown: str) -> list[dict[str, Any]]:
    if not markdown.strip():
        return []

    tokens = _get_agent_chat_markdown_parser()(markdown)
    if not isinstance(tokens, list):
        return [_simple_paragraph_node(markdown)]

    nodes: list[dict[str, Any]] = []
    for token in tokens:
        if not isinstance(token, dict):
            continue
        nodes.extend(_markdown_block_to_tiptap(token))
    return nodes or [_simple_paragraph_node(markdown)]


def _resolve_agent_chat_export_title(
    *,
    chat_session: models.AgentChatSession,
    title_override: str | None,
) -> str:
    if title_override and title_override.strip():
        return title_override.strip()
    if chat_session.title and chat_session.title.strip():
        return chat_session.title.strip()
    return f"{chat_session.agent.name} Chat Export"


async def _resolve_agent_chat_export_application(
    db: AsyncSession,
    *,
    chat_session: models.AgentChatSession,
    application_id: UUID | None,
    user_id,
) -> models.Application | None:
    if (
        application_id is not None
        and chat_session.application_id is not None
        and application_id != chat_session.application_id
    ):
        raise HTTPException(
            status_code=409,
            detail="Chat export application_id must match the chat session application context",
        )

    resolved_application_id = application_id or chat_session.application_id
    if resolved_application_id is None:
        return None

    return await _load_application_for_run(
        db,
        application_id=resolved_application_id,
        user_id=user_id,
    )


async def _load_all_agent_chat_messages(
    db: AsyncSession,
    *,
    session_id: UUID,
) -> list[models.AgentChatMessage]:
    result = await db.execute(
        select(models.AgentChatMessage)
        .where(models.AgentChatMessage.session_id == session_id)
        .order_by(
            models.AgentChatMessage.created_at.asc(),
            models.AgentChatMessage.id.asc(),
        )
    )
    return result.scalars().all()


def _encode_agent_chat_history_cursor(
    *,
    created_at: datetime,
    message_id: UUID,
) -> str:
    payload = {
        "v": _AGENT_CHAT_HISTORY_CURSOR_VERSION,
        "created_at": created_at.astimezone(timezone.utc).isoformat(),
        "id": str(message_id),
    }
    encoded = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode("utf-8")
    ).decode("utf-8")
    return encoded.rstrip("=")


def _decode_agent_chat_history_cursor(cursor: str) -> tuple[datetime, UUID]:
    try:
        padded = f"{cursor}{'=' * (-len(cursor) % 4)}"
        decoded = base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8")
        payload = json.loads(decoded)
        if not isinstance(payload, dict):
            raise ValueError("cursor payload must be an object")
        if payload.get("v") != _AGENT_CHAT_HISTORY_CURSOR_VERSION:
            raise ValueError("unsupported cursor version")

        created_at_raw = payload.get("created_at")
        message_id_raw = payload.get("id")
        if not isinstance(created_at_raw, str) or not isinstance(message_id_raw, str):
            raise ValueError("cursor payload is missing required fields")

        created_at = datetime.fromisoformat(created_at_raw)
        if created_at.tzinfo is None:
            raise ValueError("cursor timestamp must be timezone-aware")

        return created_at.astimezone(timezone.utc), UUID(message_id_raw)
    except (
        ValueError,
        TypeError,
        json.JSONDecodeError,
        UnicodeDecodeError,
        binascii.Error,
    ) as exc:
        raise HTTPException(
            status_code=422, detail="Invalid chat history cursor"
        ) from exc


def _build_agent_chat_history_metadata(
    messages: list[models.AgentChatMessage],
    *,
    has_more_before: bool,
) -> schemas.AgentChatMessageHistoryRead:
    next_before: str | None = None
    if has_more_before and messages:
        oldest_message = messages[0]
        next_before = _encode_agent_chat_history_cursor(
            created_at=oldest_message.created_at,
            message_id=oldest_message.id,
        )

    return schemas.AgentChatMessageHistoryRead(
        has_more_before=has_more_before,
        next_before=next_before,
    )


async def _load_agent_chat_history_before(
    db: AsyncSession,
    *,
    session_id: UUID,
    limit: int,
    before: tuple[datetime, UUID] | None = None,
) -> tuple[list[models.AgentChatMessage], bool]:
    query = select(models.AgentChatMessage).where(
        models.AgentChatMessage.session_id == session_id
    )

    if before is not None:
        before_created_at, before_id = before
        query = query.where(
            or_(
                models.AgentChatMessage.created_at < before_created_at,
                and_(
                    models.AgentChatMessage.created_at == before_created_at,
                    models.AgentChatMessage.id < before_id,
                ),
            )
        )

    result = await db.execute(
        query.order_by(
            desc(models.AgentChatMessage.created_at),
            desc(models.AgentChatMessage.id),
        ).limit(limit + 1)
    )
    messages = result.scalars().all()
    has_more_before = len(messages) > limit
    if has_more_before:
        messages = messages[:limit]
    messages.reverse()
    return messages, has_more_before


def _build_agent_chat_export_input_context(
    *,
    chat_session: models.AgentChatSession,
    application: models.Application | None,
    exported_messages: list[models.AgentChatMessage],
) -> dict[str, Any]:
    assistant_message_count = sum(
        1
        for message in exported_messages
        if message.role == schemas.AgentChatMessageRole.ASSISTANT.value
    )
    user_message_count = sum(
        1
        for message in exported_messages
        if message.role == schemas.AgentChatMessageRole.USER.value
    )

    return {
        "source": {
            "type": "chat_session_export",
            "chat_session_id": str(chat_session.id),
            "chat_session_title": chat_session.title,
            "agent_id": str(chat_session.agent_id),
            "application_id": str(application.id) if application is not None else None,
            "model_name": _resolve_agent_chat_model_name(chat_session),
            "message_ids": [str(message.id) for message in exported_messages],
            "message_count": len(exported_messages),
            "assistant_message_count": assistant_message_count,
            "user_message_count": user_message_count,
        }
    }


def _build_agent_chat_export_tiptap(
    *,
    chat_session: models.AgentChatSession,
    application: models.Application | None,
    title: str,
    exported_messages: list[models.AgentChatMessage],
    saved_at: datetime,
) -> str:
    metadata_lines = [
        f"Agent: {chat_session.agent.name}",
        f"Saved: {saved_at.isoformat()}",
        f"Model: {_resolve_agent_chat_model_name(chat_session)}",
    ]
    if application is not None:
        metadata_lines.append(
            f"Application Context:\n{_summarize_application_context(application)}"
        )

    content: list[dict[str, Any]] = [
        _simple_heading_node(title, level=1),
        _simple_callout_node("\n".join(metadata_lines)),
    ]

    for message in exported_messages:
        if message.role == schemas.AgentChatMessageRole.USER.value:
            content.append(_simple_blockquote_node(message.content))
            continue
        if message.role == schemas.AgentChatMessageRole.ASSISTANT.value:
            content.extend(_assistant_markdown_to_tiptap_nodes(message.content))

    return _json_dumps({"type": "doc", "content": content})


def _resolve_agent_model(agent: models.Agent):
    model_name = _snapshot_agent_model_name(agent)
    return conf.openai.get_model(model_name)


def _snapshot_agent_model_name(agent: models.Agent) -> str:
    configuration = _normalize_agent_configuration(agent.configuration)
    model_name = configuration.get("model_name")
    if model_name is None:
        return conf.openai.COMPLETION_MODEL
    return model_name


async def _load_application_for_run(
    db: AsyncSession,
    *,
    application_id,
    user_id,
) -> models.Application:
    result = await db.execute(
        select(models.Application)
        .options(
            selectinload(models.Application.lead).selectinload(models.Lead.companies)
        )
        .where(models.Application.id == application_id)
    )
    application = result.scalars().unique().first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.user_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to run this agent for the application",
        )
    return application


async def _load_user_profile_for_run(
    db: AsyncSession,
    *,
    user_id,
) -> models.User:
    result = await db.execute(
        select(models.User)
        .options(
            selectinload(models.User.skills),
            selectinload(models.User.experiences),
            selectinload(models.User.education),
            selectinload(models.User.certificates),
        )
        .where(models.User.id == user_id)
    )
    user_profile = result.scalars().unique().first()
    if not user_profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    return user_profile


async def _load_pinned_resume_for_run(
    db: AsyncSession,
    *,
    user_id,
) -> models.Document | None:
    result = await db.execute(
        select(models.Document)
        .options(selectinload(models.Document.head_version))
        .where(
            models.Document.user_id == user_id,
            models.Document.kind == schemas.DocumentKind.RESUME.value,
            models.Document.is_pinned.is_(True),
        )
        .order_by(
            desc(models.Document.updated_at),
            desc(models.Document.created_at),
            desc(models.Document.id),
        )
        .limit(1)
    )
    return result.scalars().first()


async def _load_session_document_for_run(
    db: AsyncSession,
    *,
    session_document_id,
    user_id,
) -> tuple[models.Document, list[dict[str, Any]]]:
    result = await db.execute(
        select(models.Document)
        .options(selectinload(models.Document.head_version))
        .where(models.Document.id == session_document_id)
    )
    document = result.scalars().first()
    if not document:
        raise HTTPException(status_code=404, detail="Session document not found")
    if document.user_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to run this agent in the session",
        )
    if document.kind != schemas.DocumentKind.CELL_DOC.value:
        raise HTTPException(
            status_code=400,
            detail="Agent sessions can only be rerun into cell_doc documents",
        )

    live_blocks = await _load_document_blocks(db, document_id=document.id)
    live_block_tree = [
        block.model_dump(mode="json")
        for block in _serialize_document_block_tree(live_blocks)
    ]
    return document, live_block_tree


async def _find_parent_run_id(
    db: AsyncSession,
    *,
    agent_id,
    session_document_id,
):
    result = await db.execute(
        select(models.AgentRun.id)
        .where(
            models.AgentRun.agent_id == agent_id,
            models.AgentRun.session_document_id == session_document_id,
        )
        .order_by(
            desc(models.AgentRun.created_at),
            desc(models.AgentRun.id),
        )
        .limit(1)
    )
    return result.scalar_one_or_none()


def _serialize_user_profile(user_profile: models.User) -> dict[str, Any]:
    return {
        **(model_to_dict(user_profile) or {}),
        "skills": [model_to_dict(skill) for skill in user_profile.skills],
        "experiences": [
            model_to_dict(experience) for experience in user_profile.experiences
        ],
        "education": [model_to_dict(education) for education in user_profile.education],
        "certificates": [
            model_to_dict(certificate) for certificate in user_profile.certificates
        ],
    }


def _serialize_lead(lead: models.Lead) -> dict[str, Any]:
    return {
        **(model_to_dict(lead) or {}),
        "companies": [
            model_to_dict(company) for company in getattr(lead, "companies", [])
        ],
    }


def _serialize_pinned_resume(document: models.Document | None) -> dict[str, Any] | None:
    if document is None:
        return None

    head_version = document.head_version
    return {
        "document_id": str(document.id),
        "title": document.title,
        "head_version_id": str(head_version.id) if head_version else None,
        "content": head_version.content
        if head_version and head_version.content
        else "",
    }


def _serialize_session_context(
    document: models.Document | None,
    live_block_tree: list[dict[str, Any]] | None,
) -> dict[str, Any] | None:
    if document is None:
        return None

    head_version = document.head_version
    return {
        "document_id": str(document.id),
        "title": document.title,
        "head_version": {
            "id": str(head_version.id) if head_version else None,
            "version_number": head_version.version_number if head_version else None,
            "content": head_version.content
            if head_version and head_version.content
            else "",
            "content_format": head_version.content_format if head_version else None,
        },
        "live_block_tree": live_block_tree or [],
    }


def _summarize_user_profile(user_profile: models.User) -> str:
    name = " ".join(
        part.strip()
        for part in [user_profile.first_name or "", user_profile.last_name or ""]
        if part and part.strip()
    )
    lines: list[str] = []
    if name:
        lines.append(f"Name: {name}")
    if user_profile.headline:
        lines.append(f"Headline: {user_profile.headline.strip()}")
    if user_profile.bio:
        lines.append(f"Bio: {user_profile.bio.strip()}")
    skill_names = [
        skill.name.strip()
        for skill in user_profile.skills
        if getattr(skill, "name", None) and skill.name.strip()
    ]
    if skill_names:
        lines.append(f"Skills: {', '.join(skill_names[:10])}")
    experience_titles = [
        experience.title.strip()
        for experience in user_profile.experiences
        if getattr(experience, "title", None) and experience.title.strip()
    ]
    if experience_titles:
        lines.append(f"Experience: {', '.join(experience_titles[:5])}")
    return "\n".join(lines) if lines else "No profile summary available."


def _summarize_application_context(application: models.Application | None) -> str:
    if application is None:
        return "No application context attached."
    lead = application.lead
    company_names = ", ".join(
        company.name.strip()
        for company in getattr(lead, "companies", [])
        if getattr(company, "name", None) and company.name.strip()
    )
    lines = [
        f"Role: {lead.title.strip()}" if lead.title else "Role: Unknown",
        f"Company: {company_names}" if company_names else "Company: Unknown",
        f"Stage: {getattr(application.stage, 'value', str(application.stage))}",
    ]
    if application.next_step:
        lines.append(f"Next step: {application.next_step.strip()}")
    return "\n".join(lines)


def _summarize_pinned_resume(document: models.Document | None) -> str:
    if document is None:
        return "No pinned resume available."
    head_version = document.head_version
    content = ""
    if head_version and head_version.content:
        content = head_version.content.strip()
    snippet = content[:500]
    lines = [f"Title: {document.title}"]
    if snippet:
        lines.append(f"Summary: {snippet}")
    return "\n".join(lines)


def _build_agent_chat_system_message(
    *,
    agent: models.Agent,
    application: models.Application | None,
    user_profile: models.User,
    pinned_resume: models.Document | None,
) -> str:
    sections = [
        f"Agent: {agent.name}",
        (
            f"Instructions:\n{agent.instructions.strip()}"
            if agent.instructions and agent.instructions.strip()
            else "Instructions:\nNo additional instructions provided."
        ),
        f"Application Context:\n{_summarize_application_context(application)}",
        f"User Profile:\n{_summarize_user_profile(user_profile)}",
        f"Pinned Resume:\n{_summarize_pinned_resume(pinned_resume)}",
    ]
    return "\n\n".join(sections)


async def _load_agent_chat_session(
    db: AsyncSession,
    *,
    session_id: UUID,
    user_id,
) -> models.AgentChatSession:
    result = await db.execute(
        select(models.AgentChatSession)
        .options(
            selectinload(models.AgentChatSession.agent),
            selectinload(models.AgentChatSession.application).selectinload(
                models.Application.lead
            ),
        )
        .where(models.AgentChatSession.id == session_id)
    )
    session = result.scalars().unique().first()
    if session is None:
        raise HTTPException(status_code=404, detail="Chat session not found")
    if session.user_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to access this chat session",
        )
    return session


async def _load_recent_chat_messages(
    db: AsyncSession,
    *,
    session_id: UUID,
    limit: int,
) -> list[models.AgentChatMessage]:
    messages, _has_more_before = await _load_agent_chat_history_before(
        db,
        session_id=session_id,
        limit=limit,
    )
    return messages


def _serialize_agent_chat_message(
    message: models.AgentChatMessage,
) -> schemas.AgentChatMessageRead:
    return schemas.AgentChatMessageRead.model_validate(message)


def _serialize_agent_chat_session(
    session: models.AgentChatSession,
    *,
    messages: list[models.AgentChatMessage],
    message_history: schemas.AgentChatMessageHistoryRead | None = None,
) -> schemas.AgentChatSessionRead:
    summary = schemas.AgentChatSessionSummaryRead.model_validate(session)
    return schemas.AgentChatSessionRead(
        **summary.model_dump(),
        user_id=session.user_id,
        messages=[_serialize_agent_chat_message(message) for message in messages],
        message_history=message_history,
    )


def _serialize_agent_chat_history_page(
    messages: list[models.AgentChatMessage],
    *,
    has_more_before: bool,
) -> schemas.AgentChatHistoryPageRead:
    metadata = _build_agent_chat_history_metadata(
        messages,
        has_more_before=has_more_before,
    )
    return schemas.AgentChatHistoryPageRead(
        items=[_serialize_agent_chat_message(message) for message in messages],
        has_more_before=metadata.has_more_before,
        next_before=metadata.next_before,
    )


def _derive_agent_chat_title(content: str, *, max_length: int = 80) -> str:
    normalized = " ".join(content.split())
    if len(normalized) <= max_length:
        return normalized
    if max_length <= 3:
        return normalized[:max_length]
    return f"{normalized[: max_length - 3].rstrip()}..."


async def _lock_agent_chat_session_row(
    db: AsyncSession,
    *,
    session_id: UUID,
) -> models.AgentChatSession:
    result = await db.execute(
        select(models.AgentChatSession)
        .where(models.AgentChatSession.id == session_id)
        .with_for_update()
    )
    chat_session = result.scalars().first()
    if chat_session is None:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return chat_session


async def _append_user_chat_message(
    db: AsyncSession,
    *,
    session_id: UUID,
    content: str,
) -> models.AgentChatMessage:
    created_at = datetime.now(timezone.utc)
    chat_session = await _lock_agent_chat_session_row(db, session_id=session_id)
    if chat_session.status != schemas.AgentChatSessionStatus.ACTIVE.value:
        raise HTTPException(status_code=409, detail="Chat session is archived")
    chat_session.message_count = (chat_session.message_count or 0) + 1
    chat_session.last_message_at = created_at
    chat_session.updated_at = created_at
    if not chat_session.title:
        chat_session.title = _derive_agent_chat_title(
            content,
            max_length=_AGENT_CHAT_TITLE_MAX_LENGTH,
        )

    message = models.AgentChatMessage(
        session_id=session_id,
        role=schemas.AgentChatMessageRole.USER.value,
        content=content,
        created_at=created_at,
        updated_at=created_at,
    )
    db.add(message)
    await db.flush()
    await db.commit()
    await db.refresh(message)
    return message


async def _append_or_reuse_trailing_user_chat_message(
    db: AsyncSession,
    *,
    session_id: UUID,
    content: str,
) -> models.AgentChatMessage:
    chat_session = await _lock_agent_chat_session_row(db, session_id=session_id)
    if chat_session.status != schemas.AgentChatSessionStatus.ACTIVE.value:
        raise HTTPException(status_code=409, detail="Chat session is archived")

    last_message_result = await db.execute(
        select(models.AgentChatMessage)
        .where(models.AgentChatMessage.session_id == session_id)
        .order_by(
            desc(models.AgentChatMessage.created_at),
            desc(models.AgentChatMessage.id),
        )
        .limit(1)
    )
    last_message = last_message_result.scalars().first()

    if (
        last_message is not None
        and last_message.role == schemas.AgentChatMessageRole.USER.value
        and last_message.content == content
    ):
        await db.commit()
        return last_message

    created_at = datetime.now(timezone.utc)
    chat_session.message_count = (chat_session.message_count or 0) + 1
    chat_session.last_message_at = created_at
    chat_session.updated_at = created_at
    if not chat_session.title:
        chat_session.title = _derive_agent_chat_title(
            content,
            max_length=_AGENT_CHAT_TITLE_MAX_LENGTH,
        )

    message = models.AgentChatMessage(
        session_id=session_id,
        role=schemas.AgentChatMessageRole.USER.value,
        content=content,
        created_at=created_at,
        updated_at=created_at,
    )
    db.add(message)
    await db.flush()
    await db.commit()
    await db.refresh(message)
    return message


async def _persist_assistant_chat_message(
    *,
    session_id: UUID,
    content: str,
    metadata: dict[str, Any],
) -> schemas.AgentChatMessageRead:
    created_at = datetime.now(timezone.utc)
    async with session_context() as db:
        chat_session = await _lock_agent_chat_session_row(db, session_id=session_id)
        chat_session.message_count = (chat_session.message_count or 0) + 1
        chat_session.last_message_at = created_at
        chat_session.updated_at = created_at

        message = models.AgentChatMessage(
            session_id=session_id,
            role=schemas.AgentChatMessageRole.ASSISTANT.value,
            content=content,
            metadata_=metadata,
            created_at=created_at,
            updated_at=created_at,
        )
        db.add(message)
        await db.flush()
        serialized = _serialize_agent_chat_message(message)
        await db.commit()
    return serialized


def _resolve_agent_chat_model_name(session: models.AgentChatSession) -> str:
    if session.model_name and session.model_name.strip():
        return session.model_name.strip()
    return _snapshot_agent_model_name(session.agent)


def _resolve_agent_chat_model(
    session: models.AgentChatSession,
) -> tuple[str, Any]:
    model_name = _resolve_agent_chat_model_name(session)
    try:
        return model_name, conf.openai.get_model(model_name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


async def _load_chat_messages_for_llm(
    db: AsyncSession,
    *,
    session_id: UUID,
    model_name: str,
) -> list[BaseMessage]:
    result = await db.execute(
        select(models.AgentChatMessage)
        .where(models.AgentChatMessage.session_id == session_id)
        .order_by(
            models.AgentChatMessage.created_at.asc(),
            models.AgentChatMessage.id.asc(),
        )
    )
    messages = [
        _to_langchain_agent_chat_message(message) for message in result.scalars().all()
    ]
    return _trim_agent_chat_history(messages, model_name=model_name)


def _to_langchain_agent_chat_message(
    message: models.AgentChatMessage,
) -> BaseMessage:
    if message.role == schemas.AgentChatMessageRole.SYSTEM.value:
        return SystemMessage(content=message.content)
    if message.role == schemas.AgentChatMessageRole.USER.value:
        return HumanMessage(content=message.content)
    return AIMessage(content=message.content)


def _extract_agent_chat_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
                continue
            if not isinstance(item, dict):
                continue
            text = item.get("text")
            if isinstance(text, str):
                parts.append(text)
                continue
            value = item.get("value")
            if isinstance(value, str):
                parts.append(value)
                continue
            nested_content = item.get("content")
            if isinstance(nested_content, str):
                parts.append(nested_content)
        return "".join(parts)
    if content is None:
        return ""
    return str(content)


@lru_cache(maxsize=8)
def _get_tiktoken_encoding(encoding_name: str):
    try:
        return tiktoken.get_encoding(encoding_name)
    except Exception:
        return None


def _estimate_agent_chat_text_tokens(text: str, *, encoding_name: str) -> int:
    if not text:
        return 0
    encoding = _get_tiktoken_encoding(encoding_name)
    if encoding is None:
        return max(
            1,
            (
                len(text) * _AGENT_CHAT_ESTIMATED_TOKENS_PER_CHAR_NUMERATOR
                + _AGENT_CHAT_ESTIMATED_TOKENS_PER_CHAR_DENOMINATOR
                - 1
            )
            // _AGENT_CHAT_ESTIMATED_TOKENS_PER_CHAR_DENOMINATOR,
        )
    return len(encoding.encode(text))


def _count_agent_chat_message_tokens(
    message: BaseMessage,
    *,
    encoding_name: str,
) -> int:
    message_type = getattr(message, "type", "message")
    content = _extract_agent_chat_text(message.content)
    return (
        _estimate_agent_chat_text_tokens(
            f"{message_type}:{content}",
            encoding_name=encoding_name,
        )
        + _AGENT_CHAT_MESSAGE_TOKEN_OVERHEAD
    )


def _trim_agent_chat_history(
    messages: list[BaseMessage],
    *,
    model_name: str,
) -> list[BaseMessage]:
    if len(messages) <= 1:
        return messages

    max_input_tokens = max(
        1,
        int(
            conf.openai.get_chunk_size(model_name)
            * (1 - _AGENT_CHAT_RESPONSE_TOKEN_RESERVE_RATIO)
        ),
    )
    encoding_name = conf.openai.get_tokenizer_encoding(model_name)

    preserved_system: BaseMessage | None = None
    remaining_messages = messages
    if isinstance(messages[0], SystemMessage):
        preserved_system = messages[0]
        remaining_messages = messages[1:]

    consumed_tokens = 0
    selected_messages: list[BaseMessage] = []

    if preserved_system is not None:
        consumed_tokens += _count_agent_chat_message_tokens(
            preserved_system,
            encoding_name=encoding_name,
        )

    for message in reversed(remaining_messages):
        message_tokens = _count_agent_chat_message_tokens(
            message,
            encoding_name=encoding_name,
        )
        if consumed_tokens + message_tokens > max_input_tokens and selected_messages:
            break
        selected_messages.append(message)
        consumed_tokens += message_tokens

    selected_messages.reverse()
    if preserved_system is not None:
        return [preserved_system, *selected_messages]
    return selected_messages


def _extract_agent_chat_usage(
    aggregate_chunk: AIMessageChunk | None,
) -> dict[str, Any] | None:
    if aggregate_chunk is None:
        return None

    usage_metadata = getattr(aggregate_chunk, "usage_metadata", None)
    if isinstance(usage_metadata, dict) and usage_metadata:
        return dict(usage_metadata)

    response_metadata = getattr(aggregate_chunk, "response_metadata", None)
    if not isinstance(response_metadata, dict):
        return None

    token_usage = response_metadata.get("token_usage")
    if isinstance(token_usage, dict) and token_usage:
        return dict(token_usage)
    return None


def _build_agent_chat_message_metadata(
    *,
    model_name: str,
    aggregate_chunk: AIMessageChunk | None,
) -> dict[str, Any]:
    metadata: dict[str, Any] = {"model_name": model_name}
    usage = _extract_agent_chat_usage(aggregate_chunk)
    if usage is not None:
        metadata["usage"] = usage
    return metadata


async def _generate_agent_chat_completion_events(
    *,
    model: Any,
    messages: list[BaseMessage],
    model_name: str,
    request: Request | None = None,
) -> AsyncIterator[dict[str, Any]]:
    aggregate_chunk: AIMessageChunk | None = None
    content_parts: list[str] = []
    stream_kwargs: dict[str, Any] = {}
    if hasattr(model, "stream_usage"):
        stream_kwargs["stream_usage"] = True

    async for chunk in model.astream(messages, **stream_kwargs):
        if request is not None and await request.is_disconnected():
            return

        aggregate_chunk = chunk if aggregate_chunk is None else aggregate_chunk + chunk
        delta = _extract_agent_chat_text(getattr(chunk, "content", None))
        if delta:
            content_parts.append(delta)
            yield {"type": "delta", "content": delta}

        if request is not None and await request.is_disconnected():
            return

    content = "".join(content_parts).strip()
    if not content and aggregate_chunk is not None:
        content = _extract_agent_chat_text(aggregate_chunk.content).strip()
    if not content:
        raise ValueError("Agent generated an empty response")

    yield {
        "type": "complete",
        "content": content,
        "metadata": _build_agent_chat_message_metadata(
            model_name=model_name,
            aggregate_chunk=aggregate_chunk,
        ),
    }


def _serialize_sse_event(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {_json_dumps(data)}\n\n"


def _should_stream_agent_chat_response(accept_header: str | None) -> bool:
    if accept_header is None or not accept_header.strip():
        return True

    normalized_accept = accept_header.lower()
    if "text/event-stream" in normalized_accept or "*/*" in normalized_accept:
        return True
    if "application/json" in normalized_accept:
        return False
    return True


def _build_agent_input_context(
    *,
    agent: models.Agent,
    application: models.Application,
    user_profile: models.User,
    pinned_resume: models.Document | None,
    session_document: models.Document | None,
    live_block_tree: list[dict[str, Any]] | None,
) -> dict[str, Any]:
    return {
        "agent": {
            "id": str(agent.id),
            "name": agent.name,
            "kind": agent.kind,
            "instructions": agent.instructions,
        },
        "application": model_to_dict(application) or {},
        "lead": _serialize_lead(application.lead),
        "user_profile": _serialize_user_profile(user_profile),
        "pinned_resume": _serialize_pinned_resume(pinned_resume),
        "session": _serialize_session_context(session_document, live_block_tree),
    }


def _generate_cover_letter_draft(
    *,
    input_context: dict[str, Any],
    model: Any | None = None,
) -> str:
    draft_text = generate_cover_letter(
        profile=_json_dumps(
            {
                **input_context["user_profile"],
                "pinned_resume": input_context.get("pinned_resume"),
            }
        ),
        job=_json_dumps(
            {
                "application": input_context["application"],
                "lead": input_context["lead"],
            }
        ),
        template=_json_dumps(
            {
                "instructions": input_context["agent"].get("instructions"),
                "existing_session": input_context.get("session"),
            }
        ),
        model=model,
    )
    if not draft_text or not draft_text.strip():
        raise ValueError("Agent generated an empty draft")
    return draft_text.strip()


async def _upsert_application_session_link(
    db: AsyncSession,
    *,
    application_id,
    document_id,
    version_id,
) -> None:
    result = await db.execute(
        select(models.DocumentXApplication).where(
            models.DocumentXApplication.application_id == application_id,
            models.DocumentXApplication.document_id == document_id,
        )
    )
    assoc = result.scalars().first()
    if assoc is None:
        db.add(
            models.DocumentXApplication(
                application_id=application_id,
                document_id=document_id,
                version_id=version_id,
            )
        )
        return

    assoc.version_id = version_id


async def _load_agent_run(
    db: AsyncSession,
    *,
    run_id,
) -> models.AgentRun:
    result = await db.execute(
        select(models.AgentRun)
        .options(
            selectinload(models.AgentRun.session_document),
            selectinload(models.AgentRun.session_version),
        )
        .where(models.AgentRun.id == run_id)
    )
    run = result.scalars().first()
    if run is None:
        raise HTTPException(status_code=404, detail="Agent run not found")
    return run


@router.get("/", response_model=schemas.PaginatedResponse[schemas.AgentSummaryRead])
async def list_agents(
    kind: schemas.AgentKind | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    base = select(models.Agent).where(models.Agent.user_id == user.id)

    if kind is not None:
        base = base.where(models.Agent.kind == kind.value)

    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(
        base.order_by(
            desc(models.Agent.updated_at),
            desc(models.Agent.created_at),
            desc(models.Agent.id),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    return schemas.PaginatedResponse[schemas.AgentSummaryRead](
        items=result.scalars().all(),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/models", response_model=schemas.AgentModelListRead)
async def list_agent_models(
    _user: schemas.UserRead = Depends(get_current_user),
) -> schemas.AgentModelListRead:
    conf.openai.require_enabled("Agent model listing")
    supported_models = conf.openai.SUPPORTED_MODELS
    default_model_name = conf.openai.COMPLETION_MODEL
    return {
        "default_model_name": default_model_name,
        "default_model_label": supported_models[default_model_name]["description"],
        "models": [
            {"name": name, "label": data["description"]}
            for name, data in sorted(supported_models.items())
        ],
    }


@router.post("/", status_code=201, response_model=schemas.AgentRead)
async def create_agent(
    payload: schemas.AgentCreate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    payload_data = payload.model_dump(exclude_unset=True)
    payload_data["configuration"] = _normalize_agent_configuration(
        payload.configuration
    )
    agent = models.Agent(
        **payload_data,
        user_id=user.id,
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return agent


@router.get(
    "/runs",
    response_model=schemas.PaginatedResponse[schemas.AgentRunSummaryRead],
)
async def list_runs_by_session(
    session_document_id: UUID = Query(
        ..., description="Filter runs by the session document they produced"
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    base = (
        select(models.AgentRun)
        .where(
            models.AgentRun.user_id == user.id,
            models.AgentRun.session_document_id == session_document_id,
        )
        .options(
            selectinload(models.AgentRun.session_document),
            selectinload(models.AgentRun.session_version),
        )
    )

    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(
        base.order_by(
            desc(models.AgentRun.created_at),
            desc(models.AgentRun.id),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    return schemas.PaginatedResponse[schemas.AgentRunSummaryRead](
        items=result.scalars().all(),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/{id}/chat", status_code=201, response_model=schemas.AgentChatSessionRead)
async def create_agent_chat_session(
    payload: schemas.AgentChatSessionCreate,
    agent: models.Agent = Depends(get_agent),
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    if not agent.is_enabled:
        raise HTTPException(status_code=409, detail="Agent is disabled")

    application: models.Application | None = None
    if payload.application_id is not None:
        application = await _load_application_for_run(
            db,
            application_id=payload.application_id,
            user_id=user.id,
        )

    user_profile = await _load_user_profile_for_run(db, user_id=user.id)
    pinned_resume = await _load_pinned_resume_for_run(db, user_id=user.id)
    created_at = datetime.now(timezone.utc)

    chat_session = models.AgentChatSession(
        agent_id=agent.id,
        user_id=user.id,
        application_id=application.id if application is not None else None,
        title=payload.title,
        model_name=_snapshot_agent_model_name(agent),
        status=schemas.AgentChatSessionStatus.ACTIVE.value,
        message_count=1,
        last_message_at=created_at,
        created_at=created_at,
        updated_at=created_at,
    )
    chat_session.messages.append(
        models.AgentChatMessage(
            role=schemas.AgentChatMessageRole.SYSTEM.value,
            content=_build_agent_chat_system_message(
                agent=agent,
                application=application,
                user_profile=user_profile,
                pinned_resume=pinned_resume,
            ),
            created_at=created_at,
            updated_at=created_at,
        )
    )
    db.add(chat_session)
    await db.commit()

    created_session = await _load_agent_chat_session(
        db,
        session_id=chat_session.id,
        user_id=user.id,
    )
    messages = await _load_recent_chat_messages(
        db,
        session_id=chat_session.id,
        limit=50,
    )
    message_history = _build_agent_chat_history_metadata(
        messages,
        has_more_before=created_session.message_count > len(messages),
    )
    return _serialize_agent_chat_session(
        created_session,
        messages=messages,
        message_history=message_history,
    )


@router.get(
    "/{id}/chat",
    response_model=schemas.PaginatedResponse[schemas.AgentChatSessionSummaryRead],
)
async def list_agent_chat_sessions(
    agent: models.Agent = Depends(get_agent),
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
):
    base = select(models.AgentChatSession).where(
        models.AgentChatSession.agent_id == agent.id,
        models.AgentChatSession.user_id == user.id,
    )

    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(
        base.order_by(
            desc(models.AgentChatSession.last_message_at).nulls_last(),
            desc(models.AgentChatSession.updated_at),
            desc(models.AgentChatSession.id),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    return schemas.PaginatedResponse[schemas.AgentChatSessionSummaryRead](
        items=result.scalars().all(),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/chat/{session_id}", response_model=schemas.AgentChatSessionRead)
async def get_agent_chat_session(
    session_id: UUID,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
    limit: int = Query(50, ge=1, le=200),
):
    chat_session = await _load_agent_chat_session(
        db,
        session_id=session_id,
        user_id=user.id,
    )
    messages = await _load_recent_chat_messages(
        db,
        session_id=chat_session.id,
        limit=limit,
    )
    message_history = _build_agent_chat_history_metadata(
        messages,
        has_more_before=chat_session.message_count > len(messages),
    )
    return _serialize_agent_chat_session(
        chat_session,
        messages=messages,
        message_history=message_history,
    )


@router.get(
    "/chat/{session_id}/history",
    response_model=schemas.AgentChatHistoryPageRead,
)
async def get_agent_chat_history(
    session_id: UUID,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
    limit: int = Query(50, ge=1, le=200),
    before: str | None = Query(
        None,
        description="Opaque cursor for loading messages older than the current slice",
    ),
):
    chat_session = await _load_agent_chat_session(
        db,
        session_id=session_id,
        user_id=user.id,
    )
    before_cursor = (
        _decode_agent_chat_history_cursor(before) if before is not None else None
    )
    messages, has_more_before = await _load_agent_chat_history_before(
        db,
        session_id=chat_session.id,
        limit=limit,
        before=before_cursor,
    )
    return _serialize_agent_chat_history_page(
        messages,
        has_more_before=has_more_before,
    )


@router.post(
    "/chat/{session_id}/messages",
    status_code=201,
    response_model=schemas.AgentChatMessageRead,
    responses={
        201: {
            "description": (
                "Send a chat message. Returns JSON when the client explicitly "
                "requests application/json; otherwise streams SSE events named "
                "`delta`, `done`, and `error`."
            ),
            "content": {
                "text/event-stream": {
                    "schema": {
                        "type": "string",
                        "example": (
                            "event: delta\n"
                            'data: {"content": "Hello"}\n\n'
                            "event: done\n"
                            'data: {"message": {"id": "...", "role": "assistant"}}\n\n'
                        ),
                    }
                }
            },
        }
    },
)
async def send_agent_chat_message(
    session_id: UUID,
    payload: schemas.AgentChatMessageCreate,
    request: Request,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    chat_session = await _load_agent_chat_session(
        db,
        session_id=session_id,
        user_id=user.id,
    )
    if chat_session.status != schemas.AgentChatSessionStatus.ACTIVE.value:
        raise HTTPException(status_code=409, detail="Chat session is archived")

    conf.openai.require_enabled("Agent chat")
    resolved_model_name, model = _resolve_agent_chat_model(chat_session)

    await _append_or_reuse_trailing_user_chat_message(
        db,
        session_id=session_id,
        content=payload.content,
    )
    llm_messages = await _load_chat_messages_for_llm(
        db,
        session_id=session_id,
        model_name=resolved_model_name,
    )

    if not _should_stream_agent_chat_response(request.headers.get("accept")):
        try:
            assistant_content: str | None = None
            assistant_metadata: dict[str, Any] = {"model_name": resolved_model_name}
            async for event in _generate_agent_chat_completion_events(
                model=model,
                messages=llm_messages,
                model_name=resolved_model_name,
            ):
                if event["type"] != "complete":
                    continue
                assistant_content = event["content"]
                assistant_metadata = event["metadata"]

            if assistant_content is None:
                raise ValueError("Agent generation was interrupted")

            return await _persist_assistant_chat_message(
                session_id=session_id,
                content=assistant_content,
                metadata=assistant_metadata,
            )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    async def event_stream() -> AsyncIterator[str]:
        try:
            async for event in _generate_agent_chat_completion_events(
                model=model,
                messages=llm_messages,
                model_name=resolved_model_name,
                request=request,
            ):
                if event["type"] == "delta":
                    yield _serialize_sse_event(
                        "delta",
                        {"content": event["content"]},
                    )
                    continue

                assistant_message = await _persist_assistant_chat_message(
                    session_id=session_id,
                    content=event["content"],
                    metadata=event["metadata"],
                )
                yield _serialize_sse_event(
                    "done",
                    {"message": assistant_message.model_dump(mode="json")},
                )
        except Exception as exc:
            if await request.is_disconnected():
                return
            yield _serialize_sse_event("error", {"detail": str(exc)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        status_code=201,
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post(
    "/chat/{session_id}/save-to-document",
    status_code=201,
    response_model=schemas.AgentChatSaveToDocumentRead,
)
async def save_agent_chat_to_document(
    session_id: UUID,
    payload: schemas.AgentChatSaveToDocumentRequest,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    chat_session = await _load_agent_chat_session(
        db,
        session_id=session_id,
        user_id=user.id,
    )
    application = await _resolve_agent_chat_export_application(
        db,
        chat_session=chat_session,
        application_id=payload.application_id,
        user_id=user.id,
    )
    all_messages = await _load_all_agent_chat_messages(db, session_id=chat_session.id)
    exported_messages = [
        message
        for message in all_messages
        if message.role != schemas.AgentChatMessageRole.SYSTEM.value
    ]

    if not any(
        message.role == schemas.AgentChatMessageRole.ASSISTANT.value
        and message.content.strip()
        for message in exported_messages
    ):
        raise HTTPException(
            status_code=409,
            detail="Chat session must contain at least one assistant message before it can be saved",
        )

    export_title = _resolve_agent_chat_export_title(
        chat_session=chat_session,
        title_override=payload.title,
    )
    input_context = _build_agent_chat_export_input_context(
        chat_session=chat_session,
        application=application,
        exported_messages=exported_messages,
    )

    run = models.AgentRun(
        agent_id=chat_session.agent_id,
        user_id=user.id,
        application_id=application.id if application is not None else None,
        chat_session_id=chat_session.id,
        trigger_kind=schemas.AgentRunTriggerKind.MANUAL.value,
        status=schemas.AgentRunStatus.RUNNING.value,
        input_context=input_context,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)
    run_id = run.id

    try:
        exported_content = _build_agent_chat_export_tiptap(
            chat_session=chat_session,
            application=application,
            title=export_title,
            exported_messages=exported_messages,
            saved_at=datetime.now(timezone.utc),
        )
        created_document = await create_document(
            payload=schemas.DocumentCreate(
                kind=schemas.DocumentKind.CELL_DOC,
                title=export_title,
                status=schemas.DocumentStatus.DRAFT,
                content=exported_content,
                content_type=schemas.ContentType.GENERATED,
                content_format=schemas.ContentFormat.TIPTAP_JSON,
            ),
            user=user,
            db=db,
        )
        if created_document.head_version is None:
            raise HTTPException(
                status_code=409,
                detail="Saved document is missing a head version",
            )

        document_id = created_document.id
        version_id = created_document.head_version.id

        if application is not None:
            await _upsert_application_session_link(
                db,
                application_id=application.id,
                document_id=document_id,
                version_id=version_id,
            )

        persisted_run = await db.get(models.AgentRun, run_id)
        if persisted_run is None:
            raise HTTPException(status_code=404, detail="Agent run not found")
        persisted_run.status = schemas.AgentRunStatus.COMPLETED.value
        persisted_run.session_document_id = document_id
        persisted_run.session_version_id = version_id
        persisted_run.error_summary = None
        persisted_run.completed_at = datetime.now(timezone.utc)
        await db.commit()
    except HTTPException as exc:
        await db.rollback()
        failed_run = await db.get(models.AgentRun, run_id)
        if failed_run is not None:
            failed_run.status = schemas.AgentRunStatus.FAILED.value
            failed_run.error_summary = _compact_error_summary(exc.detail)
            failed_run.completed_at = datetime.now(timezone.utc)
            await db.commit()
        raise
    except Exception as exc:
        await db.rollback()
        failed_run = await db.get(models.AgentRun, run_id)
        if failed_run is not None:
            failed_run.status = schemas.AgentRunStatus.FAILED.value
            failed_run.error_summary = _compact_error_summary(str(exc))
            failed_run.completed_at = datetime.now(timezone.utc)
            await db.commit()
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return schemas.AgentChatSaveToDocumentRead(
        document_id=document_id,
        version_id=version_id,
    )


@router.patch("/chat/{session_id}", response_model=schemas.AgentChatSessionRead)
async def update_agent_chat_session(
    session_id: UUID,
    payload: schemas.AgentChatSessionUpdate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    chat_session = await _load_agent_chat_session(
        db,
        session_id=session_id,
        user_id=user.id,
    )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(chat_session, field, value)

    await db.commit()

    updated_session = await _load_agent_chat_session(
        db,
        session_id=session_id,
        user_id=user.id,
    )
    messages = await _load_recent_chat_messages(
        db,
        session_id=session_id,
        limit=50,
    )
    message_history = _build_agent_chat_history_metadata(
        messages,
        has_more_before=updated_session.message_count > len(messages),
    )
    return _serialize_agent_chat_session(
        updated_session,
        messages=messages,
        message_history=message_history,
    )


@router.delete("/chat/{session_id}", status_code=204, response_model=None)
async def delete_agent_chat_session(
    session_id: UUID,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    chat_session = await _load_agent_chat_session(
        db,
        session_id=session_id,
        user_id=user.id,
    )
    await db.delete(chat_session)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Chat session cannot be deleted while exported agent runs still exist",
        ) from exc
    return None


@router.post("/{id}/run", status_code=201, response_model=schemas.AgentRunRead)
async def run_agent(
    payload: schemas.AgentRunExecuteRequest,
    agent: models.Agent = Depends(get_agent),
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    if not agent.is_enabled:
        raise HTTPException(status_code=409, detail="Agent is disabled")

    application = await _load_application_for_run(
        db,
        application_id=payload.application_id,
        user_id=user.id,
    )
    user_profile = await _load_user_profile_for_run(db, user_id=user.id)
    pinned_resume = await _load_pinned_resume_for_run(db, user_id=user.id)

    session_document: models.Document | None = None
    live_block_tree: list[dict[str, Any]] | None = None
    parent_run_id = None

    if payload.session_document_id is not None:
        session_document, live_block_tree = await _load_session_document_for_run(
            db,
            session_document_id=payload.session_document_id,
            user_id=user.id,
        )
        parent_run_id = await _find_parent_run_id(
            db,
            agent_id=agent.id,
            session_document_id=session_document.id,
        )

    input_context = _build_agent_input_context(
        agent=agent,
        application=application,
        user_profile=user_profile,
        pinned_resume=pinned_resume,
        session_document=session_document,
        live_block_tree=live_block_tree,
    )

    run = models.AgentRun(
        agent_id=agent.id,
        user_id=user.id,
        application_id=application.id,
        parent_run_id=parent_run_id,
        trigger_kind=schemas.AgentRunTriggerKind.MANUAL.value,
        status=schemas.AgentRunStatus.RUNNING.value,
        input_context=input_context,
        session_document_id=session_document.id if session_document else None,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)
    run_id = run.id

    try:
        conf.openai.require_enabled("Agent execution")
        model = _resolve_agent_model(agent)
        if agent.kind != schemas.AgentKind.COVER_LETTER.value:
            raise HTTPException(
                status_code=501,
                detail=f"Agent kind '{agent.kind}' is not yet supported for execution",
            )

        draft_text = _generate_cover_letter_draft(
            input_context=input_context,
            model=model,
        )
        session_content = _build_agent_session_tiptap(
            agent=agent,
            application=application,
            draft_text=draft_text,
            run_id=str(run.id),
            pinned_resume_title=pinned_resume.title if pinned_resume else None,
        )

        if session_document is None:
            created_document = await create_document(
                payload=schemas.DocumentCreate(
                    kind=schemas.DocumentKind.CELL_DOC,
                    title=f"{agent.name} Workspace - {application.lead.title or 'Application'}",
                    status=schemas.DocumentStatus.DRAFT,
                    content=session_content,
                    content_type=schemas.ContentType.GENERATED,
                    content_format=schemas.ContentFormat.TIPTAP_JSON,
                ),
                user=user,
                db=db,
            )
            session_document_id = created_document.id

            persisted_document = await db.get(models.Document, session_document_id)
            if persisted_document is None or persisted_document.head_version_id is None:
                raise HTTPException(
                    status_code=409,
                    detail="Created session document is missing a head version",
                )
            session_version_id = persisted_document.head_version_id
        else:
            created_version = await create_version(
                document_id=session_document.id,
                payload=schemas.DocumentVersionCreate(
                    name=f"{agent.name} rerun",
                    content=session_content,
                    content_type=schemas.ContentType.GENERATED,
                    content_format=schemas.ContentFormat.TIPTAP_JSON,
                    change_summary=f"Agent rerun for application: {application.lead.title or 'Application'}",
                ),
                user=user,
                db=db,
            )
            session_document_id = session_document.id
            session_version_id = created_version.id

        await _upsert_application_session_link(
            db,
            application_id=application.id,
            document_id=session_document_id,
            version_id=session_version_id,
        )

        persisted_run = await db.get(models.AgentRun, run_id)
        if persisted_run is None:
            raise HTTPException(status_code=404, detail="Agent run not found")
        persisted_run.status = schemas.AgentRunStatus.COMPLETED.value
        persisted_run.session_document_id = session_document_id
        persisted_run.session_version_id = session_version_id
        persisted_run.error_summary = None
        persisted_run.completed_at = datetime.now(timezone.utc)
        await db.commit()
    except HTTPException as exc:
        await db.rollback()
        failed_run = await db.get(models.AgentRun, run_id)
        if failed_run is not None:
            failed_run.status = schemas.AgentRunStatus.FAILED.value
            failed_run.error_summary = _compact_error_summary(exc.detail)
            failed_run.completed_at = datetime.now(timezone.utc)
            await db.commit()
        raise
    except Exception as exc:
        await db.rollback()
        failed_run = await db.get(models.AgentRun, run_id)
        if failed_run is not None:
            failed_run.status = schemas.AgentRunStatus.FAILED.value
            failed_run.error_summary = _compact_error_summary(str(exc))
            failed_run.completed_at = datetime.now(timezone.utc)
            await db.commit()
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return await _load_agent_run(db, run_id=run_id)


@router.get(
    "/{id}/runs", response_model=schemas.PaginatedResponse[schemas.AgentRunSummaryRead]
)
async def get_agent_runs(
    agent: models.Agent = Depends(get_agent),
    db: AsyncSession = Depends(get_async_session),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
):
    base = (
        select(models.AgentRun)
        .where(models.AgentRun.agent_id == agent.id)
        .options(
            selectinload(models.AgentRun.session_document),
            selectinload(models.AgentRun.session_version),
        )
    )

    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar_one()

    result = await db.execute(
        base.order_by(
            desc(models.AgentRun.created_at),
            desc(models.AgentRun.id),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    return schemas.PaginatedResponse[schemas.AgentRunSummaryRead](
        items=result.scalars().all(),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{id}", response_model=schemas.AgentRead)
async def get_agent_detail(
    agent: models.Agent = Depends(get_agent),
):
    return agent


@router.patch("/{id}", response_model=schemas.AgentRead)
async def update_agent(
    payload: schemas.AgentUpdate,
    agent: models.Agent = Depends(get_agent),
    db: AsyncSession = Depends(get_async_session),
):
    payload_data = payload.model_dump(exclude_unset=True)
    if "configuration" in payload_data:
        payload_data["configuration"] = _normalize_agent_configuration(
            payload_data["configuration"]
        )

    for field, value in payload_data.items():
        setattr(agent, field, value)

    await db.commit()
    await db.refresh(agent)
    return agent


@router.delete("/{id}", status_code=204, response_model=None)
async def delete_agent(
    agent: models.Agent = Depends(get_agent),
    db: AsyncSession = Depends(get_async_session),
):
    conflict_detail = "Agent cannot be deleted while runs or chat sessions still exist"

    existing_run = await db.execute(
        select(models.AgentRun.id).where(models.AgentRun.agent_id == agent.id).limit(1)
    )
    if existing_run.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail=conflict_detail)

    existing_chat_session = await db.execute(
        select(models.AgentChatSession.id)
        .where(models.AgentChatSession.agent_id == agent.id)
        .limit(1)
    )
    if existing_chat_session.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail=conflict_detail)

    await db.delete(agent)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail=conflict_detail) from exc

    return None
