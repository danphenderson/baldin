from __future__ import annotations

from contextlib import asynccontextmanager
from uuid import UUID, uuid4

import pytest
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app import models
from app.core import conf
from app.core.db import async_engine, drop_and_create_db_and_tables, session_context
from app.main import app
from app.tests import utils

pytestmark = pytest.mark.asyncio(loop_scope="module")

password_helper = PasswordHelper()
_db_ready = False


@asynccontextmanager
async def _client() -> AsyncClient:
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


async def _create_lead(user_id: UUID) -> UUID:
    lead_url = f"https://example.com/jobs/{utils.random_lower_string(10)}"

    async with session_context() as session:
        lead = models.Lead(
            url=lead_url,
            canonical_url=lead_url,
            title="Platform Engineer",
            description="Build internal workflow tooling.",
            location="Remote",
        )
        session.add(lead)
        await session.commit()
        return lead.id


async def _create_agent_run_context(user_id: UUID) -> tuple[UUID, UUID]:
    lead_url = f"https://example.com/jobs/{utils.random_lower_string(10)}"

    async with session_context() as session:
        company = models.Company(name=f"Baldin Labs {utils.random_lower_string(6)}")
        lead = models.Lead(
            url=lead_url,
            canonical_url=lead_url,
            title="Platform Engineer",
            description="Build internal tooling for the workspace.",
            location="Remote",
        )
        application = models.Application(
            stage=models.ApplicationStage.APPLIED,
            lead=lead,
            user_id=user_id,
            next_step="Send tailored materials",
        )
        agent = models.Agent(
            user_id=user_id,
            name="Cover Letter Workspace",
            kind="cover_letter",
            instructions="Draft a structured workspace session",
            is_enabled=True,
            configuration={},
        )
        session.add_all([company, lead, application, agent])
        await session.flush()
        session.add(models.LeadXCompany(lead_id=lead.id, company_id=company.id))
        await session.commit()
        return agent.id, application.id


async def _create_agent_chat_context(user_id: UUID) -> tuple[UUID, UUID]:
    async with session_context() as session:
        agent = models.Agent(
            user_id=user_id,
            name="Chat Coach",
            kind="custom",
            instructions="Assist with iterative drafting",
            is_enabled=True,
            configuration={},
        )
        session.add(agent)
        await session.flush()

        chat_session = models.AgentChatSession(
            agent_id=agent.id,
            user_id=user_id,
            status="active",
            message_count=1,
        )
        session.add(chat_session)
        await session.flush()

        session.add(
            models.AgentChatMessage(
                session_id=chat_session.id,
                role="system",
                content="System context",
            )
        )
        await session.commit()
        return agent.id, chat_session.id


async def test_suggest_extractor_returns_503_when_openai_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await _ensure_db_ready()
    monkeypatch.setattr(conf.openai, "API_KEY", "")

    async with _client() as client:
        email, _user_id = await _create_user("suggest-disabled-pass")
        headers = await _auth_headers(client, email, "suggest-disabled-pass")
        response = await client.post(
            "/api/v1/extractors/suggest",
            json={"description": "Extract company data"},
            headers=headers,
        )

    assert response.status_code == 503, response.text
    assert (
        response.json()["detail"]
        == "Extractor suggestion is disabled because OPENAI_API_KEY is not configured."
    )


async def test_extractor_configurables_returns_503_when_openai_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await _ensure_db_ready()
    monkeypatch.setattr(conf.openai, "API_KEY", "")

    async with _client() as client:
        email, _user_id = await _create_user("config-disabled-pass")
        headers = await _auth_headers(client, email, "config-disabled-pass")
        response = await client.get("/api/v1/extractors/configurables", headers=headers)

    assert response.status_code == 503, response.text
    assert (
        response.json()["detail"]
        == "Extractor configuration is disabled because OPENAI_API_KEY is not configured."
    )


async def test_generate_document_returns_503_when_openai_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await _ensure_db_ready()
    monkeypatch.setattr(conf.openai, "API_KEY", "")

    async with _client() as client:
        email, user_id = await _create_user("generate-disabled-pass")
        headers = await _auth_headers(client, email, "generate-disabled-pass")
        lead_id = await _create_lead(user_id)
        response = await client.post(
            "/api/v1/documents/generate",
            json={"kind": "resume", "lead_id": str(lead_id)},
            headers=headers,
        )

    assert response.status_code == 503, response.text
    assert (
        response.json()["detail"]
        == "Document generation is disabled because OPENAI_API_KEY is not configured."
    )


async def test_document_search_returns_503_when_openai_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await _ensure_db_ready()
    monkeypatch.setattr(conf.openai, "API_KEY", "")

    async with _client() as client:
        email, _user_id = await _create_user("search-disabled-pass")
        headers = await _auth_headers(client, email, "search-disabled-pass")
        response = await client.post(
            "/api/v1/documents/search",
            json={"query": "platform engineering", "k": 5},
            headers=headers,
        )

    assert response.status_code == 503, response.text
    assert (
        response.json()["detail"]
        == "Document semantic search is disabled because OPENAI_API_KEY is not configured."
    )


async def test_embed_document_returns_503_when_openai_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await _ensure_db_ready()
    monkeypatch.setattr(conf.openai, "API_KEY", "")

    async with _client() as client:
        email, _user_id = await _create_user("embed-disabled-pass")
        headers = await _auth_headers(client, email, "embed-disabled-pass")
        response = await client.post(
            f"/api/v1/documents/{uuid4()}/embed",
            json={},
            headers=headers,
        )

    assert response.status_code == 503, response.text
    assert (
        response.json()["detail"]
        == "Document embeddings is disabled because OPENAI_API_KEY is not configured."
    )


async def test_enrich_lead_returns_503_when_openai_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await _ensure_db_ready()
    monkeypatch.setattr(conf.openai, "API_KEY", "")

    async with _client() as client:
        email, _user_id = await _create_user("rag-disabled-pass")
        headers = await _auth_headers(client, email, "rag-disabled-pass")
        response = await client.post(
            "/api/v1/documents/rag/enrich-lead",
            json={"lead_description": "Platform engineering role", "k": 5},
            headers=headers,
        )

    assert response.status_code == 503, response.text
    assert (
        response.json()["detail"]
        == "Lead enrichment is disabled because OPENAI_API_KEY is not configured."
    )


async def test_summarize_company_returns_503_when_openai_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await _ensure_db_ready()
    monkeypatch.setattr(conf.openai, "API_KEY", "")

    async with _client() as client:
        email, _user_id = await _create_user("summarize-disabled-pass")
        headers = await _auth_headers(client, email, "summarize-disabled-pass")
        response = await client.post(
            "/api/v1/documents/rag/summarize-company",
            json={"url": "https://example.com"},
            headers=headers,
        )

    assert response.status_code == 503, response.text
    assert (
        response.json()["detail"]
        == "Company summarization is disabled because OPENAI_API_KEY is not configured."
    )


async def test_list_agent_models_returns_503_when_openai_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await _ensure_db_ready()
    monkeypatch.setattr(conf.openai, "API_KEY", "")

    async with _client() as client:
        email, _user_id = await _create_user("agent-models-disabled-pass")
        headers = await _auth_headers(client, email, "agent-models-disabled-pass")
        response = await client.get("/api/v1/agents/models", headers=headers)

    assert response.status_code == 503, response.text
    assert (
        response.json()["detail"]
        == "Agent model listing is disabled because OPENAI_API_KEY is not configured."
    )


async def test_run_agent_returns_503_when_openai_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await _ensure_db_ready()
    monkeypatch.setattr(conf.openai, "API_KEY", "")

    async with _client() as client:
        email, user_id = await _create_user("agent-disabled-pass")
        headers = await _auth_headers(client, email, "agent-disabled-pass")
        agent_id, application_id = await _create_agent_run_context(user_id)
        response = await client.post(
            f"/api/v1/agents/{agent_id}/run",
            json={"application_id": str(application_id)},
            headers=headers,
        )

    assert response.status_code == 503, response.text
    assert (
        response.json()["detail"]
        == "Agent execution is disabled because OPENAI_API_KEY is not configured."
    )

    async with session_context() as session:
        result = await session.execute(
            select(models.AgentRun)
            .where(models.AgentRun.agent_id == agent_id)
            .order_by(models.AgentRun.created_at.desc(), models.AgentRun.id.desc())
        )
        run = result.scalars().first()

    assert run is not None
    assert run.status == "failed"
    assert (
        run.error_summary
        == "Agent execution is disabled because OPENAI_API_KEY is not configured."
    )


async def test_send_agent_chat_message_returns_503_when_openai_disabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await _ensure_db_ready()
    monkeypatch.setattr(conf.openai, "API_KEY", "")

    async with _client() as client:
        email, user_id = await _create_user("agent-chat-disabled-pass")
        headers = await _auth_headers(client, email, "agent-chat-disabled-pass")
        _agent_id, session_id = await _create_agent_chat_context(user_id)
        response = await client.post(
            f"/api/v1/agents/chat/{session_id}/messages",
            json={"content": "Please help revise this draft"},
            headers={**headers, "Accept": "application/json"},
        )

    assert response.status_code == 503, response.text
    assert (
        response.json()["detail"]
        == "Agent chat is disabled because OPENAI_API_KEY is not configured."
    )

    async with session_context() as session:
        chat_session = await session.get(models.AgentChatSession, session_id)
        result = await session.execute(
            select(models.AgentChatMessage.id).where(
                models.AgentChatMessage.session_id == session_id
            )
        )
        message_ids = result.scalars().all()

    assert chat_session is not None
    assert chat_session.message_count == 1
    assert len(message_ids) == 1
