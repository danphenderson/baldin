from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

import app.api.deps as deps
from app import models, schemas
from app.etl_service import router as etl_router
from app.etl_service import service as etl_service
from app.etl_service.schemas import (
    CrawlerExecutionTerminalStatus,
    CrawlResult,
    CrawlRunExecuteRequest,
    CrawlRunExecuteResponse,
)
from app.etl_service_main import app as etl_app
from etl.base import CrawlerResult as BaseCrawlerResult


class _FakeAdapter:
    def __init__(self, results=None, error: Exception | None = None):
        self._results = results or []
        self._error = error

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        return None

    async def search_jobs(self):
        if self._error is not None:
            raise self._error

        for result in self._results:
            yield result


class _FakeDb:
    def __init__(self, pipeline, refresh_side_effect=None):
        self._pipeline = pipeline
        self.get = AsyncMock(side_effect=self._get)
        self.commit = AsyncMock(return_value=None)
        self.refresh = AsyncMock(side_effect=refresh_side_effect)

    async def _get(self, model, object_id):
        if model is models.CrawlerPipeline and object_id == self._pipeline.id:
            return self._pipeline
        return None


@pytest.mark.asyncio
async def test_execute_crawl_run_returns_normalized_results_and_warnings(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    results = [
        BaseCrawlerResult(
            url="https://example.com/jobs/1",
            title="Backend Engineer",
            description="short",
            company_name="Acme",
        ),
        BaseCrawlerResult(url=""),
    ]
    monkeypatch.delenv("MISSING_PROXY_TOKEN", raising=False)
    monkeypatch.setattr(
        etl_service,
        "_instantiate_adapter",
        lambda request, proxy_config: _FakeAdapter(results=results),
    )

    response = await etl_service.execute_crawl_run(
        CrawlRunExecuteRequest(
            run_id=uuid4(),
            source="linkedin",
            query_definition={"keywords": ["python"]},
            execution_policy={
                "headless": True,
                "proxy": {
                    "mode": "managed",
                    "upstream_base_url": "https://proxy.example.com/fetch",
                    "auth_header_env": "MISSING_PROXY_TOKEN",
                },
            },
        )
    )

    assert response.terminal_status == CrawlerExecutionTerminalStatus.SUCCESS
    assert response.stats == {"leads_found": 2, "errors": 1}
    assert len(response.results) == 1
    assert response.results[0].company_name == "Acme"
    assert any("MISSING_PROXY_TOKEN" in warning for warning in response.warnings)
    assert any("suspiciously short" in warning for warning in response.warnings)
    assert any("url is required" in warning for warning in response.warnings)


@pytest.mark.asyncio
async def test_execute_crawl_run_returns_failed_status_on_adapter_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        etl_service,
        "_instantiate_adapter",
        lambda request, proxy_config: _FakeAdapter(error=RuntimeError("proxy down")),
    )

    response = await etl_service.execute_crawl_run(
        CrawlRunExecuteRequest(
            run_id=uuid4(),
            source="glassdoor",
            query_definition={"keywords": "engineer"},
        )
    )

    assert response.terminal_status == CrawlerExecutionTerminalStatus.FAILED
    assert response.error_summary == "proxy down"


@pytest.mark.asyncio
async def test_call_etl_service_execute_posts_to_internal_app(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    response_payload = CrawlRunExecuteResponse(
        terminal_status=CrawlerExecutionTerminalStatus.SUCCESS,
        results=[
            CrawlResult(
                url="https://example.com/jobs/1",
                title="Backend Engineer",
            )
        ],
        stats={"leads_found": 1, "errors": 0},
    )
    execute_mock = AsyncMock(return_value=response_payload)
    monkeypatch.setattr(etl_router, "execute_crawl_run", execute_mock)

    transport = ASGITransport(app=etl_app)
    async with AsyncClient(
        transport=transport,
        base_url="http://etl-service",
    ) as client:
        response = await deps.call_etl_service_execute(
            CrawlRunExecuteRequest(
                run_id=uuid4(),
                source="linkedin",
                query_definition={},
            ),
            client=client,
        )

    assert response == response_payload
    execute_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_call_etl_service_execute_raises_on_http_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    execute_mock = AsyncMock(side_effect=RuntimeError("boom"))
    monkeypatch.setattr(etl_router, "execute_crawl_run", execute_mock)

    transport = ASGITransport(app=etl_app, raise_app_exceptions=False)
    async with AsyncClient(
        transport=transport,
        base_url="http://etl-service",
    ) as client:
        with pytest.raises(httpx.HTTPStatusError):
            await deps.call_etl_service_execute(
                CrawlRunExecuteRequest(
                    run_id=uuid4(),
                    source="linkedin",
                    query_definition={},
                ),
                client=client,
            )


@pytest.mark.asyncio
async def test_execute_crawler_run_persists_etl_service_results(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    pipeline = SimpleNamespace(
        id=uuid4(),
        name="LinkedIn Pipeline",
        source="linkedin",
        query_definition={},
        execution_policy={},
        schedule_definition=None,
        requires_approval=False,
    )
    run = SimpleNamespace(
        id=uuid4(),
        crawler_pipeline_id=pipeline.id,
        trigger_type="manual",
        status="pending",
        started_at=None,
        finished_at=None,
        stats=None,
        error_summary=None,
    )
    event = SimpleNamespace(status="pending", message="")
    db = _FakeDb(pipeline)
    user = SimpleNamespace(id=uuid4())

    monkeypatch.setattr(
        deps,
        "_find_orchestration_event_for_run",
        AsyncMock(return_value=event),
    )
    monkeypatch.setattr(
        deps,
        "call_etl_service_execute",
        AsyncMock(
            return_value=CrawlRunExecuteResponse(
                terminal_status=CrawlerExecutionTerminalStatus.SUCCESS,
                results=[
                    CrawlResult(
                        url="https://example.com/jobs/1",
                        title="Backend Engineer",
                        description="Build APIs",
                    )
                ],
                stats={"leads_found": 1, "errors": 0},
            )
        ),
    )
    monkeypatch.setattr(
        deps.schemas.UserRead,
        "model_validate",
        lambda user_obj, from_attributes=True: SimpleNamespace(id=user_obj.id),
    )
    monkeypatch.setattr(
        deps,
        "create_lead",
        AsyncMock(
            return_value=SimpleNamespace(
                disposition=schemas.LeadExtractDisposition.CREATED
            )
        ),
    )

    result = await deps.execute_crawler_run(run, db, user)

    assert result.status == "success"
    assert result.stats == {
        "leads_found": 1,
        "leads_created": 1,
        "leads_deduped": 0,
        "errors": 0,
    }
    assert event.status == "success"


@pytest.mark.asyncio
async def test_execute_crawler_run_marks_pending_review_when_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    pipeline = SimpleNamespace(
        id=uuid4(),
        name="Approval Pipeline",
        source="linkedin",
        query_definition={},
        execution_policy={},
        schedule_definition=None,
        requires_approval=True,
    )
    run = SimpleNamespace(
        id=uuid4(),
        crawler_pipeline_id=pipeline.id,
        trigger_type="manual",
        status="pending",
        started_at=None,
        finished_at=None,
        stats=None,
        error_summary=None,
    )
    event = SimpleNamespace(status="pending", message="")
    db = _FakeDb(pipeline)
    user = SimpleNamespace(id=uuid4())

    monkeypatch.setattr(
        deps,
        "_find_orchestration_event_for_run",
        AsyncMock(return_value=event),
    )
    monkeypatch.setattr(
        deps,
        "call_etl_service_execute",
        AsyncMock(
            return_value=CrawlRunExecuteResponse(
                terminal_status=CrawlerExecutionTerminalStatus.SUCCESS,
                results=[
                    CrawlResult(
                        url="https://example.com/jobs/1",
                        title="Backend Engineer",
                    )
                ],
                stats={"leads_found": 1, "errors": 0},
            )
        ),
    )
    monkeypatch.setattr(
        deps.schemas.UserRead,
        "model_validate",
        lambda user_obj, from_attributes=True: SimpleNamespace(id=user_obj.id),
    )
    monkeypatch.setattr(
        deps,
        "create_lead",
        AsyncMock(
            return_value=SimpleNamespace(
                disposition=schemas.LeadExtractDisposition.CREATED
            )
        ),
    )

    result = await deps.execute_crawler_run(run, db, user)

    assert result.status == "pending_review"
    assert event.status == "pending_review"


@pytest.mark.asyncio
async def test_execute_crawler_run_marks_failed_when_etl_service_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    pipeline = SimpleNamespace(
        id=uuid4(),
        name="Broken Pipeline",
        source="linkedin",
        query_definition={},
        execution_policy={},
        schedule_definition=None,
        requires_approval=False,
    )
    run = SimpleNamespace(
        id=uuid4(),
        crawler_pipeline_id=pipeline.id,
        trigger_type="manual",
        status="pending",
        started_at=None,
        finished_at=None,
        stats=None,
        error_summary=None,
    )
    event = SimpleNamespace(status="pending", message="")
    db = _FakeDb(pipeline)
    user = SimpleNamespace(id=uuid4())

    monkeypatch.setattr(
        deps,
        "_find_orchestration_event_for_run",
        AsyncMock(return_value=event),
    )
    monkeypatch.setattr(
        deps,
        "call_etl_service_execute",
        AsyncMock(
            return_value=CrawlRunExecuteResponse(
                terminal_status=CrawlerExecutionTerminalStatus.FAILED,
                stats={"leads_found": 0, "errors": 1},
                error_summary="proxy down",
            )
        ),
    )
    create_lead_mock = AsyncMock()
    monkeypatch.setattr(deps, "create_lead", create_lead_mock)
    monkeypatch.setattr(
        deps.schemas.UserRead,
        "model_validate",
        lambda user_obj, from_attributes=True: SimpleNamespace(id=user_obj.id),
    )

    result = await deps.execute_crawler_run(run, db, user)

    assert result.status == "failed"
    assert result.error_summary == "proxy down"
    assert event.status == "failure"
    create_lead_mock.assert_not_awaited()


@pytest.mark.asyncio
async def test_execute_crawler_run_respects_cancelled_state_before_persist(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    pipeline = SimpleNamespace(
        id=uuid4(),
        name="Cancelled Pipeline",
        source="linkedin",
        query_definition={},
        execution_policy={},
        schedule_definition=None,
        requires_approval=False,
    )
    run = SimpleNamespace(
        id=uuid4(),
        crawler_pipeline_id=pipeline.id,
        trigger_type="manual",
        status="pending",
        started_at=None,
        finished_at=None,
        stats=None,
        error_summary=None,
    )
    event = SimpleNamespace(status="pending", message="")

    refresh_calls = 0

    async def refresh_side_effect(target, attrs=None):
        nonlocal refresh_calls
        refresh_calls += 1
        if target is run and refresh_calls == 1:
            run.status = "cancelled"

    db = _FakeDb(pipeline, refresh_side_effect=refresh_side_effect)
    user = SimpleNamespace(id=uuid4())

    monkeypatch.setattr(
        deps,
        "_find_orchestration_event_for_run",
        AsyncMock(return_value=event),
    )
    monkeypatch.setattr(
        deps,
        "call_etl_service_execute",
        AsyncMock(
            return_value=CrawlRunExecuteResponse(
                terminal_status=CrawlerExecutionTerminalStatus.SUCCESS,
                results=[
                    CrawlResult(
                        url="https://example.com/jobs/1",
                        title="Backend Engineer",
                    )
                ],
                stats={"leads_found": 1, "errors": 0},
            )
        ),
    )
    monkeypatch.setattr(
        deps.schemas.UserRead,
        "model_validate",
        lambda user_obj, from_attributes=True: SimpleNamespace(id=user_obj.id),
    )
    create_lead_mock = AsyncMock()
    monkeypatch.setattr(deps, "create_lead", create_lead_mock)

    result = await deps.execute_crawler_run(run, db, user)

    assert result.status == "cancelled"
    assert result.stats == {
        "leads_found": 1,
        "leads_created": 0,
        "leads_deduped": 0,
        "errors": 0,
    }
    assert event.message == "Crawler run cancelled externally"
    create_lead_mock.assert_not_awaited()
