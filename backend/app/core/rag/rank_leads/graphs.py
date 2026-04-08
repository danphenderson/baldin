from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from app.core.rag.rank_leads.nodes import (
    build_context,
    expand_retrieval,
    finalize_failure,
    finalize_success,
    generate_ranking,
    initialize_run,
    repair_generation,
    retrieve_context,
    route_after_build_context,
    route_after_expand,
    route_after_generation,
    route_after_repair,
    route_after_retrieve,
)
from app.core.rag.rank_leads.state import LeadRankingState


def build_lead_ranking_graph():
    graph = StateGraph(LeadRankingState)
    graph.add_node("initialize_run", initialize_run)
    graph.add_node("retrieve_context", retrieve_context)
    graph.add_node("expand_retrieval", expand_retrieval)
    graph.add_node("build_context", build_context)
    graph.add_node("generate_ranking", generate_ranking)
    graph.add_node("repair_generation", repair_generation)
    graph.add_node("finalize_success", finalize_success)
    graph.add_node("finalize_failure", finalize_failure)

    graph.add_edge(START, "initialize_run")
    graph.add_edge("initialize_run", "retrieve_context")
    graph.add_conditional_edges(
        "retrieve_context",
        route_after_retrieve,
        {
            "build_context": "build_context",
            "expand_retrieval": "expand_retrieval",
            "finalize_failure": "finalize_failure",
        },
    )
    graph.add_conditional_edges(
        "expand_retrieval",
        route_after_expand,
        {
            "build_context": "build_context",
            "finalize_failure": "finalize_failure",
        },
    )
    graph.add_conditional_edges(
        "build_context",
        route_after_build_context,
        {
            "generate_ranking": "generate_ranking",
            "finalize_failure": "finalize_failure",
        },
    )
    graph.add_conditional_edges(
        "generate_ranking",
        route_after_generation,
        {
            "finalize_success": "finalize_success",
            "repair_generation": "repair_generation",
        },
    )
    graph.add_conditional_edges(
        "repair_generation",
        route_after_repair,
        {
            "finalize_success": "finalize_success",
            "finalize_failure": "finalize_failure",
        },
    )
    graph.add_edge("finalize_success", END)
    graph.add_edge("finalize_failure", END)
    return graph.compile()


lead_ranking_graph = build_lead_ranking_graph()
