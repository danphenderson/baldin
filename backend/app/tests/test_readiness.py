"""Tests for the lightweight liveness and readiness endpoints."""

from unittest.mock import AsyncMock

import pytest

import app.main as main_module
from app.conftest import async_client_ctx as _client

pytestmark = pytest.mark.asyncio(loop_scope="module")


@pytest.fixture(scope="module", autouse=True)
async def _shared_db_ready(ensure_db: None) -> None:
    del ensure_db


async def test_health_returns_ok():
    async with _client() as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_ready_returns_200_when_all_checks_pass(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(main_module.conf.settings, "CRAWLER_EXECUTION_MODE", "worker")
    monkeypatch.setattr(
        main_module,
        "_check_database_ready",
        AsyncMock(return_value=(True, None)),
    )
    monkeypatch.setattr(
        main_module,
        "_check_redis_ready",
        AsyncMock(return_value=(True, True, None)),
    )
    monkeypatch.setattr(
        main_module,
        "_check_etl_service_ready",
        AsyncMock(return_value=(True, None)),
    )

    async with _client() as client:
        response = await client.get("/ready")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"
    assert body["checks"]["database"]["ok"] is True
    assert body["checks"]["redis"]["ok"] is True
    assert body["checks"]["etl_service"]["ok"] is True


async def test_ready_returns_503_when_database_is_unavailable(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(main_module.conf.settings, "CRAWLER_EXECUTION_MODE", "inline")
    monkeypatch.setattr(
        main_module,
        "_check_database_ready",
        AsyncMock(return_value=(False, "database down")),
    )

    async with _client() as client:
        response = await client.get("/ready")

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "degraded"
    assert body["checks"]["database"]["detail"] == "unreachable"
    assert "redis" not in body["checks"]


async def test_ready_returns_503_when_worker_dependencies_are_unhealthy(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setattr(main_module.conf.settings, "CRAWLER_EXECUTION_MODE", "worker")
    monkeypatch.setattr(
        main_module,
        "_check_database_ready",
        AsyncMock(return_value=(True, None)),
    )
    monkeypatch.setattr(
        main_module,
        "_check_redis_ready",
        AsyncMock(return_value=(True, False, "redis down")),
    )
    monkeypatch.setattr(
        main_module,
        "_check_etl_service_ready",
        AsyncMock(return_value=(False, "etl down")),
    )

    async with _client() as client:
        response = await client.get("/ready")

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "degraded"
    assert body["checks"]["redis"]["detail"] == "unreachable"
    assert body["checks"]["etl_service"]["detail"] == "unreachable"
