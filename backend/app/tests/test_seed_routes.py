import json
from pathlib import Path
from unittest.mock import AsyncMock

import pytest
from fastapi import BackgroundTasks
from httpx import AsyncClient
from pytest import MonkeyPatch

import app.crawler_queue as crawler_queue
from app import models, schemas
from app.api.routes.seed_tasks import (
    SeedOperation,
    _run_seed_operation,
    schedule_seed_operation,
)
from app.conftest import create_user, login_and_get_headers
from app.core import conf
from app.core.db import session_context
from app.tests import utils

pytestmark = pytest.mark.asyncio(loop_scope="module")

USER_SEED_PATHS = (
    "/api/v1/certificates/seed",
    "/api/v1/contacts/seed",
    "/api/v1/documents/seed",
    "/api/v1/education/seed",
    "/api/v1/experiences/seed",
    "/api/v1/leads/seed",
    "/api/v1/skills/seed",
)


async def _assert_seed_acceptance(
    client: AsyncClient,
    headers: dict[str, str],
    path: str,
) -> None:
    response = await client.post(path, headers=headers)

    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "pending"
    assert (
        body["poll_url"] == f"/api/v1/orchestration-pipelines/events/{body['event_id']}"
    )

    event_response = await client.get(body["poll_url"], headers=headers)

    assert event_response.status_code == 202
    event_body = event_response.json()
    assert event_body["id"] == body["event_id"]
    assert event_body["pipeline_id"] == body["pipeline_id"]
    assert event_body["status"] in {"pending", "running", "success"}


@pytest.mark.parametrize("path", USER_SEED_PATHS)
async def test_seed_routes_return_accepted_polling_payload(
    path: str, client: AsyncClient, ensure_db: None
) -> None:
    del ensure_db
    password = "SeedRoutePass1"
    email, _ = await create_user(password)
    headers = await login_and_get_headers(client, email, password)
    await _assert_seed_acceptance(client, headers, path)


async def test_superuser_seed_route_returns_accepted_polling_payload(
    client: AsyncClient,
    ensure_db: None,
) -> None:
    del ensure_db
    password = "SuperSeedPass1"
    email = utils.random_email()
    await create_user(password, email=email, is_superuser=True)
    headers = await login_and_get_headers(client, email, password)
    await _assert_seed_acceptance(client, headers, "/api/v1/users/seed")


async def test_background_seed_failure_marks_event_failed(
    tmp_path: Path, monkeypatch: MonkeyPatch, ensure_db: None
) -> None:
    del ensure_db
    seeds_dir = tmp_path / "seeds"
    seeds_dir.mkdir()
    monkeypatch.setattr(conf.settings, "PUBLIC_ASSETS_DIR", str(tmp_path))
    seed_file = seeds_dir / "broken-seed.json"
    seed_file.write_text(json.dumps([{"id": 1}, {"id": 2}]), encoding="utf-8")

    _, user_id = await create_user("SeedFailurePass1")

    async with session_context() as session:
        user = await session.get(models.User, user_id)
        assert user is not None
        pipeline = models.OrchestrationPipeline(
            name=f"seed-test-{utils.random_lower_string(8)}",
            description="test",
            definition={},
            user_id=user.id,
        )
        session.add(pipeline)
        await session.commit()
        await session.refresh(pipeline)

        event = models.OrchestrationEvent(
            message="pending",
            payload={},
            environment="PYTEST",
            source_uri=schemas.URI(
                name=str(seed_file),
                type=schemas.URIType.FILE,
            ).model_dump(),
            destination_uri=schemas.URI(
                name="postgresql://test#seed-test",
                type=schemas.URIType.DATABASE,
            ).model_dump(),
            status=schemas.OrchestrationEventStatusType.PENDING,
            pipeline_id=pipeline.id,
        )
        session.add(event)
        await session.commit()
        await session.refresh(event)
        event_id = event.id

    counter = 0

    async def _failing_creator(record, db, user):
        nonlocal counter
        del record, db, user
        counter += 1
        if counter == 2:
            raise ValueError("seed batch failure")

    await _run_seed_operation(
        SeedOperation(
            pipeline_name="seed_test_failure",
            resource_name="Seed Test",
            seed_filename=seed_file.name,
            destination_table="seed_test",
            creator=_failing_creator,
        ),
        event_id,
        user_id,
    )

    async with session_context() as session:
        refreshed_event = await session.get(models.OrchestrationEvent, event_id)

    assert refreshed_event is not None
    assert refreshed_event.status == schemas.OrchestrationEventStatusType.FAILED
    assert refreshed_event.message == "seed batch failure"


async def test_schedule_seed_operation_enqueues_job_in_worker_mode(
    monkeypatch: MonkeyPatch,
    ensure_db: None,
) -> None:
    del ensure_db
    background_tasks = BackgroundTasks()
    enqueue_mock = AsyncMock(return_value=True)

    monkeypatch.setattr(conf.settings, "ENVIRONMENT", "DEV")
    monkeypatch.setattr(crawler_queue, "_queue_enabled", lambda: True)
    monkeypatch.setattr(crawler_queue, "enqueue_seed_job", enqueue_mock)

    async def _creator(record, db, user):
        del record, db, user
        return None

    _, user_id = await create_user("SeedQueuePass1")

    async with session_context() as session:
        user = await session.get(models.User, user_id)
        assert user is not None
        pipeline_name = f"seed-queue-{utils.random_lower_string(8)}"

        accepted = await schedule_seed_operation(
            background_tasks,
            session,
            schemas.UserRead.model_validate(user, from_attributes=True),
            SeedOperation(
                pipeline_name=pipeline_name,
                resource_name="Seed Queue Test",
                seed_filename="contacts.json",
                destination_table="contacts",
                creator=_creator,
            ),
        )

    assert accepted.status == schemas.OrchestrationEventStatusType.PENDING
    enqueue_mock.assert_awaited_once_with(
        pipeline_name,
        str(accepted.event_id),
        str(user_id),
    )
    assert background_tasks.tasks == []


async def test_schedule_seed_operation_falls_back_when_enqueue_fails(
    monkeypatch: MonkeyPatch,
    ensure_db: None,
) -> None:
    del ensure_db
    background_tasks = BackgroundTasks()
    enqueue_mock = AsyncMock(return_value=False)

    monkeypatch.setattr(conf.settings, "ENVIRONMENT", "DEV")
    monkeypatch.setattr(crawler_queue, "_queue_enabled", lambda: True)
    monkeypatch.setattr(crawler_queue, "enqueue_seed_job", enqueue_mock)

    async def _creator(record, db, user):
        del record, db, user
        return None

    _, user_id = await create_user("SeedQueueFallback1")

    async with session_context() as session:
        user = await session.get(models.User, user_id)
        assert user is not None
        pipeline_name = f"seed-queue-fallback-{utils.random_lower_string(8)}"

        accepted = await schedule_seed_operation(
            background_tasks,
            session,
            schemas.UserRead.model_validate(user, from_attributes=True),
            SeedOperation(
                pipeline_name=pipeline_name,
                resource_name="Seed Queue Test",
                seed_filename="contacts.json",
                destination_table="contacts",
                creator=_creator,
            ),
        )

    assert accepted.status == schemas.OrchestrationEventStatusType.PENDING
    enqueue_mock.assert_awaited_once_with(
        pipeline_name,
        str(accepted.event_id),
        str(user_id),
    )
    assert len(background_tasks.tasks) == 1
    task = background_tasks.tasks[0]
    assert task.func is _run_seed_operation
