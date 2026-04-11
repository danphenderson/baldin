from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from uuid import UUID

import pytest
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app import models
from app.api.routes import agents as agents_route
from app.core import conf
from app.core.db import async_engine, drop_and_create_db_and_tables, session_context
from app.main import app
from app.tests import utils

pytestmark = pytest.mark.asyncio(loop_scope="module")

password_helper = PasswordHelper()
_db_ready = False


@asynccontextmanager
async def _client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url=str(conf.settings.BACKEND_CORS_ORIGINS[-1]),
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
            email,
            password_helper.hash(password),
            session,
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
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def _create_agent(
    user_id: UUID,
    *,
    name: str = "Cover Letter Workspace",
    kind: str = "cover_letter",
    instructions: str | None = "Draft a structured workspace session",
    is_enabled: bool = True,
) -> UUID:
    async with session_context() as session:
        agent = models.Agent(
            user_id=user_id,
            name=name,
            kind=kind,
            instructions=instructions,
            is_enabled=is_enabled,
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


async def test_run_agent_creates_new_session_and_pins_application_version(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await _ensure_db_ready()
    monkeypatch.setattr(
        agents_route,
        "generate_cover_letter",
        lambda profile, job, template: (
            "Tailored cover letter draft.\nReview the highlighted fit."
        ),
    )

    async with _client() as client:
        email, user_id = await _create_user("agent-run-create-pass")
        headers = await _auth_headers(client, email, "agent-run-create-pass")
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
    await _ensure_db_ready()
    generated_drafts = iter(
        [
            "First tailored draft for this application.",
            "Second tailored draft with revised emphasis.",
        ]
    )
    monkeypatch.setattr(
        agents_route,
        "generate_cover_letter",
        lambda profile, job, template: next(generated_drafts),
    )

    async with _client() as client:
        email, user_id = await _create_user("agent-run-rerun-pass")
        headers = await _auth_headers(client, email, "agent-run-rerun-pass")
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
    await _ensure_db_ready()

    def _raise_generation_error(profile, job, template):
        raise RuntimeError("LLM unavailable for Story 4 test")

    monkeypatch.setattr(agents_route, "generate_cover_letter", _raise_generation_error)

    async with _client() as client:
        email, user_id = await _create_user("agent-run-fail-pass")
        headers = await _auth_headers(client, email, "agent-run-fail-pass")
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
    await _ensure_db_ready()
    monkeypatch.setattr(
        agents_route,
        "generate_cover_letter",
        lambda profile, job, template: "Draft for session lookup test.",
    )

    async with _client() as client:
        email, user_id = await _create_user("agent-runs-by-doc-pass")
        headers = await _auth_headers(client, email, "agent-runs-by-doc-pass")
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
    await _ensure_db_ready()

    async with _client() as client:
        email, _user_id = await _create_user("agent-runs-by-doc-empty-pass")
        headers = await _auth_headers(client, email, "agent-runs-by-doc-empty-pass")

        lookup_resp = await client.get(
            "/api/v1/agents/runs",
            params={"session_document_id": "00000000-0000-0000-0000-000000000000"},
            headers=headers,
        )

    assert lookup_resp.status_code == 200, lookup_resp.text
    assert lookup_resp.json()["total"] == 0
    assert lookup_resp.json()["items"] == []
