from asyncio import Future, ensure_future, get_event_loop, sleep
from pathlib import Path
from typing import Literal

from aiofiles import open as aopen
from bs4 import BeautifulSoup
from playwright.async_api import Keyboard, Locator, async_playwright
from playwright_stealth import stealth_async  # type: ignore

from app import schemas
from app.logging import get_logger

logger = get_logger(__name__)


class AsyncBaseModel(schemas.BaseSchema, extra="allow"):
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
        # Ref: https://peps.python.org/pep-0492/#asynchronous-context-managers-and-async-with
        return self

    async def __aexit__(self, exc_type, exc_value, traceback) -> None:
        # Ref: https://peps.python.org/pep-0492/#asynchronous-context-managers-and-async-with
        pass

    async def __await__(self):
        return self._run_sync(lambda: self).__await__()


class Job(AsyncBaseModel, schemas.LeadCreate):
    async def dump(
        self, file_path: str, indent: int = 4
    ):  # Fix: Add the "indent" parameter to match the superclass signature
        return await super().dump(
            file_path=file_path,
            indent=indent,
        )


class Scrapper:
    def __init__(self):
        self._playwright = None
        self.context = None
        self.browser = None
        self.page = None

    async def start(self, headless: bool = False):
        logger.info("Starting Chromium Browser")
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=headless)
        self.context = await self.browser.new_context(
            # viewport={"width": 1920, "height": 1080}
        )
        self.page = await self.context.new_page()
        await stealth_async(self.page)

    async def stop(self):
        logger.info("Stopping Scrapper Browser")
        if self.page is not None:
            await self.page.close()
        if self.browser is not None:
            await self.browser.close()
        if self._playwright is not None:
            await self.playwright.stop()

    async def wait_for_load_state(
        self, state: Literal["domcontentloaded", "load", "networkidle"] | None = "load"
    ):
        if self.page is not None:
            await self.page.wait_for_load_state(state)

    async def goto(self, url: str):
        if self.page is not None:
            logger.info(f"Getting {url} and waiting for dynamic content to load")
            await self.page.goto(url)
            # await self.page.wait_for_load_state()

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

    async def capture_bot_test(self):
        await self.goto("https://bot.sannysoft.com/")
        await self.screenshot(path="bot_test.png")

    async def capture_headless_test(self):
        await self.goto("https://arh.antoinevastel.com/bots/areyouheadless")
        await self.screenshot(path="headless_test.png")

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        logger.info("Closing Browser")
        await self.stop()


async def get_scrapper(headless: bool = False) -> Scrapper:
    driver = Scrapper()
    await driver.start(headless)
    return driver
