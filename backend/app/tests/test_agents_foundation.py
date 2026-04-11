from __future__ import annotations

from datetime import datetime, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app import models
from app.core.db import session_context

pytestmark = pytest.mark.asyncio(loop_scope="module")


def _build_session_context(user_id):
    lead_url = f"https://example.com/jobs/{user_id}"

    lead = models.Lead(
        url=lead_url,
        canonical_url=lead_url,
        title="Agent Foundation Lead",
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
    return lead, application, document


async def test_agent_and_agent_run_relationships(registered_user) -> None:
    _, user_id, _ = registered_user

    async with session_context() as session:
        lead, application, document = _build_session_context(user_id)
        session.add_all([lead, application, document])
        await session.flush()

        version = models.DocumentVersion(
            document_id=document.id,
            version_number=1,
            name="Session v1",
            content='{"type":"doc","content":[]}',
            content_format="tiptap_json",
        )
        session.add(version)
        await session.flush()
        document.head_version_id = version.id

        agent = models.Agent(
            user_id=user_id,
            name="Cover Letter Workspace",
            description="Creates a structured drafting workspace",
            kind="cover_letter",
            instructions="Draft a reusable workspace session",
        )
        session.add(agent)
        await session.flush()

        parent_run = models.AgentRun(
            agent_id=agent.id,
            user_id=user_id,
            application_id=application.id,
            status="completed",
            input_context={"application_id": str(application.id)},
            session_document_id=document.id,
            session_version_id=version.id,
            completed_at=datetime.now(timezone.utc),
        )
        session.add(parent_run)
        await session.flush()

        child_run = models.AgentRun(
            agent_id=agent.id,
            user_id=user_id,
            parent_run_id=parent_run.id,
            session_document_id=document.id,
            session_version_id=version.id,
        )
        session.add(child_run)
        await session.commit()

        db_agent = (
            (
                await session.execute(
                    select(models.Agent)
                    .options(selectinload(models.Agent.runs))
                    .where(models.Agent.id == agent.id)
                )
            )
            .scalars()
            .one()
        )
        db_application = (
            (
                await session.execute(
                    select(models.Application)
                    .options(selectinload(models.Application.agent_runs))
                    .where(models.Application.id == application.id)
                )
            )
            .scalars()
            .one()
        )
        db_document = (
            (
                await session.execute(
                    select(models.Document)
                    .options(selectinload(models.Document.agent_runs))
                    .where(models.Document.id == document.id)
                )
            )
            .scalars()
            .one()
        )
        db_version = (
            (
                await session.execute(
                    select(models.DocumentVersion)
                    .options(selectinload(models.DocumentVersion.agent_runs))
                    .where(models.DocumentVersion.id == version.id)
                )
            )
            .scalars()
            .one()
        )
        db_child_run = await session.get(models.AgentRun, child_run.id)

    assert db_agent.configuration == {}
    assert db_agent.is_enabled is True
    assert {run.id for run in db_agent.runs} == {parent_run.id, child_run.id}
    assert {run.id for run in db_application.agent_runs} == {parent_run.id}
    assert {run.id for run in db_document.agent_runs} == {parent_run.id, child_run.id}
    assert {run.id for run in db_version.agent_runs} == {parent_run.id, child_run.id}
    assert db_child_run is not None
    assert db_child_run.parent_run_id == parent_run.id
    assert db_child_run.trigger_kind == "manual"
    assert db_child_run.status == "pending"
    assert db_child_run.input_context == {}


async def test_agent_kind_check_constraint_rejects_invalid_values(
    registered_user,
) -> None:
    _, user_id, _ = registered_user

    async with session_context() as session:
        session.add(
            models.Agent(
                user_id=user_id,
                name="Invalid agent",
                kind="not_a_kind",
            )
        )

        with pytest.raises(IntegrityError):
            await session.commit()

        await session.rollback()


async def test_agent_run_status_check_constraint_rejects_invalid_values(
    registered_user,
) -> None:
    _, user_id, _ = registered_user

    async with session_context() as session:
        agent = models.Agent(
            user_id=user_id,
            name="Custom Workspace",
            kind="custom",
        )
        session.add(agent)
        await session.flush()

        session.add(
            models.AgentRun(
                agent_id=agent.id,
                user_id=user_id,
                trigger_kind="manual",
                status="not_a_status",
            )
        )

        with pytest.raises(IntegrityError):
            await session.commit()

        await session.rollback()


async def test_agent_delete_is_blocked_when_runs_exist(registered_user) -> None:
    _, user_id, _ = registered_user

    async with session_context() as session:
        agent = models.Agent(
            user_id=user_id,
            name="Outreach Workspace",
            kind="outreach",
        )
        session.add(agent)
        await session.flush()

        run = models.AgentRun(
            agent_id=agent.id,
            user_id=user_id,
            trigger_kind="manual",
            status="pending",
        )
        session.add(run)
        await session.commit()

        await session.delete(agent)

        with pytest.raises(IntegrityError):
            await session.commit()

        await session.rollback()
