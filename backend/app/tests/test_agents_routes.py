from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import AsyncGenerator
from uuid import UUID

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


async def _create_user(
    password: str, *, is_superuser: bool = False
) -> tuple[str, UUID]:
    email = utils.random_email()
    async with session_context() as session:
        user = await utils.create_db_user(
            email,
            password_helper.hash(password),
            session,
            is_superuser=is_superuser,
        )
        await session.commit()
    return email, user.id


async def _auth_headers(
    client: AsyncClient, email: str, password: str
) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/jwt/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _agent_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "name": "Cover Letter Workspace",
        "description": "Creates a reusable drafting workspace",
        "kind": "cover_letter",
        "instructions": "Draft a structured workspace session",
        "is_enabled": True,
    }
    payload.update(overrides)
    return payload


async def _create_agent(
    user_id: UUID,
    *,
    name: str,
    kind: str = "cover_letter",
    description: str | None = None,
    instructions: str | None = None,
    is_enabled: bool = True,
    configuration: dict[str, object] | None = None,
) -> UUID:
    async with session_context() as session:
        agent = models.Agent(
            user_id=user_id,
            name=name,
            description=description,
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
        company = models.Company(name=f"Chat Labs {utils.random_lower_string(6)}")
        lead = models.Lead(
            url=lead_url,
            canonical_url=lead_url,
            title="Backend Engineer",
            description="Build agent workflows.",
            location="Remote",
        )
        application = models.Application(
            stage=models.ApplicationStage.INTERVIEW,
            lead=lead,
            user_id=user_id,
            next_step="Prepare follow-up questions",
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


async def _seed_user_profile(user_id: UUID) -> None:
    async with session_context() as session:
        user = await session.get(models.User, user_id)
        assert user is not None
        user.first_name = "Avery"
        user.last_name = "Stone"
        user.headline = "Backend engineer focused on applied AI systems"
        user.bio = "Builds reliable APIs and internal platforms."
        session.add(models.Skill(name="Python", category="backend", user_id=user_id))
        session.add(
            models.Experience(
                title="Senior Engineer",
                company="Baldin",
                description="Built internal tools",
                start_date=datetime(2022, 1, 1, tzinfo=timezone.utc),
                user_id=user_id,
            )
        )
        await session.commit()


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


async def _create_chat_session_with_messages(
    *,
    user_id: UUID,
    agent_id: UUID,
    application_id: UUID | None = None,
    title: str | None = None,
    model_name: str | None = None,
    message_specs: list[tuple[str, str]] | None = None,
) -> UUID:
    message_specs = message_specs or [("system", "System context")]
    base_time = datetime(2026, 4, 1, tzinfo=timezone.utc)

    async with session_context() as session:
        chat_session = models.AgentChatSession(
            agent_id=agent_id,
            user_id=user_id,
            application_id=application_id,
            title=title,
            model_name=model_name,
            status="active",
            message_count=len(message_specs),
            last_message_at=base_time + timedelta(minutes=len(message_specs) - 1),
            created_at=base_time,
            updated_at=base_time + timedelta(minutes=len(message_specs) - 1),
        )
        session.add(chat_session)
        await session.flush()

        for index, (role, content) in enumerate(message_specs):
            timestamp = base_time + timedelta(minutes=index)
            session.add(
                models.AgentChatMessage(
                    session_id=chat_session.id,
                    role=role,
                    content=content,
                    metadata_={"index": index},
                    created_at=timestamp,
                    updated_at=timestamp,
                )
            )

        await session.commit()
        return chat_session.id


async def _seed_agent_run_history(
    user_id: UUID, *, run_count: int = 3
) -> dict[str, object]:
    base_time = datetime(2026, 1, 1, tzinfo=timezone.utc)
    lead_url = f"https://example.com/jobs/{utils.random_lower_string(8)}"

    async with session_context() as session:
        lead = models.Lead(
            url=lead_url,
            canonical_url=lead_url,
            title="Agent History Lead",
        )
        application = models.Application(
            stage=models.ApplicationStage.APPLIED,
            lead=lead,
            user_id=user_id,
        )
        document = models.Document(
            title="Agent Session",
            kind="cell_doc",
            status="draft",
            user_id=user_id,
        )
        agent = models.Agent(
            user_id=user_id,
            name="History Agent",
            description="Captures run history",
            kind="cover_letter",
            instructions="Track session revisions",
        )
        session.add_all([lead, application, document, agent])
        await session.flush()

        run_ids: list[UUID] = []
        version_ids: list[UUID] = []

        for index in range(run_count):
            timestamp = base_time + timedelta(minutes=index)
            version = models.DocumentVersion(
                document_id=document.id,
                version_number=index + 1,
                name=f"Session v{index + 1}",
                content='{"type":"doc","content":[]}',
                content_format="tiptap_json",
                created_at=timestamp,
                updated_at=timestamp,
            )
            session.add(version)
            await session.flush()

            run = models.AgentRun(
                agent_id=agent.id,
                user_id=user_id,
                application_id=application.id,
                status="completed",
                input_context={"iteration": index + 1},
                session_document_id=document.id,
                session_version_id=version.id,
                created_at=timestamp,
                updated_at=timestamp,
                completed_at=timestamp + timedelta(seconds=30),
            )
            session.add(run)
            await session.flush()

            run_ids.append(run.id)
            version_ids.append(version.id)

        document.head_version_id = version_ids[-1]
        await session.commit()

        return {
            "agent_id": agent.id,
            "application_id": application.id,
            "document_id": document.id,
            "run_ids": run_ids,
            "version_ids": version_ids,
        }


async def test_create_agent_returns_201() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        email, user_id = await _create_user("agent-create-pass")
        headers = await _auth_headers(client, email, "agent-create-pass")

        response = await client.post(
            "/api/v1/agents/",
            json=_agent_payload(),
            headers=headers,
        )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Cover Letter Workspace"
    assert body["kind"] == "cover_letter"
    assert body["user_id"] == str(user_id)
    assert body["configuration"] == {}
    assert body["is_enabled"] is True


async def test_list_agents_filters_by_kind_and_owner() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        email, user_id = await _create_user("agent-list-pass")
        headers = await _auth_headers(client, email, "agent-list-pass")
        _, other_user_id = await _create_user("agent-list-other-pass")

        await _create_agent(user_id, name="Cover Agent", kind="cover_letter")
        await _create_agent(user_id, name="Outreach Agent", kind="outreach")
        await _create_agent(
            other_user_id, name="Other Cover Agent", kind="cover_letter"
        )

        list_response = await client.get("/api/v1/agents/", headers=headers)
        filter_response = await client.get(
            "/api/v1/agents/",
            params={"kind": "cover_letter"},
            headers=headers,
        )

    assert list_response.status_code == 200
    list_body = list_response.json()
    assert list_body["total"] == 2
    assert {item["name"] for item in list_body["items"]} == {
        "Cover Agent",
        "Outreach Agent",
    }

    assert filter_response.status_code == 200
    filter_body = filter_response.json()
    assert filter_body["total"] == 1
    assert [item["name"] for item in filter_body["items"]] == ["Cover Agent"]
    assert filter_body["items"][0]["kind"] == "cover_letter"


async def test_list_agent_models_returns_supported_models() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        email, _user_id = await _create_user("agent-models-pass")
        headers = await _auth_headers(client, email, "agent-models-pass")

        response = await client.get("/api/v1/agents/models", headers=headers)

    assert response.status_code == 200
    expected_models = [
        {"name": name, "label": data["description"]}
        for name, data in sorted(conf.openai.SUPPORTED_MODELS.items())
    ]
    assert response.json() == {"models": expected_models}


async def test_get_agent_returns_detail_for_owner() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        email, user_id = await _create_user("agent-detail-pass")
        headers = await _auth_headers(client, email, "agent-detail-pass")
        agent_id = await _create_agent(
            user_id,
            name="Detailed Agent",
            description="Detailed description",
            instructions="Detailed instructions",
            configuration={"tone": "direct"},
        )

        response = await client.get(f"/api/v1/agents/{agent_id}", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(agent_id)
    assert body["name"] == "Detailed Agent"
    assert body["description"] == "Detailed description"
    assert body["instructions"] == "Detailed instructions"
    assert body["configuration"] == {"tone": "direct"}


async def test_agent_routes_reject_cross_user_access() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        owner_email, owner_id = await _create_user("agent-owner-pass")
        viewer_email, _ = await _create_user("agent-viewer-pass")
        await _auth_headers(client, owner_email, "agent-owner-pass")
        viewer_headers = await _auth_headers(client, viewer_email, "agent-viewer-pass")
        seeded = await _seed_agent_run_history(owner_id, run_count=1)
        agent_id = seeded["agent_id"]

        get_response = await client.get(
            f"/api/v1/agents/{agent_id}", headers=viewer_headers
        )
        patch_response = await client.patch(
            f"/api/v1/agents/{agent_id}",
            json={"name": "Unauthorized"},
            headers=viewer_headers,
        )
        delete_response = await client.delete(
            f"/api/v1/agents/{agent_id}",
            headers=viewer_headers,
        )
        runs_response = await client.get(
            f"/api/v1/agents/{agent_id}/runs",
            headers=viewer_headers,
        )

    assert get_response.status_code == 403
    assert patch_response.status_code == 403
    assert delete_response.status_code == 403
    assert runs_response.status_code == 403


async def test_create_agent_chat_session_with_application_context_returns_201() -> None:
    await _ensure_db_ready()
    explicit_model_name = sorted(conf.openai.SUPPORTED_MODELS)[0]

    async with _client() as client:
        email, user_id = await _create_user("agent-chat-create-pass")
        headers = await _auth_headers(client, email, "agent-chat-create-pass")
        application_context = await _create_application_context(user_id)
        await _seed_user_profile(user_id)
        await _create_pinned_resume(
            user_id,
            content="Experienced backend engineer shipping reliable AI features.",
        )
        agent_id = await _create_agent(
            user_id,
            name="Chat Coach",
            kind="custom",
            instructions="Help the user refine professional materials.",
            configuration={"model_name": explicit_model_name},
        )

        response = await client.post(
            f"/api/v1/agents/{agent_id}/chat",
            json={"application_id": str(application_context["application_id"])},
            headers=headers,
        )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["agent_id"] == str(agent_id)
    assert body["application_id"] == str(application_context["application_id"])
    assert body["model_name"] == explicit_model_name
    assert body["status"] == "active"
    assert body["message_count"] == 1
    assert len(body["messages"]) == 1
    assert body["messages"][0]["role"] == "system"
    assert "Agent: Chat Coach" in body["messages"][0]["content"]
    assert "Instructions:" in body["messages"][0]["content"]
    assert "Role: Backend Engineer" in body["messages"][0]["content"]
    assert "Company: Chat Labs" in body["messages"][0]["content"]
    assert "Stage: interview" in body["messages"][0]["content"]
    assert "User Profile:" in body["messages"][0]["content"]
    assert "Avery Stone" in body["messages"][0]["content"]
    assert "Pinned Resume:" in body["messages"][0]["content"]
    assert "Experienced backend engineer" in body["messages"][0]["content"]
    assert body["last_message_at"] is not None


async def test_create_agent_chat_session_without_application_context_returns_201() -> (
    None
):
    await _ensure_db_ready()
    async with _client() as client:
        email, user_id = await _create_user("agent-chat-create-no-app-pass")
        headers = await _auth_headers(client, email, "agent-chat-create-no-app-pass")
        agent_id = await _create_agent(
            user_id,
            name="General Chat Coach",
            kind="custom",
            instructions="Work from whatever context is available.",
        )

        response = await client.post(
            f"/api/v1/agents/{agent_id}/chat",
            json={"title": "Scratchpad"},
            headers=headers,
        )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["application_id"] is None
    assert body["title"] == "Scratchpad"
    assert body["model_name"] == conf.openai.COMPLETION_MODEL
    assert body["message_count"] == 1
    assert "No application context attached." in body["messages"][0]["content"]
    assert "No pinned resume available." in body["messages"][0]["content"]
    assert "No profile summary available." in body["messages"][0]["content"]


async def test_list_agent_chat_sessions_orders_by_last_message_at_desc() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        email, user_id = await _create_user("agent-chat-list-pass")
        headers = await _auth_headers(client, email, "agent-chat-list-pass")
        agent_id = await _create_agent(
            user_id,
            name="Session History Agent",
            kind="custom",
        )

        await _create_chat_session_with_messages(
            user_id=user_id,
            agent_id=agent_id,
            title="Older session",
            message_specs=[
                ("system", "context"),
                ("user", "first"),
            ],
        )
        await _create_chat_session_with_messages(
            user_id=user_id,
            agent_id=agent_id,
            title="Newest session",
            message_specs=[
                ("system", "context"),
                ("user", "first"),
                ("assistant", "second"),
                ("user", "third"),
            ],
        )

        first_page = await client.get(
            f"/api/v1/agents/{agent_id}/chat",
            params={"page": 1, "page_size": 1},
            headers=headers,
        )
        second_page = await client.get(
            f"/api/v1/agents/{agent_id}/chat",
            params={"page": 2, "page_size": 1},
            headers=headers,
        )

    assert first_page.status_code == 200, first_page.text
    assert second_page.status_code == 200, second_page.text

    first_body = first_page.json()
    second_body = second_page.json()
    assert first_body["total"] == 2
    assert first_body["items"][0]["title"] == "Newest session"
    assert first_body["items"][0]["message_count"] == 4
    assert second_body["items"][0]["title"] == "Older session"
    assert second_body["items"][0]["message_count"] == 2


async def test_get_agent_chat_session_returns_recent_messages_with_limit() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        email, user_id = await _create_user("agent-chat-detail-pass")
        headers = await _auth_headers(client, email, "agent-chat-detail-pass")
        agent_id = await _create_agent(
            user_id,
            name="Thread Agent",
            kind="custom",
        )
        session_id = await _create_chat_session_with_messages(
            user_id=user_id,
            agent_id=agent_id,
            title="Thread detail",
            message_specs=[
                ("system", "context"),
                ("user", "draft one"),
                ("assistant", "revision"),
                ("user", "draft two"),
            ],
        )

        response = await client.get(
            f"/api/v1/agents/chat/{session_id}",
            params={"limit": 2},
            headers=headers,
        )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["id"] == str(session_id)
    assert body["message_count"] == 4
    assert [message["role"] for message in body["messages"]] == ["assistant", "user"]
    assert [message["content"] for message in body["messages"]] == [
        "revision",
        "draft two",
    ]


async def test_get_agent_chat_messages_returns_paginated_history_in_ascending_order() -> (
    None
):
    await _ensure_db_ready()
    async with _client() as client:
        email, user_id = await _create_user("agent-chat-messages-pass")
        headers = await _auth_headers(client, email, "agent-chat-messages-pass")
        agent_id = await _create_agent(
            user_id,
            name="History Agent",
            kind="custom",
        )
        session_id = await _create_chat_session_with_messages(
            user_id=user_id,
            agent_id=agent_id,
            title="Paginated history",
            message_specs=[
                ("system", "context"),
                ("user", "first"),
                ("assistant", "second"),
                ("user", "third"),
            ],
        )

        response = await client.get(
            f"/api/v1/agents/chat/{session_id}/messages",
            params={"page": 2, "page_size": 2},
            headers=headers,
        )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["total"] == 4
    assert body["page"] == 2
    assert body["page_size"] == 2
    assert [item["role"] for item in body["items"]] == ["assistant", "user"]
    assert [item["content"] for item in body["items"]] == ["second", "third"]
    assert [item["metadata"]["index"] for item in body["items"]] == [2, 3]


async def test_agent_chat_session_routes_reject_cross_user_access() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        owner_email, owner_id = await _create_user("agent-chat-owner-pass")
        viewer_email, _viewer_id = await _create_user("agent-chat-viewer-pass")
        owner_headers = await _auth_headers(
            client, owner_email, "agent-chat-owner-pass"
        )
        viewer_headers = await _auth_headers(
            client,
            viewer_email,
            "agent-chat-viewer-pass",
        )
        owner_agent_id = await _create_agent(
            owner_id,
            name="Private Chat Agent",
            kind="custom",
        )
        owner_session_id = await _create_chat_session_with_messages(
            user_id=owner_id,
            agent_id=owner_agent_id,
            title="Private thread",
            message_specs=[
                ("system", "context"),
                ("user", "owner-only"),
            ],
        )

        create_response = await client.post(
            f"/api/v1/agents/{owner_agent_id}/chat",
            json={},
            headers=viewer_headers,
        )
        list_response = await client.get(
            f"/api/v1/agents/{owner_agent_id}/chat",
            headers=viewer_headers,
        )
        detail_response = await client.get(
            f"/api/v1/agents/chat/{owner_session_id}",
            headers=viewer_headers,
        )
        messages_response = await client.get(
            f"/api/v1/agents/chat/{owner_session_id}/messages",
            headers=viewer_headers,
        )
        patch_response = await client.patch(
            f"/api/v1/agents/chat/{owner_session_id}",
            json={"title": "Nope"},
            headers=viewer_headers,
        )
        delete_response = await client.delete(
            f"/api/v1/agents/chat/{owner_session_id}",
            headers=viewer_headers,
        )
        owner_readback = await client.get(
            f"/api/v1/agents/chat/{owner_session_id}",
            headers=owner_headers,
        )

    assert create_response.status_code == 403
    assert list_response.status_code == 403
    assert detail_response.status_code == 403
    assert messages_response.status_code == 403
    assert patch_response.status_code == 403
    assert delete_response.status_code == 403
    assert owner_readback.status_code == 200


async def test_update_and_delete_agent_chat_session() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        email, user_id = await _create_user("agent-chat-update-pass")
        headers = await _auth_headers(client, email, "agent-chat-update-pass")
        agent_id = await _create_agent(
            user_id,
            name="Mutable Chat Agent",
            kind="custom",
        )
        session_id = await _create_chat_session_with_messages(
            user_id=user_id,
            agent_id=agent_id,
            title="Needs archive",
            message_specs=[
                ("system", "context"),
                ("user", "archive this"),
            ],
        )

        patch_response = await client.patch(
            f"/api/v1/agents/chat/{session_id}",
            json={"title": "Archived thread", "status": "archived"},
            headers=headers,
        )
        delete_response = await client.delete(
            f"/api/v1/agents/chat/{session_id}",
            headers=headers,
        )

    assert patch_response.status_code == 200, patch_response.text
    patch_body = patch_response.json()
    assert patch_body["title"] == "Archived thread"
    assert patch_body["status"] == "archived"
    assert patch_body["message_count"] == 2

    assert delete_response.status_code == 204

    async with session_context() as session:
        deleted_session = await session.get(models.AgentChatSession, session_id)
        remaining_message = await session.execute(
            select(models.AgentChatMessage.id)
            .where(models.AgentChatMessage.session_id == session_id)
            .limit(1)
        )

    assert deleted_session is None
    assert remaining_message.scalar_one_or_none() is None


async def test_update_agent_only_mutates_supported_fields() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        email, user_id = await _create_user("agent-update-pass")
        headers = await _auth_headers(client, email, "agent-update-pass")
        agent_id = await _create_agent(
            user_id,
            name="Update Agent",
            kind="outreach",
            description="Old description",
            instructions="Old instructions",
            configuration={"tone": "formal"},
        )

        response = await client.patch(
            f"/api/v1/agents/{agent_id}",
            json={
                "name": "Updated Agent",
                "description": "New description",
                "instructions": "New instructions",
                "configuration": {"tone": "direct", "sections": ["draft"]},
                "is_enabled": False,
                "kind": "custom",
            },
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Updated Agent"
    assert body["description"] == "New description"
    assert body["instructions"] == "New instructions"
    assert body["configuration"] == {"tone": "direct", "sections": ["draft"]}
    assert body["is_enabled"] is False
    assert body["kind"] == "outreach"


async def test_delete_agent_hard_deletes_when_no_runs_exist() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        email, user_id = await _create_user("agent-delete-pass")
        headers = await _auth_headers(client, email, "agent-delete-pass")
        agent_id = await _create_agent(user_id, name="Delete Me")

        response = await client.delete(f"/api/v1/agents/{agent_id}", headers=headers)

    assert response.status_code == 204

    async with session_context() as session:
        deleted = await session.get(models.Agent, agent_id)

    assert deleted is None


async def test_delete_agent_with_runs_returns_409() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        email, user_id = await _create_user("agent-delete-runs-pass")
        headers = await _auth_headers(client, email, "agent-delete-runs-pass")
        seeded = await _seed_agent_run_history(user_id, run_count=1)
        agent_id = seeded["agent_id"]

        response = await client.delete(f"/api/v1/agents/{agent_id}", headers=headers)

    assert response.status_code == 409
    assert "cannot be deleted" in response.json()["detail"].lower()

    async with session_context() as session:
        agent = await session.get(models.Agent, agent_id)

    assert agent is not None


async def test_get_agent_runs_returns_paginated_history_with_session_metadata() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        email, user_id = await _create_user("agent-runs-pass")
        headers = await _auth_headers(client, email, "agent-runs-pass")
        seeded = await _seed_agent_run_history(user_id, run_count=3)
        agent_id = seeded["agent_id"]
        document_id = seeded["document_id"]

        first_page = await client.get(
            f"/api/v1/agents/{agent_id}/runs",
            params={"page": 1, "page_size": 2},
            headers=headers,
        )
        second_page = await client.get(
            f"/api/v1/agents/{agent_id}/runs",
            params={"page": 2, "page_size": 2},
            headers=headers,
        )

    assert first_page.status_code == 200
    first_body = first_page.json()
    assert first_body["total"] == 3
    assert first_body["page"] == 1
    assert first_body["page_size"] == 2
    assert len(first_body["items"]) == 2
    assert first_body["items"][0]["session_document_id"] == str(document_id)
    assert first_body["items"][0]["session_document"] == {
        "id": str(document_id),
        "title": "Agent Session",
        "kind": "cell_doc",
        "status": "draft",
    }
    assert first_body["items"][0]["session_version"]["version_number"] == 3
    assert first_body["items"][0]["session_version"]["name"] == "Session v3"
    assert first_body["items"][1]["session_version"]["version_number"] == 2

    assert second_page.status_code == 200
    second_body = second_page.json()
    assert second_body["total"] == 3
    assert second_body["page"] == 2
    assert second_body["page_size"] == 2
    assert len(second_body["items"]) == 1
    assert second_body["items"][0]["session_version"]["version_number"] == 1
