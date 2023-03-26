import asyncio
from selenium import webdriver
from bs4 import BeautifulSoup
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.common.keys import Keys
from typing import Any, Awaitable
from app.conf import get_chrome_settings



class Driver:
    
    @staticmethod
    async def _run_sync(func) -> Awaitable[Any]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, func)
    
    def __init__(self):
        self.settings = get_chrome_settings()
        self.browser = webdriver.Chrome(self.settings.driver_path, options=self.settings.options)
        self._tasks = []

    def __aenter__(self):
        return self

    def __await__(self):
        return self._run_sync(lambda: self).__await__()

    async def __aexit__(self, exc_type, exc_value, traceback):
        await self.close()

    async def run_async(self, func) -> Awaitable[Any]:
        task = asyncio.ensure_future(self._run_sync(func))
        self._tasks.append(task)
        return await task

    @property
    def current_url(self) -> str:
        return self.browser.current_url

    async def get(self, url: str, wait: int = 0) -> None:
        await self.run_async(lambda: self.browser.get(url))
        if wait > 0:
            await self.wait(wait)

    async def page_soup(self) -> Awaitable[BeautifulSoup]:
        return await self.run_async(lambda: BeautifulSoup(self.browser.page_source.strip(), "html.parser"))

    async def element(self, value: str, by: str = "id") -> Awaitable[WebElement]:
        return await self.run_async(lambda: self.browser.find_element(by=by, value=value))
        
    async def elements(self, value: str, by: str = "id") -> Awaitable[list[WebElement]]:
        return await self.run_async(lambda: self.browser.find_elements(by=by, value=value))

    async def send_element_keys(self, value: str, keys: str, by: str = "id", key = Keys.ENTER) -> None:
        element = await self.element(value, by)
        if not isinstance(element, WebElement):
            raise ValueError(f"Element {value} not found, search by {by}")
        await self.run_async(lambda: element.send_keys(keys, key))
    
    async def wait(self, seconds) -> None:
        await asyncio.sleep(seconds)

    async def close(self) -> None:
        await self.run_async(self.browser.close)


async def get_driver() -> Awaitable[Driver]:
    return await Driver()


