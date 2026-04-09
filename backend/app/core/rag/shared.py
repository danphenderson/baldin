from __future__ import annotations

import hashlib
from contextvars import ContextVar
from datetime import datetime, timezone
from time import perf_counter
from typing import Any, Literal
from uuid import uuid4

from pydantic import Field

from app import schemas
from app.core import conf
from app.core.correlation_id import correlation_id
from app.core.orchestration import (
    build_status_message,
    create_orchestration_event,
    get_or_create_orchestration_pipeline,
    update_orchestration_event,
)
from app.schemas import BaseSchema

# ---------------------------------------------------------------------------
#  Score constants
# ---------------------------------------------------------------------------

INITIAL_SCORE_FLOOR = 0.62
EXPANDED_SCORE_FLOOR = 0.55
STRONG_MATCH_SCORE = 0.72
EXPANDED_K_DELTA = 3
NO_CONTEXT_DETAIL = "No embedded documents found. Embed documents first."

# ---------------------------------------------------------------------------
#  Shared state constants
# ---------------------------------------------------------------------------

MAX_LEAD_PREVIEW_CHARS = 160
MAX_RENDERED_CONTEXT_CHARS = 2500
MAX_PERSISTED_IDS = 5

# ---------------------------------------------------------------------------
#  Context variable
# ---------------------------------------------------------------------------

active_rag_event_id: ContextVar[str] = ContextVar("active_rag_event_id", default="")

# ---------------------------------------------------------------------------
#  Generic trace entry
# ---------------------------------------------------------------------------


class RagTraceEntry(BaseSchema):
    node: str
    status: Literal["success", "warning", "failure"]
    attempt: int = 1
    duration_ms: int = Field(..., ge=0)
    warning_codes: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
#  Pure utility helpers
# ---------------------------------------------------------------------------


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def to_utc_iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def fingerprint_text(value: str | None) -> str | None:
    if not value:
        return None
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
    return f"sha256:{digest}"


def safe_preview(value: str, max_chars: int = MAX_LEAD_PREVIEW_CHARS) -> str:
    normalized = " ".join(value.split())
    if len(normalized) <= max_chars:
        return normalized
    return f"{normalized[: max_chars - 3].rstrip()}..."


# ---------------------------------------------------------------------------
#  Generic node helpers
# ---------------------------------------------------------------------------


def append_trace(
    state: dict[str, Any],
    *,
    node: str,
    status: str,
    attempt: int,
    started_at: float,
    warning_codes: list[str] | None = None,
) -> list[RagTraceEntry | dict]:
    trace = list(state.get("trace", []))
    trace.append(
        RagTraceEntry(
            node=node,
            status=status,
            attempt=attempt,
            duration_ms=int((perf_counter() - started_at) * 1000),
            warning_codes=warning_codes or [],
        )
    )
    return trace


def mark_failure(
    *,
    http_status: int,
    error_code: str,
    error_summary: str,
) -> dict[str, Any]:
    return {
        "outcome_result": "failure",
        "http_status": http_status,
        "error_code": error_code,
        "error_summary": error_summary,
    }


def select_results(results: list[dict], score_floor: float) -> list[dict]:
    return [item for item in results if float(item.get("score", 0.0)) >= score_floor]


def classify_initial_results(selected_results: list[dict]) -> str:
    if not selected_results:
        return "empty"
    max_score = max(float(item.get("score", 0.0)) for item in selected_results)
    if len(selected_results) >= 2 or max_score >= STRONG_MATCH_SCORE:
        return "strong"
    return "weak"


def sanitize_exception(exc: Exception) -> str:
    detail = " ".join(str(exc).split())
    if len(detail) > 200:
        return f"{detail[:197].rstrip()}..."
    return detail or exc.__class__.__name__


# ---------------------------------------------------------------------------
#  Trace normalization
# ---------------------------------------------------------------------------


def _round_score(value: float | None) -> float | None:
    if value is None:
        return None
    return round(float(value), 4)


def normalize_trace_entries(
    trace: list[RagTraceEntry | dict[str, Any]] | None,
) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for entry in trace or []:
        if isinstance(entry, RagTraceEntry):
            normalized.append(entry.model_dump(exclude_none=True))
        else:
            normalized.append({k: v for k, v in entry.items() if v not in (None, [])})
    return normalized


# ---------------------------------------------------------------------------
#  Generic orchestration payload builder
# ---------------------------------------------------------------------------


def build_rag_orchestration_payload(
    state: dict[str, Any],
    *,
    kind: str,
    schema_version: int,
    validator_name: str,
    input_section: dict[str, Any],
    retrieval_section: dict[str, Any] | None = None,
    fetch_section: dict[str, Any] | None = None,
) -> dict[str, Any]:
    rendered = state.get("rendered_enrichment", "") or state.get("rendered_output", "")
    trace = normalize_trace_entries(state.get("trace"))
    warning_count = sum(1 for entry in trace if entry.get("status") == "warning")
    started_at = state.get("request_started_at")
    finished_at = state.get("request_finished_at")
    duration_ms = None
    if started_at and finished_at:
        duration_ms = int((finished_at - started_at).total_seconds() * 1000)

    payload: dict[str, Any] = {
        "kind": kind,
        "schema_version": schema_version,
        "request": {
            "thread_id": state.get("thread_id"),
            "workflow_name": state.get("workflow_name"),
            "started_at": to_utc_iso(started_at),
            "finished_at": to_utc_iso(finished_at),
            "duration_ms": duration_ms,
        },
        "input": input_section,
        "generation": {
            "attempts": state.get("generation_attempts", 0),
            "validator_name": validator_name,
            "repair_used": state.get("repair_used", False),
            "rendered_chars": len(rendered),
            "output_fingerprint": fingerprint_text(rendered),
        },
        "trace": trace,
        "outcome": {
            "result": state.get("outcome_result", "running"),
            "http_status": state.get("http_status"),
            "warning_count": warning_count,
            "error_code": state.get("error_code"),
            "error_summary": state.get("error_summary"),
        },
    }
    if retrieval_section is not None:
        payload["retrieval"] = retrieval_section
    if fetch_section is not None:
        payload["fetch"] = fetch_section
    return payload


# ---------------------------------------------------------------------------
#  Shared node factories
# ---------------------------------------------------------------------------


async def shared_initialize_run(
    state: dict[str, Any],
    *,
    workflow_name: str,
    description: str,
    entrypoint: str,
    build_payload_fn=None,
) -> dict[str, Any]:
    started = perf_counter()
    thread_id = correlation_id.get("") or uuid4().hex
    request_started_at = utc_now()
    pipeline = await get_or_create_orchestration_pipeline(
        workflow_name,
        db=state["db"],
        user=state["user"],
        description=description,
        definition={
            "kind": "langgraph",
            "entrypoint": entrypoint,
            "schema_version": 1,
        },
    )
    update: dict[str, Any] = {
        "workflow_name": workflow_name,
        "thread_id": thread_id,
        "request_started_at": request_started_at,
        "pipeline_id": pipeline.id,
        "outcome_result": "running",
        "http_status": None,
        "error_code": None,
        "error_summary": None,
        "retrieval_attempts": 0,
        "generation_attempts": 0,
        "repair_used": False,
    }
    update["trace"] = append_trace(
        {**state, **update},
        node="initialize_run",
        status="success",
        attempt=1,
        started_at=started,
    )
    event = await create_orchestration_event(
        schemas.OrchestrationEventCreate(
            message=build_status_message(workflow_name, "running", "initialized"),
            payload=build_payload_fn({**state, **update}) if build_payload_fn else {},
            environment=conf.settings.ENVIRONMENT,
            status=schemas.OrchestrationEventStatusType.RUNNING,
            pipeline_id=pipeline.id,
        ),
        db=state["db"],
    )
    active_rag_event_id.set(str(event.id))
    update["event_id"] = event.id
    return update


async def shared_finalize_success(
    state: dict[str, Any],
    *,
    render_fn,
    build_payload_fn,
    rendered_field: str = "rendered_output",
) -> dict[str, Any]:
    started = perf_counter()
    rendered = render_fn(state["draft"])
    request_finished_at = utc_now()
    update: dict[str, Any] = {
        "request_finished_at": request_finished_at,
        "outcome_result": "success",
        "http_status": 200,
        "error_code": None,
        "error_summary": None,
    }
    update[rendered_field] = rendered
    if rendered_field != "rendered_output":
        update["rendered_output"] = rendered
    update["trace"] = append_trace(
        {**state, **update},
        node="finalize_success",
        status="success",
        attempt=1,
        started_at=started,
    )
    payload = build_payload_fn({**state, **update})
    await update_orchestration_event(
        state["event_id"],
        schemas.OrchestrationEventUpdate(
            message=build_status_message(
                state.get("workflow_name", ""),
                "success",
                f"completed in {payload['request']['duration_ms']} ms",
            ),
            payload=payload,
            status=schemas.OrchestrationEventStatusType.SUCCESS,
        ),
        state["db"],
    )
    return update


async def shared_finalize_failure(
    state: dict[str, Any],
    *,
    build_payload_fn,
) -> dict[str, Any]:
    started = perf_counter()
    request_finished_at = utc_now()
    error_summary = (
        state.get("error_summary")
        or "Structured generation failed after one repair attempt."
    )
    update: dict[str, Any] = {
        "request_finished_at": request_finished_at,
        "outcome_result": "failure",
        "http_status": state.get("http_status", 500) or 500,
        "error_code": state.get("error_code") or "generation_failed",
        "error_summary": error_summary,
    }
    update["trace"] = append_trace(
        {**state, **update},
        node="finalize_failure",
        status="failure",
        attempt=1,
        started_at=started,
        warning_codes=[update["error_code"]],
    )
    payload = build_payload_fn({**state, **update})
    await update_orchestration_event(
        state["event_id"],
        schemas.OrchestrationEventUpdate(
            message=build_status_message(
                state.get("workflow_name", ""),
                "failure",
                error_summary,
            ),
            payload=payload,
            status=schemas.OrchestrationEventStatusType.FAILED,
        ),
        state["db"],
    )
    return update
