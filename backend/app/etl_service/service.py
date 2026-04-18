from __future__ import annotations

import os
from typing import Any

from app.etl_service.schemas import (
    CrawlerExecutionTerminalStatus,
    CrawlResult,
    CrawlRunExecuteRequest,
    CrawlRunExecuteResponse,
)
from app.logging import get_async_logger
from etl.glassdoor import GlassdoorCrawler
from etl.linkedin import LinkedInCrawler

log = get_async_logger(__name__)


def _proxy_config_from_execution_policy(
    request: CrawlRunExecuteRequest,
) -> tuple[dict[str, Any] | None, list[str]]:
    execution_policy = request.execution_policy
    proxy_policy = execution_policy.proxy if execution_policy is not None else None
    if proxy_policy is None:
        return None, []

    warnings: list[str] = []
    if (
        proxy_policy.auth_header_env
        and not os.getenv(proxy_policy.auth_header_env, "").strip()
    ):
        warnings.append(
            f"Proxy auth header env '{proxy_policy.auth_header_env}' is not set; continuing without Authorization header."
        )

    return proxy_policy.model_dump(exclude_none=True), warnings


def _instantiate_adapter(
    request: CrawlRunExecuteRequest,
    proxy_config: dict[str, Any] | None,
):
    execution_policy = request.execution_policy
    headless = True if execution_policy is None else execution_policy.headless

    if request.source == "linkedin":
        return LinkedInCrawler(
            keywords=request.query_definition.get("keywords", []),
            location=request.query_definition.get("location", ""),
            page_start=request.query_definition.get("page_start", 1),
            page_end=request.query_definition.get("page_end", 5),
            headless=headless,
            proxy_config=proxy_config,
        )

    if request.source == "glassdoor":
        return GlassdoorCrawler(
            keywords=request.query_definition.get("keywords", ""),
            location=request.query_definition.get("location", ""),
            headless=headless,
            proxy_config=proxy_config,
        )

    raise ValueError(f"Unsupported crawler source: {request.source}")


async def execute_crawl_run(
    request: CrawlRunExecuteRequest,
) -> CrawlRunExecuteResponse:
    stats = {
        "leads_found": 0,
        "errors": 0,
    }
    results: list[CrawlResult] = []
    proxy_config, warnings = _proxy_config_from_execution_policy(request)

    await log.info(
        "ETL service: executing crawl run %s source=%s",
        request.run_id,
        request.source,
    )

    try:
        adapter = _instantiate_adapter(request, proxy_config)
        async with adapter:
            async for crawler_result in adapter.search_jobs():
                stats["leads_found"] += 1
                validation = crawler_result.validate()

                if not validation.is_valid:
                    stats["errors"] += 1
                    warnings.extend(
                        f"{crawler_result.url or 'unknown'}: {error}"
                        for error in validation.errors
                    )
                    continue

                warnings.extend(
                    f"{crawler_result.url or 'unknown'}: {warning}"
                    for warning in validation.warnings
                )
                results.append(
                    CrawlResult.model_validate(crawler_result, from_attributes=True)
                )
    except Exception as exc:
        await log.exception(
            "ETL service: crawl run %s failed: %s",
            request.run_id,
            exc,
        )
        return CrawlRunExecuteResponse(
            terminal_status=CrawlerExecutionTerminalStatus.FAILED,
            results=results,
            stats=stats,
            error_summary=str(exc)[:2000],
            warnings=warnings,
        )

    return CrawlRunExecuteResponse(
        terminal_status=CrawlerExecutionTerminalStatus.SUCCESS,
        results=results,
        stats=stats,
        warnings=warnings,
    )
