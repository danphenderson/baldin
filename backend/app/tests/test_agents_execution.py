from __future__ import annotations

from contextlib import asynccontextmanager
from types import SimpleNamespace
from uuid import UUID

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app import models
from app.api.routes import agents as agents_route
from app.conftest import create_user, login_and_get_headers
from app.core import conf
from app.core.db import session_context
from app.tests import utils

pytestmark = pytest.mark.asyncio(loop_scope="module")

_client = None


@pytest.fixture(autouse=True)
def _configure_openai_for_agent_execution_tests(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(conf.openai, "API_KEY", "test-openai-key")


@pytest.fixture(autouse=True)
def _use_shared_client(client: AsyncClient) -> None:
    """Bridge existing `_client()` call sites onto the shared client fixture."""
    global _client

    @asynccontextmanager
    async def _ctx():
        yield client

    _client = _ctx


async def _create_agent(
    user_id: UUID,
    *,
    name: str = "Cover Letter Workspace",
    kind: str = "cover_letter",
    instructions: str | None = "Draft a structured workspace session",
    is_enabled: bool = True,
    configuration: dict[str, object] | None = None,
) -> UUID:
    async with session_context() as session:
        agent = models.Agent(
            user_id=user_id,
            name=name,
            kind=kind,
            instructions=instructions,
            is_enabled=is_enabled,
            configuration=configuration or {},
        )
        session.add(agent)
        await session.commit()
        return agent.id


async def _create_application_context(user_id: UUID) -> dict[str, UUID]:
    lead_url = f"https://example.com/jobs/{utils.random_lower_string(10)}"

    async with session_context() as session:
        company = models.Company(name=f"Baldin Labs {utils.random_lower_string(6)}")
        lead = models.Lead(
            url=lead_url,
            canonical_url=lead_url,
            title="Platform Engineer",
            description="Build internal tooling for the job-search workspace.",
            location="Remote",
        )
        application = models.Application(
            stage=models.ApplicationStage.APPLIED,
            lead=lead,
            user_id=user_id,
            next_step="Send tailored materials",
        )
        session.add_all([company, lead, application])
        await session.flush()
        session.add(models.LeadXCompany(lead_id=lead.id, company_id=company.id))
        await session.commit()
        return {
            "application_id": application.id,
            "lead_id": lead.id,
            "company_id": company.id,
        }


async def _create_pinned_resume(user_id: UUID, *, content: str) -> dict[str, UUID]:
    async with session_context() as session:
        document = models.Document(
            title="Pinned Resume",
            kind="resume",
            status="active",
            is_pinned=True,
            user_id=user_id,
        )
        session.add(document)
        await session.flush()

        version = models.DocumentVersion(
            document_id=document.id,
            version_number=1,
            name="Pinned Resume v1",
            content=content,
            content_format="plain_text",
        )
        session.add(version)
        await session.flush()

        document.head_version_id = version.id
        await session.commit()
        return {"document_id": document.id, "version_id": version.id}


async def _get_application_link(application_id: UUID, document_id: UUID):
    async with session_context() as session:
        result = await session.execute(
            select(models.DocumentXApplication).where(
                models.DocumentXApplication.application_id == application_id,
                models.DocumentXApplication.document_id == document_id,
            )
        )
        return result.scalars().first()


async def _create_source_document(
    user_id: UUID,
    *,
    title: str = "Editable Surface Source",
    kind: str = "freeform",
    content: str = "Existing surface content.",
    content_format: str = "plain_text",
) -> dict[str, UUID]:
    async with session_context() as session:
        document = models.Document(
            title=title,
            kind=kind,
            status="draft",
            user_id=user_id,
        )
        session.add(document)
        await session.flush()

        version = models.DocumentVersion(
            document_id=document.id,
            version_number=1,
            name="Initial source version",
            content=content,
            content_format=content_format,
        )
        session.add(version)
        await session.flush()

        document.head_version_id = version.id
        await session.commit()
        return {"document_id": document.id, "version_id": version.id}


async def test_run_agent_uses_agent_configured_model(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, object | None] = {}
    resolved_model = object()

    def _get_model(model_name: str | None = None):
        captured["model_name"] = model_name
        return resolved_model

    def _generate_cover_letter(profile, job, template, model=None):
        del profile, job, template
        captured["model"] = model
        return "Tailored cover letter draft."

    monkeypatch.setattr(agents_route.conf.openai, "get_model", _get_model)
    monkeypatch.setattr(agents_route, "generate_cover_letter", _generate_cover_letter)

    async with _client() as client:
        email, user_id = await create_user("agent-run-explicit-model-pass")
        headers = await login_and_get_headers(
            client, email, "agent-run-explicit-model-pass"
        )
        application_context = await _create_application_context(user_id)
        await _create_pinned_resume(
            user_id,
            content="Experience for explicit model routing.",
        )
        agent_id = await _create_agent(
            user_id,
            configuration={"model_name": "gpt-5.4-mini-2026-03-17"},
        )

        response = await client.post(
            f"/api/v1/agents/{agent_id}/run",
            json={"application_id": str(application_context["application_id"])},
            headers=headers,
        )

    assert response.status_code == 201, response.text
    assert captured["model_name"] == "gpt-5.4-mini-2026-03-17"
    assert captured["model"] is resolved_model


async def test_run_agent_defaults_to_completion_model_when_model_name_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, object | None] = {}
    resolved_model = object()

    def _get_model(model_name: str | None = None):
        captured["model_name"] = model_name
        return resolved_model

    def _generate_cover_letter(profile, job, template, model=None):
        del profile, job, template
        captured["model"] = model
        return "Tailored cover letter draft."

    monkeypatch.setattr(agents_route.conf.openai, "get_model", _get_model)
    monkeypatch.setattr(agents_route, "generate_cover_letter", _generate_cover_letter)

    async with _client() as client:
        email, user_id = await create_user("agent-run-default-model-pass")
        headers = await login_and_get_headers(
            client, email, "agent-run-default-model-pass"
        )
        application_context = await _create_application_context(user_id)
        await _create_pinned_resume(
            user_id,
            content="Experience for default model routing.",
        )
        agent_id = await _create_agent(user_id)

        response = await client.post(
            f"/api/v1/agents/{agent_id}/run",
            json={"application_id": str(application_context["application_id"])},
            headers=headers,
        )

    assert response.status_code == 201, response.text
    assert captured["model_name"] == conf.openai.COMPLETION_MODEL
    assert captured["model"] is resolved_model


async def test_run_agent_returns_clear_error_for_invalid_model_name(
    monkeypatch: pytest.MonkeyPatch,
) -> None:

    def _get_model(model_name: str | None = None):
        raise ValueError(
            f"Model {model_name} not found. Supported models: ['gpt-5.4-mini-2026-03-17']"
        )

    def _unexpected_generate_cover_letter(profile, job, template, model=None):
        del profile, job, template, model
        raise AssertionError("generate_cover_letter should not be called")

    monkeypatch.setattr(agents_route.conf.openai, "get_model", _get_model)
    monkeypatch.setattr(
        agents_route, "generate_cover_letter", _unexpected_generate_cover_letter
    )

    async with _client() as client:
        email, user_id = await create_user("agent-run-invalid-model-pass")
        headers = await login_and_get_headers(
            client, email, "agent-run-invalid-model-pass"
        )
        application_context = await _create_application_context(user_id)
        await _create_pinned_resume(
            user_id,
            content="Experience for invalid model handling.",
        )
        agent_id = await _create_agent(
            user_id,
            configuration={"model_name": "does-not-exist"},
        )

        response = await client.post(
            f"/api/v1/agents/{agent_id}/run",
            json={"application_id": str(application_context["application_id"])},
            headers=headers,
        )

    assert response.status_code == 400, response.text
    assert "does-not-exist" in response.json()["detail"]

    async with session_context() as session:
        result = await session.execute(
            select(models.AgentRun)
            .where(models.AgentRun.agent_id == agent_id)
            .order_by(models.AgentRun.created_at.desc(), models.AgentRun.id.desc())
        )
        failed_run = result.scalars().first()

    assert failed_run is not None
    assert failed_run.status == "failed"
    assert "does-not-exist" in (failed_run.error_summary or "")


async def test_run_agent_creates_new_session_and_pins_application_version(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        agents_route,
        "generate_cover_letter",
        lambda profile, job, template, model=None: (
            "Tailored cover letter draft.\nReview the highlighted fit."
        ),
    )

    async with _client() as client:
        email, user_id = await create_user("agent-run-create-pass")
        headers = await login_and_get_headers(client, email, "agent-run-create-pass")
        application_context = await _create_application_context(user_id)
        await _create_pinned_resume(
            user_id,
            content="Platform engineering experience with drafting and iteration.",
        )
        agent_id = await _create_agent(user_id)

        response = await client.post(
            f"/api/v1/agents/{agent_id}/run",
            json={"application_id": str(application_context["application_id"])},
            headers=headers,
        )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["status"] == "completed"
    assert body["session_document_id"] is not None
    assert body["session_version_id"] is not None
    assert body["session_document"]["kind"] == "cell_doc"
    assert body["session_version"]["content_format"] == "tiptap_json"
    assert body["input_context"]["application"]["id"] == str(
        application_context["application_id"]
    )
    assert body["input_context"]["pinned_resume"]["title"] == "Pinned Resume"

    session_document_id = UUID(body["session_document_id"])
    session_version_id = UUID(body["session_version_id"])

    async with session_context() as session:
        document = await session.get(models.Document, session_document_id)
        version = await session.get(models.DocumentVersion, session_version_id)
        root_blocks_result = await session.execute(
            select(models.DocumentBlock)
            .where(
                models.DocumentBlock.document_id == session_document_id,
                models.DocumentBlock.parent_block_id.is_(None),
            )
            .order_by(
                models.DocumentBlock.position.asc(), models.DocumentBlock.id.asc()
            )
        )
        root_blocks = root_blocks_result.scalars().all()

    assert document is not None
    assert document.kind == "cell_doc"
    assert document.head_version_id == session_version_id
    assert version is not None
    assert version.block_snapshot is not None
    assert [block.block_type for block in root_blocks] == [
        "heading",
        "callout",
        "table",
        "heading",
        "paragraph",
        "heading",
        "task_list",
    ]
    assert all(
        block.properties.get("agent_run_id") == body["id"] for block in root_blocks
    )
    assert root_blocks[2].properties.get("agent_section") == "application_context"

    link = await _get_application_link(
        application_context["application_id"],
        session_document_id,
    )
    assert link is not None
    assert link.version_id == session_version_id


async def test_run_agent_rerun_creates_new_version_and_updates_attachment_pin(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    generated_drafts = iter(
        [
            "First tailored draft for this application.",
            "Second tailored draft with revised emphasis.",
        ]
    )
    monkeypatch.setattr(
        agents_route,
        "generate_cover_letter",
        lambda profile, job, template, model=None: next(generated_drafts),
    )

    async with _client() as client:
        email, user_id = await create_user("agent-run-rerun-pass")
        headers = await login_and_get_headers(client, email, "agent-run-rerun-pass")
        application_context = await _create_application_context(user_id)
        await _create_pinned_resume(
            user_id,
            content="Resume baseline for rerun context.",
        )
        agent_id = await _create_agent(
            user_id, instructions="Revise the workspace draft"
        )

        initial_response = await client.post(
            f"/api/v1/agents/{agent_id}/run",
            json={"application_id": str(application_context["application_id"])},
            headers=headers,
        )
        assert initial_response.status_code == 201, initial_response.text
        initial_body = initial_response.json()

        rerun_response = await client.post(
            f"/api/v1/agents/{agent_id}/run",
            json={
                "application_id": str(application_context["application_id"]),
                "session_document_id": initial_body["session_document_id"],
            },
            headers=headers,
        )

    assert rerun_response.status_code == 201, rerun_response.text
    rerun_body = rerun_response.json()
    assert rerun_body["status"] == "completed"
    assert rerun_body["session_document_id"] == initial_body["session_document_id"]
    assert rerun_body["session_version_id"] != initial_body["session_version_id"]
    assert rerun_body["parent_run_id"] == initial_body["id"]
    assert (
        rerun_body["input_context"]["session"]["document_id"]
        == initial_body["session_document_id"]
    )
    assert rerun_body["input_context"]["session"]["live_block_tree"] != []

    session_document_id = UUID(rerun_body["session_document_id"])
    first_version_id = UUID(initial_body["session_version_id"])
    second_version_id = UUID(rerun_body["session_version_id"])

    async with session_context() as session:
        document = await session.get(models.Document, session_document_id)
        versions_result = await session.execute(
            select(models.DocumentVersion)
            .where(models.DocumentVersion.document_id == session_document_id)
            .order_by(models.DocumentVersion.version_number.asc())
        )
        versions = versions_result.scalars().all()
        first_version = await session.get(models.DocumentVersion, first_version_id)
        second_version = await session.get(models.DocumentVersion, second_version_id)

    assert document is not None
    assert document.head_version_id == second_version_id
    assert len(versions) == 2
    assert first_version is not None
    assert second_version is not None
    assert first_version.block_snapshot is not None
    assert second_version.block_snapshot is not None
    assert (
        first_version.block_snapshot[0]["id"] == second_version.block_snapshot[0]["id"]
    )
    assert (
        first_version.block_snapshot[2]["id"] == second_version.block_snapshot[2]["id"]
    )
    assert (
        first_version.block_snapshot[6]["id"] == second_version.block_snapshot[6]["id"]
    )

    link = await _get_application_link(
        application_context["application_id"],
        session_document_id,
    )
    assert link is not None
    assert link.version_id == second_version_id


async def test_run_agent_persists_failed_run_without_returning_500(
    monkeypatch: pytest.MonkeyPatch,
) -> None:

    def _raise_generation_error(profile, job, template, model=None):
        del profile, job, template, model
        raise RuntimeError("LLM unavailable for Story 4 test")

    monkeypatch.setattr(agents_route, "generate_cover_letter", _raise_generation_error)

    async with _client() as client:
        email, user_id = await create_user("agent-run-fail-pass")
        headers = await login_and_get_headers(client, email, "agent-run-fail-pass")
        application_context = await _create_application_context(user_id)
        await _create_pinned_resume(
            user_id,
            content="Pinned resume for failure-path coverage.",
        )
        agent_id = await _create_agent(user_id)

        response = await client.post(
            f"/api/v1/agents/{agent_id}/run",
            json={"application_id": str(application_context["application_id"])},
            headers=headers,
        )

    assert response.status_code == 502
    assert response.status_code != 500
    assert "LLM unavailable" in response.json()["detail"]

    async with session_context() as session:
        result = await session.execute(
            select(models.AgentRun)
            .where(models.AgentRun.agent_id == agent_id)
            .order_by(models.AgentRun.created_at.desc(), models.AgentRun.id.desc())
        )
        failed_run = result.scalars().first()

    assert failed_run is not None
    assert failed_run.status == "failed"
    assert "LLM unavailable" in (failed_run.error_summary or "")
    assert failed_run.completed_at is not None
    assert failed_run.session_document_id is None
    assert failed_run.session_version_id is None


async def test_list_runs_by_session_document(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GET /agents/runs?session_document_id= returns runs scoped to a session."""
    monkeypatch.setattr(
        agents_route,
        "generate_cover_letter",
        lambda profile, job, template, model=None: "Draft for session lookup test.",
    )

    async with _client() as client:
        email, user_id = await create_user("agent-runs-by-doc-pass")
        headers = await login_and_get_headers(client, email, "agent-runs-by-doc-pass")
        app_ctx = await _create_application_context(user_id)
        await _create_pinned_resume(user_id, content="Resume for lookup test.")
        agent_id = await _create_agent(user_id)

        # Create a session via agent run
        run_resp = await client.post(
            f"/api/v1/agents/{agent_id}/run",
            json={"application_id": str(app_ctx["application_id"])},
            headers=headers,
        )
        assert run_resp.status_code == 201
        run_body = run_resp.json()
        session_doc_id = run_body["session_document_id"]

        # Query runs by session_document_id
        lookup_resp = await client.get(
            "/api/v1/agents/runs",
            params={"session_document_id": session_doc_id},
            headers=headers,
        )

    assert lookup_resp.status_code == 200, lookup_resp.text
    lookup_body = lookup_resp.json()
    assert lookup_body["total"] >= 1
    items = lookup_body["items"]
    assert len(items) >= 1
    assert items[0]["session_document_id"] == session_doc_id
    assert items[0]["agent_id"] == str(agent_id)
    assert items[0]["status"] == "completed"


async def test_list_runs_by_session_document_empty_for_unknown(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """GET /agents/runs?session_document_id= returns empty for a non-matching document."""

    async with _client() as client:
        email, _user_id = await create_user("agent-runs-by-doc-empty-pass")
        headers = await login_and_get_headers(
            client, email, "agent-runs-by-doc-empty-pass"
        )

        lookup_resp = await client.get(
            "/api/v1/agents/runs",
            params={"session_document_id": "00000000-0000-0000-0000-000000000000"},
            headers=headers,
        )

    assert lookup_resp.status_code == 200, lookup_resp.text
    assert lookup_resp.json()["total"] == 0
    assert lookup_resp.json()["items"] == []


async def test_create_agent_surface_run_without_application_context(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        agents_route.conf.openai,
        "get_model",
        lambda model_name=None: SimpleNamespace(
            invoke=lambda messages: SimpleNamespace(
                content="A suggested follow-up paragraph."
            )
        ),
    )

    async with _client() as client:
        email, user_id = await create_user("surface-run-no-app-pass")
        headers = await login_and_get_headers(client, email, "surface-run-no-app-pass")
        agent_id = await _create_agent(
            user_id,
            name="Surface Coach",
            kind="custom",
            instructions="Help refine the active surface.",
        )

        response = await client.post(
            f"/api/v1/agents/{agent_id}/surface-runs",
            json={
                "surface_kind": "multiline_text_field",
                "source_route": "/messages/123",
                "source_field_key": "composer",
                "content_format": "plain_text",
                "surface_content": "Current composer draft.",
                "prompt_text": "Make this clearer.",
                "requested_apply_mode": "append_to_surface",
                "entity_refs": [
                    {
                        "kind": "conversation",
                        "id": "conversation-123",
                        "label": "Hiring manager thread",
                    }
                ],
            },
            headers=headers,
        )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["trigger_kind"] == "surface_mention"
    assert body["status"] == "completed"
    assert body["application_id"] is None
    assert body["source_surface_kind"] == "multiline_text_field"
    assert body["source_field_key"] == "composer"
    assert body["source_route"] == "/messages/123"
    assert body["apply_status"] == "pending"
    assert body["suggested_edit"]["operation"] == "append_to_surface"
    assert body["suggested_edit"]["content_format"] == "plain_text"
    assert body["suggested_edit"]["content"] == "A suggested follow-up paragraph."
    assert body["input_context"]["application"] == {}
    assert (
        body["input_context"]["source"]["surface_content"] == "Current composer draft."
    )
    assert body["input_context"]["source"]["entity_refs"][0]["kind"] == "conversation"


async def test_list_runs_by_source_filters(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        agents_route.conf.openai,
        "get_model",
        lambda model_name=None: SimpleNamespace(
            invoke=lambda messages: SimpleNamespace(content="Suggested edit.")
        ),
    )

    async with _client() as client:
        email, user_id = await create_user("surface-run-filter-pass")
        headers = await login_and_get_headers(client, email, "surface-run-filter-pass")
        agent_id = await _create_agent(user_id, name="Filter Coach", kind="custom")

        first = await client.post(
            f"/api/v1/agents/{agent_id}/surface-runs",
            json={
                "surface_kind": "multiline_text_field",
                "source_route": "/applications/alpha",
                "source_field_key": "notes",
                "content_format": "plain_text",
                "surface_content": "Alpha notes",
                "prompt_text": "Expand this",
                "requested_apply_mode": "append_to_surface",
            },
            headers=headers,
        )
        second = await client.post(
            f"/api/v1/agents/{agent_id}/surface-runs",
            json={
                "surface_kind": "multiline_text_field",
                "source_route": "/applications/beta",
                "source_field_key": "outcome_reason",
                "content_format": "plain_text",
                "surface_content": "Beta notes",
                "prompt_text": "Tighten this",
                "requested_apply_mode": "append_to_surface",
            },
            headers=headers,
        )
        assert first.status_code == 201, first.text
        assert second.status_code == 201, second.text

        lookup = await client.get(
            "/api/v1/agents/runs",
            params={
                "source_route": "/applications/alpha",
                "source_field_key": "notes",
                "apply_status": "pending",
            },
            headers=headers,
        )

    assert lookup.status_code == 200, lookup.text
    body = lookup.json()
    assert body["total"] == 1
    assert body["items"][0]["source_route"] == "/applications/alpha"
    assert body["items"][0]["source_field_key"] == "notes"
    assert body["items"][0]["apply_status"] == "pending"


async def test_apply_agent_surface_run_links_document_version_and_records_activity(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        agents_route.conf.openai,
        "get_model",
        lambda model_name=None: SimpleNamespace(
            invoke=lambda messages: SimpleNamespace(content="Refined paragraph.")
        ),
    )

    async with _client() as client:
        email, user_id = await create_user("surface-run-apply-pass")
        headers = await login_and_get_headers(client, email, "surface-run-apply-pass")
        agent_id = await _create_agent(user_id, name="Apply Coach", kind="custom")
        source_document = await _create_source_document(user_id, content="Draft body.")

        create_response = await client.post(
            f"/api/v1/agents/{agent_id}/surface-runs",
            json={
                "surface_kind": "rich_text_editor",
                "source_route": "/workspace/source-doc",
                "source_document_id": str(source_document["document_id"]),
                "content_format": "plain_text",
                "surface_content": "Draft body.",
                "prompt_text": "Improve the closing paragraph.",
                "requested_apply_mode": "append_to_surface",
                "entity_refs": [
                    {"kind": "document", "id": str(source_document["document_id"])}
                ],
            },
            headers=headers,
        )
        assert create_response.status_code == 201, create_response.text
        run_id = create_response.json()["id"]

        async with session_context() as session:
            version = models.DocumentVersion(
                document_id=source_document["document_id"],
                version_number=2,
                name="Applied version",
                content="Draft body.\nRefined paragraph.",
                content_format="plain_text",
            )
            session.add(version)
            await session.flush()
            document = await session.get(
                models.Document, source_document["document_id"]
            )
            assert document is not None
            document.head_version_id = version.id
            await session.commit()
            applied_version_id = version.id

        apply_response = await client.post(
            f"/api/v1/agents/runs/{run_id}/apply",
            json={
                "session_document_id": str(source_document["document_id"]),
                "session_version_id": str(applied_version_id),
            },
            headers=headers,
        )

    assert apply_response.status_code == 200, apply_response.text
    body = apply_response.json()
    assert body["apply_status"] == "applied"
    assert body["session_document_id"] == str(source_document["document_id"])
    assert body["session_version_id"] == str(applied_version_id)
    assert body["applied_at"] is not None

    async with session_context() as session:
        activity_result = await session.execute(
            select(models.DocumentActivity)
            .where(
                models.DocumentActivity.document_id == source_document["document_id"]
            )
            .order_by(models.DocumentActivity.created_at.asc())
        )
        activities = activity_result.scalars().all()

    activity_types = [activity.activity_type for activity in activities]
    assert "agent_task_requested" in activity_types
    assert "agent_task_applied" in activity_types


async def test_dismiss_agent_surface_run_records_activity(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        agents_route.conf.openai,
        "get_model",
        lambda model_name=None: SimpleNamespace(
            invoke=lambda messages: SimpleNamespace(content="Dismiss me.")
        ),
    )

    async with _client() as client:
        email, user_id = await create_user("surface-run-dismiss-pass")
        headers = await login_and_get_headers(client, email, "surface-run-dismiss-pass")
        agent_id = await _create_agent(user_id, name="Dismiss Coach", kind="custom")
        source_document = await _create_source_document(
            user_id, content="Dismiss source."
        )

        create_response = await client.post(
            f"/api/v1/agents/{agent_id}/surface-runs",
            json={
                "surface_kind": "rich_text_editor",
                "source_route": "/workspace/dismiss-doc",
                "source_document_id": str(source_document["document_id"]),
                "content_format": "plain_text",
                "surface_content": "Dismiss source.",
                "prompt_text": "Suggest an alternate closing.",
                "requested_apply_mode": "append_to_surface",
            },
            headers=headers,
        )
        assert create_response.status_code == 201, create_response.text

        dismiss_response = await client.post(
            f"/api/v1/agents/runs/{create_response.json()['id']}/dismiss",
            headers=headers,
        )

    assert dismiss_response.status_code == 200, dismiss_response.text
    assert dismiss_response.json()["apply_status"] == "dismissed"

    async with session_context() as session:
        activity_result = await session.execute(
            select(models.DocumentActivity.activity_type).where(
                models.DocumentActivity.document_id == source_document["document_id"]
            )
        )
        activity_types = list(activity_result.scalars())

    assert "agent_task_requested" in activity_types
    assert "agent_task_dismissed" in activity_types
