import json
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app import schemas
from app.core.rag import shared as rag_shared
from app.core.rag.rank_leads import nodes
from app.core.rag.rank_leads.graphs import build_lead_ranking_graph
from app.core.rag.rank_leads.state import (
    LeadRankingDraft,
    RankedLeadEntry,
    render_lead_ranking,
)


def _result(chunk_text: str, score: float) -> dict:
    return {
        "id": uuid4(),
        "document_id": uuid4(),
        "document_version_id": uuid4(),
        "chunk_index": 0,
        "chunk_text": chunk_text,
        "score": score,
    }


class _FakeStore:
    def __init__(self, responses: list[list[dict]]) -> None:
        self._responses = responses
        self.calls: list[dict] = []

    async def similarity_search(self, query: str, *, user_id, k: int = 5) -> list[dict]:
        self.calls.append({"query": query, "user_id": user_id, "k": k})
        return self._responses[len(self.calls) - 1]


class _OrchestrationRecorder:
    def __init__(self) -> None:
        self.created_payloads: list[schemas.OrchestrationEventCreate] = []
        self.updated_payloads: list[
            tuple[object, schemas.OrchestrationEventUpdate]
        ] = []

    async def create(
        self, payload: schemas.OrchestrationEventCreate, db
    ) -> SimpleNamespace:
        self.created_payloads.append(payload)
        return SimpleNamespace(id=uuid4())

    async def update(
        self,
        id,
        payload: schemas.OrchestrationEventUpdate,
        db,
        user=None,
    ) -> SimpleNamespace:
        self.updated_payloads.append((id, payload))
        return SimpleNamespace(id=id)


_SAMPLE_LEADS = [
    {
        "title": "Senior Backend Engineer",
        "description": "FastAPI and PostgreSQL expertise required.",
    },
    {
        "title": "Platform Engineer",
        "description": "Kubernetes and infrastructure automation.",
    },
    {"title": "ML Engineer", "description": "Building retrieval and ranking systems."},
]


def _base_state(store: _FakeStore, leads: list[dict] | None = None) -> dict:
    leads = leads or _SAMPLE_LEADS
    combined_query = " ".join(
        lead.get("title", "") + " " + lead.get("description", "") for lead in leads
    )
    return {
        "db": object(),
        "store": store,
        "user": SimpleNamespace(id=uuid4()),
        "workflow_name": "rag.rank_leads",
        "model_name": "gpt-5.4-nano-2026-03-17",
        "leads": leads,
        "aspirations": [],
        "combined_query": combined_query,
        "combined_query_chars": len(combined_query),
        "requested_k": 5,
    }


def _valid_draft() -> LeadRankingDraft:
    return LeadRankingDraft(
        ranked_leads=[
            RankedLeadEntry(
                lead_index=1,
                title="Senior Backend Engineer",
                relevance_score=9,
                explanation="Your FastAPI and PostgreSQL experience directly matches this role's core requirements.",
                aspiration_alignment="Direct fit with the user's aspiration to grow into senior backend platform roles.",
            ),
            RankedLeadEntry(
                lead_index=3,
                title="ML Engineer",
                relevance_score=7,
                explanation="Your retrieval system work partially matches, but deeper ML experience is needed.",
            ),
            RankedLeadEntry(
                lead_index=2,
                title="Platform Engineer",
                relevance_score=5,
                explanation="Partial match on infrastructure tooling, but the role emphasizes Kubernetes expertise you haven't demonstrated.",
            ),
        ]
    )


def _out_of_range_draft() -> LeadRankingDraft:
    return LeadRankingDraft(
        ranked_leads=[
            RankedLeadEntry(
                lead_index=4,
                title="Out Of Range Role",
                relevance_score=9,
                explanation="This explanation is long enough to satisfy validation even though the lead index is invalid.",
            )
        ]
    )


def _missing_lead_draft() -> LeadRankingDraft:
    return LeadRankingDraft(
        ranked_leads=[
            RankedLeadEntry(
                lead_index=1,
                title="Senior Backend Engineer",
                relevance_score=9,
                explanation="The backend scope strongly matches the user's existing FastAPI and PostgreSQL experience.",
            ),
            RankedLeadEntry(
                lead_index=2,
                title="Platform Engineer",
                relevance_score=7,
                explanation="The infrastructure focus partially aligns, but it is not a complete ranking for the request.",
            ),
        ]
    )


def _install_orchestration_recorder(
    monkeypatch: pytest.MonkeyPatch,
) -> _OrchestrationRecorder:
    recorder = _OrchestrationRecorder()

    async def _fake_get_or_create_pipeline(*args, **kwargs):
        del args, kwargs
        return SimpleNamespace(id=uuid4(), name="rag.rank_leads")

    # Patch shared module — that's where shared_initialize_run and
    # shared_finalize_success/failure call orchestration functions.
    monkeypatch.setattr(
        rag_shared,
        "get_or_create_orchestration_pipeline",
        _fake_get_or_create_pipeline,
    )
    monkeypatch.setattr(rag_shared, "create_orchestration_event", recorder.create)
    monkeypatch.setattr(rag_shared, "update_orchestration_event", recorder.update)
    return recorder


def _install_generator(
    monkeypatch: pytest.MonkeyPatch,
    outcomes: list[LeadRankingDraft | Exception],
) -> None:
    async def _fake_ainvoke(prompt, variables, schema, *, model_name=None):
        del prompt, variables, model_name
        assert schema is LeadRankingDraft
        outcome = outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    monkeypatch.setattr(nodes, "ainvoke_structured_prompt", _fake_ainvoke)


def test_build_ranking_prompt_includes_aspirations() -> None:
    prompt = nodes._build_ranking_prompt(" - Role: Staff Engineer")
    messages = prompt.format_messages(
        context="PROFILE CONTEXT",
        leads_text="1. Staff Engineer: Platform and backend scope.",
        aspirations_text="- Role: Staff Engineer",
    )
    rendered = "\n".join(str(message.content) for message in messages)
    assert "career aspirations" in rendered
    assert "Staff Engineer" in rendered


def test_build_ranking_prompt_omits_aspirations_when_absent() -> None:
    prompt = nodes._build_ranking_prompt()
    messages = prompt.format_messages(
        context="PROFILE CONTEXT",
        leads_text="1. Staff Engineer: Platform and backend scope.",
    )
    rendered = "\n".join(str(message.content) for message in messages)
    assert "career aspirations" not in rendered


@pytest.mark.asyncio
async def test_ranking_graph_strong_retrieval_persists_compact_payload(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = _FakeStore(
        [
            [
                _result("UNIQUE_CONTEXT_ALPHA", 0.88),
                _result("UNIQUE_CONTEXT_BETA", 0.79),
            ]
        ]
    )
    recorder = _install_orchestration_recorder(monkeypatch)
    _install_generator(monkeypatch, [_valid_draft()])

    graph = build_lead_ranking_graph()
    state = _base_state(store)
    final_state = await graph.ainvoke(state)

    assert final_state["outcome_result"] == "success"
    assert final_state["http_status"] == 200
    assert final_state["generation_attempts"] == 1
    assert store.calls == [
        {
            "query": state["combined_query"],
            "user_id": state["user"].id,
            "k": 5,
        }
    ]

    payload = recorder.updated_payloads[-1][1].payload
    assert payload is not None
    assert set(payload) == {
        "kind",
        "schema_version",
        "request",
        "input",
        "retrieval",
        "generation",
        "trace",
        "outcome",
    }
    assert (
        recorder.created_payloads[0].status
        == schemas.OrchestrationEventStatusType.RUNNING
    )
    assert (
        recorder.updated_payloads[-1][1].status
        == schemas.OrchestrationEventStatusType.SUCCESS
    )
    assert payload["retrieval"]["attempts"] == 1
    assert payload["generation"]["attempts"] == 1
    assert payload["outcome"]["result"] == "success"
    assert payload["input"]["combined_query_preview"].endswith("...")
    assert payload["input"]["lead_count"] == 3

    serialized_payload = json.dumps(payload, sort_keys=True)
    assert state["combined_query"] not in serialized_payload
    assert "UNIQUE_CONTEXT_ALPHA" not in serialized_payload
    assert "UNIQUE_CONTEXT_BETA" not in serialized_payload
    assert final_state["rendered_output"] not in serialized_payload
    assert "raw prompt" not in serialized_payload.lower()


@pytest.mark.asyncio
async def test_ranking_graph_expands_once_for_weak_retrieval(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = _FakeStore(
        [
            [_result("WEAK_CONTEXT_ONLY", 0.68)],
            [_result("EXPANDED_CONTEXT", 0.74)],
        ]
    )
    recorder = _install_orchestration_recorder(monkeypatch)
    _install_generator(monkeypatch, [_valid_draft()])

    graph = build_lead_ranking_graph()
    final_state = await graph.ainvoke(_base_state(store))

    assert final_state["outcome_result"] == "success"
    assert final_state["retrieval_attempts"] == 2
    assert store.calls[0]["k"] == 5
    assert store.calls[1]["k"] == 8

    payload = recorder.updated_payloads[-1][1].payload
    assert payload is not None
    assert payload["retrieval"]["attempts"] == 2
    assert any(entry["node"] == "expand_retrieval" for entry in payload["trace"])


@pytest.mark.asyncio
async def test_ranking_graph_fails_for_empty_retrieval(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = _FakeStore([[]])
    recorder = _install_orchestration_recorder(monkeypatch)
    _install_generator(monkeypatch, [])

    graph = build_lead_ranking_graph()
    final_state = await graph.ainvoke(_base_state(store))

    assert final_state["outcome_result"] == "failure"
    assert final_state["http_status"] == 400
    assert final_state["error_code"] == "no_usable_context"

    payload = recorder.updated_payloads[-1][1].payload
    assert payload is not None
    assert payload["outcome"]["http_status"] == 400
    assert payload["outcome"]["error_code"] == "no_usable_context"
    assert (
        recorder.updated_payloads[-1][1].status
        == schemas.OrchestrationEventStatusType.FAILED
    )


@pytest.mark.asyncio
async def test_ranking_graph_repairs_once_after_validation_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = _FakeStore(
        [[_result("REPAIRABLE_CONTEXT", 0.9), _result("SECOND_CONTEXT", 0.83)]]
    )
    recorder = _install_orchestration_recorder(monkeypatch)
    _install_generator(
        monkeypatch,
        [ValueError("schema mismatch"), _valid_draft()],
    )

    graph = build_lead_ranking_graph()
    final_state = await graph.ainvoke(_base_state(store))

    assert final_state["outcome_result"] == "success"
    assert final_state["generation_attempts"] == 2
    assert final_state["repair_used"] is True

    payload = recorder.updated_payloads[-1][1].payload
    assert payload is not None
    assert payload["generation"]["attempts"] == 2
    assert payload["generation"]["repair_used"] is True
    assert any(
        entry["node"] == "generate_ranking" and entry["status"] == "warning"
        for entry in payload["trace"]
    )
    assert any(
        entry["node"] == "repair_generation" and entry["status"] == "success"
        for entry in payload["trace"]
    )


@pytest.mark.asyncio
async def test_ranking_graph_fails_after_repair_exhausted(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = _FakeStore(
        [[_result("TERMINAL_CONTEXT", 0.87), _result("BACKUP_CONTEXT", 0.82)]]
    )
    recorder = _install_orchestration_recorder(monkeypatch)
    _install_generator(
        monkeypatch,
        [ValueError("first failure"), ValueError("second failure")],
    )

    graph = build_lead_ranking_graph()
    final_state = await graph.ainvoke(_base_state(store))

    assert final_state["outcome_result"] == "failure"
    assert final_state["http_status"] == 500
    assert final_state["error_code"] == "generation_failed"
    assert final_state["generation_attempts"] == 2
    assert final_state["repair_used"] is True

    payload = recorder.updated_payloads[-1][1].payload
    assert payload is not None
    assert payload["outcome"]["http_status"] == 500
    assert payload["generation"]["attempts"] == 2
    assert payload["generation"]["repair_used"] is True
    assert (
        recorder.updated_payloads[-1][1].status
        == schemas.OrchestrationEventStatusType.FAILED
    )


@pytest.mark.asyncio
async def test_ranking_graph_rejects_out_of_range_lead_indices(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = _FakeStore(
        [[_result("OUT_OF_RANGE_CONTEXT", 0.9), _result("SECOND_CONTEXT", 0.83)]]
    )
    recorder = _install_orchestration_recorder(monkeypatch)
    _install_generator(
        monkeypatch,
        [_out_of_range_draft(), _out_of_range_draft()],
    )

    graph = build_lead_ranking_graph()
    final_state = await graph.ainvoke(_base_state(store))

    assert final_state["outcome_result"] == "failure"
    assert final_state["http_status"] == 500
    assert final_state["error_code"] == "generation_failed"
    assert final_state["generation_attempts"] == 2
    assert final_state["repair_used"] is True
    assert "input leads range" in final_state["generation_error_summary"]

    payload = recorder.updated_payloads[-1][1].payload
    assert payload is not None
    assert payload["generation"]["attempts"] == 2
    assert payload["outcome"]["error_code"] == "generation_failed"


@pytest.mark.asyncio
async def test_ranking_graph_rejects_missing_lead_indices(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = _FakeStore(
        [[_result("MISSING_LEAD_CONTEXT", 0.9), _result("SECOND_CONTEXT", 0.83)]]
    )
    recorder = _install_orchestration_recorder(monkeypatch)
    _install_generator(
        monkeypatch,
        [_missing_lead_draft(), _missing_lead_draft()],
    )

    graph = build_lead_ranking_graph()
    final_state = await graph.ainvoke(_base_state(store))

    assert final_state["outcome_result"] == "failure"
    assert final_state["http_status"] == 500
    assert final_state["error_code"] == "generation_failed"
    assert final_state["generation_attempts"] == 2
    assert final_state["repair_used"] is True
    assert (
        "include every input lead exactly once"
        in final_state["generation_error_summary"]
    )

    payload = recorder.updated_payloads[-1][1].payload
    assert payload is not None
    assert payload["generation"]["attempts"] == 2
    assert payload["outcome"]["error_code"] == "generation_failed"


def test_render_lead_ranking_is_stable_and_sorted() -> None:
    draft = _valid_draft()
    rendered = render_lead_ranking(draft)

    assert rendered.startswith("Lead Rankings\n")
    assert "Senior Backend Engineer (Score: 9/10)" in rendered
    assert "ML Engineer (Score: 7/10)" in rendered
    assert "Platform Engineer (Score: 5/10)" in rendered
    assert (
        "Aspiration fit: Direct fit with the user's aspiration to grow into senior backend platform roles."
        in rendered
    )

    lines = rendered.split("\n")
    # First entry after header should be highest score
    rank_lines = [line for line in lines if line and line[0].isdigit()]
    assert rank_lines[0].startswith("1. Senior Backend Engineer")
    assert rank_lines[1].startswith("2. ML Engineer")
    assert rank_lines[2].startswith("3. Platform Engineer")

    # Verify stability: rendering twice gives identical output
    rendered2 = render_lead_ranking(draft)
    assert rendered == rendered2
