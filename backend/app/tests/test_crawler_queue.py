import asyncio
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import BackgroundTasks

import app.api.deps as deps
import app.crawler_queue as crawler_queue
from app.api.deps import schedule_crawler_run_execution
from app.core import conf


def test_queue_disabled_in_pytest() -> None:
    assert conf.settings.ENVIRONMENT == "PYTEST"
    assert crawler_queue._queue_enabled() is False


@pytest.mark.asyncio
async def test_enqueue_returns_false_in_pytest() -> None:
    result = await crawler_queue.enqueue_crawler_job("fake-run-id", "fake-user-id")
    assert result is False


@pytest.mark.asyncio
async def test_schedule_crawler_run_execution_enqueues_job_in_worker_mode(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    enqueue_mock = AsyncMock(return_value=True)

    monkeypatch.setattr(conf.settings, "ENVIRONMENT", "DEV")
    monkeypatch.setattr(crawler_queue, "_queue_enabled", lambda: True)
    monkeypatch.setattr(crawler_queue, "enqueue_crawler_job", enqueue_mock)

    background_tasks = BackgroundTasks()
    run_id = uuid4()
    user_id = uuid4()

    await schedule_crawler_run_execution(
        run_id,
        user_id,
        background_tasks=background_tasks,
    )

    enqueue_mock.assert_awaited_once_with(str(run_id), str(user_id))
    assert background_tasks.tasks == []


@pytest.mark.asyncio
async def test_schedule_crawler_run_execution_falls_back_when_enqueue_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    enqueue_mock = AsyncMock(return_value=False)
    execute_mock = AsyncMock()

    monkeypatch.setattr(conf.settings, "ENVIRONMENT", "DEV")
    monkeypatch.setattr(crawler_queue, "_queue_enabled", lambda: True)
    monkeypatch.setattr(crawler_queue, "enqueue_crawler_job", enqueue_mock)
    monkeypatch.setattr(deps, "execute_crawler_run_background", execute_mock)

    background_tasks = BackgroundTasks()
    run_id = uuid4()
    user_id = uuid4()

    await schedule_crawler_run_execution(
        run_id,
        user_id,
        background_tasks=background_tasks,
    )

    enqueue_mock.assert_awaited_once_with(str(run_id), str(user_id))
    assert len(background_tasks.tasks) == 1
    task = background_tasks.tasks[0]
    assert task.func is execute_mock
    assert task.args == (run_id, user_id)


@pytest.mark.asyncio
async def test_schedule_crawler_run_execution_uses_asyncio_task_without_background_tasks(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    enqueue_mock = AsyncMock(return_value=False)
    execute_mock = AsyncMock()
    created_tasks: list[asyncio.Task] = []
    original_create_task = deps.asyncio.create_task

    def _capture_task(coro):
        task = original_create_task(coro)
        created_tasks.append(task)
        return task

    monkeypatch.setattr(conf.settings, "ENVIRONMENT", "DEV")
    monkeypatch.setattr(crawler_queue, "_queue_enabled", lambda: True)
    monkeypatch.setattr(crawler_queue, "enqueue_crawler_job", enqueue_mock)
    monkeypatch.setattr(deps, "execute_crawler_run_background", execute_mock)
    monkeypatch.setattr(deps.asyncio, "create_task", _capture_task)

    run_id = uuid4()
    user_id = uuid4()

    await schedule_crawler_run_execution(run_id, user_id)

    enqueue_mock.assert_awaited_once_with(str(run_id), str(user_id))
    assert len(created_tasks) == 1
    await created_tasks[0]
    execute_mock.assert_awaited_once_with(run_id, user_id)


@pytest.mark.asyncio
async def test_schedule_crawler_run_execution_marks_run_failed_when_inline_task_cannot_start(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    enqueue_mock = AsyncMock(return_value=False)
    execute_mock = AsyncMock()
    mark_failed_mock = AsyncMock()

    def _raise_runtime_error(coro):
        coro.close()
        raise RuntimeError("loop closed")

    monkeypatch.setattr(conf.settings, "ENVIRONMENT", "DEV")
    monkeypatch.setattr(crawler_queue, "_queue_enabled", lambda: True)
    monkeypatch.setattr(crawler_queue, "enqueue_crawler_job", enqueue_mock)
    monkeypatch.setattr(deps, "execute_crawler_run_background", execute_mock)
    monkeypatch.setattr(deps, "mark_crawler_run_enqueue_failure", mark_failed_mock)
    monkeypatch.setattr(deps.asyncio, "create_task", _raise_runtime_error)

    run_id = uuid4()
    user_id = uuid4()

    await schedule_crawler_run_execution(run_id, user_id)

    enqueue_mock.assert_awaited_once_with(str(run_id), str(user_id))
    execute_mock.assert_not_awaited()
    mark_failed_mock.assert_awaited_once()
    assert mark_failed_mock.await_args.args[0] == run_id
    assert "loop closed" in mark_failed_mock.await_args.args[1]
