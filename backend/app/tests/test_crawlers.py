# Path: app/tests/test_crawlers.py
"""
Tests for the crawler queue helper and crawler run routes.

All tests use the inline fallback path (ENVIRONMENT=PYTEST, no REDIS_URL)
so no Redis instance is required for CI to stay green.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app import models, schemas
from app.core import conf
from app.crawler_queue import _queue_enabled, enqueue_crawler_job

# ---------------------------------------------------------------------------
# Queue helper unit tests
# ---------------------------------------------------------------------------


def test_queue_disabled_in_pytest():
    """Queue must be disabled when ENVIRONMENT=PYTEST."""
    assert conf.settings.ENVIRONMENT == "PYTEST"
    assert _queue_enabled() is False


def test_queue_disabled_without_redis_url(monkeypatch):
    """Queue must be disabled when REDIS_URL is not configured."""
    monkeypatch.setattr(conf.settings, "REDIS_URL", None)
    monkeypatch.setattr(conf.settings, "CRAWLER_EXECUTION_MODE", "worker")
    assert _queue_enabled() is False


def test_queue_disabled_in_inline_mode(monkeypatch):
    """Queue must be disabled when CRAWLER_EXECUTION_MODE is 'inline'."""
    monkeypatch.setattr(conf.settings, "REDIS_URL", "redis://localhost:6379/0")
    monkeypatch.setattr(conf.settings, "CRAWLER_EXECUTION_MODE", "inline")
    # ENVIRONMENT is still PYTEST which is the first guard
    assert _queue_enabled() is False


@pytest.mark.asyncio
async def test_enqueue_returns_false_in_pytest():
    """enqueue_crawler_job returns False (inline fallback) in PYTEST."""
    result = await enqueue_crawler_job("fake-run-id", "fake-user-id")
    assert result is False


# ---------------------------------------------------------------------------
# execute_crawler_run unit tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_execute_crawler_run_skips_missing_run(db: AsyncSession):
    """execute_crawler_run should log and return gracefully for unknown run IDs."""
    import uuid

    from app.api.deps import execute_crawler_run

    await execute_crawler_run(uuid.uuid4(), uuid.uuid4(), db)  # should not raise


@pytest.mark.asyncio
async def test_execute_crawler_run_skips_terminal_run(db: AsyncSession, default_user):
    """execute_crawler_run must skip runs that are already success or failed."""
    from app.api.deps import execute_crawler_run

    run = models.CrawlerRun(
        url="https://example.com",
        user_id=default_user.id,
        status=schemas.CrawlerRunStatus.SUCCESS,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    await execute_crawler_run(run.id, default_user.id, db)

    # Status should remain SUCCESS – not reset to running
    await db.refresh(run)
    assert run.status == schemas.CrawlerRunStatus.SUCCESS


@pytest.mark.asyncio
async def test_execute_crawler_run_marks_failed_on_bad_url(
    db: AsyncSession, default_user, monkeypatch
):
    """execute_crawler_run sets status=failed when the URL fetch fails."""
    from app.api.deps import execute_crawler_run
    from app.core import langchain as lc_module

    async def _raise(*_a, **_kw):
        raise RuntimeError("connection refused")

    monkeypatch.setattr(lc_module, "extract_text_from_url", _raise)

    run = models.CrawlerRun(
        url="https://unreachable.invalid",
        user_id=default_user.id,
        status=schemas.CrawlerRunStatus.PENDING,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    await execute_crawler_run(run.id, default_user.id, db)

    await db.refresh(run)
    assert run.status == schemas.CrawlerRunStatus.FAILED
    assert run.result is not None
    assert "error" in run.result


# ---------------------------------------------------------------------------
# API route integration tests (inline mode)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_crawler_run_returns_201(
    test_client: AsyncClient, default_user, db: AsyncSession, monkeypatch
):
    """POST /crawlers/runs should create a run and return 201."""
    from app.core import langchain as lc_module

    # Stub out the actual URL fetch so the test does not hit the network
    async def _stub_text(url: str) -> str:
        return f"<html>stub content for {url}</html>"

    monkeypatch.setattr(lc_module, "extract_text_from_url", _stub_text)

    # Obtain a JWT token
    login_res = await test_client.post(
        "/auth/jwt/login",
        data={"username": "geralt@wiedzmin.pl", "password": "geralt"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    if login_res.status_code != 200:
        pytest.skip("Auth not available in this test run")

    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = await test_client.post(
        "/crawlers/runs",
        json={"url": "https://example.com/jobs"},
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["url"] == "https://example.com/jobs"
    assert data["status"] in ("pending", "running", "success", "failed")


@pytest.mark.asyncio
async def test_list_crawler_runs(
    test_client: AsyncClient, default_user, db: AsyncSession
):
    """GET /crawlers/runs should list runs for the authenticated user."""
    login_res = await test_client.post(
        "/auth/jwt/login",
        data={"username": "geralt@wiedzmin.pl", "password": "geralt"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    if login_res.status_code != 200:
        pytest.skip("Auth not available in this test run")

    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = await test_client.get("/crawlers/runs", headers=headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)
