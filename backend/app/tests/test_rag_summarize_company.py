import json
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app import schemas
from app.core.rag import shared as rag_shared
from app.core.rag.summarize_company import nodes
from app.core.rag.summarize_company.graphs import build_company_summarization_graph
from app.core.rag.summarize_company.state import (
    CompanySummaryDraft,
    render_company_summary,
)


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


_SAMPLE_URL = "https://example.com/about"
_SAMPLE_PAGE_TEXT = (
    "Acme Corp builds developer tools for modern infrastructure teams. "
    "Our mission is to simplify cloud-native development and empower "
    "engineering organizations to ship faster. We offer a suite of "
    "observability, deployment automation, and incident management tools."
)


def _base_state() -> dict:
    return {
        "db": object(),
        "user": SimpleNamespace(id=uuid4()),
        "workflow_name": "rag.summarize_company",
        "model_name": "gpt-5.4-nano-2026-03-17",
        "url": _SAMPLE_URL,
    }


def _valid_draft() -> CompanySummaryDraft:
    return CompanySummaryDraft(
        company_name="Acme Corp",
        mission="Acme Corp is focused on simplifying cloud-native development and empowering engineering organizations.",
        products_and_services="The company offers observability, deployment automation, and incident management tools.",
        culture="Remote-first with quarterly team gatherings and a strong open-source contribution culture.",
        recent_news="",
        job_opportunities="Currently hiring for backend and platform engineering roles.",
    )


def _install_orchestration_recorder(
    monkeypatch: pytest.MonkeyPatch,
) -> _OrchestrationRecorder:
    recorder = _OrchestrationRecorder()

    async def _fake_get_or_create_pipeline(*args, **kwargs):
        del args, kwargs
        return SimpleNamespace(id=uuid4(), name="rag.summarize_company")

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
    outcomes: list[CompanySummaryDraft | Exception],
) -> None:
    async def _fake_ainvoke(prompt, variables, schema, *, model_name=None):
        del prompt, variables, model_name
        assert schema is CompanySummaryDraft
        outcome = outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    monkeypatch.setattr(nodes, "ainvoke_structured_prompt", _fake_ainvoke)


def _install_fetcher(
    monkeypatch: pytest.MonkeyPatch,
    page_text: str | Exception,
) -> None:
    async def _fake_extract(url: str) -> str:
        if isinstance(page_text, Exception):
            raise page_text
        return page_text

    monkeypatch.setattr(nodes, "extract_text_from_url", _fake_extract)


@pytest.mark.asyncio
async def test_summarization_graph_succeeds_with_fetched_content(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    recorder = _install_orchestration_recorder(monkeypatch)
    _install_fetcher(monkeypatch, _SAMPLE_PAGE_TEXT)
    _install_generator(monkeypatch, [_valid_draft()])

    graph = build_company_summarization_graph()
    state = _base_state()
    final_state = await graph.ainvoke(state)

    assert final_state["outcome_result"] == "success"
    assert final_state["http_status"] == 200
    assert final_state["generation_attempts"] == 1

    payload = recorder.updated_payloads[-1][1].payload
    assert payload is not None
    assert set(payload) == {
        "kind",
        "schema_version",
        "request",
        "input",
        "fetch",
        "generation",
        "trace",
        "outcome",
    }
    assert "retrieval" not in payload
    assert (
        recorder.created_payloads[0].status
        == schemas.OrchestrationEventStatusType.RUNNING
    )
    assert (
        recorder.updated_payloads[-1][1].status
        == schemas.OrchestrationEventStatusType.SUCCESS
    )
    assert payload["fetch"]["status"] == "success"
    assert payload["fetch"]["fetched_chars"] > 0
    assert payload["generation"]["attempts"] == 1
    assert payload["outcome"]["result"] == "success"
    assert payload["input"]["url"] == _SAMPLE_URL

    serialized_payload = json.dumps(payload, sort_keys=True)
    assert _SAMPLE_PAGE_TEXT not in serialized_payload
    assert final_state["rendered_output"] not in serialized_payload


@pytest.mark.asyncio
async def test_summarization_graph_fails_for_empty_page_text(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    recorder = _install_orchestration_recorder(monkeypatch)
    _install_fetcher(monkeypatch, "")
    _install_generator(monkeypatch, [])

    graph = build_company_summarization_graph()
    final_state = await graph.ainvoke(_base_state())

    assert final_state["outcome_result"] == "failure"
    assert final_state["http_status"] == 400
    assert final_state["error_code"] == "empty_page_text"

    payload = recorder.updated_payloads[-1][1].payload
    assert payload is not None
    assert payload["outcome"]["http_status"] == 400
    assert payload["outcome"]["error_code"] == "empty_page_text"
    assert (
        recorder.updated_payloads[-1][1].status
        == schemas.OrchestrationEventStatusType.FAILED
    )


@pytest.mark.asyncio
async def test_summarization_graph_fails_for_fetch_exception(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    recorder = _install_orchestration_recorder(monkeypatch)
    _install_fetcher(monkeypatch, ConnectionError("DNS resolution failed"))
    _install_generator(monkeypatch, [])

    graph = build_company_summarization_graph()
    final_state = await graph.ainvoke(_base_state())

    assert final_state["outcome_result"] == "failure"
    assert final_state["http_status"] == 400
    assert final_state["error_code"] == "empty_page_text"

    payload = recorder.updated_payloads[-1][1].payload
    assert payload is not None
    assert payload["outcome"]["http_status"] == 400
    assert (
        recorder.updated_payloads[-1][1].status
        == schemas.OrchestrationEventStatusType.FAILED
    )


@pytest.mark.asyncio
async def test_summarization_graph_repairs_once_after_validation_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    recorder = _install_orchestration_recorder(monkeypatch)
    _install_fetcher(monkeypatch, _SAMPLE_PAGE_TEXT)
    _install_generator(
        monkeypatch,
        [ValueError("schema mismatch"), _valid_draft()],
    )

    graph = build_company_summarization_graph()
    final_state = await graph.ainvoke(_base_state())

    assert final_state["outcome_result"] == "success"
    assert final_state["generation_attempts"] == 2
    assert final_state["repair_used"] is True

    payload = recorder.updated_payloads[-1][1].payload
    assert payload is not None
    assert payload["generation"]["attempts"] == 2
    assert payload["generation"]["repair_used"] is True
    assert any(
        entry["node"] == "generate_summary" and entry["status"] == "warning"
        for entry in payload["trace"]
    )
    assert any(
        entry["node"] == "repair_generation" and entry["status"] == "success"
        for entry in payload["trace"]
    )


@pytest.mark.asyncio
async def test_summarization_graph_fails_after_repair_exhausted(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    recorder = _install_orchestration_recorder(monkeypatch)
    _install_fetcher(monkeypatch, _SAMPLE_PAGE_TEXT)
    _install_generator(
        monkeypatch,
        [ValueError("first failure"), ValueError("second failure")],
    )

    graph = build_company_summarization_graph()
    final_state = await graph.ainvoke(_base_state())

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


def test_render_company_summary_omits_empty_optional_sections() -> None:
    # Full draft with all sections populated
    full_draft = CompanySummaryDraft(
        company_name="Acme Corp",
        mission="Acme Corp is focused on simplifying cloud-native development and empowering engineering organizations.",
        products_and_services="The company offers observability, deployment automation, and incident management tools.",
        culture="Remote-first with quarterly team gatherings.",
        recent_news="Just raised a Series B round of funding.",
        job_opportunities="Currently hiring backend engineers.",
    )
    full_rendered = render_company_summary(full_draft)
    assert "Company: Acme Corp" in full_rendered
    assert "Mission" in full_rendered
    assert "Products & Services" in full_rendered
    assert "Culture" in full_rendered
    assert "Recent News" in full_rendered
    assert "Job Opportunities" in full_rendered

    # Minimal draft with only required sections
    minimal_draft = CompanySummaryDraft(
        company_name="Acme Corp",
        mission="Acme Corp is focused on simplifying cloud-native development and empowering engineering organizations.",
        products_and_services="The company offers observability, deployment automation, and incident management tools.",
    )
    minimal_rendered = render_company_summary(minimal_draft)
    assert "Company: Acme Corp" in minimal_rendered
    assert "Mission" in minimal_rendered
    assert "Products & Services" in minimal_rendered
    assert "Culture" not in minimal_rendered
    assert "Recent News" not in minimal_rendered
    assert "Job Opportunities" not in minimal_rendered

    # Verify stability
    assert render_company_summary(full_draft) == full_rendered
    assert render_company_summary(minimal_draft) == minimal_rendered
