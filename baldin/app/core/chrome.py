import asyncio
from selenium import webdriver
from bs4 import BeautifulSoup
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager # type: ignore
from typing import Any, Awaitable
from app.core import conf
import openai

from app.logging import console_log, get_async_logger

log = get_async_logger(__name__)


class Driver:
    
    @staticmethod
    async def _run_sync(func) -> Awaitable[Any]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, func)
    
    def __init__(self):
        console_log.critical("Starting Chrome Driver")
        self.settings = conf.chrome
        self.browser = webdriver.Chrome(service=ChromeService(ChromeDriverManager().install()), options=self.settings.options)
        self._tasks = []

    def __aenter__(self):
        return self

    def __await__(self):
        return self._run_sync(lambda: self).__await__()

    async def __aexit__(self, exc_type, exc_value, traceback):
        await log.info(f"Closing Chrome Driver with {len(self._tasks)} tasks remaining")
        await self.close()

    async def run_async(self, func) -> Awaitable[Any]:
        await log.debug(f"Running async function {func.__name__}")
        task = asyncio.ensure_future(self._run_sync(func))
        self._tasks.append(task)
        await log.debug(f"Task {task} added to {len(self._tasks)} tasks")
        return await task

    @property
    def current_url(self) -> str:
        return self.browser.current_url

    async def get(self, url: str, wait: int = 0) -> None:
        await log.info(f"Getting {url}")
        await self.run_async(lambda: self.browser.get(url))
        if wait > 0:
            await self.wait(wait)

    async def page_soup(self) -> Awaitable[BeautifulSoup]:
        await log.info("Getting page soup")
        return await self.run_async(lambda: BeautifulSoup(self.browser.page_source.strip(), "html.parser"))

    async def element(self, value: str, by: str = "id") -> Awaitable[WebElement]:
        await log.info(f"Getting element {value} by {by}")
        return await self.run_async(lambda: self.browser.find_element(by=by, value=value))
        
    async def elements(self, value: str, by: str = "id") -> Awaitable[list[WebElement]]:
        return await self.run_async(lambda: self.browser.find_elements(by=by, value=value))

    async def send_element_keys(self, value: str, keys: str, by: str = "id", key = Keys.ENTER) -> None:
        await log.info(f"Sending keys {keys} to element {value} by {by}")
        element = await self.element(value, by)
        if not isinstance(element, WebElement):
            console_log.error(f"Element {value} not found, search by {by}")
            raise ValueError(f"Element {value} not found, search by {by}")
        await self.run_async(lambda: element.send_keys(keys, key))
    
    async def wait(self, seconds) -> None:
        await log.info(f"Waiting {seconds} seconds; there are {len(self._tasks)} tasks queued")
        await asyncio.sleep(seconds)

    async def close(self) -> None:
        console_log.critical(f"Closing Chrome Driver with {len(self._tasks)} tasks remaining")
        await self.run_async(self.browser.close)

    async def chat_completion(self, messages: list, max_tokens: int = 3000) -> Awaitable[str]:
        resp = await self.run_async(
            lambda: openai.ChatCompletion.create(
                model=conf.openai.model,
                messages=messages,
                max_tokens=max_tokens,
            )
        )
        return resp['choices'].pop(0).get('message', {}).get('content', '') # type: ignore



async def get_driver() -> Awaitable[Driver]:
    return await Driver()


