from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import Field, field_validator, model_validator
from typing_extensions import TypedDict

from app.core.rag.shared import (  # noqa: F401
    MAX_LEAD_PREVIEW_CHARS,
    MAX_PERSISTED_IDS,
    MAX_RENDERED_CONTEXT_CHARS,
    RagTraceEntry,
    active_rag_event_id,
    fingerprint_text,
    safe_preview,
    to_utc_iso,
    utc_now,
)
from app.schemas import BaseSchema

PAYLOAD_KIND = "rag.lead_enrichment.run"
PAYLOAD_SCHEMA_VERSION = 1
WORKFLOW_NAME = "rag.enrich_lead"


def _normalize_overview(value: str) -> str:
    normalized = " ".join(value.split())
    if len(normalized) < 40 or len(normalized) > 600:
        raise ValueError("overview must be between 40 and 600 characters")
    return normalized


def _normalize_bullets(
    value: list[str],
    *,
    field_name: str,
    min_items: int,
    max_items: int,
) -> list[str]:
    if not isinstance(value, list):
        raise ValueError(f"{field_name} must be a list of strings")

    cleaned: list[str] = []
    seen: set[str] = set()
    for item in value:
        if not isinstance(item, str):
            raise ValueError(f"{field_name} must contain only strings")
        normalized = " ".join(item.split())
        if not normalized:
            continue
        if len(normalized) > 220:
            raise ValueError(f"{field_name} items must be 220 characters or fewer")
        key = normalized.casefold()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(normalized)

    if len(cleaned) < min_items or len(cleaned) > max_items:
        raise ValueError(
            f"{field_name} must contain between {min_items} and {max_items} unique items"
        )
    return cleaned


class LeadEnrichmentDraft(BaseSchema):
    overview: str = Field(..., min_length=40, max_length=600)
    matching_qualifications: list[str] = Field(..., min_length=1, max_length=5)
    gaps_to_address: list[str] = Field(default_factory=list, max_length=4)
    next_steps: list[str] = Field(..., min_length=1, max_length=5)

    @field_validator("overview")
    @classmethod
    def validate_overview(cls, value: str) -> str:
        return _normalize_overview(value)

    @field_validator("matching_qualifications")
    @classmethod
    def validate_matching_qualifications(cls, value: list[str]) -> list[str]:
        return _normalize_bullets(
            value,
            field_name="matching_qualifications",
            min_items=1,
            max_items=5,
        )

    @field_validator("gaps_to_address")
    @classmethod
    def validate_gaps_to_address(cls, value: list[str]) -> list[str]:
        return _normalize_bullets(
            value,
            field_name="gaps_to_address",
            min_items=0,
            max_items=4,
        )

    @field_validator("next_steps")
    @classmethod
    def validate_next_steps(cls, value: list[str]) -> list[str]:
        return _normalize_bullets(
            value,
            field_name="next_steps",
            min_items=1,
            max_items=5,
        )

    @model_validator(mode="after")
    def ensure_required_lists_after_deduplication(self) -> "LeadEnrichmentDraft":
        if not self.matching_qualifications:
            raise ValueError("matching_qualifications cannot be empty")
        if not self.next_steps:
            raise ValueError("next_steps cannot be empty")
        return self


# Backward-compatible alias — enrichment trace entries use the shared type
LeadEnrichmentTraceEntry = RagTraceEntry


class LeadEnrichmentState(TypedDict, total=False):
    db: Any
    store: Any
    user: Any
    workflow_name: str
    model_name: str
    lead_description: str
    requested_k: int
    thread_id: str
    pipeline_id: Any
    event_id: Any
    request_started_at: datetime
    request_finished_at: datetime
    retrieval_attempts: int
    effective_k: int
    score_floor: float
    retrieval_results: list[dict[str, Any]]
    selected_results: list[dict[str, Any]]
    retrieval_classification: Literal["strong", "weak", "empty"]
    context: str
    context_chars: int
    context_truncated: bool
    context_fingerprint: str | None
    source_document_ids: list[str]
    embedding_ids: list[str]
    generation_attempts: int
    draft: LeadEnrichmentDraft
    rendered_enrichment: str
    repair_used: bool
    generation_error_summary: str | None
    trace: list[LeadEnrichmentTraceEntry | dict[str, Any]]
    outcome_result: Literal["running", "success", "failure"]
    http_status: int | None
    error_code: str | None
    error_summary: str | None


def render_lead_enrichment(draft: LeadEnrichmentDraft) -> str:
    sections = [
        "Overview",
        draft.overview,
        "",
        "Matching Qualifications",
        *[f"- {item}" for item in draft.matching_qualifications],
    ]
    if draft.gaps_to_address:
        sections.extend(
            [
                "",
                "Gaps To Address",
                *[f"- {item}" for item in draft.gaps_to_address],
            ]
        )
    sections.extend(
        [
            "",
            "Next Steps",
            *[f"- {item}" for item in draft.next_steps],
        ]
    )
    return "\n".join(sections)


def _round_score(value: float | None) -> float | None:
    if value is None:
        return None
    return round(float(value), 4)


def build_orchestration_payload(state: LeadEnrichmentState) -> dict[str, Any]:
    from app.core.rag.shared import build_rag_orchestration_payload

    retrieval_results = state.get("selected_results", [])
    retrieval_scores = [
        float(item["score"]) for item in retrieval_results if "score" in item
    ]
    source_document_ids = state.get("source_document_ids") or []
    embedding_ids = state.get("embedding_ids") or []

    input_section = {
        "requested_k": state.get("requested_k"),
        "model_name": state.get("model_name"),
        "lead_description_chars": len(state.get("lead_description", "")),
        "lead_description_preview": safe_preview(state.get("lead_description", "")),
    }
    retrieval_section = {
        "attempts": state.get("retrieval_attempts", 0),
        "effective_k": state.get("effective_k", state.get("requested_k", 0)),
        "score_floor": _round_score(state.get("score_floor")),
        "total_results": len(state.get("retrieval_results", [])),
        "selected_results": len(retrieval_results),
        "source_document_count": len(set(source_document_ids)),
        "source_document_ids": source_document_ids[:MAX_PERSISTED_IDS],
        "embedding_ids": embedding_ids[:MAX_PERSISTED_IDS],
        "min_score": _round_score(min(retrieval_scores) if retrieval_scores else None),
        "max_score": _round_score(max(retrieval_scores) if retrieval_scores else None),
        "avg_score": _round_score(
            sum(retrieval_scores) / len(retrieval_scores) if retrieval_scores else None
        ),
        "context_chars": state.get("context_chars", 0),
        "context_truncated": state.get("context_truncated", False),
        "context_fingerprint": state.get("context_fingerprint"),
    }

    # Enrichment stores rendered output as "rendered_enrichment"
    rendered_enrichment = state.get("rendered_enrichment") or state.get(
        "rendered_output", ""
    )
    augmented = {**state, "rendered_output": rendered_enrichment}

    return build_rag_orchestration_payload(
        augmented,
        kind=PAYLOAD_KIND,
        schema_version=PAYLOAD_SCHEMA_VERSION,
        validator_name=LeadEnrichmentDraft.__name__,
        input_section=input_section,
        retrieval_section=retrieval_section,
    )
