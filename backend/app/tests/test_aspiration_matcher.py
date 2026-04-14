from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from pydantic import ValidationError
from sqlalchemy import select

from app import models, schemas
from app.conftest import create_user, login_and_get_headers
from app.core import conf
from app.core import orchestration as orchestration_core
from app.core.db import session_context
from app.core.rag import shared as rag_shared
from app.core.rag.match_aspirations import (
    AspirationLeadMatchDraft,
    AspirationMatchDraft,
    AspirationMatchDraftResult,
    build_match_response,
    paginate_matches,
    validate_aspiration_match_draft,
)
from app.core.rag.match_aspirations import (
    lead_requirements as lead_requirements_service,
)
from app.core.rag.match_aspirations import service as match_service
from app.core.rag.shared import NO_CONTEXT_DETAIL, active_rag_event_id


@pytest.fixture(autouse=True)
def _configure_openai(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(conf.openai, "API_KEY", "test-openai-key")


@pytest.fixture(autouse=True)
def _stub_lead_requirement_extraction(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _fake_extract(lead, *, llm_name=None):
        del lead, llm_name
        return None

    monkeypatch.setattr(match_service, "extract_lead_requirements", _fake_extract)


def _request_body(*, aspiration_count: int = 1, verbose: bool = False) -> dict:
    label_suffix = (
        " with platform leadership, internal tooling, cross-functional delivery, "
        "and developer productivity focus"
        if verbose
        else ""
    )
    reason_suffix = (
        " emphasizing backend architecture, orchestration reliability, and "
        "retrieval-heavy product systems"
        if verbose
        else ""
    )
    notes_suffix = (
        " including remote-first teams, mentorship, and measurable execution wins"
        if verbose
        else ""
    )
    aspirations = [
        {
            "client_key": f"draft-{index}",
            "kind": "role" if index == 1 else "company",
            "label": f"Aspiration {index}{label_suffix}",
            "reason": f"Reason {index}{reason_suffix}",
            "notes": f"Notes {index}{notes_suffix}",
            "priority": index,
            "extracted_attributes": {"rank": index},
        }
        for index in range(1, aspiration_count + 1)
    ]
    leads = [
        {
            "id": str(uuid4()),
            "title": (
                "Platform Engineer building internal developer platforms"
                if verbose
                else "Platform Engineer"
            ),
            "description": (
                "Backend systems, workflow tooling, orchestration reliability, "
                "and measurable developer productivity wins"
                if verbose
                else "Backend systems and workflow tooling"
            ),
        },
        {
            "id": str(uuid4()),
            "title": (
                "ML Engineer focused on retrieval and ranking systems"
                if verbose
                else "ML Engineer"
            ),
            "description": (
                "Retrieval ranking systems, applied AI evaluation, and productized "
                "search experiences"
                if verbose
                else "Retrieval ranking systems and applied AI"
            ),
        },
    ]
    return {"aspirations": aspirations, "leads": leads, "k": 5}


def _request_model(
    *,
    aspiration_count: int = 1,
    verbose: bool = False,
) -> schemas.AspirationMatchRequest:
    return schemas.AspirationMatchRequest(
        **_request_body(aspiration_count=aspiration_count, verbose=verbose)
    )


def _draft(*, aspiration_count: int = 1) -> AspirationMatchDraft:
    results = []
    for aspiration_index in range(1, aspiration_count + 1):
        results.append(
            AspirationMatchDraftResult(
                aspiration_index=aspiration_index,
                lead_matches=[
                    AspirationLeadMatchDraft(
                        lead_index=1,
                        match_score=9 - aspiration_index,
                        explanation=(
                            "The user's backend and workflow experience strongly supports "
                            "this aspiration and maps well to the lead."
                        ),
                    ),
                    AspirationLeadMatchDraft(
                        lead_index=2,
                        match_score=6,
                        explanation=(
                            "The lead partially aligns, but the role leans further into "
                            "applied AI than the aspiration requires."
                        ),
                    ),
                ],
            )
        )
    return AspirationMatchDraft(results=results)


def _retrieval_result(chunk_text: str, score: float) -> dict:
    return {
        "id": uuid4(),
        "document_id": uuid4(),
        "document_version_id": uuid4(),
        "chunk_index": 0,
        "chunk_text": chunk_text,
        "score": score,
    }


class _FakeStore:
    def __init__(self, responses: list[dict]) -> None:
        self.responses = responses

    async def similarity_search(self, query: str, *, user_id, k: int = 5) -> list[dict]:
        del query, user_id, k
        return self.responses


class _CapturingStore(_FakeStore):
    def __init__(self, responses: list[dict]) -> None:
        super().__init__(responses)
        self.queries: list[str] = []

    async def similarity_search(self, query: str, *, user_id, k: int = 5) -> list[dict]:
        del user_id, k
        self.queries.append(query)
        return self.responses


class _CrashingStore:
    async def similarity_search(self, query: str, *, user_id, k: int = 5) -> list[dict]:
        del query, user_id, k
        raise RuntimeError("vector store timeout after event creation")


class _OrchestrationRecorder:
    def __init__(self) -> None:
        self.pipeline_definitions: list[dict | None] = []
        self.created_payloads: list[schemas.OrchestrationEventCreate] = []
        self.updated_payloads: list[
            tuple[object, schemas.OrchestrationEventUpdate]
        ] = []

    async def create(
        self,
        payload: schemas.OrchestrationEventCreate,
        db,
    ) -> SimpleNamespace:
        del db
        self.created_payloads.append(payload)
        return SimpleNamespace(id=uuid4())

    async def update(
        self,
        id,
        payload: schemas.OrchestrationEventUpdate,
        db,
        user=None,
    ) -> SimpleNamespace:
        del db, user
        self.updated_payloads.append((id, payload))
        return SimpleNamespace(id=id)

    @property
    def final_status(self) -> str | None:
        if not self.updated_payloads:
            return None
        status = self.updated_payloads[-1][1].status
        return status.value if hasattr(status, "value") else status

    @property
    def final_payload(self) -> dict | None:
        if not self.updated_payloads:
            return None
        return self.updated_payloads[-1][1].payload


def _install_orchestration_recorder(
    monkeypatch: pytest.MonkeyPatch,
) -> _OrchestrationRecorder:
    recorder = _OrchestrationRecorder()

    async def _fake_get_or_create_pipeline(
        name: str,
        *,
        db,
        user,
        description: str | None = None,
        definition: dict | None = None,
    ) -> SimpleNamespace:
        del name, db, user, description
        recorder.pipeline_definitions.append(definition)
        return SimpleNamespace(id=uuid4())

    monkeypatch.setattr(
        rag_shared,
        "get_or_create_orchestration_pipeline",
        _fake_get_or_create_pipeline,
    )
    monkeypatch.setattr(rag_shared, "create_orchestration_event", recorder.create)
    monkeypatch.setattr(rag_shared, "update_orchestration_event", recorder.update)
    return recorder


def test_validate_aspiration_match_draft_rejects_invalid_indices() -> None:
    draft = AspirationMatchDraft(
        results=[
            AspirationMatchDraftResult(
                aspiration_index=2,
                lead_matches=[
                    AspirationLeadMatchDraft(
                        lead_index=3,
                        match_score=8,
                        explanation=(
                            "This explanation is long enough to satisfy validation, even "
                            "though both indices are invalid for the request."
                        ),
                    )
                ],
            )
        ]
    )

    with pytest.raises(ValueError, match="aspiration_index values must be within"):
        validate_aspiration_match_draft(draft, aspiration_count=1, lead_count=2)


def test_draft_result_deduplicates_and_sorts_matches() -> None:
    result = AspirationMatchDraftResult(
        aspiration_index=1,
        lead_matches=[
            AspirationLeadMatchDraft(
                lead_index=2,
                match_score=5,
                explanation="This lower score should be replaced once the duplicate higher score arrives in the draft.",
            ),
            AspirationLeadMatchDraft(
                lead_index=1,
                match_score=8,
                explanation="This lead should sort first after deduplication because it ties on score and has the lower index.",
            ),
            AspirationLeadMatchDraft(
                lead_index=2,
                match_score=8,
                explanation="This higher score should replace the earlier duplicate while preserving the correct lead index.",
            ),
        ],
    )

    assert [match.lead_index for match in result.lead_matches] == [1, 2]
    assert [match.match_score for match in result.lead_matches] == [8, 8]


def test_paginate_matches_returns_requested_slice() -> None:
    matches = [
        AspirationLeadMatchDraft(
            lead_index=1,
            match_score=9,
            explanation="This first explanation is long enough to satisfy validation for the pagination helper test.",
        ),
        AspirationLeadMatchDraft(
            lead_index=2,
            match_score=7,
            explanation="This second explanation is also long enough to satisfy validation for the pagination helper test.",
        ),
    ]

    paged, total = paginate_matches(matches, page=2, page_size=1)

    assert total == 2
    assert [match.lead_index for match in paged] == [2]


def test_build_match_response_maps_lead_ids_and_echoes_aspiration_fields() -> None:
    request = schemas.AspirationMatchRequest(
        aspirations=[
            schemas.AspirationMatchInput(
                client_key="draft-role",
                kind=schemas.AspirationKind.ROLE,
                label="  Staff Engineer  ",
                reason="  Principal IC path  ",
                notes="  Remote-first teams  ",
                priority=2,
                extracted_attributes={"seniority": "staff"},
            )
        ],
        leads=[
            schemas.LeadRankInput(
                id=uuid4(),
                title="Platform Engineer",
                description="Backend systems",
            ),
            schemas.LeadRankInput(
                id=uuid4(),
                title="ML Engineer",
                description="Ranking systems",
            ),
        ],
        page=1,
        page_size=1,
    )

    response = build_match_response(request, _draft())
    result = response.results[0]

    assert result.client_key == "draft-role"
    assert result.label == "Staff Engineer"
    assert result.reason == "Principal IC path"
    assert result.notes == "Remote-first teams"
    assert result.page == 1
    assert result.page_size == 1
    assert result.total == 2
    assert result.lead_matches[0].lead_id == request.leads[0].id


def test_combined_query_includes_extracted_aspiration_attributes_and_lead_requirements() -> (
    None
):
    request = _request_model()

    combined_query = match_service._build_combined_query(
        request,
        lead_requirements=[
            match_service.LeadRequirements(
                required_skills=["Python", "Distributed systems"],
                seniority_level="Senior",
                education_level="BS",
                key_responsibilities=["Own platform reliability"],
            ),
            None,
        ],
    )

    assert "rank" in combined_query
    assert "Python" in combined_query
    assert "Distributed systems" in combined_query
    assert "Senior" in combined_query
    assert "Own platform reliability" in combined_query


def test_format_leads_text_includes_extracted_requirements() -> None:
    leads_text = match_service._format_leads_text(
        _request_model().leads,
        lead_requirements=[
            match_service.LeadRequirements(
                required_skills=["Python"],
                seniority_level="Senior",
                key_responsibilities=["Own platform roadmap"],
            ),
            None,
        ],
    )

    assert "extracted_requirements" in leads_text
    assert "Python" in leads_text
    assert "Senior" in leads_text
    assert "Own platform roadmap" in leads_text


@pytest.mark.asyncio
async def test_match_service_includes_extracted_data_in_query_and_prompt(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _install_orchestration_recorder(monkeypatch)
    request = _request_model()
    request.aspirations[0].extracted_attributes = {"focus": "platform reliability"}
    store = _CapturingStore([_retrieval_result("PROFILE_CONTEXT_ALPHA", 0.88)])
    captured: dict[str, object] = {}

    async def _fake_extract_requirements(lead, *, llm_name=None):
        del llm_name
        if lead.title != "Platform Engineer":
            return None
        return match_service.LeadRequirements(
            required_skills=["Python", "SQL"],
            seniority_level="Staff",
            education_level="Bachelor's",
            key_responsibilities=["Build internal platforms"],
        )

    async def _fake_generator(prompt, variables, schema, *, model_name=None):
        del prompt, schema, model_name
        captured["variables"] = variables
        return _draft()

    monkeypatch.setattr(match_service, "PGVectorStore", lambda db: store)
    monkeypatch.setattr(
        match_service,
        "extract_lead_requirements",
        _fake_extract_requirements,
    )
    monkeypatch.setattr(match_service, "ainvoke_structured_prompt", _fake_generator)

    service = match_service.AspirationMatcherService(object())
    response = await service.match(request, SimpleNamespace(id=uuid4()))

    assert response.results[0].client_key == "draft-1"
    assert "platform reliability" in store.queries[0]
    assert "required_skills" in store.queries[0]
    assert "Python" in store.queries[0]
    assert "platform reliability" in captured["variables"]["aspirations_text"]
    assert "required_skills" in captured["variables"]["leads_text"]
    assert "Build internal platforms" in captured["variables"]["leads_text"]


@pytest.mark.asyncio
async def test_match_service_still_works_without_aspiration_extracted_attributes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _install_orchestration_recorder(monkeypatch)
    captured: dict[str, object] = {}
    request = schemas.AspirationMatchRequest(
        aspirations=[
            schemas.AspirationMatchInput(
                kind=schemas.AspirationKind.ROLE,
                label="Staff Engineer",
                extracted_attributes=None,
            )
        ],
        leads=_request_model().leads,
        k=5,
    )

    class _CapturingStore(_FakeStore):
        async def similarity_search(
            self, query: str, *, user_id, k: int = 5
        ) -> list[dict]:
            captured["query"] = query
            return await super().similarity_search(query, user_id=user_id, k=k)

    async def _fake_generator(prompt, variables, schema, *, model_name=None):
        del prompt, schema, model_name
        captured["variables"] = variables
        return _draft()

    async def _fake_extract_requirements(lead, *, llm_name=None):
        del lead, llm_name
        return match_service.LeadRequirements(required_skills=["Python"])

    monkeypatch.setattr(
        match_service,
        "PGVectorStore",
        lambda db: _CapturingStore([_retrieval_result("PROFILE_CONTEXT_ALPHA", 0.88)]),
    )
    monkeypatch.setattr(match_service, "ainvoke_structured_prompt", _fake_generator)
    monkeypatch.setattr(
        match_service,
        "extract_lead_requirements",
        _fake_extract_requirements,
    )

    service = match_service.AspirationMatcherService(object())
    response = await service.match(request, SimpleNamespace(id=uuid4()))

    assert response.results[0].label == "Staff Engineer"
    assert "Staff Engineer" in str(captured["query"])
    assert "Python" in captured["variables"]["leads_text"]


@pytest.mark.asyncio
async def test_match_service_handles_blank_lead_text_cleanly(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _install_orchestration_recorder(monkeypatch)
    captured: dict[str, object] = {}
    request = schemas.AspirationMatchRequest(
        aspirations=[
            schemas.AspirationMatchInput(
                kind=schemas.AspirationKind.ROLE,
                label="Staff Engineer",
            )
        ],
        leads=[
            schemas.LeadRankInput(
                id=uuid4(),
                title="   ",
                description="   ",
            )
        ],
        k=5,
    )

    class _CapturingStore(_FakeStore):
        async def similarity_search(
            self, query: str, *, user_id, k: int = 5
        ) -> list[dict]:
            captured["query"] = query
            return await super().similarity_search(query, user_id=user_id, k=k)

    async def _fake_generator(prompt, variables, schema, *, model_name=None):
        del prompt, schema, model_name
        captured["variables"] = variables
        return AspirationMatchDraft(
            results=[
                AspirationMatchDraftResult(
                    aspiration_index=1,
                    lead_matches=[
                        AspirationLeadMatchDraft(
                            lead_index=1,
                            match_score=7,
                            explanation=(
                                "The context is still enough to assess this blank lead "
                                "entry without extracted requirements."
                            ),
                        )
                    ],
                )
            ]
        )

    async def _unexpected_run(request: schemas.ExtractorRequest) -> dict:
        del request
        raise AssertionError("blank lead text should not invoke extraction")

    monkeypatch.setattr(
        lead_requirements_service,
        "_run_lead_requirements_extraction",
        _unexpected_run,
    )
    monkeypatch.setattr(
        match_service,
        "PGVectorStore",
        lambda db: _CapturingStore([_retrieval_result("PROFILE_CONTEXT_ALPHA", 0.88)]),
    )
    monkeypatch.setattr(match_service, "ainvoke_structured_prompt", _fake_generator)
    monkeypatch.setattr(
        match_service,
        "extract_lead_requirements",
        lead_requirements_service.extract_lead_requirements,
    )

    service = match_service.AspirationMatcherService(object())
    response = await service.match(request, SimpleNamespace(id=uuid4()))

    assert response.results[0].lead_matches
    assert "extracted_requirements" not in captured["variables"]["leads_text"]


@pytest.mark.asyncio
async def test_match_service_degrades_when_lead_requirement_extraction_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    recorder = _install_orchestration_recorder(monkeypatch)
    captured: dict[str, object] = {}
    request = _request_model()

    async def _failing_extract(lead, *, llm_name=None):
        del lead, llm_name
        raise RuntimeError("extractor unavailable")

    async def _fake_generator(prompt, variables, schema, *, model_name=None):
        del prompt, schema, model_name
        captured["variables"] = variables
        return _draft()

    monkeypatch.setattr(
        match_service,
        "PGVectorStore",
        lambda db: _CapturingStore([_retrieval_result("PROFILE_CONTEXT_ALPHA", 0.88)]),
    )
    monkeypatch.setattr(
        match_service,
        "extract_lead_requirements",
        _failing_extract,
    )
    monkeypatch.setattr(match_service, "ainvoke_structured_prompt", _fake_generator)

    service = match_service.AspirationMatcherService(object())
    response = await service.match(request, SimpleNamespace(id=uuid4()))

    assert response.results[0].lead_matches
    assert recorder.created_payloads
    assert "extracted_requirements" not in captured["variables"]["leads_text"]
    assert recorder.final_status == "success"
    payload = recorder.final_payload
    assert payload is not None
    assert payload["extraction"]["degraded"] is True
    assert payload["extraction"]["failed"] == len(request.leads)
    extraction_trace = next(
        entry
        for entry in payload["trace"]
        if entry["node"] == "extract_lead_requirements"
    )
    assert extraction_trace["status"] == "warning"
    assert "lead_requirements_extraction_degraded" in extraction_trace["warning_codes"]


@pytest.mark.asyncio
async def test_match_service_passes_model_name_to_lead_requirement_extraction(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _install_orchestration_recorder(monkeypatch)
    seen: list[str | None] = []

    async def _capturing_extract(lead, *, llm_name=None):
        del lead
        seen.append(llm_name)
        return None

    async def _fake_generator(prompt, variables, schema, *, model_name=None):
        del prompt, variables, schema, model_name
        return _draft()

    monkeypatch.setattr(
        match_service,
        "PGVectorStore",
        lambda db: _CapturingStore([_retrieval_result("PROFILE_CONTEXT_ALPHA", 0.88)]),
    )
    monkeypatch.setattr(
        match_service,
        "extract_lead_requirements",
        _capturing_extract,
    )
    monkeypatch.setattr(match_service, "ainvoke_structured_prompt", _fake_generator)

    service = match_service.AspirationMatcherService(object())
    await service.match(_request_model(), SimpleNamespace(id=uuid4()))

    assert seen
    assert all(name == conf.openai.COMPLETION_MODEL for name in seen)


def test_match_request_rejects_more_than_max_leads() -> None:
    aspirations = [
        schemas.AspirationMatchInput(
            kind=schemas.AspirationKind.ROLE,
            label="Platform Engineer",
        )
    ]
    leads = [
        schemas.LeadRankInput(
            id=uuid4(),
            title=f"Lead {index}",
            description="Backend platform role",
        )
        for index in range(schemas.MATCH_ASPIRATIONS_MAX_LEADS + 1)
    ]

    with pytest.raises(ValidationError):
        schemas.AspirationMatchRequest(
            aspirations=aspirations,
            leads=leads,
            k=5,
        )


@pytest.mark.asyncio
async def test_match_service_limits_lead_requirement_extraction_concurrency(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _install_orchestration_recorder(monkeypatch)
    request = schemas.AspirationMatchRequest(
        aspirations=[
            schemas.AspirationMatchInput(
                kind=schemas.AspirationKind.ROLE,
                label="Platform Engineer",
            )
        ],
        leads=[
            schemas.LeadRankInput(
                id=uuid4(),
                title=f"Lead {index}",
                description="Backend platform role",
            )
            for index in range(6)
        ],
        k=5,
    )
    active = 0
    max_active = 0

    async def _capturing_extract(lead, *, llm_name=None):
        nonlocal active, max_active
        del lead, llm_name
        active += 1
        max_active = max(max_active, active)
        try:
            await asyncio.sleep(0.01)
        finally:
            active -= 1
        return None

    async def _fake_generator(prompt, variables, schema, *, model_name=None):
        del prompt, variables, schema, model_name
        return AspirationMatchDraft(
            results=[
                AspirationMatchDraftResult(
                    aspiration_index=1,
                    lead_matches=[
                        AspirationLeadMatchDraft(
                            lead_index=index + 1,
                            match_score=7,
                            explanation=(
                                "This explanation is long enough to satisfy validation "
                                "for each lead match in the batch."
                            ),
                        )
                        for index in range(len(request.leads))
                    ],
                )
            ]
        )

    monkeypatch.setattr(conf.settings, "MAX_CONCURRENCY", 2)
    monkeypatch.setattr(
        match_service,
        "PGVectorStore",
        lambda db: _CapturingStore([_retrieval_result("PROFILE_CONTEXT_ALPHA", 0.88)]),
    )
    monkeypatch.setattr(
        match_service,
        "extract_lead_requirements",
        _capturing_extract,
    )
    monkeypatch.setattr(match_service, "ainvoke_structured_prompt", _fake_generator)

    service = match_service.AspirationMatcherService(object())
    response = await service.match(request, SimpleNamespace(id=uuid4()))

    assert response.results[0].lead_matches
    assert max_active <= 2


@pytest.mark.asyncio
async def test_match_service_persists_compact_success_payload(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    recorder = _install_orchestration_recorder(monkeypatch)
    request = _request_model(verbose=True)
    combined_query = match_service._build_combined_query(request)
    draft = _draft()

    async def _fake_generator(prompt, variables, schema, *, model_name=None):
        del prompt, variables, schema, model_name
        return draft

    monkeypatch.setattr(
        match_service,
        "PGVectorStore",
        lambda db: _FakeStore([_retrieval_result("PROFILE_CONTEXT_ALPHA", 0.88)]),
    )
    monkeypatch.setattr(match_service, "ainvoke_structured_prompt", _fake_generator)

    service = match_service.AspirationMatcherService(object())
    response = await service.match(request, SimpleNamespace(id=uuid4()))

    assert len(combined_query) > 160
    assert response.results[0].client_key == "draft-1"
    assert recorder.pipeline_definitions == [
        {
            "kind": "service",
            "entrypoint": "aspirations.match",
            "schema_version": 1,
        }
    ]
    assert (
        recorder.created_payloads[0].message
        == "rag.match_aspirations running: initialized"
    )
    assert (
        recorder.created_payloads[0].status
        == schemas.OrchestrationEventStatusType.RUNNING
    )
    assert (
        recorder.updated_payloads[-1][1].status
        == schemas.OrchestrationEventStatusType.SUCCESS
    )

    payload = recorder.updated_payloads[-1][1].payload
    assert payload is not None
    assert payload["kind"] == "rag.aspiration_matching.run"
    assert payload["schema_version"] == 1
    assert payload["request"]["workflow_name"] == "rag.match_aspirations"
    assert payload["input"]["aspiration_count"] == 1
    assert payload["input"]["lead_count"] == 2
    assert payload["retrieval"]["attempts"] == 1
    assert payload["generation"]["attempts"] == 1
    assert payload["generation"]["validator_name"] == "AspirationMatchDraft"
    assert payload["generation"]["repair_used"] is False
    assert payload["outcome"]["result"] == "success"

    serialized_payload = json.dumps(payload, sort_keys=True)
    assert combined_query not in serialized_payload
    assert "PROFILE_CONTEXT_ALPHA" not in serialized_payload
    assert draft.results[0].lead_matches[0].explanation not in serialized_payload


@pytest.mark.asyncio
async def test_match_service_persists_no_context_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    recorder = _install_orchestration_recorder(monkeypatch)

    monkeypatch.setattr(
        match_service,
        "PGVectorStore",
        lambda db: _FakeStore([_retrieval_result("LOW_CONFIDENCE_CONTEXT", 0.2)]),
    )

    service = match_service.AspirationMatcherService(object())
    with pytest.raises(HTTPException) as exc_info:
        await service.match(_request_model(), SimpleNamespace(id=uuid4()))

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == NO_CONTEXT_DETAIL
    assert (
        recorder.updated_payloads[-1][1].status
        == schemas.OrchestrationEventStatusType.FAILED
    )
    payload = recorder.updated_payloads[-1][1].payload
    assert payload["outcome"]["http_status"] == 400
    assert payload["outcome"]["error_code"] == "no_usable_context"
    assert payload["outcome"]["error_summary"] == NO_CONTEXT_DETAIL


@pytest.mark.asyncio
async def test_match_service_persists_generation_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    recorder = _install_orchestration_recorder(monkeypatch)

    async def _failing_generator(prompt, variables, schema, *, model_name=None):
        del prompt, variables, schema, model_name
        raise ValueError("schema mismatch")

    monkeypatch.setattr(
        match_service,
        "PGVectorStore",
        lambda db: _FakeStore([_retrieval_result("PROFILE_CONTEXT_BETA", 0.9)]),
    )
    monkeypatch.setattr(match_service, "ainvoke_structured_prompt", _failing_generator)

    service = match_service.AspirationMatcherService(object())
    with pytest.raises(HTTPException) as exc_info:
        await service.match(_request_model(), SimpleNamespace(id=uuid4()))

    assert exc_info.value.status_code == 500
    assert exc_info.value.detail == "Failed to match aspirations to leads."
    assert (
        recorder.updated_payloads[-1][1].status
        == schemas.OrchestrationEventStatusType.FAILED
    )
    payload = recorder.updated_payloads[-1][1].payload
    assert payload["outcome"]["http_status"] == 500
    assert payload["outcome"]["error_code"] == "generation_failed"
    assert payload["outcome"]["error_summary"] == "schema mismatch"


@pytest.mark.asyncio(loop_scope="module")
async def test_match_route_single_aspiration_supports_pagination(
    monkeypatch: pytest.MonkeyPatch,
    fresh_client: AsyncClient,
) -> None:
    async def _fake_generator(prompt, variables, schema, *, model_name=None):
        del prompt, variables, schema, model_name
        return _draft()

    monkeypatch.setattr(
        match_service,
        "PGVectorStore",
        lambda db: _FakeStore([_retrieval_result("PROFILE_CONTEXT_ALPHA", 0.88)]),
    )
    monkeypatch.setattr(match_service, "ainvoke_structured_prompt", _fake_generator)

    email, _ = await create_user("matcher-paginated-pass")
    headers = await login_and_get_headers(fresh_client, email, "matcher-paginated-pass")
    body = _request_body()
    body.update({"page": 1, "page_size": 1})
    response = await fresh_client.post(
        "/api/v1/aspirations/match",
        json=body,
        headers=headers,
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert len(payload["results"]) == 1
    result = payload["results"][0]
    assert result["total"] == 2
    assert result["page"] == 1
    assert result["page_size"] == 1
    assert len(result["lead_matches"]) == 1
    assert result["client_key"] == "draft-1"

    async with session_context() as session:
        events = (
            (await session.execute(select(models.OrchestrationEvent))).scalars().all()
        )

    assert len(events) == 1
    event = events[0]
    assert event.status == "success"
    assert event.payload["request"]["workflow_name"] == "rag.match_aspirations"
    assert event.payload["request"]["thread_id"] == response.headers["x-request-id"]
    assert event.payload["input"]["aspiration_count"] == 1
    assert event.payload["input"]["lead_count"] == 2
    assert event.payload["retrieval"]["attempts"] == 1
    assert event.payload["generation"]["attempts"] == 1


@pytest.mark.asyncio(loop_scope="module")
async def test_match_route_multi_aspiration_returns_full_results_without_pagination(
    monkeypatch: pytest.MonkeyPatch,
    fresh_client: AsyncClient,
) -> None:
    async def _fake_generator(prompt, variables, schema, *, model_name=None):
        del prompt, variables, schema, model_name
        return _draft(aspiration_count=2)

    monkeypatch.setattr(
        match_service,
        "PGVectorStore",
        lambda db: _FakeStore([_retrieval_result("PROFILE_CONTEXT_BETA", 0.91)]),
    )
    monkeypatch.setattr(match_service, "ainvoke_structured_prompt", _fake_generator)

    email, _ = await create_user("matcher-multi-pass")
    headers = await login_and_get_headers(fresh_client, email, "matcher-multi-pass")
    response = await fresh_client.post(
        "/api/v1/aspirations/match",
        json=_request_body(aspiration_count=2),
        headers=headers,
    )

    assert response.status_code == 200, response.text
    results = response.json()["results"]
    assert [result["client_key"] for result in results] == ["draft-1", "draft-2"]
    assert all(result["page"] == 1 for result in results)
    assert all(result["page_size"] == 2 for result in results)
    assert all(result["total"] == 2 for result in results)
    assert all(len(result["lead_matches"]) == 2 for result in results)


@pytest.mark.asyncio(loop_scope="module")
async def test_match_route_rejects_pagination_with_multiple_aspirations(
    fresh_client: AsyncClient,
) -> None:
    email, _ = await create_user("matcher-invalid-pagination-pass")
    headers = await login_and_get_headers(
        fresh_client, email, "matcher-invalid-pagination-pass"
    )
    body = _request_body(aspiration_count=2)
    body.update({"page": 1, "page_size": 1})
    response = await fresh_client.post(
        "/api/v1/aspirations/match",
        json=body,
        headers=headers,
    )

    assert response.status_code == 400, response.text
    assert (
        response.json()["detail"]
        == "Pagination is only supported when matching a single aspiration."
    )


@pytest.mark.asyncio(loop_scope="module")
async def test_match_route_returns_400_when_no_usable_context(
    monkeypatch: pytest.MonkeyPatch,
    fresh_client: AsyncClient,
) -> None:
    monkeypatch.setattr(
        match_service,
        "PGVectorStore",
        lambda db: _FakeStore([_retrieval_result("LOW_CONFIDENCE_CONTEXT", 0.2)]),
    )

    email, _ = await create_user("matcher-no-context-pass")
    headers = await login_and_get_headers(
        fresh_client, email, "matcher-no-context-pass"
    )
    response = await fresh_client.post(
        "/api/v1/aspirations/match",
        json=_request_body(),
        headers=headers,
    )

    assert response.status_code == 400, response.text
    assert response.json()["detail"] == NO_CONTEXT_DETAIL

    async with session_context() as session:
        events = (
            (await session.execute(select(models.OrchestrationEvent))).scalars().all()
        )

    assert len(events) == 1
    event = events[0]
    assert event.status == "failure"
    assert event.payload["request"]["workflow_name"] == "rag.match_aspirations"
    assert event.payload["outcome"]["result"] == "failure"
    assert event.payload["outcome"]["http_status"] == 400
    assert event.payload["outcome"]["error_code"] == "no_usable_context"


@pytest.mark.asyncio(loop_scope="module")
async def test_match_route_returns_500_when_generation_fails(
    monkeypatch: pytest.MonkeyPatch,
    fresh_client: AsyncClient,
) -> None:
    async def _failing_generator(prompt, variables, schema, *, model_name=None):
        del prompt, variables, schema, model_name
        raise ValueError("schema mismatch")

    monkeypatch.setattr(
        match_service,
        "PGVectorStore",
        lambda db: _FakeStore([_retrieval_result("PROFILE_CONTEXT_GAMMA", 0.84)]),
    )
    monkeypatch.setattr(match_service, "ainvoke_structured_prompt", _failing_generator)

    email, _ = await create_user("matcher-failure-pass")
    headers = await login_and_get_headers(fresh_client, email, "matcher-failure-pass")
    response = await fresh_client.post(
        "/api/v1/aspirations/match",
        json=_request_body(),
        headers=headers,
    )

    assert response.status_code == 500, response.text
    assert response.json()["detail"] == "Failed to match aspirations to leads."

    async with session_context() as session:
        events = (
            (await session.execute(select(models.OrchestrationEvent))).scalars().all()
        )

    assert len(events) == 1
    event = events[0]
    assert event.status == "failure"
    assert event.payload["request"]["workflow_name"] == "rag.match_aspirations"
    assert event.payload["outcome"]["result"] == "failure"
    assert event.payload["outcome"]["http_status"] == 500
    assert event.payload["outcome"]["error_code"] == "generation_failed"


@pytest.mark.asyncio(loop_scope="module")
async def test_match_route_marks_running_event_failed_when_service_crashes(
    monkeypatch: pytest.MonkeyPatch,
    fresh_client: AsyncClient,
) -> None:
    email, user_id = await create_user("matcher-crash-pass")

    async with session_context() as session:
        pipeline = models.OrchestrationPipeline(
            name="rag.match_aspirations",
            description="Service orchestration pipeline for aspiration matching",
            definition={
                "kind": "service",
                "entrypoint": "aspirations.match",
                "schema_version": 1,
            },
            user_id=user_id,
        )
        session.add(pipeline)
        await session.flush()
        event = await orchestration_core.create_orchestration_event(
            schemas.OrchestrationEventCreate(
                message="rag.match_aspirations running: initialized",
                payload={
                    "kind": "rag.aspiration_matching.run",
                    "schema_version": 1,
                    "request": {
                        "thread_id": "synthetic-thread-id",
                        "workflow_name": "rag.match_aspirations",
                        "started_at": datetime(2026, 4, 6, tzinfo=timezone.utc)
                        .isoformat()
                        .replace("+00:00", "Z"),
                    },
                    "trace": [],
                    "outcome": {"result": "running"},
                },
                environment="PYTEST",
                status=schemas.OrchestrationEventStatusType.RUNNING,
                pipeline_id=pipeline.id,
            ),
            session,
        )
        event_id = event.id

        async def _fake_initialize(*args, **kwargs):
            del args, kwargs
            active_rag_event_id.set(str(event_id))
            return {
                "workflow_name": "rag.match_aspirations",
                "thread_id": "synthetic-thread-id",
                "pipeline_id": pipeline.id,
                "event_id": event_id,
                "trace": [],
            }

        created_statuses: list[str] = []
        real_mark_failed = orchestration_core.mark_orchestration_event_failed_if_running

        async def _recording_mark_failed(*args, **kwargs):
            created_statuses.append("failure")
            return await real_mark_failed(*args, **kwargs)

        monkeypatch.setattr(match_service, "shared_initialize_run", _fake_initialize)
        monkeypatch.setattr(match_service, "PGVectorStore", lambda db: _CrashingStore())
        monkeypatch.setattr(
            orchestration_core,
            "mark_orchestration_event_failed_if_running",
            _recording_mark_failed,
        )

    headers = await login_and_get_headers(fresh_client, email, "matcher-crash-pass")
    response = await fresh_client.post(
        "/api/v1/aspirations/match",
        json=_request_body(),
        headers=headers,
    )

    assert response.status_code == 500
    assert response.json() == {"detail": "Failed to match aspirations to leads."}
    assert created_statuses == ["failure"]

    async with session_context() as session:
        refreshed_event = await session.get(models.OrchestrationEvent, event_id)

    assert refreshed_event is not None
    assert refreshed_event.status == "failure"
    assert refreshed_event.payload["outcome"]["result"] == "failure"
    assert refreshed_event.payload["outcome"]["error_code"] == "workflow_exception"
    assert refreshed_event.payload["outcome"]["http_status"] == 500
    assert any(
        entry.get("node") == "workflow_service"
        for entry in refreshed_event.payload.get("trace", [])
    )
