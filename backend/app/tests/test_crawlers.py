"""
Tests for the V1 Superuser Crawler subsystem.

Covers auth enforcement, CRUD operations, manual run triggering,
run listing/detail, cancel/pause/resume transitions, lead deduplication,
ETL adapter normalization, and scheduler guard.
"""

from contextlib import asynccontextmanager
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import pytest
from fastapi_users.password import PasswordHelper
from httpx import ASGITransport, AsyncClient

from app import models, schemas
from app.api import deps as api_deps
from app.core import conf
from app.core.db import async_engine, drop_and_create_db_and_tables, session_context
from app.main import app
from app.tests import utils
from etl.base import CrawlerResult

pytestmark = pytest.mark.asyncio(loop_scope="module")

password_helper = PasswordHelper()
_db_ready = False


# ---------------------------------------------------------------------------
# Helpers — mirrors existing test patterns (test_leads.py, test_db_management.py)
# ---------------------------------------------------------------------------


@asynccontextmanager
async def _client():
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url=str(conf.settings.BACKEND_CORS_ORIGINS[-1]),
    ) as client:
        yield client


async def _ensure_db_ready():
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
    app.state.limiter.reset()
    response = await client.post(
        "/auth/jwt/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _pipeline_payload(**overrides) -> dict:
    payload = {
        "name": f"Test Pipeline {utils.random_lower_string(6)}",
        "description": "Test pipeline description",
        "source": "linkedin",
        "query_definition": {
            "keywords": ["python", "backend"],
            "location": "Remote",
        },
        "enabled": True,
    }
    payload.update(overrides)
    return payload


# ---------------------------------------------------------------------------
# 1. Auth enforcement
# ---------------------------------------------------------------------------


async def test_unauthenticated_user_gets_401_on_crawler_routes():
    """Non-authenticated requests get 401 on all crawler endpoints."""
    await _ensure_db_ready()
    async with _client() as client:
        endpoints = [
            ("POST", "/crawlers/pipelines"),
            ("GET", "/crawlers/pipelines"),
            ("GET", f"/crawlers/pipelines/{uuid4()}"),
            ("PATCH", f"/crawlers/pipelines/{uuid4()}"),
            ("POST", f"/crawlers/pipelines/{uuid4()}/runs"),
            ("GET", "/crawlers/runs"),
            ("GET", f"/crawlers/runs/{uuid4()}"),
            ("POST", f"/crawlers/runs/{uuid4()}/cancel"),
            ("POST", f"/crawlers/runs/{uuid4()}/pause"),
            ("POST", f"/crawlers/runs/{uuid4()}/resume"),
        ]
        for method, path in endpoints:
            resp = await client.request(method, path)
            assert resp.status_code == 401, (
                f"{method} {path} returned {resp.status_code}, expected 401"
            )


async def test_non_superuser_gets_403_on_crawler_routes():
    """Regular authenticated users get 403 on all crawler endpoints."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("regular-pass")
        headers = await _auth_headers(client, email, "regular-pass")

        endpoints = [
            ("POST", "/crawlers/pipelines"),
            ("GET", "/crawlers/pipelines"),
            ("GET", f"/crawlers/pipelines/{uuid4()}"),
            ("PATCH", f"/crawlers/pipelines/{uuid4()}"),
            ("POST", f"/crawlers/pipelines/{uuid4()}/runs"),
            ("GET", "/crawlers/runs"),
            ("GET", f"/crawlers/runs/{uuid4()}"),
            ("POST", f"/crawlers/runs/{uuid4()}/cancel"),
            ("POST", f"/crawlers/runs/{uuid4()}/pause"),
            ("POST", f"/crawlers/runs/{uuid4()}/resume"),
        ]
        for method, path in endpoints:
            resp = await client.request(method, path, headers=headers)
            assert resp.status_code == 403, (
                f"{method} {path} returned {resp.status_code}, expected 403"
            )


# ---------------------------------------------------------------------------
# 2. CRUD operations
# ---------------------------------------------------------------------------


async def test_superuser_creates_pipeline():
    """Superuser can create a crawler pipeline."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("super-create", is_superuser=True)
        headers = await _auth_headers(client, email, "super-create")

        payload = _pipeline_payload()
        resp = await client.post("/crawlers/pipelines", json=payload, headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["name"] == payload["name"]
        assert body["source"] == "linkedin"
        assert body["enabled"] is True
        assert "id" in body
        assert "created_at" in body


async def test_superuser_lists_pipelines():
    """Superuser can list all pipelines."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("super-list", is_superuser=True)
        headers = await _auth_headers(client, email, "super-list")

        # Create two pipelines
        await client.post(
            "/crawlers/pipelines",
            json=_pipeline_payload(name="Pipeline A"),
            headers=headers,
        )
        await client.post(
            "/crawlers/pipelines",
            json=_pipeline_payload(name="Pipeline B"),
            headers=headers,
        )

        resp = await client.get("/crawlers/pipelines", headers=headers)
        assert resp.status_code == 200
        pipelines = resp.json()
        assert isinstance(pipelines, list)
        assert len(pipelines) >= 2
        names = [p["name"] for p in pipelines]
        assert "Pipeline A" in names
        assert "Pipeline B" in names


async def test_superuser_gets_single_pipeline():
    """Superuser can get a single pipeline by ID."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("super-get", is_superuser=True)
        headers = await _auth_headers(client, email, "super-get")

        create_resp = await client.post(
            "/crawlers/pipelines", json=_pipeline_payload(), headers=headers
        )
        pipeline_id = create_resp.json()["id"]

        resp = await client.get(f"/crawlers/pipelines/{pipeline_id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == pipeline_id


async def test_superuser_updates_pipeline():
    """Superuser can update a pipeline."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("super-update", is_superuser=True)
        headers = await _auth_headers(client, email, "super-update")

        create_resp = await client.post(
            "/crawlers/pipelines", json=_pipeline_payload(), headers=headers
        )
        pipeline_id = create_resp.json()["id"]

        resp = await client.patch(
            f"/crawlers/pipelines/{pipeline_id}",
            json={"name": "Updated Name", "enabled": False},
            headers=headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["name"] == "Updated Name"
        assert body["enabled"] is False


# ---------------------------------------------------------------------------
# 3. Manual run triggering
# ---------------------------------------------------------------------------


async def test_superuser_triggers_manual_run():
    """POST /crawlers/pipelines/{id}/runs creates a run with manual trigger."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("super-run", is_superuser=True)
        headers = await _auth_headers(client, email, "super-run")

        create_resp = await client.post(
            "/crawlers/pipelines", json=_pipeline_payload(), headers=headers
        )
        pipeline_id = create_resp.json()["id"]

        resp = await client.post(
            f"/crawlers/pipelines/{pipeline_id}/runs", headers=headers
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["trigger_type"] == "manual"
        assert body["status"] == "pending"
        assert body["crawler_pipeline_id"] == pipeline_id


async def test_superuser_triggers_manual_run_awaits_checked_queue_handoff(
    monkeypatch: pytest.MonkeyPatch,
):
    """POST /crawlers/pipelines/{id}/runs awaits the queue handoff helper."""
    await _ensure_db_ready()
    schedule_mock = AsyncMock(return_value=None)
    monkeypatch.setattr(api_deps, "schedule_crawler_run_execution", schedule_mock)

    async with _client() as client:
        email, user_id = await _create_user("super-await-run", is_superuser=True)
        headers = await _auth_headers(client, email, "super-await-run")

        create_resp = await client.post(
            "/crawlers/pipelines", json=_pipeline_payload(), headers=headers
        )
        pipeline_id = create_resp.json()["id"]

        resp = await client.post(
            f"/crawlers/pipelines/{pipeline_id}/runs", headers=headers
        )
        assert resp.status_code == 200
        run_id = UUID(resp.json()["id"])

    schedule_mock.assert_awaited_once()
    assert schedule_mock.await_args.args[0] == run_id
    assert schedule_mock.await_args.args[1] == user_id
    assert schedule_mock.await_args.kwargs["background_tasks"] is not None


# ---------------------------------------------------------------------------
# 4. Run listing and detail
# ---------------------------------------------------------------------------


async def test_superuser_lists_runs():
    """GET /crawlers/runs lists runs."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("super-runs-list", is_superuser=True)
        headers = await _auth_headers(client, email, "super-runs-list")

        # Create a pipeline and trigger a run
        create_resp = await client.post(
            "/crawlers/pipelines", json=_pipeline_payload(), headers=headers
        )
        pipeline_id = create_resp.json()["id"]
        await client.post(f"/crawlers/pipelines/{pipeline_id}/runs", headers=headers)

        resp = await client.get("/crawlers/runs", headers=headers)
        assert resp.status_code == 200
        runs = resp.json()
        assert isinstance(runs, list)
        assert len(runs) >= 1


async def test_superuser_lists_runs_with_filters():
    """GET /crawlers/runs supports filtering by pipeline_id and status."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("super-runs-filter", is_superuser=True)
        headers = await _auth_headers(client, email, "super-runs-filter")

        create_resp = await client.post(
            "/crawlers/pipelines", json=_pipeline_payload(), headers=headers
        )
        pipeline_id = create_resp.json()["id"]
        await client.post(f"/crawlers/pipelines/{pipeline_id}/runs", headers=headers)

        # Filter by pipeline_id
        resp = await client.get(
            "/crawlers/runs",
            params={"pipeline_id": pipeline_id},
            headers=headers,
        )
        assert resp.status_code == 200
        runs = resp.json()
        assert all(r["crawler_pipeline_id"] == pipeline_id for r in runs)

        # Filter by status — pending runs from the trigger above
        resp = await client.get(
            "/crawlers/runs",
            params={"status": "pending"},
            headers=headers,
        )
        assert resp.status_code == 200


async def test_superuser_gets_run_detail():
    """GET /crawlers/runs/{id} returns CrawlerRunDetailRead with events."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("super-run-detail", is_superuser=True)
        headers = await _auth_headers(client, email, "super-run-detail")

        create_resp = await client.post(
            "/crawlers/pipelines", json=_pipeline_payload(), headers=headers
        )
        pipeline_id = create_resp.json()["id"]
        run_resp = await client.post(
            f"/crawlers/pipelines/{pipeline_id}/runs", headers=headers
        )
        run_id = run_resp.json()["id"]

        resp = await client.get(f"/crawlers/runs/{run_id}", headers=headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == run_id
        assert "events" in body
        assert isinstance(body["events"], list)
        # A pending run should have an associated orchestration event
        assert len(body["events"]) >= 1


# ---------------------------------------------------------------------------
# 5. Cancel / pause / resume transitions
# ---------------------------------------------------------------------------


async def _create_run_with_status(
    client: AsyncClient, headers: dict, status: str
) -> str:
    """Helper: create a pipeline + run, then set the run to desired status."""
    create_resp = await client.post(
        "/crawlers/pipelines", json=_pipeline_payload(), headers=headers
    )
    pipeline_id = create_resp.json()["id"]
    run_resp = await client.post(
        f"/crawlers/pipelines/{pipeline_id}/runs", headers=headers
    )
    run_id = run_resp.json()["id"]

    if status != "pending":
        # Directly update in DB
        async with session_context() as session:
            run = await session.get(models.CrawlerRun, UUID(run_id))
            assert run is not None
            run.status = status
            await session.commit()

    return run_id


async def test_cancel_pending_run():
    """Cancel works on pending runs."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("super-cancel-p", is_superuser=True)
        headers = await _auth_headers(client, email, "super-cancel-p")
        run_id = await _create_run_with_status(client, headers, "pending")

        resp = await client.post(f"/crawlers/runs/{run_id}/cancel", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"


async def test_cancel_running_run():
    """Cancel works on running runs."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("super-cancel-r", is_superuser=True)
        headers = await _auth_headers(client, email, "super-cancel-r")
        run_id = await _create_run_with_status(client, headers, "running")

        resp = await client.post(f"/crawlers/runs/{run_id}/cancel", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"


async def test_cancel_completed_run_returns_409():
    """Cancel on a completed (success) run returns 409."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("super-cancel-s", is_superuser=True)
        headers = await _auth_headers(client, email, "super-cancel-s")
        run_id = await _create_run_with_status(client, headers, "success")

        resp = await client.post(f"/crawlers/runs/{run_id}/cancel", headers=headers)
        assert resp.status_code == 409


async def test_pause_running_run():
    """Pause works on running runs."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("super-pause-r", is_superuser=True)
        headers = await _auth_headers(client, email, "super-pause-r")
        run_id = await _create_run_with_status(client, headers, "running")

        resp = await client.post(f"/crawlers/runs/{run_id}/pause", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "paused"


async def test_pause_pending_run_returns_409():
    """Pause on a pending run returns 409."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("super-pause-p", is_superuser=True)
        headers = await _auth_headers(client, email, "super-pause-p")
        run_id = await _create_run_with_status(client, headers, "pending")

        resp = await client.post(f"/crawlers/runs/{run_id}/pause", headers=headers)
        assert resp.status_code == 409


async def test_pause_completed_run_returns_409():
    """Pause on a completed run returns 409."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("super-pause-s", is_superuser=True)
        headers = await _auth_headers(client, email, "super-pause-s")
        run_id = await _create_run_with_status(client, headers, "success")

        resp = await client.post(f"/crawlers/runs/{run_id}/pause", headers=headers)
        assert resp.status_code == 409


async def test_resume_paused_run():
    """Resume works on paused runs."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("super-resume-p", is_superuser=True)
        headers = await _auth_headers(client, email, "super-resume-p")
        run_id = await _create_run_with_status(client, headers, "paused")

        resp = await client.post(f"/crawlers/runs/{run_id}/resume", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "running"


async def test_resume_pending_run_returns_409():
    """Resume on a pending run returns 409."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("super-resume-pend", is_superuser=True)
        headers = await _auth_headers(client, email, "super-resume-pend")
        run_id = await _create_run_with_status(client, headers, "pending")

        resp = await client.post(f"/crawlers/runs/{run_id}/resume", headers=headers)
        assert resp.status_code == 409


async def test_resume_completed_run_returns_409():
    """Resume on a completed run returns 409."""
    await _ensure_db_ready()
    async with _client() as client:
        email, _ = await _create_user("super-resume-s", is_superuser=True)
        headers = await _auth_headers(client, email, "super-resume-s")
        run_id = await _create_run_with_status(client, headers, "success")

        resp = await client.post(f"/crawlers/runs/{run_id}/resume", headers=headers)
        assert resp.status_code == 409


# ---------------------------------------------------------------------------
# 6. Lead deduplication (unit test)
# ---------------------------------------------------------------------------


async def test_crawler_result_to_lead_create_produces_valid_payload():
    """crawler_result_to_lead_create converts CrawlerResult to LeadCreate."""
    result = CrawlerResult(
        url="https://example.com/jobs/123",
        title="Software Engineer",
        description="Build things",
        location="Remote",
        salary="100k",
        job_function="Engineering",
        employment_type="Full-time",
        seniority_level="Mid",
        education_level="BS",
        company_name="Acme Corp",
    )
    lead_create = api_deps.crawler_result_to_lead_create(result)
    assert isinstance(lead_create, schemas.LeadCreate)
    assert lead_create.url == "https://example.com/jobs/123"
    assert lead_create.title == "Software Engineer"
    assert "[Acme Corp]" in lead_create.description
    assert "Build things" in lead_create.description
    assert lead_create.location == "Remote"
    assert lead_create.company_ids is None


async def test_crawler_result_to_lead_create_no_company():
    """When company_name is None, description is not prefixed."""
    result = CrawlerResult(
        url="https://example.com/jobs/456",
        title="Designer",
        description="Design things",
    )
    lead_create = api_deps.crawler_result_to_lead_create(result)
    assert lead_create.description == "Design things"


async def test_crawler_result_to_lead_create_empty_description_with_company():
    """When description is empty but company_name exists, description is just the company."""
    result = CrawlerResult(
        url="https://example.com/jobs/789",
        title="PM",
        company_name="BigCo",
    )
    lead_create = api_deps.crawler_result_to_lead_create(result)
    assert lead_create.description == "[BigCo]"


async def test_create_lead_deduplication_via_canonical_url():
    """Creating a lead with the same canonical URL twice deduplicates."""
    await _ensure_db_ready()
    async with _client() as client:
        email, user_id = await _create_user("super-dedup", is_superuser=True)
        headers = await _auth_headers(client, email, "super-dedup")

        url = f"https://example.com/jobs/{utils.random_lower_string(12)}"

        # First creation
        resp1 = await client.post(
            "/leads/",
            json={
                "url": url,
                "title": "Dedup Test Job",
                "description": "First submission",
            },
            headers=headers,
        )
        assert resp1.status_code == 201
        lead_id_1 = resp1.json()["id"]

        # Second creation with same URL
        resp2 = await client.post(
            "/leads/",
            json={
                "url": url,
                "title": "Dedup Test Job Again",
                "description": "Second submission",
            },
            headers=headers,
        )
        assert resp2.status_code == 201
        lead_id_2 = resp2.json()["id"]

        # Same lead
        assert lead_id_1 == lead_id_2


# ---------------------------------------------------------------------------
# 7. ETL adapter normalization (unit test, no network)
# ---------------------------------------------------------------------------


async def test_linkedin_crawler_can_be_instantiated():
    """LinkedInCrawler can be instantiated without network."""
    from etl.linkedin import LinkedInCrawler

    crawler = LinkedInCrawler(
        keywords=["python"], location="Remote", page_start=1, page_end=2
    )
    assert crawler.keywords == ["python"]
    assert crawler.location == "Remote"
    assert crawler.page_start == 1
    assert crawler.page_end == 2


async def test_linkedin_crawler_accepts_max_retries():
    """LinkedInCrawler accepts max_retries parameter."""
    from etl.linkedin import LinkedInCrawler

    crawler = LinkedInCrawler(keywords=["python"], location="Remote", max_retries=5)
    assert crawler.max_retries == 5


async def test_glassdoor_crawler_can_be_instantiated():
    """GlassdoorCrawler can be instantiated without network."""
    from etl.glassdoor import GlassdoorCrawler

    crawler = GlassdoorCrawler(keywords="python", location="Remote")
    assert crawler.keywords == "python"
    assert crawler.location == "Remote"


async def test_glassdoor_crawler_accepts_max_retries():
    """GlassdoorCrawler accepts max_retries parameter."""
    from etl.glassdoor import GlassdoorCrawler

    crawler = GlassdoorCrawler(keywords="python", max_retries=5)
    assert crawler.max_retries == 5


async def test_crawler_result_fields_map_to_lead_create():
    """All CrawlerResult fields map correctly to LeadCreate."""
    result = CrawlerResult(
        url="https://example.com/job/test-mapping",
        title="Mapper Role",
        description="Testing field mapping",
        location="NYC",
        salary="120k",
        job_function="Data",
        employment_type="Contract",
        seniority_level="Senior",
        education_level="MS",
        company_name="MapCo",
    )
    lead = api_deps.crawler_result_to_lead_create(result)
    assert lead.url == result.url
    assert lead.title == result.title
    assert result.description in lead.description
    assert lead.location == result.location
    assert lead.salary == result.salary
    assert lead.job_function == result.job_function
    assert lead.employment_type == result.employment_type
    assert lead.seniority_level == result.seniority_level
    assert lead.education_level == result.education_level


# ---------------------------------------------------------------------------
# 7b. CrawlerResult validation tests
# ---------------------------------------------------------------------------


async def test_crawler_result_valid_with_url_and_content():
    """CrawlerResult validates successfully with URL and content."""
    result = CrawlerResult(
        url="https://example.com/job/123",
        title="Software Engineer",
        description="Full description of the role...",
    )
    validation = result.validate()
    assert validation.is_valid is True
    assert len(validation.errors) == 0


async def test_crawler_result_invalid_without_url():
    """CrawlerResult fails validation without URL."""
    result = CrawlerResult(
        url="",
        title="Software Engineer",
        description="Full description",
    )
    validation = result.validate()
    assert validation.is_valid is False
    assert "url is required but empty" in validation.errors


async def test_crawler_result_invalid_with_malformed_url():
    """CrawlerResult fails validation with non-HTTP URL."""
    result = CrawlerResult(
        url="not-a-valid-url",
        title="Software Engineer",
    )
    validation = result.validate()
    assert validation.is_valid is False
    assert any("not a valid HTTP" in e for e in validation.errors)


async def test_crawler_result_warns_without_content():
    """CrawlerResult warns when both title and description are empty."""
    result = CrawlerResult(
        url="https://example.com/job/123",
    )
    validation = result.validate()
    assert validation.is_valid is True  # still valid, just warning
    assert "Both title and description are empty" in validation.warnings


async def test_crawler_result_warns_on_short_description():
    """CrawlerResult warns on suspiciously short description."""
    result = CrawlerResult(
        url="https://example.com/job/123",
        title="Engineer",
        description="Short",
    )
    validation = result.validate()
    assert validation.is_valid is True
    assert any("suspiciously short" in w for w in validation.warnings)


async def test_crawler_result_is_valid_convenience():
    """CrawlerResult.is_valid() convenience method works correctly."""
    valid = CrawlerResult(url="https://example.com/job/123", title="Job")
    invalid = CrawlerResult(url="", title="Job")

    assert valid.is_valid() is True
    assert invalid.is_valid() is False


# ---------------------------------------------------------------------------
# 7c. Retry logic tests (unit tests, no network)
# ---------------------------------------------------------------------------


async def test_async_retry_succeeds_on_first_try():
    """async_retry returns result on immediate success."""
    from etl.base import async_retry

    call_count = 0

    async def succeeds_immediately():
        nonlocal call_count
        call_count += 1
        return "success"

    result = await async_retry(succeeds_immediately, max_retries=3)
    assert result == "success"
    assert call_count == 1


async def test_async_retry_succeeds_after_failures():
    """async_retry retries and succeeds after transient failures."""
    from etl.base import async_retry

    call_count = 0

    async def fails_then_succeeds():
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise TimeoutError("Simulated timeout")
        return "success"

    result = await async_retry(
        fails_then_succeeds,
        max_retries=3,
        base_delay=0.01,  # short delay for tests
    )
    assert result == "success"
    assert call_count == 3


async def test_async_retry_raises_after_exhaustion():
    """async_retry raises exception after retries exhausted."""
    from etl.base import async_retry

    call_count = 0

    async def always_fails():
        nonlocal call_count
        call_count += 1
        raise TimeoutError("Persistent timeout")

    with pytest.raises(TimeoutError):
        await async_retry(
            always_fails,
            max_retries=2,
            base_delay=0.01,
        )
    assert call_count == 3  # initial + 2 retries


async def test_async_retry_does_not_retry_non_retryable():
    """async_retry does not retry non-retryable exceptions."""
    from etl.base import async_retry

    call_count = 0

    async def raises_value_error():
        nonlocal call_count
        call_count += 1
        raise ValueError("Not retryable")

    with pytest.raises(ValueError):
        await async_retry(
            raises_value_error,
            max_retries=3,
            base_delay=0.01,
        )
    assert call_count == 1  # no retries for ValueError


# ---------------------------------------------------------------------------
# 8. Scheduler guard
# ---------------------------------------------------------------------------


async def test_scheduler_disabled_in_pytest_environment():
    """SHOULD_RUN_CRAWLER_SCHEDULER is False when ENVIRONMENT=PYTEST."""
    assert conf.settings.ENVIRONMENT == "PYTEST"
    assert conf.settings.SHOULD_RUN_CRAWLER_SCHEDULER is False
