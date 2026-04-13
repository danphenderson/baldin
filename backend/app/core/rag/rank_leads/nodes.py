from __future__ import annotations

from time import perf_counter

from langchain_core.prompts import ChatPromptTemplate

from app.core.langchain import ainvoke_structured_prompt
from app.core.rag.rank_leads.state import (
    WORKFLOW_NAME,
    LeadRankingDraft,
    LeadRankingState,
    build_ranking_orchestration_payload,
    render_lead_ranking,
    validate_lead_ranking_draft,
)
from app.core.rag.shared import (
    EXPANDED_K_DELTA,
    EXPANDED_SCORE_FLOOR,
    INITIAL_SCORE_FLOOR,
    MAX_RENDERED_CONTEXT_CHARS,
    NO_CONTEXT_DETAIL,
    append_trace,
    classify_initial_results,
    fingerprint_text,
    mark_failure,
    sanitize_exception,
    select_results,
    shared_finalize_failure,
    shared_finalize_success,
    shared_initialize_run,
)


def _format_aspirations_text(aspirations: list[dict]) -> str:
    parts: list[str] = []
    for aspiration in aspirations:
        kind = str(aspiration.get("kind", "aspiration")).strip() or "aspiration"
        label = str(aspiration.get("label", "")).strip()
        if not label:
            continue
        priority = aspiration.get("priority")
        reason = str(aspiration.get("reason", "")).strip()
        line = f"- {kind.title()}: {label}"
        if isinstance(priority, int) and priority > 0:
            line += f" (priority {priority})"
        if reason:
            line += f" - {reason}"
        parts.append(line)
    return "\n".join(parts)


def _build_ranking_prompt(
    aspirations_text: str | None = None,
    repair_note: str | None = None,
) -> ChatPromptTemplate:
    messages: list[tuple[str, str]] = [
        (
            "system",
            "You are a career advisor. Rank the following job leads by relevance "
            "to the user's background as reflected in the provided document context. "
            "For each lead, provide a relevance score (1-10) and a brief explanation "
            "grounded in the context. When aspirations are provided, also explain "
            "how each lead aligns or conflicts with them. Return concise structured "
            "output that matches the required schema exactly.",
        ),
    ]
    if aspirations_text:
        messages.append(
            (
                "system",
                "The user has these career aspirations:\n{aspirations_text}\n\n"
                "Use them as an additional ranking signal. Populate aspiration_alignment "
                "with a short note when you can tie the lead to those aspirations. "
                "If there is no meaningful tie, omit aspiration_alignment.",
            )
        )
    if repair_note:
        messages.append(
            (
                "system",
                "Repair the previous attempt. Requirements: each lead needs "
                "lead_index (1-based int), title (1-200 chars), relevance_score "
                "(1-10), explanation (20-400 chars), and optional aspiration_alignment "
                "(5-240 chars). All entries must have unique lead_index values. "
                f"Prior failure: {repair_note}",
            )
        )
    messages.append(
        (
            "user",
            "Document context:\n{context}\n\n"
            "Job leads to rank:\n{leads_text}\n\n"
            "Rank all leads by relevance, providing a score and explanation for each.",
        )
    )
    return ChatPromptTemplate.from_messages(messages)


def _format_leads_text(leads: list[dict]) -> str:
    parts: list[str] = []
    for i, lead in enumerate(leads, 1):
        title = lead.get("title", "Untitled")
        desc = lead.get("description", "")
        parts.append(f"{i}. {title}: {desc}")
    return "\n".join(parts)


async def initialize_run(state: LeadRankingState) -> LeadRankingState:
    update = await shared_initialize_run(
        state,
        workflow_name=state.get("workflow_name", WORKFLOW_NAME),
        description="LangGraph orchestration pipeline for lead ranking",
        entrypoint="documents.rag.rank_leads",
    )
    return update


async def retrieve_context(state: LeadRankingState) -> LeadRankingState:
    started = perf_counter()
    attempt = int(state.get("retrieval_attempts", 0)) + 1
    results = await state["store"].similarity_search(
        state["combined_query"],
        user_id=state["user"].id,
        k=state["requested_k"],
    )
    selected = select_results(results, INITIAL_SCORE_FLOOR)
    classification = classify_initial_results(selected)
    update: LeadRankingState = {
        "retrieval_attempts": attempt,
        "effective_k": state["requested_k"],
        "score_floor": INITIAL_SCORE_FLOOR,
        "retrieval_results": results,
        "selected_results": selected,
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


async def expand_retrieval(state: LeadRankingState) -> LeadRankingState:
    started = perf_counter()
    attempt = int(state.get("retrieval_attempts", 0)) + 1
    effective_k = min(int(state["requested_k"]) + EXPANDED_K_DELTA, 20)
    results = await state["store"].similarity_search(
        state["combined_query"],
        user_id=state["user"].id,
        k=effective_k,
    )
    selected = select_results(results, EXPANDED_SCORE_FLOOR)
    classification = classify_initial_results(selected)
    update: LeadRankingState = {
        "retrieval_attempts": attempt,
        "effective_k": effective_k,
        "score_floor": EXPANDED_SCORE_FLOOR,
        "retrieval_results": results,
        "selected_results": selected,
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


async def build_context(state: LeadRankingState) -> LeadRankingState:
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
    update: LeadRankingState = {
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


async def generate_ranking(state: LeadRankingState) -> LeadRankingState:
    started = perf_counter()
    attempt = int(state.get("generation_attempts", 0)) + 1
    aspirations_text = _format_aspirations_text(state.get("aspirations", []))
    prompt = _build_ranking_prompt(aspirations_text or None)
    leads_text = _format_leads_text(state.get("leads", []))
    try:
        draft = await ainvoke_structured_prompt(
            prompt,
            {
                "context": state["context"],
                "leads_text": leads_text,
                "aspirations_text": aspirations_text,
            },
            LeadRankingDraft,
            model_name=state.get("model_name"),
        )
        draft = validate_lead_ranking_draft(
            draft,
            lead_count=len(state.get("leads", [])),
        )
    except Exception as exc:
        update: LeadRankingState = {
            "generation_attempts": attempt,
            "generation_error_summary": sanitize_exception(exc),
            "trace": append_trace(
                state,
                node="generate_ranking",
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
            node="generate_ranking",
            status="success",
            attempt=attempt,
            started_at=started,
        ),
    }
    return update


async def repair_generation(state: LeadRankingState) -> LeadRankingState:
    started = perf_counter()
    attempt = int(state.get("generation_attempts", 0)) + 1
    aspirations_text = _format_aspirations_text(state.get("aspirations", []))
    prompt = _build_ranking_prompt(
        aspirations_text or None, state.get("generation_error_summary")
    )
    leads_text = _format_leads_text(state.get("leads", []))
    try:
        draft = await ainvoke_structured_prompt(
            prompt,
            {
                "context": state["context"],
                "leads_text": leads_text,
                "aspirations_text": aspirations_text,
            },
            LeadRankingDraft,
            model_name=state.get("model_name"),
        )
        draft = validate_lead_ranking_draft(
            draft,
            lead_count=len(state.get("leads", [])),
        )
    except Exception as exc:
        failure_summary = sanitize_exception(exc)
        update: LeadRankingState = {
            "generation_attempts": attempt,
            "repair_used": True,
            "generation_error_summary": failure_summary,
            **mark_failure(
                http_status=500,
                error_code="generation_failed",
                error_summary="Structured ranking generation failed after one repair attempt.",
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


async def finalize_success(state: LeadRankingState) -> LeadRankingState:
    return await shared_finalize_success(
        state,
        render_fn=render_lead_ranking,
        build_payload_fn=build_ranking_orchestration_payload,
    )


async def finalize_failure(state: LeadRankingState) -> LeadRankingState:
    return await shared_finalize_failure(
        state,
        build_payload_fn=build_ranking_orchestration_payload,
    )


# ---------------------------------------------------------------------------
#  Routing functions
# ---------------------------------------------------------------------------


def route_after_retrieve(state: LeadRankingState) -> str:
    classification = state.get("retrieval_classification", "empty")
    if classification == "strong":
        return "build_context"
    if classification == "weak":
        return "expand_retrieval"
    return "finalize_failure"


def route_after_expand(state: LeadRankingState) -> str:
    if state.get("retrieval_classification") == "strong":
        return "build_context"
    return "finalize_failure"


def route_after_build_context(state: LeadRankingState) -> str:
    if state.get("context"):
        return "generate_ranking"
    return "finalize_failure"


def route_after_generation(state: LeadRankingState) -> str:
    if state.get("draft"):
        return "finalize_success"
    return "repair_generation"


def route_after_repair(state: LeadRankingState) -> str:
    if state.get("draft"):
        return "finalize_success"
    return "finalize_failure"
