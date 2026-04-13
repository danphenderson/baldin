from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Sequence

from pydantic import Field, field_validator, model_validator
from typing_extensions import TypedDict

from app.core.rag.shared import (
    INITIAL_SCORE_FLOOR,
    MAX_PERSISTED_IDS,
    RagTraceEntry,
    build_rag_orchestration_payload,
    safe_preview,
)
from app.schemas import BaseSchema

PAYLOAD_KIND = "rag.aspiration_matching.run"
PAYLOAD_SCHEMA_VERSION = 1
WORKFLOW_NAME = "rag.match_aspirations"


class AspirationLeadMatchDraft(BaseSchema):
    lead_index: int = Field(..., ge=1, description="1-based lead position from input")
    match_score: int = Field(..., ge=1, le=10)
    explanation: str = Field(..., min_length=20, max_length=400)

    @field_validator("explanation")
    @classmethod
    def trim_explanation(cls, value: str) -> str:
        return " ".join(value.split())


class AspirationMatchDraftResult(BaseSchema):
    aspiration_index: int = Field(
        ..., ge=1, description="1-based aspiration position from input"
    )
    lead_matches: list[AspirationLeadMatchDraft] = Field(..., min_length=1)

    @model_validator(mode="after")
    def deduplicate_and_sort(self) -> "AspirationMatchDraftResult":
        deduped: dict[int, tuple[int, AspirationLeadMatchDraft]] = {}
        for order, match in enumerate(self.lead_matches):
            existing = deduped.get(match.lead_index)
            if existing is None:
                deduped[match.lead_index] = (order, match)
                continue
            existing_order, existing_match = existing
            if match.match_score > existing_match.match_score:
                deduped[match.lead_index] = (existing_order, match)

        self.lead_matches = [
            item[1]
            for item in sorted(
                deduped.values(),
                key=lambda item: (-item[1].match_score, item[1].lead_index, item[0]),
            )
        ]
        return self


class AspirationMatchDraft(BaseSchema):
    results: list[AspirationMatchDraftResult] = Field(..., min_length=1)

    @model_validator(mode="after")
    def deduplicate_results(self) -> "AspirationMatchDraft":
        seen: set[int] = set()
        unique: list[AspirationMatchDraftResult] = []
        for result in self.results:
            if result.aspiration_index in seen:
                continue
            seen.add(result.aspiration_index)
            unique.append(result)
        if not unique:
            raise ValueError("results cannot be empty after deduplication")
        self.results = sorted(unique, key=lambda item: item.aspiration_index)
        return self


def validate_aspiration_match_draft(
    draft: AspirationMatchDraft,
    *,
    aspiration_count: int,
    lead_count: int,
) -> AspirationMatchDraft:
    invalid_aspiration_indices = sorted(
        {
            result.aspiration_index
            for result in draft.results
            if result.aspiration_index > aspiration_count
        }
    )
    if invalid_aspiration_indices:
        joined = ", ".join(str(index) for index in invalid_aspiration_indices[:5])
        raise ValueError(
            "aspiration_index values must be within the input aspirations range; "
            f"received {joined} for {aspiration_count} aspirations"
        )

    missing_aspiration_indices = [
        index
        for index in range(1, aspiration_count + 1)
        if index not in {result.aspiration_index for result in draft.results}
    ]
    if missing_aspiration_indices:
        joined = ", ".join(str(index) for index in missing_aspiration_indices[:5])
        raise ValueError(
            "results must include every input aspiration index exactly once; "
            f"missing {joined}"
        )

    for result in draft.results:
        invalid_lead_indices = sorted(
            {
                match.lead_index
                for match in result.lead_matches
                if match.lead_index > lead_count
            }
        )
        if invalid_lead_indices:
            joined = ", ".join(str(index) for index in invalid_lead_indices[:5])
            raise ValueError(
                "lead_index values must be within the input leads range; "
                f"received {joined} for {lead_count} leads"
            )

        present_lead_indices = {match.lead_index for match in result.lead_matches}
        missing_lead_indices = [
            index
            for index in range(1, lead_count + 1)
            if index not in present_lead_indices
        ]
        if missing_lead_indices:
            joined = ", ".join(str(index) for index in missing_lead_indices[:5])
            raise ValueError(
                "lead_matches must include every input lead index exactly once per aspiration; "
                f"missing {joined} for aspiration_index {result.aspiration_index}"
            )

    return draft


class AspirationMatcherState(TypedDict, total=False):
    db: Any
    store: Any
    user: Any
    workflow_name: str
    model_name: str
    combined_query: str
    combined_query_chars: int
    requested_k: int
    aspiration_count: int
    lead_count: int
    single_aspiration_mode: bool
    pagination_requested: bool
    page: int | None
    page_size: int | None
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
    context: str
    context_chars: int
    context_truncated: bool
    context_fingerprint: str | None
    source_document_ids: list[str]
    embedding_ids: list[str]
    generation_attempts: int
    draft: AspirationMatchDraft
    rendered_output: str
    repair_used: bool
    trace: list[RagTraceEntry | dict[str, Any]]
    outcome_result: Literal["running", "success", "failure"]
    http_status: int | None
    error_code: str | None
    error_summary: str | None


def render_match_persistence_summary(draft: AspirationMatchDraft) -> str:
    pairs = [
        f"{result.aspiration_index}:{match.lead_index}:{match.match_score}"
        for result in draft.results
        for match in result.lead_matches
    ]
    total_matches = sum(len(result.lead_matches) for result in draft.results)
    max_score = max(
        (
            match.match_score
            for result in draft.results
            for match in result.lead_matches
        ),
        default=0,
    )
    return (
        f"aspirations={len(draft.results)};"
        f"matches={total_matches};"
        f"max_score={max_score};"
        f"pairs={','.join(pairs)}"
    )


def _round_score(value: float | None) -> float | None:
    if value is None:
        return None
    return round(float(value), 4)


def build_match_orchestration_payload(
    state: AspirationMatcherState,
) -> dict[str, Any]:
    retrieval_results = state.get("selected_results", [])
    retrieval_scores = [
        float(item["score"]) for item in retrieval_results if "score" in item
    ]
    source_document_ids = state.get("source_document_ids") or []
    embedding_ids = state.get("embedding_ids") or []

    input_section = {
        "requested_k": state.get("requested_k"),
        "model_name": state.get("model_name"),
        "aspiration_count": state.get("aspiration_count", 0),
        "lead_count": state.get("lead_count", 0),
        "single_aspiration_mode": state.get("single_aspiration_mode", False),
        "pagination_requested": state.get("pagination_requested", False),
        "page": state.get("page"),
        "page_size": state.get("page_size"),
        "combined_query_chars": state.get("combined_query_chars", 0),
        "combined_query_preview": safe_preview(state.get("combined_query", "")),
    }
    retrieval_section = {
        "attempts": state.get("retrieval_attempts", 0),
        "effective_k": state.get("effective_k", state.get("requested_k", 0)),
        "score_floor": _round_score(state.get("score_floor", INITIAL_SCORE_FLOOR)),
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
        validator_name=AspirationMatchDraft.__name__,
        input_section=input_section,
        retrieval_section=retrieval_section,
    )


def paginate_matches(
    matches: Sequence[AspirationLeadMatchDraft],
    *,
    page: int,
    page_size: int,
) -> tuple[list[AspirationLeadMatchDraft], int]:
    total = len(matches)
    start = max(0, (page - 1) * page_size)
    end = start + page_size
    return list(matches[start:end]), total
