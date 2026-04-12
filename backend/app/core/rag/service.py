from __future__ import annotations

from fastapi import HTTPException

from app import schemas
from app.core import conf
from app.core import orchestration as orchestration_core
from app.core.correlation_id import correlation_id
from app.core.rag.graphs import lead_enrichment_graph
from app.core.rag.rank_leads.graphs import lead_ranking_graph
from app.core.rag.rank_leads.state import WORKFLOW_NAME as RANKING_WORKFLOW_NAME
from app.core.rag.rank_leads.state import LeadRankingState
from app.core.rag.shared import active_rag_event_id, sanitize_exception
from app.core.rag.state import WORKFLOW_NAME, LeadEnrichmentState
from app.core.rag.summarize_company.graphs import company_summarization_graph
from app.core.rag.summarize_company.state import (
    WORKFLOW_NAME as SUMMARIZE_WORKFLOW_NAME,
)
from app.core.rag.summarize_company.state import CompanySummaryState
from app.core.vector_store import PGVectorStore


class RagWorkflowService:
    def __init__(self, db) -> None:
        self.db = db

    async def enrich_lead(
        self,
        body: schemas.LeadEnrichRequest,
        user: schemas.UserRead,
    ) -> schemas.LeadEnrichResponse:
        conf.openai.require_enabled("Lead enrichment")
        thread_id = correlation_id.get("")
        event_token = active_rag_event_id.set("")
        initial_state: LeadEnrichmentState = {
            "db": self.db,
            "store": PGVectorStore(self.db),
            "user": user,
            "workflow_name": WORKFLOW_NAME,
            "model_name": conf.openai.COMPLETION_MODEL,
            "lead_description": body.lead_description,
            "requested_k": body.k,
        }
        config = {"configurable": {"thread_id": thread_id}} if thread_id else {}
        try:
            final_state = await lead_enrichment_graph.ainvoke(
                initial_state, config=config
            )
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
                detail="Failed to generate lead enrichment.",
            ) from exc
        finally:
            active_rag_event_id.reset(event_token)

        if final_state.get("outcome_result") == "success":
            return schemas.LeadEnrichResponse(
                enrichment=final_state["rendered_enrichment"]
            )

        http_status = int(final_state.get("http_status") or 500)
        if http_status == 400:
            raise HTTPException(
                status_code=400,
                detail=final_state.get("error_summary")
                or "No embedded documents found. Embed documents first.",
            )

        raise HTTPException(
            status_code=http_status,
            detail="Failed to generate lead enrichment.",
        )

    async def rank_leads(
        self,
        body: schemas.LeadRankRequest,
        user: schemas.UserRead,
    ) -> schemas.LeadRankResponse:
        conf.openai.require_enabled("Lead ranking")
        thread_id = correlation_id.get("")
        event_token = active_rag_event_id.set("")
        combined_query = " ".join(
            lead.get("title", "") + " " + lead.get("description", "")
            for lead in body.leads
        )
        initial_state: LeadRankingState = {
            "db": self.db,
            "store": PGVectorStore(self.db),
            "user": user,
            "workflow_name": RANKING_WORKFLOW_NAME,
            "model_name": conf.openai.COMPLETION_MODEL,
            "leads": body.leads,
            "combined_query": combined_query,
            "combined_query_chars": len(combined_query),
            "requested_k": body.k,
        }
        config = {"configurable": {"thread_id": thread_id}} if thread_id else {}
        try:
            final_state = await lead_ranking_graph.ainvoke(initial_state, config=config)
        except HTTPException:
            raise
        except Exception as exc:
            event_id = active_rag_event_id.get("")
            if event_id:
                await orchestration_core.mark_orchestration_event_failed_if_running(
                    event_id,
                    workflow_name=RANKING_WORKFLOW_NAME,
                    detail=sanitize_exception(exc),
                    db=self.db,
                )
            raise HTTPException(
                status_code=500,
                detail="Failed to generate lead ranking.",
            ) from exc
        finally:
            active_rag_event_id.reset(event_token)

        if final_state.get("outcome_result") == "success":
            return schemas.LeadRankResponse(ranking=final_state["rendered_output"])

        http_status = int(final_state.get("http_status") or 500)
        if http_status == 400:
            raise HTTPException(
                status_code=400,
                detail=final_state.get("error_summary")
                or "No embedded documents found. Embed documents first.",
            )

        raise HTTPException(
            status_code=http_status,
            detail="Failed to generate lead ranking.",
        )

    async def summarize_company(
        self,
        body: schemas.CompanySummarizeRequest,
        user: schemas.UserRead,
    ) -> schemas.CompanySummarizeResponse:
        conf.openai.require_enabled("Company summarization")
        thread_id = correlation_id.get("")
        event_token = active_rag_event_id.set("")
        initial_state: CompanySummaryState = {
            "db": self.db,
            "user": user,
            "workflow_name": SUMMARIZE_WORKFLOW_NAME,
            "model_name": conf.openai.COMPLETION_MODEL,
            "url": body.url,
        }
        config = {"configurable": {"thread_id": thread_id}} if thread_id else {}
        try:
            final_state = await company_summarization_graph.ainvoke(
                initial_state, config=config
            )
        except HTTPException:
            raise
        except Exception as exc:
            event_id = active_rag_event_id.get("")
            if event_id:
                await orchestration_core.mark_orchestration_event_failed_if_running(
                    event_id,
                    workflow_name=SUMMARIZE_WORKFLOW_NAME,
                    detail=sanitize_exception(exc),
                    db=self.db,
                )
            raise HTTPException(
                status_code=500,
                detail="Failed to generate company summary.",
            ) from exc
        finally:
            active_rag_event_id.reset(event_token)

        if final_state.get("outcome_result") == "success":
            return schemas.CompanySummarizeResponse(
                url=body.url,
                summary=final_state["rendered_output"],
            )

        http_status = int(final_state.get("http_status") or 500)
        if http_status == 400:
            raise HTTPException(
                status_code=400,
                detail=final_state.get("error_summary")
                or "Could not extract text from the URL",
            )

        raise HTTPException(
            status_code=http_status,
            detail="Failed to generate company summary.",
        )
