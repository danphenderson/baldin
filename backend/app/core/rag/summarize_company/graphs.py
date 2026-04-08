from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from app.core.rag.summarize_company.nodes import (
    fetch_content,
    finalize_failure,
    finalize_success,
    generate_summary,
    initialize_run,
    repair_generation,
    route_after_fetch,
    route_after_generation,
    route_after_repair,
)
from app.core.rag.summarize_company.state import CompanySummaryState


def build_company_summarization_graph():
    graph = StateGraph(CompanySummaryState)
    graph.add_node("initialize_run", initialize_run)
    graph.add_node("fetch_content", fetch_content)
    graph.add_node("generate_summary", generate_summary)
    graph.add_node("repair_generation", repair_generation)
    graph.add_node("finalize_success", finalize_success)
    graph.add_node("finalize_failure", finalize_failure)

    graph.add_edge(START, "initialize_run")
    graph.add_edge("initialize_run", "fetch_content")
    graph.add_conditional_edges(
        "fetch_content",
        route_after_fetch,
        {
            "generate_summary": "generate_summary",
            "finalize_failure": "finalize_failure",
        },
    )
    graph.add_conditional_edges(
        "generate_summary",
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


company_summarization_graph = build_company_summarization_graph()
