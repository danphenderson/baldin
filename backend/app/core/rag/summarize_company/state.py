from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import Field, field_validator
from typing_extensions import TypedDict

from app.core.rag.shared import (
    RagTraceEntry,
    build_rag_orchestration_payload,
    safe_preview,
)
from app.schemas import BaseSchema

PAYLOAD_KIND = "rag.company_summarization.run"
PAYLOAD_SCHEMA_VERSION = 1
WORKFLOW_NAME = "rag.summarize_company"
MAX_PAGE_TEXT_CHARS = 8000


class CompanySummaryDraft(BaseSchema):
    company_name: str = Field(..., min_length=1, max_length=200)
    mission: str = Field(..., min_length=20, max_length=600)
    products_and_services: str = Field(..., min_length=20, max_length=600)
    culture: str = Field(default="", max_length=400)
    recent_news: str = Field(default="", max_length=400)
    job_opportunities: str = Field(default="", max_length=400)

    @field_validator(
        "company_name",
        "mission",
        "products_and_services",
        "culture",
        "recent_news",
        "job_opportunities",
        mode="before",
    )
    @classmethod
    def trim_whitespace(cls, value: str) -> str:
        if isinstance(value, str):
            return " ".join(value.split())
        return value

    @field_validator("company_name", mode="after")
    @classmethod
    def reject_empty_company_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("company_name must not be empty after trimming")
        return value

    @field_validator("mission", mode="after")
    @classmethod
    def reject_empty_mission(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("mission must not be empty after trimming")
        return value

    @field_validator("products_and_services", mode="after")
    @classmethod
    def reject_empty_products(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("products_and_services must not be empty after trimming")
        return value


class CompanySummaryState(TypedDict, total=False):
    db: Any
    user: Any
    workflow_name: str
    model_name: str
    url: str
    page_text: str
    page_text_chars: int
    fetch_method: str
    content_fingerprint: str | None
    thread_id: str
    pipeline_id: Any
    event_id: Any
    request_started_at: datetime
    request_finished_at: datetime
    generation_attempts: int
    draft: CompanySummaryDraft
    rendered_output: str
    repair_used: bool
    generation_error_summary: str | None
    trace: list[RagTraceEntry | dict[str, Any]]
    outcome_result: Literal["running", "success", "failure"]
    http_status: int | None
    error_code: str | None
    error_summary: str | None


def render_company_summary(draft: CompanySummaryDraft) -> str:
    lines = [
        f"Company: {draft.company_name}",
        "",
        "Mission",
        draft.mission,
    ]

    lines.append("")
    lines.append("Products & Services")
    lines.append(draft.products_and_services)

    if draft.culture:
        lines.append("")
        lines.append("Culture")
        lines.append(draft.culture)

    if draft.recent_news:
        lines.append("")
        lines.append("Recent News")
        lines.append(draft.recent_news)

    if draft.job_opportunities:
        lines.append("")
        lines.append("Job Opportunities")
        lines.append(draft.job_opportunities)

    return "\n".join(lines)


def build_summarization_orchestration_payload(
    state: CompanySummaryState,
) -> dict[str, Any]:
    input_section = {
        "url": state.get("url", ""),
        "model_name": state.get("model_name"),
        "page_text_chars": state.get("page_text_chars", 0),
        "page_text_preview": safe_preview(state.get("page_text", ""), max_chars=160),
    }
    fetch_section = {
        "status": "success" if state.get("page_text") else "failure",
        "fetched_chars": state.get("page_text_chars", 0),
        "fetch_method": state.get("fetch_method", "unknown"),
        "content_fingerprint": state.get("content_fingerprint"),
    }

    return build_rag_orchestration_payload(
        state,
        kind=PAYLOAD_KIND,
        schema_version=PAYLOAD_SCHEMA_VERSION,
        validator_name=CompanySummaryDraft.__name__,
        input_section=input_section,
        fetch_section=fetch_section,
    )
