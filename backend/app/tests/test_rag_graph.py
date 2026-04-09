import json
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app import schemas
from app.core.rag import nodes
from app.core.rag import shared as rag_shared
from app.core.rag.graphs import build_lead_enrichment_graph
from app.core.rag.state import LeadEnrichmentDraft, render_lead_enrichment


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


def _base_state(store: _FakeStore, lead_description: str | None = None) -> dict:
    return {
        "db": object(),
        "store": store,
        "user": SimpleNamespace(id=uuid4()),
        "workflow_name": "rag.enrich_lead",
        "model_name": "gpt-5.4-nano-2026-03-17",
        "lead_description": lead_description
        or (
            "Senior backend role focused on FastAPI, PostgreSQL, and AI-assisted "
            "workflow tooling across retrieval-heavy product surfaces. " * 4
        ),
        "requested_k": 5,
    }


def _valid_draft() -> LeadEnrichmentDraft:
    return LeadEnrichmentDraft(
        overview=(
            "You are a strong match for the backend and API-focused parts of this "
            "role, with a few targeted gaps around the team's domain-specific tools."
        ),
        matching_qualifications=[
            "You already have direct FastAPI and PostgreSQL experience.",
            "Your background shows workflow debugging and automation ownership.",
        ],
        gaps_to_address=[
            "The lead asks for deeper production AI evaluation examples than the context clearly shows.",
        ],
        next_steps=[
            "Tailor your resume toward API design and data-model ownership.",
            "Prepare a concrete orchestration debugging example for interviews.",
        ],
    )


def _install_orchestration_recorder(
    monkeypatch: pytest.MonkeyPatch,
) -> _OrchestrationRecorder:
    recorder = _OrchestrationRecorder()

    async def _fake_get_or_create_pipeline(*args, **kwargs):
        del args, kwargs
        return SimpleNamespace(id=uuid4(), name="rag.enrich_lead")

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
    outcomes: list[LeadEnrichmentDraft | Exception],
) -> None:
    async def _fake_ainvoke(prompt, variables, schema, *, model_name=None):
        del prompt, variables, model_name
        assert schema is LeadEnrichmentDraft
        outcome = outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    monkeypatch.setattr(nodes, "ainvoke_structured_prompt", _fake_ainvoke)


@pytest.mark.asyncio
async def test_lead_enrichment_graph_strong_retrieval_persists_compact_payload(
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

    graph = build_lead_enrichment_graph()
    state = _base_state(store)
    final_state = await graph.ainvoke(state)

    assert final_state["outcome_result"] == "success"
    assert final_state["http_status"] == 200
    assert final_state["generation_attempts"] == 1
    assert store.calls == [
        {
            "query": state["lead_description"],
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
    assert payload["input"]["lead_description_preview"].endswith("...")

    serialized_payload = json.dumps(payload, sort_keys=True)
    assert state["lead_description"] not in serialized_payload
    assert "UNIQUE_CONTEXT_ALPHA" not in serialized_payload
    assert "UNIQUE_CONTEXT_BETA" not in serialized_payload
    assert final_state["rendered_enrichment"] not in serialized_payload
    assert "raw prompt" not in serialized_payload.lower()


@pytest.mark.asyncio
async def test_lead_enrichment_graph_expands_once_for_weak_retrieval(
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

    graph = build_lead_enrichment_graph()
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
async def test_lead_enrichment_graph_fails_when_expanded_retrieval_is_still_thin(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = _FakeStore(
        [
            [_result("WEAK_CONTEXT_ONLY", 0.68)],
            [_result("STILL_THIN_CONTEXT", 0.56)],
        ]
    )
    recorder = _install_orchestration_recorder(monkeypatch)
    _install_generator(monkeypatch, [])

    graph = build_lead_enrichment_graph()
    final_state = await graph.ainvoke(_base_state(store))

    assert final_state["outcome_result"] == "failure"
    assert final_state["http_status"] == 400
    assert final_state["error_code"] == "no_usable_context"

    payload = recorder.updated_payloads[-1][1].payload
    assert payload is not None
    assert payload["retrieval"]["attempts"] == 2
    assert payload["outcome"]["error_code"] == "no_usable_context"
    assert (
        recorder.updated_payloads[-1][1].status
        == schemas.OrchestrationEventStatusType.FAILED
    )


@pytest.mark.asyncio
async def test_lead_enrichment_graph_returns_client_failure_for_empty_retrieval(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = _FakeStore([[]])
    recorder = _install_orchestration_recorder(monkeypatch)
    _install_generator(monkeypatch, [])

    graph = build_lead_enrichment_graph()
    final_state = await graph.ainvoke(_base_state(store))

    assert final_state["outcome_result"] == "failure"
    assert final_state["http_status"] == 400
    assert final_state["error_code"] == "no_usable_context"
    assert final_state["error_summary"] == nodes.NO_CONTEXT_DETAIL

    payload = recorder.updated_payloads[-1][1].payload
    assert payload is not None
    assert payload["outcome"]["http_status"] == 400
    assert payload["outcome"]["error_code"] == "no_usable_context"
    assert (
        recorder.updated_payloads[-1][1].status
        == schemas.OrchestrationEventStatusType.FAILED
    )


@pytest.mark.asyncio
async def test_lead_enrichment_graph_repairs_once_after_validation_failure(
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

    graph = build_lead_enrichment_graph()
    final_state = await graph.ainvoke(_base_state(store))

    assert final_state["outcome_result"] == "success"
    assert final_state["generation_attempts"] == 2
    assert final_state["repair_used"] is True

    payload = recorder.updated_payloads[-1][1].payload
    assert payload is not None
    assert payload["generation"]["attempts"] == 2
    assert payload["generation"]["repair_used"] is True
    assert any(
        entry["node"] == "generate_enrichment" and entry["status"] == "warning"
        for entry in payload["trace"]
    )
    assert any(
        entry["node"] == "repair_generation" and entry["status"] == "success"
        for entry in payload["trace"]
    )


@pytest.mark.asyncio
async def test_lead_enrichment_graph_fails_after_repair_attempt_is_exhausted(
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

    graph = build_lead_enrichment_graph()
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


def test_render_lead_enrichment_is_stable_and_omits_empty_gaps_section() -> None:
    with_gaps = render_lead_enrichment(_valid_draft())
    assert with_gaps.startswith("Overview\n")
    assert "\nMatching Qualifications\n" in with_gaps
    assert "\nGaps To Address\n" in with_gaps
    assert with_gaps.endswith(
        "- Tailor your resume toward API design and data-model ownership.\n"
        "- Prepare a concrete orchestration debugging example for interviews."
    )

    without_gaps = render_lead_enrichment(
        LeadEnrichmentDraft(
            overview=(
                "You have a strong backend match for this role and can position your "
                "workflow and API experience directly against the lead requirements."
            ),
            matching_qualifications=[
                "You already have strong backend API design experience.",
            ],
            gaps_to_address=[],
            next_steps=["Update your resume to foreground the most relevant wins."],
        )
    )
    assert "Gaps To Address" not in without_gaps
    assert without_gaps == (
        "Overview\n"
        "You have a strong backend match for this role and can position your workflow and API experience directly against the lead requirements.\n\n"
        "Matching Qualifications\n"
        "- You already have strong backend API design experience.\n\n"
        "Next Steps\n"
        "- Update your resume to foreground the most relevant wins."
    )
