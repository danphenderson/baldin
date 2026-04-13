from contextlib import asynccontextmanager
from datetime import datetime
from typing import AsyncGenerator
from uuid import UUID, uuid4

import pytest
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, text

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


async def _auth_headers(
    client: AsyncClient, email: str, password: str
) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/jwt/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def _ensure_db_ready() -> None:
    global _db_ready
    if _db_ready:
        return
    await async_engine.dispose()
    await drop_and_create_db_and_tables()
    app.state.bootstrap_completed = True
    _db_ready = True


async def _create_user(
    password: str,
    *,
    email: str | None = None,
    is_superuser: bool = False,
) -> tuple[str, UUID]:
    email = email or utils.random_email()
    async with session_context() as session:
        user = await utils.create_db_user(
            email,
            password_helper.hash(password),
            session,
            is_superuser=is_superuser,
        )
        await session.commit()
    return email, user.id


async def _update_user(user_id: UUID, **attrs: object) -> None:
    async with session_context() as session:
        user = await session.get(models.User, user_id)
        assert user is not None
        for key, value in attrs.items():
            setattr(user, key, value)
        await session.commit()


def _expected_deleted_records() -> dict[str, int]:
    return {
        "agent_runs": 1,
        "agent_chat_messages": 1,
        "agent_chat_sessions": 1,
        "agents": 1,
        "orchestration_events": 1,
        "extractor_examples": 1,
        "lead_registrations": 1,
        "lead_comments": 1,
        "documents_x_applications": 1,
        "document_embeddings": 1,
        "document_shares": 1,
        "document_activities": 1,
        "document_versions": 1,
        "applications": 1,
        "user_skills": 1,
        "user_experiences": 1,
        "user_education": 1,
        "user_certificates": 1,
        "aspirations": 1,
        "contacts": 1,
        "documents": 1,
        "extractors": 1,
        "orchestration_pipelines": 1,
    }


_DOMAIN_ORDER = (
    "profile",
    "leads",
    "applications",
    "documents",
    "agents",
    "extractors",
    "orchestration",
)

_TABLE_DOMAINS = {
    "agent_runs": {"agents"},
    "agent_chat_messages": {"agents"},
    "agent_chat_sessions": {"agents"},
    "agents": {"agents"},
    "orchestration_events": {"orchestration"},
    "extractor_examples": {"extractors"},
    "lead_registrations": {"leads"},
    "lead_comments": {"leads"},
    "documents_x_applications": {"applications", "documents"},
    "document_embeddings": {"documents"},
    "document_shares": {"documents"},
    "document_activities": {"documents"},
    "document_versions": {"documents"},
    "applications": {"applications"},
    "user_skills": {"profile"},
    "user_experiences": {"profile"},
    "user_education": {"profile"},
    "user_certificates": {"profile"},
    "aspirations": {"profile"},
    "contacts": {"profile"},
    "documents": {"documents"},
    "extractors": {"extractors"},
    "orchestration_pipelines": {"orchestration"},
}


def _expected_domains(*domains: str) -> list[str]:
    if not domains:
        return list(_DOMAIN_ORDER)
    selected = set(domains)
    return [domain for domain in _DOMAIN_ORDER if domain in selected]


def _expected_deleted_records_for_domains(*domains: str) -> dict[str, int]:
    if not domains:
        return _expected_deleted_records()
    selected = set(domains)
    return {
        table_name: count
        for table_name, count in _expected_deleted_records().items()
        if _TABLE_DOMAINS[table_name] & selected
    }


async def _seed_user_data(user_id: UUID) -> dict[str, UUID]:
    async with session_context() as session:
        user = await session.get(models.User, user_id)
        assert user is not None
        user.first_name = "Target"
        user.last_name = "User"
        user.city = "Novigrad"

        lead_url = f"https://example.com/jobs/{utils.random_lower_string(12)}"

        lead = models.Lead(
            url=lead_url,
            canonical_url=utils.app_utils.canonicalize_lead_url(lead_url),
            title="Target Lead",
        )
        skill = models.Skill(name="Python", category="backend", user_id=user_id)
        experience = models.Experience(
            title="Engineer",
            company="Baldin",
            start_date=datetime.now(),
            end_date=datetime.now(),
            description="Built systems",
            user_id=user_id,
        )
        education = models.Education(
            university="Aretuza",
            degree="Magic",
            activities=["alchemy"],
            achievements=["graduated"],
            start_date=datetime.now(),
            end_date=datetime.now(),
            user_id=user_id,
        )
        certificate = models.Certificate(
            title="Admin",
            issuer="Guild",
            issued_date=datetime.now(),
            expiration_date=datetime.now(),
            user_id=user_id,
        )
        aspiration = models.Aspiration(
            user_id=user_id,
            kind="role",
            label="Staff Engineer",
            reason="Core target role",
        )
        contact = models.Contact(
            first_name="Jaskier",
            last_name="Bard",
            email=f"{utils.random_lower_string(8)}@example.com",
            user_id=user_id,
        )
        document = models.Document(
            title="Resume",
            kind="resume",
            status="draft",
            user_id=user_id,
        )
        application = models.Application(
            stage=models.ApplicationStage.APPLIED, lead=lead, user_id=user_id
        )
        lead_comment = models.LeadComment(
            lead=lead,
            author=user,
            content="Target comment",
            anonymous=True,
        )
        extractor = models.Extractor(
            name=f"extractor-{utils.random_lower_string(6)}",
            description="Test extractor",
            user_id=user_id,
        )
        pipeline = models.OrchestrationPipeline(
            name=f"pipeline-{utils.random_lower_string(6)}",
            description="Test pipeline",
            definition={"step": "test"},
            user_id=user_id,
        )
        lead.registrations.append(models.LeadRegistration(user=user))

        session.add_all(
            [
                lead,
                lead_comment,
                skill,
                experience,
                education,
                certificate,
                aspiration,
                contact,
                document,
                application,
                extractor,
                pipeline,
            ]
        )
        await session.flush()

        document_version = models.DocumentVersion(
            document_id=document.id,
            version_number=1,
            name="Resume v1",
            content="Resume content",
            content_format="plain_text",
        )
        session.add(document_version)
        await session.flush()
        document.head_version_id = document_version.id

        agent = models.Agent(
            user_id=user_id,
            name="Cover Letter Workspace",
            description="Draft a tailored session",
            kind="cover_letter",
            instructions="Generate a structured session workspace",
        )
        session.add(agent)
        await session.flush()

        chat_session = models.AgentChatSession(
            agent_id=agent.id,
            user_id=user_id,
            application_id=application.id,
            title="Target session",
            model_name="gpt-5.4-mini",
            message_count=1,
            last_message_at=datetime.now(),
        )
        chat_session.messages.append(
            models.AgentChatMessage(
                role="user",
                content="Need a more polished draft.",
            )
        )
        session.add(chat_session)
        await session.flush()

        extractor_example = models.ExtractorExample(
            content="Input example",
            output={"field": "value"},
            extractor_id=extractor.id,
        )
        orchestration_event = models.OrchestrationEvent(
            message="Started",
            status="pending",
            payload={"step": "test"},
            environment="PYTEST",
            pipeline_id=pipeline.id,
        )
        document_link = models.DocumentXApplication(
            application_id=application.id,
            document_id=document.id,
            version_id=document_version.id,
        )
        document_share = models.DocumentShare(
            document_id=document.id,
            shared_with_user_id=user_id,
            shared_by_user_id=user_id,
            role="editor",
        )
        document_activity = models.DocumentActivity(
            document_id=document.id,
            actor_user_id=user_id,
            activity_type="document_created",
            message="Created document",
            details={},
        )
        document_embedding = models.DocumentEmbedding(
            document_id=document.id,
            document_version_id=document_version.id,
            user_id=user_id,
            chunk_index=0,
            chunk_text="Resume content",
            embedding=[0.0] * 1536,
        )
        agent_run = models.AgentRun(
            agent_id=agent.id,
            user_id=user_id,
            application_id=application.id,
            trigger_kind="manual",
            status="completed",
            input_context={"application_id": str(application.id)},
            session_document_id=document.id,
            session_version_id=document_version.id,
            completed_at=datetime.now(),
        )

        session.add_all(
            [
                extractor_example,
                orchestration_event,
                document_link,
                document_share,
                document_activity,
                document_embedding,
                agent_run,
            ]
        )
        await session.commit()

    return {
        "user_id": user_id,
        "lead_id": lead.id,
        "skill_id": skill.id,
        "experience_id": experience.id,
        "education_id": education.id,
        "certificate_id": certificate.id,
        "aspiration_id": aspiration.id,
        "contact_id": contact.id,
        "document_id": document.id,
        "document_version_id": document_version.id,
        "agent_id": agent.id,
        "agent_run_id": agent_run.id,
        "application_id": application.id,
        "chat_session_id": chat_session.id,
        "chat_message_id": chat_session.messages[0].id,
        "extractor_id": extractor.id,
        "extractor_example_id": extractor_example.id,
        "pipeline_id": pipeline.id,
        "event_id": orchestration_event.id,
    }


async def _seed_unrelated_skill(user_id: UUID) -> UUID:
    async with session_context() as session:
        skill = models.Skill(name="Other Skill", category="other", user_id=user_id)
        session.add(skill)
        await session.commit()
        return skill.id


async def _set_superusers(user_ids: set[UUID]) -> None:
    async with session_context() as session:
        rows = await session.execute(select(models.User))
        for user in rows.scalars().all():
            user.is_superuser = user.id in user_ids
        await session.commit()


async def test_db_management_requires_authentication() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        response = await client.get("/api/v1/db-management/list-tables")

    assert response.status_code == 401


async def test_db_management_rejects_non_superusers() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        password = "user-pass"
        email, _ = await _create_user(password)
        headers = await _auth_headers(client, email, password)
        response = await client.get(
            "/api/v1/db-management/table-details/users", headers=headers
        )

    assert response.status_code == 403


async def test_db_management_cleanup_preview_requires_authentication() -> None:
    await _ensure_db_ready()
    _, target_user_id = await _create_user("target-pass")
    async with _client() as client:
        response = await client.get(
            f"/api/v1/db-management/users/{target_user_id}/cleanup-preview"
        )

    assert response.status_code == 401


async def test_db_management_cleanup_preview_rejects_non_superusers() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        password = "user-pass"
        email, target_user_id = await _create_user(password)
        headers = await _auth_headers(client, email, password)
        response = await client.get(
            f"/api/v1/db-management/users/{target_user_id}/cleanup-preview",
            headers=headers,
        )

    assert response.status_code == 403


async def test_db_management_allows_superusers() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        password = "superuser-pass"
        email, _ = await _create_user(password, is_superuser=True)
        headers = await _auth_headers(client, email, password)
        response = await client.get(
            "/api/v1/db-management/table-details/users", headers=headers
        )

    assert response.status_code == 200
    assert "email" in response.json()


async def test_db_management_cleanup_preview_returns_expected_counts() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        admin_password = "admin-preview-pass"
        admin_email, admin_user_id = await _create_user(
            admin_password,
            email="admin-preview@example.com",
            is_superuser=True,
        )
        _, target_user_id = await _create_user(
            "target-preview-pass",
            email="target-preview@example.com",
        )
        target_data = await _seed_user_data(target_user_id)
        headers = await _auth_headers(client, admin_email, admin_password)
        response = await client.get(
            f"/api/v1/db-management/users/{target_user_id}/cleanup-preview",
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["user_id"] == str(target_user_id)
    assert body["domains"] == _expected_domains()
    assert body["cleared_profile_fields"] == 3
    assert body["deleted_records"] == _expected_deleted_records()
    assert body["delete_allowed"] is True
    assert body["delete_block_reason"] is None
    assert body["purge_allowed"] is True
    assert body["purge_block_reason"] is None

    async with session_context() as session:
        user = await session.get(models.User, target_user_id)
        assert user is not None
        assert user.first_name == "Target"
        assert (
            await session.get(models.Document, target_data["document_id"]) is not None
        )
        assert await session.get(models.User, admin_user_id) is not None


async def test_db_management_cleanup_preview_can_be_scoped_to_profile_domain() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        admin_password = "admin-preview-domain-pass"
        admin_email, _ = await _create_user(
            admin_password,
            email="admin-preview-domain@example.com",
            is_superuser=True,
        )
        _, target_user_id = await _create_user(
            "target-preview-domain-pass",
            email="target-preview-domain@example.com",
        )
        await _seed_user_data(target_user_id)
        headers = await _auth_headers(client, admin_email, admin_password)
        response = await client.get(
            f"/api/v1/db-management/users/{target_user_id}/cleanup-preview",
            headers=headers,
            params={"domains": "profile"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["user_id"] == str(target_user_id)
    assert body["domains"] == _expected_domains("profile")
    assert body["cleared_profile_fields"] == 3
    assert body["deleted_records"] == _expected_deleted_records_for_domains("profile")
    assert body["delete_allowed"] is True
    assert body["delete_block_reason"] is None
    assert body["purge_allowed"] is True
    assert body["purge_block_reason"] is None


async def test_db_management_cleanup_preview_returns_404_for_missing_user() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        admin_password = "admin-preview-404-pass"
        admin_email, _ = await _create_user(
            admin_password,
            email="admin-preview-404@example.com",
            is_superuser=True,
        )
        headers = await _auth_headers(client, admin_email, admin_password)
        response = await client.get(
            f"/api/v1/db-management/users/{uuid4()}/cleanup-preview",
            headers=headers,
        )

    assert response.status_code == 404
    assert response.json() == {"detail": "User not found"}


async def test_db_management_cleanup_preview_blocks_self_delete() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        admin_password = "self-preview-pass"
        admin_email, admin_user_id = await _create_user(
            admin_password,
            email="self-preview@example.com",
            is_superuser=True,
        )
        _, peer_superuser_id = await _create_user(
            "peer-preview-pass",
            email="peer-preview@example.com",
            is_superuser=True,
        )
        await _set_superusers({admin_user_id, peer_superuser_id})
        headers = await _auth_headers(client, admin_email, admin_password)
        response = await client.get(
            f"/api/v1/db-management/users/{admin_user_id}/cleanup-preview",
            headers=headers,
        )

    assert response.status_code == 200
    assert response.json()["domains"] == _expected_domains()
    assert response.json()["delete_allowed"] is False
    assert response.json()["delete_block_reason"] == "self_delete"
    assert response.json()["purge_allowed"] is False
    assert response.json()["purge_block_reason"] == "self_delete"


async def test_db_management_cleanup_preview_blocks_last_remaining_superuser() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        admin_password = "last-preview-pass"
        admin_email, admin_user_id = await _create_user(
            admin_password,
            email="last-preview@example.com",
            is_superuser=True,
        )
        await _set_superusers({admin_user_id})
        headers = await _auth_headers(client, admin_email, admin_password)
        response = await client.get(
            f"/api/v1/db-management/users/{admin_user_id}/cleanup-preview",
            headers=headers,
        )

    assert response.status_code == 200
    assert response.json()["domains"] == _expected_domains()
    assert response.json()["delete_allowed"] is False
    assert response.json()["delete_block_reason"] == "last_remaining_superuser"
    assert response.json()["purge_allowed"] is False
    assert response.json()["purge_block_reason"] == "last_remaining_superuser"


async def test_db_management_list_users_rejects_non_superusers() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        password = "user-list-pass"
        email, _ = await _create_user(password, email="user-list@example.com")
        headers = await _auth_headers(client, email, password)
        response = await client.get("/api/v1/db-management/users", headers=headers)

    assert response.status_code == 403


async def test_db_management_list_users_supports_search_filters_and_pagination() -> (
    None
):
    await _ensure_db_ready()
    async with _client() as client:
        admin_password = "admin-list-pass"
        admin_email, admin_user_id = await _create_user(
            admin_password,
            email="admin.db-management@example.com",
            is_superuser=True,
        )
        _, alice_user_id = await _create_user(
            "alice-list-pass",
            email="alice.db-management@example.com",
        )
        _, inactive_user_id = await _create_user(
            "inactive-list-pass",
            email="inactive.db-management@example.com",
        )
        _, peer_superuser_id = await _create_user(
            "peer-list-pass",
            email="peer-super.db-management@example.com",
            is_superuser=True,
        )
        await _update_user(
            alice_user_id,
            first_name="Alice",
            last_name="Searchable",
        )
        await _update_user(
            inactive_user_id,
            first_name="Ina",
            last_name="Ctive",
            is_active=False,
        )
        headers = await _auth_headers(client, admin_email, admin_password)

        search_response = await client.get(
            "/api/v1/db-management/users",
            headers=headers,
            params={"q": "alice.db-management", "request_count": True},
        )
        inactive_response = await client.get(
            "/api/v1/db-management/users",
            headers=headers,
            params={"is_active": False, "request_count": True},
        )
        superuser_response = await client.get(
            "/api/v1/db-management/users",
            headers=headers,
            params={
                "q": "db-management",
                "is_superuser": True,
                "page_size": 1,
                "request_count": True,
            },
        )

    assert search_response.status_code == 200
    search_body = search_response.json()
    assert search_body["total"] == 1
    assert len(search_body["items"]) == 1
    assert search_body["items"][0]["user_id"] == str(alice_user_id)
    assert search_body["items"][0]["display_name"] == "Alice Searchable"

    assert inactive_response.status_code == 200
    inactive_body = inactive_response.json()
    assert inactive_body["total"] == 1
    assert len(inactive_body["items"]) == 1
    assert inactive_body["items"][0]["user_id"] == str(inactive_user_id)
    assert inactive_body["items"][0]["is_active"] is False

    assert superuser_response.status_code == 200
    superuser_body = superuser_response.json()
    assert superuser_body["total"] == 2
    assert superuser_body["page_size"] == 1
    assert len(superuser_body["items"]) == 1
    assert superuser_body["items"][0]["user_id"] in {
        str(admin_user_id),
        str(peer_superuser_id),
    }


async def test_db_management_status_reports_revisions() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        admin_password = "admin-status-pass"
        admin_email, _ = await _create_user(
            admin_password,
            email="admin-status@example.com",
            is_superuser=True,
        )
        headers = await _auth_headers(client, admin_email, admin_password)
        response = await client.get("/api/v1/db-management/status", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert "current_revision" in body
    assert body["head_revision"] is not None
    assert body["public_table_count"] > 0
    assert body["is_at_head"] == (
        body["current_revision"] == body["head_revision"]
        and body["head_revision"] is not None
    )


async def test_db_management_tables_include_known_table_summaries() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        admin_password = "admin-tables-pass"
        admin_email, _ = await _create_user(
            admin_password,
            email="admin-tables@example.com",
            is_superuser=True,
        )
        headers = await _auth_headers(client, admin_email, admin_password)
        response = await client.get("/api/v1/db-management/tables", headers=headers)

    assert response.status_code == 200
    users_table = next(
        item for item in response.json() if item["table_name"] == "users"
    )
    assert set(users_table.keys()) == {"table_name", "column_count", "row_count"}
    assert users_table["column_count"] > 0
    assert users_table["row_count"] >= 1


async def test_db_management_legacy_list_tables_keeps_public_view_compatibility() -> (
    None
):
    await _ensure_db_ready()
    async with session_context() as session:
        await session.execute(
            text(
                "CREATE OR REPLACE VIEW public.test_db_management_view AS SELECT id FROM users"
            )
        )
        await session.commit()

    async with _client() as client:
        admin_password = "admin-legacy-tables-pass"
        admin_email, _ = await _create_user(
            admin_password,
            email="admin-legacy-tables@example.com",
            is_superuser=True,
        )
        headers = await _auth_headers(client, admin_email, admin_password)
        legacy_response = await client.get(
            "/api/v1/db-management/list-tables",
            headers=headers,
        )
        summary_response = await client.get(
            "/api/v1/db-management/tables",
            headers=headers,
        )

    assert legacy_response.status_code == 200
    assert "test_db_management_view" in legacy_response.json()
    assert summary_response.status_code == 200
    assert all(
        item["table_name"] != "test_db_management_view"
        for item in summary_response.json()
    )


async def test_db_management_table_detail_returns_table_or_404() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        admin_password = "admin-table-detail-pass"
        admin_email, _ = await _create_user(
            admin_password,
            email="admin-table-detail@example.com",
            is_superuser=True,
        )
        headers = await _auth_headers(client, admin_email, admin_password)
        detail_response = await client.get(
            "/api/v1/db-management/tables/users",
            headers=headers,
        )
        missing_response = await client.get(
            "/api/v1/db-management/tables/not_a_real_table",
            headers=headers,
        )

    assert detail_response.status_code == 200
    detail_body = detail_response.json()
    assert set(detail_body.keys()) == {"table_name", "row_count", "columns"}
    assert detail_body["table_name"] == "users"
    assert detail_body["row_count"] >= 1
    email_column = next(
        column for column in detail_body["columns"] if column["name"] == "email"
    )
    assert set(email_column.keys()) == {"name", "data_type", "is_nullable", "default"}

    assert missing_response.status_code == 404
    assert missing_response.json() == {"detail": "Table not found"}


async def test_db_management_purges_user_data_without_deleting_user() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        admin_password = "admin-pass"
        admin_email, _ = await _create_user(admin_password, is_superuser=True)
        _, target_user_id = await _create_user("target-pass")
        _, other_user_id = await _create_user("other-pass")
        target_data = await _seed_user_data(target_user_id)
        other_skill_id = await _seed_unrelated_skill(other_user_id)
        headers = await _auth_headers(client, admin_email, admin_password)
        response = await client.patch(
            f"/api/v1/db-management/users/{target_user_id}/purge",
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["user_id"] == str(target_user_id)
    assert body["user_deleted"] is False
    assert body["domains"] == _expected_domains()
    assert body["cleared_profile_fields"] == 3
    assert body["deleted_records"] == _expected_deleted_records()

    async with session_context() as session:
        user = await session.get(models.User, target_user_id)
        assert user is not None
        assert user.first_name is None
        assert user.last_name is None
        assert user.city is None
        assert await session.get(models.Skill, target_data["skill_id"]) is None
        assert (
            await session.get(models.Experience, target_data["experience_id"]) is None
        )
        assert await session.get(models.Education, target_data["education_id"]) is None
        assert (
            await session.get(models.Certificate, target_data["certificate_id"]) is None
        )
        assert (
            await session.get(models.Aspiration, target_data["aspiration_id"]) is None
        )
        assert await session.get(models.Contact, target_data["contact_id"]) is None
        assert await session.get(models.Document, target_data["document_id"]) is None
        assert (
            await session.get(
                models.DocumentVersion, target_data["document_version_id"]
            )
            is None
        )
        assert (
            await session.get(models.Application, target_data["application_id"]) is None
        )
        assert (
            await session.get(models.AgentChatSession, target_data["chat_session_id"])
            is None
        )
        assert (
            await session.get(models.AgentChatMessage, target_data["chat_message_id"])
            is None
        )
        assert await session.get(models.Extractor, target_data["extractor_id"]) is None
        assert (
            await session.get(
                models.ExtractorExample, target_data["extractor_example_id"]
            )
            is None
        )
        assert (
            await session.get(models.OrchestrationPipeline, target_data["pipeline_id"])
            is None
        )
        assert (
            await session.get(models.OrchestrationEvent, target_data["event_id"])
            is None
        )
        assert await session.get(models.Lead, target_data["lead_id"]) is not None
        lead_registration = await session.execute(
            select(models.LeadRegistration).where(
                models.LeadRegistration.lead_id == target_data["lead_id"],
                models.LeadRegistration.user_id == target_user_id,
            )
        )
        assert lead_registration.scalar_one_or_none() is None
        document_link = await session.execute(
            select(models.DocumentXApplication).where(
                models.DocumentXApplication.application_id
                == target_data["application_id"],
                models.DocumentXApplication.document_id == target_data["document_id"],
            )
        )
        assert document_link.scalar_one_or_none() is None
        assert await session.get(models.Skill, other_skill_id) is not None


async def test_db_management_purges_only_selected_profile_domain() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        admin_password = "admin-profile-purge-pass"
        admin_email, _ = await _create_user(
            admin_password,
            email="admin-profile-purge@example.com",
            is_superuser=True,
        )
        _, target_user_id = await _create_user(
            "target-profile-purge-pass",
            email="target-profile-purge@example.com",
        )
        target_data = await _seed_user_data(target_user_id)
        headers = await _auth_headers(client, admin_email, admin_password)
        response = await client.patch(
            f"/api/v1/db-management/users/{target_user_id}/purge",
            headers=headers,
            params={"domains": "profile"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["user_id"] == str(target_user_id)
    assert body["user_deleted"] is False
    assert body["domains"] == _expected_domains("profile")
    assert body["cleared_profile_fields"] == 3
    assert body["deleted_records"] == _expected_deleted_records_for_domains("profile")

    async with session_context() as session:
        user = await session.get(models.User, target_user_id)
        assert user is not None
        assert user.first_name is None
        assert user.last_name is None
        assert user.city is None
        assert await session.get(models.Skill, target_data["skill_id"]) is None
        assert (
            await session.get(models.Experience, target_data["experience_id"]) is None
        )
        assert await session.get(models.Education, target_data["education_id"]) is None
        assert (
            await session.get(models.Certificate, target_data["certificate_id"]) is None
        )
        assert (
            await session.get(models.Aspiration, target_data["aspiration_id"]) is None
        )
        assert await session.get(models.Contact, target_data["contact_id"]) is None
        assert (
            await session.get(models.Document, target_data["document_id"]) is not None
        )
        assert (
            await session.get(models.Application, target_data["application_id"])
            is not None
        )
        assert (
            await session.get(models.AgentChatSession, target_data["chat_session_id"])
            is not None
        )
        assert (
            await session.get(models.Extractor, target_data["extractor_id"]) is not None
        )
        assert (
            await session.get(models.OrchestrationPipeline, target_data["pipeline_id"])
            is not None
        )


async def test_db_management_deletes_user_and_owned_data() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        admin_password = "delete-admin-pass"
        admin_email, _ = await _create_user(admin_password, is_superuser=True)
        _, target_user_id = await _create_user("delete-target-pass")
        _, other_user_id = await _create_user("delete-other-pass")
        target_data = await _seed_user_data(target_user_id)
        other_skill_id = await _seed_unrelated_skill(other_user_id)
        headers = await _auth_headers(client, admin_email, admin_password)
        response = await client.delete(
            f"/api/v1/db-management/users/{target_user_id}",
            headers=headers,
        )

    assert response.status_code == 200
    body = response.json()
    assert body["user_id"] == str(target_user_id)
    assert body["user_deleted"] is True
    assert body["domains"] == _expected_domains()
    assert body["cleared_profile_fields"] == 0
    assert body["deleted_records"] == _expected_deleted_records()

    async with session_context() as session:
        assert await session.get(models.User, target_user_id) is None
        assert await session.get(models.Skill, target_data["skill_id"]) is None
        assert (
            await session.get(models.Experience, target_data["experience_id"]) is None
        )
        assert await session.get(models.Education, target_data["education_id"]) is None
        assert (
            await session.get(models.Certificate, target_data["certificate_id"]) is None
        )
        assert (
            await session.get(models.Aspiration, target_data["aspiration_id"]) is None
        )
        assert await session.get(models.Contact, target_data["contact_id"]) is None
        assert await session.get(models.Document, target_data["document_id"]) is None
        assert (
            await session.get(
                models.DocumentVersion, target_data["document_version_id"]
            )
            is None
        )
        assert (
            await session.get(models.Application, target_data["application_id"]) is None
        )
        assert (
            await session.get(models.AgentChatSession, target_data["chat_session_id"])
            is None
        )
        assert (
            await session.get(models.AgentChatMessage, target_data["chat_message_id"])
            is None
        )
        assert await session.get(models.Extractor, target_data["extractor_id"]) is None
        assert (
            await session.get(
                models.ExtractorExample, target_data["extractor_example_id"]
            )
            is None
        )
        assert (
            await session.get(models.OrchestrationPipeline, target_data["pipeline_id"])
            is None
        )
        assert (
            await session.get(models.OrchestrationEvent, target_data["event_id"])
            is None
        )
        assert await session.get(models.Lead, target_data["lead_id"]) is not None
        lead_registration = await session.execute(
            select(models.LeadRegistration).where(
                models.LeadRegistration.lead_id == target_data["lead_id"],
                models.LeadRegistration.user_id == target_user_id,
            )
        )
        assert lead_registration.scalar_one_or_none() is None
        assert await session.get(models.Skill, other_skill_id) is not None


async def test_db_management_rejects_full_self_purge_but_allows_scoped_purge() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        admin_password = "self-purge-admin-pass"
        admin_email, admin_user_id = await _create_user(
            admin_password,
            email="self-purge-admin@example.com",
            is_superuser=True,
        )
        _, peer_superuser_id = await _create_user(
            "self-purge-peer-pass",
            email="self-purge-peer@example.com",
            is_superuser=True,
        )
        await _set_superusers({admin_user_id, peer_superuser_id})
        target_data = await _seed_user_data(admin_user_id)
        headers = await _auth_headers(client, admin_email, admin_password)

        blocked_response = await client.patch(
            f"/api/v1/db-management/users/{admin_user_id}/purge",
            headers=headers,
        )
        scoped_response = await client.patch(
            f"/api/v1/db-management/users/{admin_user_id}/purge",
            headers=headers,
            params={"domains": "profile"},
        )

    assert blocked_response.status_code == 409
    assert blocked_response.json() == {
        "detail": (
            "Superusers cannot fully purge their own account. "
            "Use scoped cleanup domains for targeted cleanup."
        )
    }
    assert scoped_response.status_code == 200
    assert scoped_response.json()["domains"] == _expected_domains("profile")
    assert scoped_response.json()[
        "deleted_records"
    ] == _expected_deleted_records_for_domains("profile")

    async with session_context() as session:
        user = await session.get(models.User, admin_user_id)
        assert user is not None
        assert user.is_superuser is True
        assert await session.get(models.Skill, target_data["skill_id"]) is None
        assert (
            await session.get(models.Document, target_data["document_id"]) is not None
        )


async def test_db_management_rejects_current_superuser_deletion() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        admin_password = "self-delete-admin-pass"
        admin_email, admin_user_id = await _create_user(
            admin_password, is_superuser=True
        )
        _, peer_superuser_id = await _create_user(
            "peer-superuser-pass", is_superuser=True
        )
        await _set_superusers({admin_user_id, peer_superuser_id})
        headers = await _auth_headers(client, admin_email, admin_password)
        response = await client.delete(
            f"/api/v1/db-management/users/{admin_user_id}",
            headers=headers,
        )

    assert response.status_code == 409
    assert response.json() == {
        "detail": "Superusers cannot delete their own account.",
    }

    async with session_context() as session:
        assert await session.get(models.User, admin_user_id) is not None


async def test_db_management_rejects_deleting_last_remaining_superuser() -> None:
    await _ensure_db_ready()
    async with _client() as client:
        admin_password = "last-superuser-pass"
        admin_email, admin_user_id = await _create_user(
            admin_password, is_superuser=True
        )
        await _set_superusers({admin_user_id})
        headers = await _auth_headers(client, admin_email, admin_password)
        response = await client.delete(
            f"/api/v1/db-management/users/{admin_user_id}",
            headers=headers,
        )

    assert response.status_code == 409
    assert response.json() == {
        "detail": "Cannot delete the last remaining superuser.",
    }

    async with session_context() as session:
        user = await session.get(models.User, admin_user_id)
        assert user is not None
        assert user.is_superuser is True
