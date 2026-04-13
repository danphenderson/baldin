from __future__ import annotations

from time import perf_counter

from fastapi import HTTPException
from langchain_core.prompts import ChatPromptTemplate

from app import schemas
from app.core import conf
from app.core import orchestration as orchestration_core
from app.core.langchain import ainvoke_structured_prompt
from app.core.rag.match_aspirations.state import (
    WORKFLOW_NAME,
    AspirationMatchDraft,
    AspirationMatcherState,
    build_match_orchestration_payload,
    paginate_matches,
    render_match_persistence_summary,
    validate_aspiration_match_draft,
)
from app.core.rag.shared import (
    INITIAL_SCORE_FLOOR,
    MAX_RENDERED_CONTEXT_CHARS,
    NO_CONTEXT_DETAIL,
    active_rag_event_id,
    append_trace,
    fingerprint_text,
    sanitize_exception,
    select_results,
    shared_finalize_failure,
    shared_finalize_success,
    shared_initialize_run,
)
from app.core.vector_store import PGVectorStore

MATCHER_PIPELINE_DEFINITION = {
    "kind": "service",
    "entrypoint": "aspirations.match",
    "schema_version": 1,
}


def _build_prompt() -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "You are a career advisor matching job leads to career aspirations. "
                "Use the document context as evidence about the user's background. "
                "For each aspiration, score every lead from 1-10, where 10 is the "
                "strongest match. Keep each explanation grounded in the document "
                "context and the lead text. Return structured output that matches "
                "the required schema exactly.",
            ),
            (
                "user",
                "Document context:\n{context}\n\n"
                "Aspirations:\n{aspirations_text}\n\n"
                "Leads:\n{leads_text}\n\n"
                "Return one result per aspiration_index and include every lead_index "
                "exactly once within each lead_matches list.",
            ),
        ]
    )


def _format_aspirations_text(
    aspirations: list[schemas.AspirationMatchInput],
) -> str:
    parts: list[str] = []
    for index, aspiration in enumerate(aspirations, 1):
        line = f"{index}. [{aspiration.kind.value}] {aspiration.label}"
        if aspiration.priority > 0:
            line += f" (priority {aspiration.priority})"
        if aspiration.reason:
            line += f" | reason: {aspiration.reason}"
        if aspiration.notes:
            line += f" | notes: {aspiration.notes}"
        if aspiration.extracted_attributes:
            line += f" | extracted_attributes: {aspiration.extracted_attributes}"
        parts.append(line)
    return "\n".join(parts)


def _format_leads_text(leads: list[schemas.LeadRankInput]) -> str:
    parts: list[str] = []
    for index, lead in enumerate(leads, 1):
        description = lead.description or ""
        parts.append(f"{index}. {lead.title}: {description}")
    return "\n".join(parts)


def _build_combined_query(body: schemas.AspirationMatchRequest) -> str:
    aspiration_parts = [
        " ".join(
            part
            for part in (
                aspiration.label,
                aspiration.reason or "",
                aspiration.notes or "",
            )
            if part
        ).strip()
        for aspiration in body.aspirations
    ]
    lead_parts = [
        " ".join(part for part in (lead.title, lead.description or "") if part).strip()
        for lead in body.leads
    ]
    return " ".join(part for part in [*aspiration_parts, *lead_parts] if part)


def _build_context(
    retrieval_results: list[dict],
) -> tuple[str, list[dict], bool]:
    selected_results = select_results(retrieval_results, INITIAL_SCORE_FLOOR)
    deduped_results: list[dict] = []
    context_parts: list[str] = []
    seen_chunks: set[str] = set()
    total_chars = 0
    truncated = False

    for item in selected_results:
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

    return "".join(context_parts), deduped_results, truncated


def build_match_response(
    body: schemas.AspirationMatchRequest,
    draft: AspirationMatchDraft,
) -> schemas.AspirationMatchResponse:
    lead_ids = [lead.id for lead in body.leads]
    results: list[schemas.AspirationMatchResult] = []

    multi_aspiration = len(body.aspirations) > 1
    for draft_result in draft.results:
        aspiration = body.aspirations[draft_result.aspiration_index - 1]
        if multi_aspiration:
            page = 1
            total = len(draft_result.lead_matches)
            page_size = total
            page_matches = list(draft_result.lead_matches)
        else:
            total_page_size = len(draft_result.lead_matches)
            page = body.page or 1
            page_size = body.page_size or total_page_size
            page_matches, total = paginate_matches(
                draft_result.lead_matches,
                page=page,
                page_size=page_size,
            )

        results.append(
            schemas.AspirationMatchResult(
                client_key=aspiration.client_key,
                kind=aspiration.kind,
                label=aspiration.label,
                reason=aspiration.reason,
                notes=aspiration.notes,
                priority=aspiration.priority,
                extracted_attributes=aspiration.extracted_attributes,
                lead_matches=[
                    schemas.AspirationLeadMatch(
                        lead_id=lead_ids[match.lead_index - 1],
                        match_score=match.match_score,
                        explanation=match.explanation,
                    )
                    for match in page_matches
                ],
                total=total,
                page=page,
                page_size=page_size,
            )
        )

    return schemas.AspirationMatchResponse(results=results)


class AspirationMatcherService:
    def __init__(self, db) -> None:
        self.db = db

    async def match(
        self,
        body: schemas.AspirationMatchRequest,
        user: schemas.UserRead,
    ) -> schemas.AspirationMatchResponse:
        conf.openai.require_enabled("Aspiration matching")
        if len(body.aspirations) > 1 and (
            body.page is not None or body.page_size is not None
        ):
            raise HTTPException(
                status_code=400,
                detail="Pagination is only supported when matching a single aspiration.",
            )

        combined_query = _build_combined_query(body)
        event_token = active_rag_event_id.set("")
        state: AspirationMatcherState = {
            "db": self.db,
            "store": PGVectorStore(self.db),
            "user": user,
            "workflow_name": WORKFLOW_NAME,
            "model_name": conf.openai.COMPLETION_MODEL,
            "combined_query": combined_query,
            "combined_query_chars": len(combined_query),
            "requested_k": body.k,
            "aspiration_count": len(body.aspirations),
            "lead_count": len(body.leads),
            "single_aspiration_mode": len(body.aspirations) == 1,
            "pagination_requested": body.page is not None or body.page_size is not None,
            "page": body.page,
            "page_size": body.page_size,
        }
        try:
            state = {
                **state,
                **await shared_initialize_run(
                    state,
                    workflow_name=WORKFLOW_NAME,
                    description="Service orchestration pipeline for aspiration matching",
                    entrypoint="aspirations.match",
                    build_payload_fn=build_match_orchestration_payload,
                    pipeline_definition=MATCHER_PIPELINE_DEFINITION,
                ),
            }

            retrieval_started = perf_counter()
            retrieval_results = await state["store"].similarity_search(
                combined_query,
                user_id=user.id,
                k=body.k,
            )
            context, selected_results, context_truncated = _build_context(
                retrieval_results
            )
            retrieval_update: AspirationMatcherState = {
                "retrieval_attempts": 1,
                "effective_k": body.k,
                "score_floor": INITIAL_SCORE_FLOOR,
                "retrieval_results": retrieval_results,
                "selected_results": selected_results,
                "context": context,
                "context_chars": len(context),
                "context_truncated": context_truncated,
                "context_fingerprint": fingerprint_text(context),
                "source_document_ids": [
                    str(item["document_id"])
                    for item in selected_results
                    if item.get("document_id")
                ],
                "embedding_ids": [
                    str(item["id"]) for item in selected_results if item.get("id")
                ],
            }
            if context:
                state = {
                    **state,
                    **retrieval_update,
                    "trace": append_trace(
                        {**state, **retrieval_update},
                        node="retrieve_context",
                        status="success",
                        attempt=1,
                        started_at=retrieval_started,
                    ),
                }
            else:
                state = {
                    **state,
                    **retrieval_update,
                    "http_status": 400,
                    "error_code": "no_usable_context",
                    "error_summary": NO_CONTEXT_DETAIL,
                    "trace": append_trace(
                        {
                            **state,
                            **retrieval_update,
                            "http_status": 400,
                            "error_code": "no_usable_context",
                            "error_summary": NO_CONTEXT_DETAIL,
                        },
                        node="retrieve_context",
                        status="failure",
                        attempt=1,
                        started_at=retrieval_started,
                        warning_codes=["no_usable_context"],
                    ),
                }
                state = {
                    **state,
                    **await shared_finalize_failure(
                        state,
                        build_payload_fn=build_match_orchestration_payload,
                    ),
                }
                raise HTTPException(status_code=400, detail=NO_CONTEXT_DETAIL)

            generation_started = perf_counter()
            try:
                draft = await ainvoke_structured_prompt(
                    _build_prompt(),
                    {
                        "context": state["context"],
                        "aspirations_text": _format_aspirations_text(body.aspirations),
                        "leads_text": _format_leads_text(body.leads),
                    },
                    AspirationMatchDraft,
                    model_name=state.get("model_name"),
                )
                draft = validate_aspiration_match_draft(
                    draft,
                    aspiration_count=len(body.aspirations),
                    lead_count=len(body.leads),
                )
            except Exception as exc:
                error_summary = sanitize_exception(exc)
                state = {
                    **state,
                    "generation_attempts": 1,
                    "http_status": 500,
                    "error_code": "generation_failed",
                    "error_summary": error_summary,
                    "trace": append_trace(
                        {
                            **state,
                            "generation_attempts": 1,
                            "http_status": 500,
                            "error_code": "generation_failed",
                            "error_summary": error_summary,
                        },
                        node="generate_matches",
                        status="failure",
                        attempt=1,
                        started_at=generation_started,
                        warning_codes=["generation_failed"],
                    ),
                }
                state = {
                    **state,
                    **await shared_finalize_failure(
                        state,
                        build_payload_fn=build_match_orchestration_payload,
                    ),
                }
                raise HTTPException(
                    status_code=500,
                    detail="Failed to match aspirations to leads.",
                ) from exc

            state = {
                **state,
                "generation_attempts": 1,
                "draft": draft,
                "trace": append_trace(
                    {**state, "generation_attempts": 1, "draft": draft},
                    node="generate_matches",
                    status="success",
                    attempt=1,
                    started_at=generation_started,
                ),
            }
            response = build_match_response(body, draft)
            state = {
                **state,
                **await shared_finalize_success(
                    state,
                    render_fn=render_match_persistence_summary,
                    build_payload_fn=build_match_orchestration_payload,
                ),
            }
            return response
        except HTTPException:
            raise
        except Exception as exc:
            event_id = active_rag_event_id.get("")
            if event_id:
                await orchestration_core.mark_orchestration_event_failed_if_running(
                    event_id,
                    workflow_name=WORKFLOW_NAME,
                    detail=sanitize_exception(exc),
                    db=self.db,
                )
            raise HTTPException(
                status_code=500,
                detail="Failed to match aspirations to leads.",
            ) from exc
        finally:
            active_rag_event_id.reset(event_token)
