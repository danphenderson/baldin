from __future__ import annotations

from time import perf_counter

from langchain_core.prompts import ChatPromptTemplate

from app.core.langchain import ainvoke_structured_prompt, extract_text_from_url
from app.core.rag.shared import (
    append_trace,
    fingerprint_text,
    mark_failure,
    sanitize_exception,
    shared_finalize_failure,
    shared_finalize_success,
    shared_initialize_run,
)
from app.core.rag.summarize_company.state import (
    MAX_PAGE_TEXT_CHARS,
    WORKFLOW_NAME,
    CompanySummaryDraft,
    CompanySummaryState,
    build_summarization_orchestration_payload,
    render_company_summary,
)


def _build_summarization_prompt(repair_note: str | None = None) -> ChatPromptTemplate:
    messages: list[tuple[str, str]] = [
        (
            "system",
            "You are a company research assistant. Summarize the following company "
            "website content. Focus on: company name, mission, products and services, "
            "culture, recent news, and potential job opportunities. Return concise "
            "structured output that matches the required schema exactly. If a section "
            "has no relevant information, leave it empty.",
        ),
    ]
    if repair_note:
        messages.append(
            (
                "system",
                "Repair the previous attempt. Requirements: company_name 1-200 chars, "
                "mission 20-600 chars, products_and_services 20-600 chars. Culture, "
                "recent_news, job_opportunities are optional (0-400 chars each). All "
                "strings must be trimmed and non-empty where required. Prior failure: "
                f"{repair_note}",
            )
        )
    messages.append(
        (
            "user",
            "Website URL: {url}\n\nPage content:\n{page_text}\n\n"
            "Provide a structured summary covering company name, mission, "
            "products/services, and optionally culture, recent news, and "
            "job opportunities.",
        )
    )
    return ChatPromptTemplate.from_messages(messages)


async def initialize_run(state: CompanySummaryState) -> CompanySummaryState:
    update = await shared_initialize_run(
        state,
        workflow_name=state.get("workflow_name", WORKFLOW_NAME),
        description="LangGraph orchestration pipeline for company summarization",
        entrypoint="documents.rag.summarize_company",
    )
    return update


async def fetch_content(state: CompanySummaryState) -> CompanySummaryState:
    started = perf_counter()
    url = state.get("url", "")
    try:
        page_text = await extract_text_from_url(url)
    except Exception:
        failure = mark_failure(
            http_status=400,
            error_code="empty_page_text",
            error_summary="Could not extract text from the URL",
        )
        update: CompanySummaryState = {
            **failure,
            "page_text": "",
            "page_text_chars": 0,
            "content_fingerprint": None,
            "fetch_method": "unknown",
            "trace": append_trace(
                {**state, **failure},
                node="fetch_content",
                status="failure",
                attempt=1,
                started_at=started,
                warning_codes=["fetch_failed"],
            ),
        }
        return update

    stripped = page_text.strip() if page_text else ""
    if not stripped:
        failure = mark_failure(
            http_status=400,
            error_code="empty_page_text",
            error_summary="Could not extract text from the URL",
        )
        update = {
            **failure,
            "page_text": "",
            "page_text_chars": 0,
            "content_fingerprint": None,
            "fetch_method": "playwright",
            "trace": append_trace(
                {**state, **failure},
                node="fetch_content",
                status="failure",
                attempt=1,
                started_at=started,
                warning_codes=["empty_page_text"],
            ),
        }
        return update

    truncated = stripped[:MAX_PAGE_TEXT_CHARS]
    update = {
        "page_text": truncated,
        "page_text_chars": len(truncated),
        "content_fingerprint": fingerprint_text(truncated),
        "fetch_method": "playwright",
        "trace": append_trace(
            state,
            node="fetch_content",
            status="success",
            attempt=1,
            started_at=started,
        ),
    }
    return update


async def generate_summary(state: CompanySummaryState) -> CompanySummaryState:
    started = perf_counter()
    attempt = int(state.get("generation_attempts", 0)) + 1
    prompt = _build_summarization_prompt()
    try:
        draft = await ainvoke_structured_prompt(
            prompt,
            {
                "url": state.get("url", ""),
                "page_text": state.get("page_text", ""),
            },
            CompanySummaryDraft,
            model_name=state.get("model_name"),
        )
    except Exception as exc:
        update: CompanySummaryState = {
            "generation_attempts": attempt,
            "generation_error_summary": sanitize_exception(exc),
            "trace": append_trace(
                state,
                node="generate_summary",
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
            node="generate_summary",
            status="success",
            attempt=attempt,
            started_at=started,
        ),
    }
    return update


async def repair_generation(state: CompanySummaryState) -> CompanySummaryState:
    started = perf_counter()
    attempt = int(state.get("generation_attempts", 0)) + 1
    prompt = _build_summarization_prompt(state.get("generation_error_summary"))
    try:
        draft = await ainvoke_structured_prompt(
            prompt,
            {
                "url": state.get("url", ""),
                "page_text": state.get("page_text", ""),
            },
            CompanySummaryDraft,
            model_name=state.get("model_name"),
        )
    except Exception as exc:
        failure_summary = sanitize_exception(exc)
        update: CompanySummaryState = {
            "generation_attempts": attempt,
            "repair_used": True,
            "generation_error_summary": failure_summary,
            **mark_failure(
                http_status=500,
                error_code="generation_failed",
                error_summary="Structured summarization generation failed after one repair attempt.",
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


async def finalize_success(state: CompanySummaryState) -> CompanySummaryState:
    return await shared_finalize_success(
        state,
        render_fn=render_company_summary,
        build_payload_fn=build_summarization_orchestration_payload,
    )


async def finalize_failure(state: CompanySummaryState) -> CompanySummaryState:
    return await shared_finalize_failure(
        state,
        build_payload_fn=build_summarization_orchestration_payload,
    )


# ---------------------------------------------------------------------------
#  Routing functions
# ---------------------------------------------------------------------------


def route_after_fetch(state: CompanySummaryState) -> str:
    if state.get("page_text"):
        return "generate_summary"
    return "finalize_failure"


def route_after_generation(state: CompanySummaryState) -> str:
    if state.get("draft"):
        return "finalize_success"
    return "repair_generation"


def route_after_repair(state: CompanySummaryState) -> str:
    if state.get("draft"):
        return "finalize_success"
    return "finalize_failure"
