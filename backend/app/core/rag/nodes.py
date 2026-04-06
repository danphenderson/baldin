from __future__ import annotations

from time import perf_counter
from uuid import uuid4

from langchain_core.prompts import ChatPromptTemplate

from app import schemas
from app.core import conf
from app.core.correlation_id import correlation_id
from app.core.langchain import ainvoke_structured_prompt
from app.core.orchestration import (
    build_status_message,
    create_orchestration_event,
    get_or_create_orchestration_pipeline,
    update_orchestration_event,
)
from app.core.rag.shared import (
    EXPANDED_K_DELTA,
    EXPANDED_SCORE_FLOOR,
    INITIAL_SCORE_FLOOR,
    MAX_RENDERED_CONTEXT_CHARS,
    NO_CONTEXT_DETAIL,
    append_trace,
    classify_initial_results,
    mark_failure,
    sanitize_exception,
    select_results,
)
from app.core.rag.state import (
    WORKFLOW_NAME,
    LeadEnrichmentDraft,
    LeadEnrichmentState,
    active_rag_event_id,
    build_orchestration_payload,
    fingerprint_text,
    render_lead_enrichment,
    utc_now,
)


def _build_generation_prompt(repair_note: str | None = None) -> ChatPromptTemplate:
    messages: list[tuple[str, str]] = [
        (
            "system",
            "You are a career research assistant. Use only the provided document "
            "context to analyze the lead. Return concise structured output that "
            "matches the required schema exactly. Do not invent background that "
            "is not grounded in the context.",
        ),
    ]
    if repair_note:
        messages.append(
            (
                "system",
                "Repair the previous attempt. Requirements: overview 40-600 chars, "
                "matching_qualifications 1-5 unique items, gaps_to_address 0-4 "
                "unique items, next_steps 1-5 unique actionable items. Every item "
                f"must be trimmed and non-empty. Prior failure: {repair_note}",
            )
        )
    messages.append(
        (
            "user",
            "Document context:\n{context}\n\n"
            "Lead description:\n{lead_description}\n\n"
            "Ground the overview, qualifications, gaps, and next steps in the lead "
            "and the context.",
        )
    )
    return ChatPromptTemplate.from_messages(messages)


async def initialize_run(state: LeadEnrichmentState) -> LeadEnrichmentState:
    started = perf_counter()
    workflow_name = state.get("workflow_name", WORKFLOW_NAME)
    thread_id = correlation_id.get("") or uuid4().hex
    request_started_at = utc_now()
    pipeline = await get_or_create_orchestration_pipeline(
        workflow_name,
        db=state["db"],
        user=state["user"],
        description="LangGraph orchestration pipeline for lead enrichment",
        definition={
            "kind": "langgraph",
            "entrypoint": "documents.rag.enrich_lead",
            "schema_version": 1,
        },
    )
    update: LeadEnrichmentState = {
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
            payload=build_orchestration_payload({**state, **update}),
            environment=conf.settings.ENVIRONMENT,
            status=schemas.OrchestrationEventStatusType.RUNNING,
            pipeline_id=pipeline.id,
        ),
        db=state["db"],
    )
    active_rag_event_id.set(str(event.id))
    update["event_id"] = event.id
    return update


async def retrieve_context(state: LeadEnrichmentState) -> LeadEnrichmentState:
    started = perf_counter()
    attempt = int(state.get("retrieval_attempts", 0)) + 1
    results = await state["store"].similarity_search(
        state["lead_description"],
        user_id=state["user"].id,
        k=state["requested_k"],
    )
    selected_results = select_results(results, INITIAL_SCORE_FLOOR)
    classification = classify_initial_results(selected_results)
    update: LeadEnrichmentState = {
        "retrieval_attempts": attempt,
        "effective_k": state["requested_k"],
        "score_floor": INITIAL_SCORE_FLOOR,
        "retrieval_results": results,
        "selected_results": selected_results,
        "retrieval_classification": classification,
    }
    warning_codes: list[str] = []
    status = "success"
    if classification == "weak":
        status = "warning"
        warning_codes = ["weak_context"]
    elif classification == "empty":
        status = "warning"
        warning_codes = ["no_usable_context"]
        update.update(
            mark_failure(
                http_status=400,
                error_code="no_usable_context",
                error_summary=NO_CONTEXT_DETAIL,
            )
        )

    update["trace"] = append_trace(
        {**state, **update},
        node="retrieve_context",
        status=status,
        attempt=attempt,
        started_at=started,
        warning_codes=warning_codes,
    )
    return update


async def expand_retrieval(state: LeadEnrichmentState) -> LeadEnrichmentState:
    started = perf_counter()
    attempt = int(state.get("retrieval_attempts", 0)) + 1
    effective_k = min(int(state["requested_k"]) + EXPANDED_K_DELTA, 20)
    results = await state["store"].similarity_search(
        state["lead_description"],
        user_id=state["user"].id,
        k=effective_k,
    )
    selected_results = select_results(results, EXPANDED_SCORE_FLOOR)
    classification = classify_initial_results(selected_results)
    update: LeadEnrichmentState = {
        "retrieval_attempts": attempt,
        "effective_k": effective_k,
        "score_floor": EXPANDED_SCORE_FLOOR,
        "retrieval_results": results,
        "selected_results": selected_results,
        "retrieval_classification": classification,
    }
    warning_codes: list[str] = []
    status = "success"
    if classification != "strong":
        status = "warning"
        warning_codes = (
            ["weak_context"] if classification == "weak" else ["no_usable_context"]
        )
        update.update(
            mark_failure(
                http_status=400,
                error_code="no_usable_context",
                error_summary=NO_CONTEXT_DETAIL,
            )
        )

    update["trace"] = append_trace(
        {**state, **update},
        node="expand_retrieval",
        status=status,
        attempt=1,
        started_at=started,
        warning_codes=warning_codes,
    )
    return update


async def build_context(state: LeadEnrichmentState) -> LeadEnrichmentState:
    started = perf_counter()
    deduped_results: list[dict] = []
    seen_chunks: set[str] = set()
    context_parts: list[str] = []
    total_chars = 0
    truncated = False

    for item in state.get("selected_results", []):
        chunk_text = " ".join(str(item.get("chunk_text", "")).split())
        if not chunk_text or chunk_text in seen_chunks:
            continue
        seen_chunks.add(chunk_text)
        separator = "\n---\n" if context_parts else ""
        next_length = total_chars + len(separator) + len(chunk_text)
        if next_length > MAX_RENDERED_CONTEXT_CHARS:
            remaining = MAX_RENDERED_CONTEXT_CHARS - total_chars - len(separator)
            if remaining > 0 and not context_parts:
                chunk_text = chunk_text[:remaining].rstrip()
                context_parts.append(chunk_text)
                deduped_results.append(item)
                total_chars = MAX_RENDERED_CONTEXT_CHARS
            truncated = True
            break
        if separator:
            context_parts.append(separator)
            total_chars += len(separator)
        context_parts.append(chunk_text)
        total_chars += len(chunk_text)
        deduped_results.append(item)

    context = "".join(context_parts)
    update: LeadEnrichmentState = {
        "selected_results": deduped_results,
        "context": context,
        "context_chars": len(context),
        "context_truncated": truncated,
        "context_fingerprint": fingerprint_text(context),
        "source_document_ids": [
            str(item["document_id"])
            for item in deduped_results
            if item.get("document_id")
        ],
        "embedding_ids": [
            str(item["id"]) for item in deduped_results if item.get("id")
        ],
    }
    if not context:
        update.update(
            mark_failure(
                http_status=400,
                error_code="no_usable_context",
                error_summary=NO_CONTEXT_DETAIL,
            )
        )
        trace_status = "warning"
        warning_codes = ["no_usable_context"]
    else:
        trace_status = "success"
        warning_codes = []

    update["trace"] = append_trace(
        {**state, **update},
        node="build_context",
        status=trace_status,
        attempt=1,
        started_at=started,
        warning_codes=warning_codes,
    )
    return update


async def generate_enrichment(state: LeadEnrichmentState) -> LeadEnrichmentState:
    started = perf_counter()
    attempt = int(state.get("generation_attempts", 0)) + 1
    prompt = _build_generation_prompt()
    try:
        draft = await ainvoke_structured_prompt(
            prompt,
            {
                "context": state["context"],
                "lead_description": state["lead_description"],
            },
            LeadEnrichmentDraft,
            model_name=state.get("model_name"),
        )
    except Exception as exc:
        update: LeadEnrichmentState = {
            "generation_attempts": attempt,
            "generation_error_summary": sanitize_exception(exc),
            "trace": append_trace(
                state,
                node="generate_enrichment",
                status="warning",
                attempt=attempt,
                started_at=started,
                warning_codes=["validation_failed"],
            ),
        }
        return update

    update = {
        "generation_attempts": attempt,
        "draft": draft,
        "generation_error_summary": None,
        "trace": append_trace(
            {**state, "draft": draft},
            node="generate_enrichment",
            status="success",
            attempt=attempt,
            started_at=started,
        ),
    }
    return update


async def repair_generation(state: LeadEnrichmentState) -> LeadEnrichmentState:
    started = perf_counter()
    attempt = int(state.get("generation_attempts", 0)) + 1
    prompt = _build_generation_prompt(state.get("generation_error_summary"))
    try:
        draft = await ainvoke_structured_prompt(
            prompt,
            {
                "context": state["context"],
                "lead_description": state["lead_description"],
            },
            LeadEnrichmentDraft,
            model_name=state.get("model_name"),
        )
    except Exception as exc:
        failure_summary = sanitize_exception(exc)
        update: LeadEnrichmentState = {
            "generation_attempts": attempt,
            "repair_used": True,
            "generation_error_summary": failure_summary,
            **mark_failure(
                http_status=500,
                error_code="generation_failed",
                error_summary="Structured enrichment generation failed after one repair attempt.",
            ),
            "trace": append_trace(
                state,
                node="repair_generation",
                status="failure",
                attempt=1,
                started_at=started,
                warning_codes=["validation_failed"],
            ),
        }
        return update

    update = {
        "generation_attempts": attempt,
        "repair_used": True,
        "draft": draft,
        "generation_error_summary": None,
        "trace": append_trace(
            {**state, "draft": draft, "repair_used": True},
            node="repair_generation",
            status="success",
            attempt=1,
            started_at=started,
        ),
    }
    return update


async def finalize_success(state: LeadEnrichmentState) -> LeadEnrichmentState:
    started = perf_counter()
    rendered = render_lead_enrichment(state["draft"])
    request_finished_at = utc_now()
    update: LeadEnrichmentState = {
        "rendered_enrichment": rendered,
        "request_finished_at": request_finished_at,
        "outcome_result": "success",
        "http_status": 200,
        "error_code": None,
        "error_summary": None,
    }
    update["trace"] = append_trace(
        {**state, **update},
        node="finalize_success",
        status="success",
        attempt=1,
        started_at=started,
    )
    payload = build_orchestration_payload({**state, **update})
    await update_orchestration_event(
        state["event_id"],
        schemas.OrchestrationEventUpdate(
            message=build_status_message(
                state.get("workflow_name", WORKFLOW_NAME),
                "success",
                f"completed in {payload['request']['duration_ms']} ms",
            ),
            payload=payload,
            status=schemas.OrchestrationEventStatusType.SUCCESS,
        ),
        state["db"],
    )
    return update


async def finalize_failure(state: LeadEnrichmentState) -> LeadEnrichmentState:
    started = perf_counter()
    request_finished_at = utc_now()
    error_summary = state.get("error_summary")
    if not error_summary:
        error_summary = (
            "Structured enrichment generation failed after one repair attempt."
        )
    update: LeadEnrichmentState = {
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
    payload = build_orchestration_payload({**state, **update})
    await update_orchestration_event(
        state["event_id"],
        schemas.OrchestrationEventUpdate(
            message=build_status_message(
                state.get("workflow_name", WORKFLOW_NAME),
                "failure",
                error_summary,
            ),
            payload=payload,
            status=schemas.OrchestrationEventStatusType.FAILED,
        ),
        state["db"],
    )
    return update


def route_after_retrieve(state: LeadEnrichmentState) -> str:
    classification = state.get("retrieval_classification", "empty")
    if classification == "strong":
        return "build_context"
    if classification == "weak":
        return "expand_retrieval"
    return "finalize_failure"


def route_after_expand(state: LeadEnrichmentState) -> str:
    if state.get("retrieval_classification") == "strong":
        return "build_context"
    return "finalize_failure"


def route_after_build_context(state: LeadEnrichmentState) -> str:
    if state.get("context"):
        return "generate_enrichment"
    return "finalize_failure"


def route_after_generation(state: LeadEnrichmentState) -> str:
    if state.get("draft"):
        return "finalize_success"
    return "repair_generation"


def route_after_repair(state: LeadEnrichmentState) -> str:
    if state.get("draft"):
        return "finalize_success"
    return "finalize_failure"
