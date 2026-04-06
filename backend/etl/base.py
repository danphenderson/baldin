"""
ETL crawler base classes.

CrawlerBase — async context manager owning the Playwright browser lifecycle.
CrawlerResult — normalized crawler output compatible with LeadCreate payloads.
"""

from __future__ import annotations

from asyncio import Future, ensure_future, get_event_loop, sleep
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from aiofiles import open as aopen
from bs4 import BeautifulSoup
from playwright.async_api import Locator, Page, async_playwright

from app import schemas

try:
    # playwright-stealth >=2.x exposes a class-based API.
    from playwright_stealth import Stealth as _Stealth

    async def _apply_stealth(page: Page) -> None:  # type: ignore[misc]
        _Stealth().apply_stealth_async(page)

except ImportError:
    # Older package (<2.x) exposes stealth_async directly.
    from playwright_stealth import stealth_async as _apply_stealth  # type: ignore

from app.logging import get_logger

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# New abstractions
# ---------------------------------------------------------------------------


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
    ) -> None:
        self._headless = headless
        self._viewport = viewport
        self._timeout = timeout
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
        logger.info("Navigating to %s", url)
        await page.goto(url, wait_until=wait_until)

    async def wait_for_selector(self, selector: str, *, timeout: int = 10_000) -> None:
        page = self._require_page()
        await page.wait_for_selector(selector, timeout=timeout)

    async def click(self, selector: str) -> None:
        page = self._require_page()
        await page.click(selector)

    async def fill(self, selector: str, value: str) -> None:
        page = self._require_page()
        await page.fill(selector, value)

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
