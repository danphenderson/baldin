import json
from contextlib import asynccontextmanager
from uuid import UUID, uuid4

import pytest
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app import models, schemas
from app.core import conf
from app.core import orchestration as orchestration_core
from app.core.db import async_engine, drop_and_create_db_and_tables, session_context
from app.core.rag.state import LeadEnrichmentDraft, active_rag_event_id
from app.main import app
from app.tests import utils

password_helper = PasswordHelper()
_db_ready = False


@pytest.fixture(autouse=True)
def _configure_openai_for_documents_rag_tests(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(conf.openai, "API_KEY", "test-openai-key")


@asynccontextmanager
async def _client() -> AsyncClient:
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as client:
        yield client


async def _ensure_db_ready() -> None:
    global _db_ready
    if _db_ready:
        return

    await async_engine.dispose()
    await drop_and_create_db_and_tables()
    app.state.bootstrap_completed = True
    _db_ready = True


async def _create_user(password: str) -> tuple[str, UUID]:
    email = utils.random_email()
    async with session_context() as session:
        user = await utils.create_db_user(
            email, password_helper.hash(password), session
        )
        await session.commit()
    return email, user.id


async def _auth_headers(
    client: AsyncClient,
    email: str,
    password: str,
) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/jwt/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _route_draft() -> LeadEnrichmentDraft:
    return LeadEnrichmentDraft(
        overview=(
            "You are a strong match for the backend, API, and workflow-heavy parts "
            "of this role, with a few areas to sharpen around the employer's domain tools."
        ),
        matching_qualifications=[
            "You already have direct FastAPI and PostgreSQL experience.",
            "Your background shows workflow orchestration and debugging ownership.",
        ],
        gaps_to_address=[
            "The role asks for more explicit AI evaluation evidence than the current context shows.",
        ],
        next_steps=[
            "Tailor your resume toward API design and workflow reliability wins.",
            "Prepare a retrieval debugging example for the interview loop.",
        ],
    )


@pytest.mark.asyncio(loop_scope="module")
async def test_enrich_lead_route_uses_langgraph_and_persists_compact_payload(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await _ensure_db_ready()

    lead_description = (
        "Principal backend role working across FastAPI, PostgreSQL, and AI-assisted "
        "workflow tooling for retrieval-heavy product areas. " * 4
    )
    retrieval_results = [
        {
            "id": uuid4(),
            "document_id": uuid4(),
            "document_version_id": uuid4(),
            "chunk_index": 0,
            "chunk_text": "ROUTE_CONTEXT_ALPHA",
            "score": 0.88,
        },
        {
            "id": uuid4(),
            "document_id": uuid4(),
            "document_version_id": uuid4(),
            "chunk_index": 1,
            "chunk_text": "ROUTE_CONTEXT_BETA",
            "score": 0.82,
        },
    ]
    created_statuses: list[str] = []
    updated_statuses: list[str] = []

    from app.core.rag import nodes as rag_nodes
    from app.core.rag import service as rag_service
    from app.core.rag import shared as rag_shared

    class _FakeVectorStore:
        def __init__(self, db) -> None:
            self.db = db

        async def similarity_search(
            self, query: str, *, user_id, k: int = 5
        ) -> list[dict]:
            del query, user_id, k
            return retrieval_results

    async def _fake_generator(prompt, variables, schema, *, model_name=None):
        del prompt, variables, schema, model_name
        return _route_draft()

    real_create = orchestration_core.create_orchestration_event
    real_update = orchestration_core.update_orchestration_event

    async def _recording_create(payload, db):
        created_statuses.append(payload.status.value)
        return await real_create(payload, db)

    async def _recording_update(id, payload, db, user=None):
        del user
        updated_statuses.append(payload.status.value)
        return await real_update(id, payload, db)

    monkeypatch.setattr(rag_service, "PGVectorStore", _FakeVectorStore)
    monkeypatch.setattr(rag_nodes, "ainvoke_structured_prompt", _fake_generator)
    monkeypatch.setattr(rag_shared, "create_orchestration_event", _recording_create)
    monkeypatch.setattr(rag_shared, "update_orchestration_event", _recording_update)

    async with _client() as client:
        email, _user_id = await _create_user("rag-route-pass")
        headers = await _auth_headers(client, email, "rag-route-pass")
        response = await client.post(
            "/api/v1/documents/rag/enrich-lead",
            json={"lead_description": lead_description, "k": 5},
            headers=headers,
        )

    assert response.status_code == 200, response.text
    assert set(response.json()) == {"enrichment"}
    assert response.headers["x-request-id"]
    assert created_statuses == ["running"]
    assert updated_statuses == ["success"]

    async with session_context() as session:
        result = await session.execute(select(models.OrchestrationEvent))
        events = result.scalars().all()
        assert len(events) == 1
        event = events[0]

    assert event.status == "success"
    payload = event.payload
    assert payload["request"]["thread_id"] == response.headers["x-request-id"]
    assert payload["request"]["workflow_name"] == "rag.enrich_lead"
    assert payload["input"]["requested_k"] == 5
    assert payload["input"]["lead_description_preview"].endswith("...")
    assert payload["retrieval"]["attempts"] == 1
    assert payload["retrieval"]["selected_results"] == 2
    assert payload["generation"]["attempts"] == 1
    assert payload["generation"]["repair_used"] is False
    assert payload["outcome"]["result"] == "success"

    serialized_payload = json.dumps(payload, sort_keys=True)
    assert lead_description not in serialized_payload
    assert "ROUTE_CONTEXT_ALPHA" not in serialized_payload
    assert "ROUTE_CONTEXT_BETA" not in serialized_payload
    assert response.json()["enrichment"] not in serialized_payload


@pytest.mark.asyncio(loop_scope="module")
async def test_enrich_lead_route_persists_terminal_failure_after_repair_attempt(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await _ensure_db_ready()

    retrieval_results = [
        {
            "id": uuid4(),
            "document_id": uuid4(),
            "document_version_id": uuid4(),
            "chunk_index": 0,
            "chunk_text": "FAILURE_CONTEXT_ALPHA",
            "score": 0.86,
        },
        {
            "id": uuid4(),
            "document_id": uuid4(),
            "document_version_id": uuid4(),
            "chunk_index": 1,
            "chunk_text": "FAILURE_CONTEXT_BETA",
            "score": 0.8,
        },
    ]
    created_statuses: list[str] = []
    updated_statuses: list[str] = []
    attempt_counter = {"count": 0}

    from app.core.rag import nodes as rag_nodes
    from app.core.rag import service as rag_service
    from app.core.rag import shared as rag_shared

    class _FakeVectorStore:
        def __init__(self, db) -> None:
            self.db = db

        async def similarity_search(
            self, query: str, *, user_id, k: int = 5
        ) -> list[dict]:
            del query, user_id, k
            return retrieval_results

    async def _failing_generator(prompt, variables, schema, *, model_name=None):
        del prompt, variables, schema, model_name
        attempt_counter["count"] += 1
        raise ValueError(f"structured output failure {attempt_counter['count']}")

    real_create = orchestration_core.create_orchestration_event
    real_update = orchestration_core.update_orchestration_event

    async def _recording_create(payload, db):
        created_statuses.append(payload.status.value)
        return await real_create(payload, db)

    async def _recording_update(id, payload, db, user=None):
        del user
        updated_statuses.append(payload.status.value)
        return await real_update(id, payload, db)

    monkeypatch.setattr(rag_service, "PGVectorStore", _FakeVectorStore)
    monkeypatch.setattr(rag_nodes, "ainvoke_structured_prompt", _failing_generator)
    monkeypatch.setattr(rag_shared, "create_orchestration_event", _recording_create)
    monkeypatch.setattr(rag_shared, "update_orchestration_event", _recording_update)

    async with _client() as client:
        email, _user_id = await _create_user("rag-route-fail-pass")
        headers = await _auth_headers(client, email, "rag-route-fail-pass")
        response = await client.post(
            "/api/v1/documents/rag/enrich-lead",
            json={
                "lead_description": "Backend platform role focused on orchestration and retrieval systems.",
                "k": 5,
            },
            headers=headers,
        )

    assert response.status_code == 500
    assert response.json() == {"detail": "Failed to generate lead enrichment."}
    assert created_statuses == ["running"]
    assert updated_statuses == ["failure"]
    assert attempt_counter["count"] == 2

    async with session_context() as session:
        result = await session.execute(
            select(models.OrchestrationEvent).order_by(
                models.OrchestrationEvent.created_at.desc()
            )
        )
        event = result.scalars().first()

    assert event is not None
    assert event.status == "failure"
    payload = event.payload
    assert payload["generation"]["attempts"] == 2
    assert payload["generation"]["repair_used"] is True
    assert payload["outcome"]["result"] == "failure"
    assert payload["outcome"]["http_status"] == 500
    assert payload["outcome"]["error_code"] == "generation_failed"


@pytest.mark.asyncio(loop_scope="module")
async def test_enrich_lead_route_marks_running_event_failed_when_graph_crashes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await _ensure_db_ready()

    created_statuses: list[str] = []

    async with session_context() as session:
        email, user_id = await _create_user("rag-route-crash-pass")
        user = await session.get(models.User, user_id)
        assert user is not None
        pipeline = await orchestration_core.create_orchestration_pipeline(
            schemas.OrchestrationPipelineCreate(
                name="rag.enrich_lead",
                description="Crash test workflow",
                definition={"kind": "langgraph"},
            ),
            user,
            session,
        )
        event = await orchestration_core.create_orchestration_event(
            schemas.OrchestrationEventCreate(
                message="rag.enrich_lead running: initialized",
                payload={
                    "request": {
                        "thread_id": "synthetic-thread-id",
                        "workflow_name": "rag.enrich_lead",
                        "started_at": "2026-04-06T00:00:00Z",
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

    from app.core.rag import service as rag_service

    class _CrashingGraph:
        async def ainvoke(self, initial_state, config=None):
            del initial_state, config
            active_rag_event_id.set(str(event_id))
            raise RuntimeError("vector store timeout after event creation")

    real_mark_failed = orchestration_core.mark_orchestration_event_failed_if_running

    async def _recording_mark_failed(*args, **kwargs):
        created_statuses.append("failure")
        return await real_mark_failed(*args, **kwargs)

    monkeypatch.setattr(rag_service, "lead_enrichment_graph", _CrashingGraph())
    monkeypatch.setattr(
        orchestration_core,
        "mark_orchestration_event_failed_if_running",
        _recording_mark_failed,
    )

    async with _client() as client:
        headers = await _auth_headers(client, email, "rag-route-crash-pass")
        response = await client.post(
            "/api/v1/documents/rag/enrich-lead",
            json={
                "lead_description": "Backend platform role focused on orchestration reliability.",
                "k": 5,
            },
            headers=headers,
        )

    assert response.status_code == 500
    assert response.json() == {"detail": "Failed to generate lead enrichment."}
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
