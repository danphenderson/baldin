from typing import Literal

from bs4 import BeautifulSoup
from playwright.async_api import Keyboard, Locator, async_playwright
from playwright_stealth import stealth_async  # type: ignore

from .logging import get_logger

logger = get_logger(__name__)


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
