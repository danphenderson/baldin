"""Tests for etl.base — CrawlerResult, CrawlerResultValidation, async_retry."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from etl.base import (
    DEFAULT_BASE_DELAY,
    DEFAULT_MAX_RETRIES,
    MIN_DESCRIPTION_LENGTH,
    RETRYABLE_EXCEPTIONS,
    CrawlerBase,
    CrawlerResult,
    _apply_stealth,
    async_retry,
    build_proxy_headers,
    resolve_navigation_url,
)

# ---------------------------------------------------------------------------
# CrawlerResult construction
# ---------------------------------------------------------------------------


class TestCrawlerResultConstruction:
    """CrawlerResult dataclass creation and field defaults."""

    def test_default_fields(self) -> None:
        result = CrawlerResult()
        assert result.url == ""
        assert result.title is None
        assert result.description is None
        assert result.location is None
        assert result.salary is None
        assert result.job_function is None
        assert result.employment_type is None
        assert result.seniority_level is None
        assert result.education_level is None
        assert result.company_name is None

    def test_full_construction(self) -> None:
        result = CrawlerResult(
            url="https://example.com/job/1",
            title="Backend Engineer",
            description="Build APIs and services.",
            location="Remote",
            salary="$120k",
            job_function="Engineering",
            employment_type="Full-time",
            seniority_level="Mid",
            education_level="Bachelor's",
            company_name="Acme",
        )
        assert result.url == "https://example.com/job/1"
        assert result.title == "Backend Engineer"
        assert result.company_name == "Acme"


# ---------------------------------------------------------------------------
# CrawlerResultValidation
# ---------------------------------------------------------------------------


class TestCrawlerResultValidation:
    """Validation logic exercised via CrawlerResult.validate()."""

    def test_valid_result_passes(self) -> None:
        result = CrawlerResult(
            url="https://example.com/job/42",
            title="Engineer",
            description="A " * MIN_DESCRIPTION_LENGTH,
        )
        v = result.validate()
        assert v.is_valid is True
        assert v.errors == []

    def test_empty_url_is_error(self) -> None:
        result = CrawlerResult(url="", title="Engineer")
        v = result.validate()
        assert v.is_valid is False
        assert any("url is required" in e for e in v.errors)

    def test_invalid_url_scheme_is_error(self) -> None:
        result = CrawlerResult(url="ftp://files.example.com/job", title="Eng")
        v = result.validate()
        assert v.is_valid is False
        assert any("not a valid HTTP" in e for e in v.errors)

    def test_url_without_netloc_is_error(self) -> None:
        result = CrawlerResult(url="https://", title="Eng")
        v = result.validate()
        assert v.is_valid is False

    def test_missing_title_and_description_warns(self) -> None:
        result = CrawlerResult(url="https://example.com/job/1")
        v = result.validate()
        assert v.is_valid is True  # warnings, not errors
        assert any("title and description are empty" in w for w in v.warnings)

    def test_short_description_warns(self) -> None:
        result = CrawlerResult(
            url="https://example.com/job/1",
            description="short",
        )
        v = result.validate()
        assert v.is_valid is True
        assert any("suspiciously short" in w for w in v.warnings)

    def test_adequate_description_no_warning(self) -> None:
        result = CrawlerResult(
            url="https://example.com/job/1",
            description="x" * MIN_DESCRIPTION_LENGTH,
        )
        v = result.validate()
        assert v.is_valid is True
        # Should not have the short-description warning
        assert not any("suspiciously short" in w for w in v.warnings)

    def test_is_valid_convenience_method(self) -> None:
        good = CrawlerResult(url="https://example.com/job/1", title="Eng")
        assert good.is_valid() is True

        bad = CrawlerResult(url="")
        assert bad.is_valid() is False

    def test_is_valid_url_static_helper(self) -> None:
        assert CrawlerResult._is_valid_url("https://example.com") is True
        assert CrawlerResult._is_valid_url("http://example.com/path") is True
        assert CrawlerResult._is_valid_url("ftp://no.good") is False
        assert CrawlerResult._is_valid_url("not-a-url") is False
        assert CrawlerResult._is_valid_url("") is False


# ---------------------------------------------------------------------------
# async_retry
# ---------------------------------------------------------------------------


class TestAsyncRetry:
    """Retry decorator behaviour: count, backoff, exception filtering."""

    async def test_succeeds_on_first_try(self) -> None:
        func = AsyncMock(return_value="ok")
        result = await async_retry(func, max_retries=3, base_delay=0.01)
        assert result == "ok"
        func.assert_awaited_once()

    async def test_retries_on_retryable_exception(self) -> None:
        func = AsyncMock(side_effect=[TimeoutError("boom"), "ok"])
        with patch("etl.base.sleep", new_callable=AsyncMock):
            result = await async_retry(func, max_retries=2, base_delay=0.01)
        assert result == "ok"
        assert func.await_count == 2

    async def test_raises_after_max_retries_exhausted(self) -> None:
        func = AsyncMock(side_effect=TimeoutError("always"))
        with patch("etl.base.sleep", new_callable=AsyncMock):
            with pytest.raises(TimeoutError, match="always"):
                await async_retry(func, max_retries=2, base_delay=0.01)
        # 1 initial + 2 retries = 3 total
        assert func.await_count == 3

    async def test_non_retryable_exception_propagates_immediately(self) -> None:
        func = AsyncMock(side_effect=ValueError("bad"))
        with pytest.raises(ValueError, match="bad"):
            await async_retry(func, max_retries=3, base_delay=0.01)
        func.assert_awaited_once()

    async def test_custom_retryable_exceptions(self) -> None:
        func = AsyncMock(side_effect=[KeyError("k"), "ok"])
        with patch("etl.base.sleep", new_callable=AsyncMock):
            result = await async_retry(
                func,
                max_retries=2,
                base_delay=0.01,
                retryable_exceptions=(KeyError,),
            )
        assert result == "ok"

    async def test_forwards_args_and_kwargs(self) -> None:
        async def func(a: int, b: str, c: int = 0) -> str:
            return f"{a}-{b}-{c}"

        result = await async_retry(func, 1, "x", c=42, max_retries=0, base_delay=0.01)
        assert result == "1-x-42"


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------


class TestConstants:
    """Verify sensible constant values."""

    def test_min_description_length_is_positive(self) -> None:
        assert MIN_DESCRIPTION_LENGTH > 0

    def test_default_retry_constants(self) -> None:
        assert DEFAULT_MAX_RETRIES >= 1
        assert DEFAULT_BASE_DELAY > 0

    def test_retryable_exceptions_are_tuple(self) -> None:
        assert isinstance(RETRYABLE_EXCEPTIONS, tuple)
        assert TimeoutError in RETRYABLE_EXCEPTIONS


# ---------------------------------------------------------------------------
# CrawlerBase._require_page guard
# ---------------------------------------------------------------------------


class TestCrawlerBaseGuard:
    """CrawlerBase raises when page is None."""

    def test_require_page_without_start_raises(self) -> None:
        crawler = CrawlerBase()
        with pytest.raises(RuntimeError, match="not initialised"):
            crawler._require_page()


class TestStealthApplication:
    async def test_apply_stealth_awaits_class_based_api(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        page = object()
        awaited: list[object] = []

        class FakeStealth:
            async def apply_stealth_async(self, received_page: object) -> None:
                awaited.append(received_page)

        monkeypatch.setattr("etl.base._Stealth", FakeStealth, raising=False)

        await _apply_stealth(page)  # type: ignore[arg-type]

        assert awaited == [page]


class TestProxyHelpers:
    """Proxy URL and header helpers for managed ETL execution."""

    def test_resolve_navigation_url_direct_mode_returns_original_url(self) -> None:
        url = "https://example.com/jobs/1"
        assert resolve_navigation_url(url, {"mode": "direct"}) == url

    def test_resolve_navigation_url_managed_mode_wraps_target_url(self) -> None:
        url = "https://example.com/jobs/1"
        resolved = resolve_navigation_url(
            url,
            {
                "mode": "managed",
                "upstream_base_url": "https://proxy.example.com/fetch?region=us",
            },
        )
        assert resolved.startswith("https://proxy.example.com/fetch?")
        assert "region=us" in resolved
        assert "url=https%3A%2F%2Fexample.com%2Fjobs%2F1" in resolved

    def test_build_proxy_headers_returns_authorization_header_from_env(
        self,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        monkeypatch.setenv("TEST_PROXY_AUTH", "Bearer test-token")

        assert build_proxy_headers(
            {
                "mode": "managed",
                "auth_header_env": "TEST_PROXY_AUTH",
            }
        ) == {"Authorization": "Bearer test-token"}

    def test_build_proxy_headers_returns_none_when_env_missing(
        self,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        monkeypatch.delenv("TEST_PROXY_AUTH", raising=False)

        assert (
            build_proxy_headers(
                {
                    "mode": "managed",
                    "auth_header_env": "TEST_PROXY_AUTH",
                }
            )
            is None
        )
