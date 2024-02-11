import asyncio
from typing import Any, Awaitable

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

from logging import getLogger

log = getLogger(__name__)

class Driver:
    def __init__(self):
        self._playwright = None
        self.browser = None
        self.page = None

    async def start(self):
        log.critical("Starting Browser")
        self._playwright = await async_playwright().start()
        # Using Chromium, but you can also use firefox or webkit
        self.browser = await self._playwright.chromium.launch(headless=True)  # Add options based on your conf.chrome.options
        self.page = await self.browser.new_page()

    async def stop(self):
        await self.page.close()
        await self.browser.close()
        await self._playwright.stop()

    async def get(self, url: str):
        log.info(f"Getting {url}")
        await self.page.goto(url)

    async def page_soup(self) -> BeautifulSoup:
        log.info("Getting page soup")
        page_content = await self.page.content()
        return BeautifulSoup(page_content, "html.parser")

    async def find_element(self, selector: str) -> Any:
        log.info(f"Finding element {selector}")
        return await self.page.query_selector(selector)

    async def find_elements(self, selector: str) -> list:
        log.info(f"Finding elements {selector}")
        return await self.page.query_selector_all(selector)

    async def send_keys(self, selector: str, keys: str):
        log.info(f"Sending keys to element {selector}")
        await self.page.fill(selector, keys)


    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        log.info("Closing Browser")
        await self.stop()


async def get_driver() -> Driver:
    driver = Driver()
    await driver.start()
    return driver
