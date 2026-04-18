"""
ETL crawler base classes.

CrawlerBase — async context manager owning the Playwright browser lifecycle.
CrawlerResult — normalized crawler output compatible with LeadCreate payloads.

Retry and validation utilities are included to harden LinkedIn/Glassdoor crawlers.
"""

from __future__ import annotations

import os
import random
from asyncio import Future, ensure_future, get_event_loop, sleep
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Literal, TypedDict, TypeVar
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from aiofiles import open as aopen
from bs4 import BeautifulSoup
from playwright.async_api import Locator, Page, async_playwright

from app import schemas

try:
    # playwright-stealth >=2.x exposes a class-based API.
    from playwright_stealth import Stealth as _Stealth

    async def _apply_stealth(page: Page) -> None:  # type: ignore[misc]
        await _Stealth().apply_stealth_async(page)

except ImportError:
    # Older package (<2.x) exposes stealth_async directly.
    from playwright_stealth import stealth_async as _apply_stealth  # type: ignore

from app.logging import get_logger

logger = get_logger(__name__)

T = TypeVar("T")


class ProxyConfig(TypedDict, total=False):
    mode: Literal["direct", "managed"]
    upstream_base_url: str
    auth_header_env: str


def build_proxy_headers(proxy_config: ProxyConfig | None) -> dict[str, str] | None:
    if not proxy_config or proxy_config.get("mode", "direct") != "managed":
        return None

    env_name = proxy_config.get("auth_header_env")
    if not env_name:
        return None

    header_value = os.getenv(env_name, "").strip()
    if not header_value:
        return None

    return {"Authorization": header_value}


def resolve_navigation_url(url: str, proxy_config: ProxyConfig | None) -> str:
    if not proxy_config or proxy_config.get("mode", "direct") != "managed":
        return url

    upstream_base_url = (proxy_config.get("upstream_base_url") or "").strip()
    if not upstream_base_url:
        return url

    parsed = urlparse(upstream_base_url)
    query_pairs = parse_qsl(parsed.query, keep_blank_values=True)
    query_pairs.append(("url", url))
    return urlunparse(parsed._replace(query=urlencode(query_pairs, doseq=True)))


# ---------------------------------------------------------------------------
# Retry configuration defaults
# ---------------------------------------------------------------------------

DEFAULT_MAX_RETRIES = 3
DEFAULT_BASE_DELAY = 1.0  # seconds
DEFAULT_MAX_DELAY = 30.0  # seconds
DEFAULT_JITTER = 0.5  # ±50% jitter

# Validation thresholds
MIN_DESCRIPTION_LENGTH = 20  # Characters below this trigger a warning

# Playwright and network errors that warrant a retry
RETRYABLE_EXCEPTIONS = (
    TimeoutError,
    ConnectionError,
    OSError,
)


async def async_retry(
    coro_func: Callable[..., Any],
    *args: Any,
    max_retries: int = DEFAULT_MAX_RETRIES,
    base_delay: float = DEFAULT_BASE_DELAY,
    max_delay: float = DEFAULT_MAX_DELAY,
    jitter: float = DEFAULT_JITTER,
    retryable_exceptions: tuple = RETRYABLE_EXCEPTIONS,
    **kwargs: Any,
) -> Any:
    """Execute an async function with exponential backoff retry logic.

    Parameters
    ----------
    coro_func : Callable
        The async function to call (not awaited yet).
    *args
        Positional arguments forwarded to coro_func.
    max_retries : int
        Maximum number of retry attempts (default: 3).
    base_delay : float
        Initial delay in seconds before first retry (default: 1.0).
    max_delay : float
        Cap on delay to prevent excessive waits (default: 30.0).
    jitter : float
        Random jitter factor (0.5 = ±50%) to spread retries (default: 0.5).
    retryable_exceptions : tuple
        Exception types that should trigger a retry.
    **kwargs
        Keyword arguments forwarded to coro_func.

    Returns
    -------
    Any
        The return value from coro_func on success.

    Raises
    ------
    Exception
        The last exception encountered after all retries are exhausted.
    """
    last_exception: Exception | None = None

    for attempt in range(max_retries + 1):
        try:
            return await coro_func(*args, **kwargs)
        except retryable_exceptions as exc:
            last_exception = exc
            if attempt >= max_retries:
                logger.warning(
                    "Retry exhausted after %d attempts: %s", attempt + 1, exc
                )
                raise

            # Exponential backoff with jitter
            delay = min(base_delay * (2**attempt), max_delay)
            jitter_range = delay * jitter
            actual_delay = delay + random.uniform(-jitter_range, jitter_range)
            actual_delay = max(0.1, actual_delay)  # ensure positive

            logger.info(
                "Attempt %d/%d failed (%s), retrying in %.2fs",
                attempt + 1,
                max_retries + 1,
                type(exc).__name__,
                actual_delay,
            )
            await sleep(actual_delay)

    # Should not reach here, but raise last exception if we somehow do
    if last_exception:
        raise last_exception
    raise RuntimeError("Retry loop completed without success or exception")


# ---------------------------------------------------------------------------
# New abstractions
# ---------------------------------------------------------------------------


@dataclass
class CrawlerResultValidation:
    """Validation result from CrawlerResult.validate()."""

    is_valid: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass
class CrawlerResult:
    """Normalized output from a single crawled job posting.

    Fields intentionally mirror BaseLeadShared so that the Phase-4 execution
    pipeline can trivially construct a LeadCreate payload from one of these.
    """

    url: str = ""
    title: str | None = None
    description: str | None = None
    location: str | None = None
    salary: str | None = None
    job_function: str | None = None
    employment_type: str | None = None
    seniority_level: str | None = None
    education_level: str | None = None
    company_name: str | None = None

    def validate(self) -> CrawlerResultValidation:
        """Validate the crawler result for completeness and correctness.

        Returns a CrawlerResultValidation object with is_valid=True if the
        result meets minimum requirements for lead creation.

        Validation rules:
        - url is required and must be a valid HTTP(S) URL
        - At least one of title/description should be non-empty (warning if both empty)

        Returns
        -------
        CrawlerResultValidation
            Object containing is_valid bool, errors list, and warnings list.
        """
        errors: list[str] = []
        warnings: list[str] = []

        # URL is required
        if not self.url:
            errors.append("url is required but empty")
        elif not self._is_valid_url(self.url):
            errors.append(f"url is not a valid HTTP(S) URL: {self.url[:100]}")

        # Warn if no meaningful content
        has_title = bool(self.title and self.title.strip())
        has_description = bool(self.description and self.description.strip())
        if not has_title and not has_description:
            warnings.append("Both title and description are empty")

        # Warn if description looks like an error message
        if self.description and len(self.description.strip()) < MIN_DESCRIPTION_LENGTH:
            warnings.append(
                f"Description is suspiciously short (< {MIN_DESCRIPTION_LENGTH} chars)"
            )

        return CrawlerResultValidation(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
        )

    def is_valid(self) -> bool:
        """Convenience method: returns True if validate().is_valid is True."""
        return self.validate().is_valid

    @staticmethod
    def _is_valid_url(url: str) -> bool:
        """Check if URL is a valid HTTP or HTTPS URL."""
        try:
            parsed = urlparse(url)
            return parsed.scheme in ("http", "https") and bool(parsed.netloc)
        except Exception:
            return False


class CrawlerBase:
    """Async Playwright browser wrapper.

    Usage::

        async with CrawlerBase(headless=True) as crawler:
            await crawler.navigate("https://example.com")
            text = await crawler.get_text("h1")
    """

    def __init__(
        self,
        headless: bool = True,
        viewport: dict[str, int] | None = None,
        timeout: int = 30_000,
        proxy_config: ProxyConfig | None = None,
    ) -> None:
        self._headless = headless
        self._viewport = viewport
        self._timeout = timeout
        self._proxy_config = proxy_config or {}
        self._playwright = None
        self.browser = None
        self.context = None
        self.page: Page | None = None

    # -- lifecycle -----------------------------------------------------------

    async def start(self, headless: bool | None = None) -> None:
        """Launch Chromium, create a context and page with stealth applied."""
        headless = headless if headless is not None else self._headless
        logger.info("Starting Chromium browser (headless=%s)", headless)
        self._playwright = await async_playwright().start()
        self.browser = await self._playwright.chromium.launch(headless=headless)
        ctx_kwargs: dict = {}
        if self._viewport:
            ctx_kwargs["viewport"] = self._viewport
        proxy_headers = build_proxy_headers(self._proxy_config)
        if proxy_headers:
            ctx_kwargs["extra_http_headers"] = proxy_headers
        self.context = await self.browser.new_context(**ctx_kwargs)
        self.context.set_default_timeout(self._timeout)
        self.page = await self.context.new_page()
        await _apply_stealth(self.page)

    async def stop(self) -> None:
        """Tear down page, context, browser and Playwright in order."""
        logger.info("Stopping crawler browser")
        if self.page is not None:
            await self.page.close()
            self.page = None
        if self.context is not None:
            await self.context.close()
            self.context = None
        if self.browser is not None:
            await self.browser.close()
            self.browser = None
        if self._playwright is not None:
            await self._playwright.stop()
            self._playwright = None

    async def __aenter__(self) -> "CrawlerBase":
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        await self.stop()

    # -- helpers -------------------------------------------------------------

    def _require_page(self) -> Page:
        if self.page is None:
            raise RuntimeError("Browser page is not initialised — call start() first")
        return self.page

    async def navigate(self, url: str, wait_until: str = "domcontentloaded") -> None:
        page = self._require_page()
        target_url = resolve_navigation_url(url, self._proxy_config)
        logger.info("Navigating to %s", target_url)
        await page.goto(target_url, wait_until=wait_until)

    async def navigate_with_retry(
        self,
        url: str,
        wait_until: str = "domcontentloaded",
        max_retries: int = DEFAULT_MAX_RETRIES,
    ) -> None:
        """Navigate to URL with automatic retry on transient failures.

        Uses exponential backoff for retries on timeout and network errors.

        Parameters
        ----------
        url : str
            The URL to navigate to.
        wait_until : str
            Wait condition ('domcontentloaded', 'load', 'networkidle').
        max_retries : int
            Maximum retry attempts (default: 3).
        """
        await async_retry(
            self.navigate,
            url,
            wait_until=wait_until,
            max_retries=max_retries,
        )

    async def wait_for_selector(self, selector: str, *, timeout: int = 10_000) -> None:
        page = self._require_page()
        await page.wait_for_selector(selector, timeout=timeout)

    async def click(self, selector: str) -> None:
        page = self._require_page()
        await page.click(selector)

    async def click_with_retry(
        self,
        selector: str,
        max_retries: int = DEFAULT_MAX_RETRIES,
    ) -> None:
        """Click an element with automatic retry on transient failures.

        Parameters
        ----------
        selector : str
            CSS selector for the element to click.
        max_retries : int
            Maximum retry attempts (default: 3).
        """
        await async_retry(self.click, selector, max_retries=max_retries)

    async def fill(self, selector: str, value: str) -> None:
        page = self._require_page()
        await page.fill(selector, value)

    async def fill_with_retry(
        self,
        selector: str,
        value: str,
        max_retries: int = DEFAULT_MAX_RETRIES,
    ) -> None:
        """Fill an input field with automatic retry on transient failures.

        Parameters
        ----------
        selector : str
            CSS selector for the input element.
        value : str
            Value to fill in.
        max_retries : int
            Maximum retry attempts (default: 3).
        """
        await async_retry(self.fill, selector, value, max_retries=max_retries)

    async def get_text(self, selector: str) -> str:
        page = self._require_page()
        return await page.inner_text(selector)

    async def get_html(self, selector: str) -> str:
        page = self._require_page()
        return await page.inner_html(selector)

    async def wait_for_load_state(
        self,
        state: Literal["domcontentloaded", "load", "networkidle"] = "load",
    ) -> None:
        page = self._require_page()
        await page.wait_for_load_state(state)


# ---------------------------------------------------------------------------
# Legacy classes — DEPRECATED, kept for backwards compatibility only.
# New code should use CrawlerBase / CrawlerResult above.
# ---------------------------------------------------------------------------


class AsyncBaseModel(schemas.BaseSchema, extra="allow"):
    """DEPRECATED — use CrawlerBase instead."""

    _tasks: list = []

    @staticmethod
    async def _run_sync(func, *args, **kwargs):
        loop = get_event_loop()
        return await loop.run_in_executor(None, func, *args, **kwargs)

    @classmethod
    async def load(cls, file_path: str):
        async with aopen(file_path, "r") as f:
            data = await f.read()
            return await cls._run_sync(lambda: cls.parse_raw(data))

    async def run_async(self, func, *args, **kwargs) -> Future:
        task = ensure_future(self._run_sync(func, *args, **kwargs))
        self._tasks.append(task)
        return await task

    async def to_dict(self) -> dict:
        return await self._run_sync(lambda: self.__dict__)

    async def dump(self, file_path: str, indent: int = 4):
        Path(file_path).parent.mkdir(parents=True, exist_ok=True)
        async with aopen(file_path, "a") as f:
            await f.write(self.json())

    async def wait(self, seconds: int) -> None:
        if seconds > 0:
            await sleep(seconds)

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_value, traceback) -> None:
        pass

    async def __await__(self):
        return self._run_sync(lambda: self).__await__()


class Job(AsyncBaseModel, schemas.LeadCreate):
    """DEPRECATED — use CrawlerResult instead."""

    async def dump(self, file_path: str, indent: int = 4):
        return await super().dump(file_path=file_path, indent=indent)


class Scrapper(AsyncBaseModel):
    """DEPRECATED — use CrawlerBase instead."""

    def __init__(self):
        self._playwright = None
        self.context = None
        self.browser = None
        self.page = None
        super().__init__()

    async def start(self, headless: bool = False):
        logger.info("Starting Chromium Browser")
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=headless)
        self.context = await self.browser.new_context()
        self.page = await self.context.new_page()
        await _apply_stealth(self.page)

    async def stop(self):
        logger.info("Stopping Scrapper Browser")
        if self.page is not None:
            await self.page.close()
        if self.browser is not None:
            await self.browser.close()
        if self._playwright is not None:
            await self.playwright.stop()

    async def wait_for_load_state(
        self,
        state: Literal["domcontentloaded", "load", "networkidle"] | None = "load",
    ):
        if self.page is not None:
            await self.page.wait_for_load_state(state)

    async def goto(self, url: str):
        if self.page is not None:
            logger.info(f"Getting {url} and waiting for dynamic content to load")
            await self.page.goto(url)

    async def keyboard_press(self, key: str):
        if self.page is None:
            raise ValueError("Page is not initialized")
        await self.page.keyboard.press(key)

    def locator(self, selector: str) -> Locator:
        if self.page is None:
            raise ValueError("Page is not initialized")
        return self.page.locator(selector)

    def get_by_placeholder(self, placeholder: str) -> Locator:
        if self.page is None:
            raise ValueError("Page is not initialized")
        return self.page.get_by_placeholder(placeholder)

    def get_by_label(self, label: str) -> Locator:
        if self.page is None:
            raise ValueError("Page is not initialized")
        return self.page.get_by_label(label)

    async def content(self):
        if self.page is not None:
            return await self.page.content()

    async def soup(self) -> BeautifulSoup:
        logger.info("Getting page soup")
        return BeautifulSoup(await self.content() or "", "html.parser")

    async def screenshot(self, path: str):
        logger.info(f"Saving screenshot to {path}")
        if self.page is not None:
            await self.page.screenshot(path=path)

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_value, traceback) -> None:
        await self.stop()


async def get_scrapper(headless: bool = False) -> Scrapper:
    """DEPRECATED — use ``async with CrawlerBase() as crawler`` instead."""
    driver = Scrapper()
    await driver.start(headless)
    return driver
