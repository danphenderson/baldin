from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import Field, field_validator, model_validator
from typing_extensions import TypedDict

from app.core.rag.shared import (
    MAX_PERSISTED_IDS,
    RagTraceEntry,
    build_rag_orchestration_payload,
    safe_preview,
)
from app.schemas import BaseSchema

PAYLOAD_KIND = "rag.lead_ranking.run"
PAYLOAD_SCHEMA_VERSION = 1
WORKFLOW_NAME = "rag.rank_leads"


class RankedLeadEntry(BaseSchema):
    lead_index: int = Field(..., ge=1, description="1-based lead position from input")
    title: str = Field(..., min_length=1, max_length=200)
    relevance_score: int = Field(..., ge=1, le=10)
    explanation: str = Field(..., min_length=20, max_length=400)

    @field_validator("title")
    @classmethod
    def trim_title(cls, value: str) -> str:
        return " ".join(value.split())

    @field_validator("explanation")
    @classmethod
    def trim_explanation(cls, value: str) -> str:
        return " ".join(value.split())


class LeadRankingDraft(BaseSchema):
    ranked_leads: list[RankedLeadEntry] = Field(..., min_length=1, max_length=20)

    @model_validator(mode="after")
    def sort_and_deduplicate(self) -> "LeadRankingDraft":
        seen: set[int] = set()
        unique: list[RankedLeadEntry] = []
        for entry in self.ranked_leads:
            if entry.lead_index in seen:
                continue
            seen.add(entry.lead_index)
            unique.append(entry)
        if not unique:
            raise ValueError("ranked_leads cannot be empty after deduplication")
        self.ranked_leads = sorted(
            unique, key=lambda e: e.relevance_score, reverse=True
        )
        return self


class LeadRankingState(TypedDict, total=False):
    db: Any
    store: Any
    user: Any
    workflow_name: str
    model_name: str
    leads: list[dict]
    combined_query: str
    combined_query_chars: int
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
    draft: LeadRankingDraft
    rendered_output: str
    repair_used: bool
    generation_error_summary: str | None
    trace: list[RagTraceEntry | dict[str, Any]]
    outcome_result: Literal["running", "success", "failure"]
    http_status: int | None
    error_code: str | None
    error_summary: str | None


def render_lead_ranking(draft: LeadRankingDraft) -> str:
    lines = ["Lead Rankings", ""]
    sorted_leads = sorted(
        draft.ranked_leads, key=lambda e: e.relevance_score, reverse=True
    )
    for rank, entry in enumerate(sorted_leads, 1):
        lines.append(f"{rank}. {entry.title} (Score: {entry.relevance_score}/10)")
        lines.append(f"   {entry.explanation}")
        lines.append("")
    # Strip trailing blank line
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines)


def _round_score(value: float | None) -> float | None:
    if value is None:
        return None
    return round(float(value), 4)


def build_ranking_orchestration_payload(state: LeadRankingState) -> dict[str, Any]:
    retrieval_results = state.get("selected_results", [])
    retrieval_scores = [
        float(item["score"]) for item in retrieval_results if "score" in item
    ]
    source_document_ids = state.get("source_document_ids") or []
    embedding_ids = state.get("embedding_ids") or []

    input_section = {
        "requested_k": state.get("requested_k"),
        "model_name": state.get("model_name"),
        "lead_count": len(state.get("leads", [])),
        "combined_query_chars": state.get("combined_query_chars", 0),
        "combined_query_preview": safe_preview(state.get("combined_query", "")),
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

    return build_rag_orchestration_payload(
        state,
        kind=PAYLOAD_KIND,
        schema_version=PAYLOAD_SCHEMA_VERSION,
        validator_name=LeadRankingDraft.__name__,
        input_section=input_section,
        retrieval_section=retrieval_section,
    )
