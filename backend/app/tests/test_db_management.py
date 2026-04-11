from contextlib import asynccontextmanager
from datetime import datetime
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


def _expected_deleted_records() -> dict[str, int]:
    return {
        "agent_runs": 1,
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
        "contacts": 1,
        "documents": 1,
        "extractors": 1,
        "orchestration_pipelines": 1,
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
        "contact_id": contact.id,
        "document_id": document.id,
        "document_version_id": document_version.id,
        "agent_id": agent.id,
        "agent_run_id": agent_run.id,
        "application_id": application.id,
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
