import json
from contextlib import asynccontextmanager
from pathlib import Path
from unittest.mock import AsyncMock

import pytest
from fastapi import BackgroundTasks
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient
from pytest import MonkeyPatch

import app.crawler_queue as crawler_queue
from app import models, schemas
from app.api.routes.seed_tasks import (
    SeedOperation,
    _run_seed_operation,
    schedule_seed_operation,
)
from app.core import conf
from app.core.db import async_engine, drop_and_create_db_and_tables, session_context
from app.main import app
from app.tests import utils

pytestmark = pytest.mark.asyncio(loop_scope="module")

password_helper = PasswordHelper()

USER_SEED_PATHS = (
    "/certificate/seed",
    "/contacts/seed",
    "/documents/seed",
    "/education/seed",
    "/experiences/seed",
    "/leads/seed",
    "/skills/seed",
)


@asynccontextmanager
async def _test_client_with_fresh_db() -> AsyncClient:
    await async_engine.dispose()
    await drop_and_create_db_and_tables()
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url=str(conf.settings.BACKEND_CORS_ORIGINS[-1]),
    ) as client:
        yield client


async def _register_user(client: AsyncClient, password: str) -> str:
    email = utils.random_email()
    response = await client.post(
        "/auth/register",
        json={"email": email, "password": password},
    )
    assert response.status_code in {200, 201}
    return email


async def _auth_headers(
    client: AsyncClient,
    email: str,
    password: str,
) -> dict[str, str]:
    app.state.limiter.reset()
    response = await client.post(
        "/auth/jwt/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def _create_superuser(email: str, password: str) -> None:
    async with session_context() as session:
        await utils.create_db_user(
            email,
            password_helper.hash(password),
            session,
            is_superuser=True,
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
    assert body["poll_url"] == f"/data_orchestration/events/{body['event_id']}"

    event_response = await client.get(body["poll_url"], headers=headers)

    assert event_response.status_code == 202
    event_body = event_response.json()
    assert event_body["id"] == body["event_id"]
    assert event_body["pipeline_id"] == body["pipeline_id"]
    assert event_body["status"] in {"pending", "running", "success"}


@pytest.mark.parametrize("path", USER_SEED_PATHS)
async def test_seed_routes_return_accepted_polling_payload(path: str) -> None:
    async with _test_client_with_fresh_db() as client:
        password = "SeedRoutePass1"
        email = await _register_user(client, password)
        headers = await _auth_headers(client, email, password)

        await _assert_seed_acceptance(client, headers, path)


async def test_superuser_seed_route_returns_accepted_polling_payload() -> None:
    async with _test_client_with_fresh_db() as client:
        password = "SuperSeedPass1"
        email = utils.random_email()
        await _create_superuser(email, password)
        headers = await _auth_headers(client, email, password)

        await _assert_seed_acceptance(client, headers, "/users/seed")


async def test_background_seed_failure_marks_event_failed(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    async with _test_client_with_fresh_db():
        seeds_dir = tmp_path / "seeds"
        seeds_dir.mkdir()
        monkeypatch.setattr(conf.settings, "PUBLIC_ASSETS_DIR", str(tmp_path))
        seed_file = seeds_dir / "broken-seed.json"
        seed_file.write_text(json.dumps([{"id": 1}, {"id": 2}]), encoding="utf-8")

        async with session_context() as session:
            user = await utils.create_db_user(
                utils.random_email(),
                password_helper.hash("SeedFailurePass1"),
                session,
            )
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
            user_id = user.id

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
) -> None:
    background_tasks = BackgroundTasks()
    enqueue_mock = AsyncMock(return_value=True)

    monkeypatch.setattr(conf.settings, "ENVIRONMENT", "DEV")
    monkeypatch.setattr(crawler_queue, "_queue_enabled", lambda: True)
    monkeypatch.setattr(crawler_queue, "enqueue_seed_job", enqueue_mock)

    async def _creator(record, db, user):
        del record, db, user
        return None

    async with _test_client_with_fresh_db():
        async with session_context() as session:
            user = await utils.create_db_user(
                utils.random_email(),
                password_helper.hash("SeedQueuePass1"),
                session,
            )
            await session.commit()
            user_id = user.id
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
) -> None:
    background_tasks = BackgroundTasks()
    enqueue_mock = AsyncMock(return_value=False)

    monkeypatch.setattr(conf.settings, "ENVIRONMENT", "DEV")
    monkeypatch.setattr(crawler_queue, "_queue_enabled", lambda: True)
    monkeypatch.setattr(crawler_queue, "enqueue_seed_job", enqueue_mock)

    async def _creator(record, db, user):
        del record, db, user
        return None

    async with _test_client_with_fresh_db():
        async with session_context() as session:
            user = await utils.create_db_user(
                utils.random_email(),
                password_helper.hash("SeedQueueFallback1"),
                session,
            )
            await session.commit()
            user_id = user.id
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
