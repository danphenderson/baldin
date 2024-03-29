from typing import Awaitable
from unittest.mock import MagicMock

import pytest
from bs4 import BeautifulSoup  # type: ignore

from app.core.chrome import Driver, get_driver


@pytest.fixture
async def driver() -> Awaitable[Driver]:
    driver = await get_driver()
    return driver


@pytest.fixture
def mock_webdriver():
    return MagicMock()


@pytest.mark.asyncio
async def test_async_driver_get(driver, mock_webdriver):
    mock_webdriver.get.return_value = None
    driver.browser = mock_webdriver
    await driver.get("https://www.example.com")
    mock_webdriver.get.assert_called_with("https://www.example.com")


@pytest.mark.asyncio
async def test_async_driver_page_soup(driver, mock_webdriver):
    mock_webdriver.page_source = "<html><body><p>Example</p></body></html>"
    driver._driver = mock_webdriver
    soup = await driver.page_soup()
    assert isinstance(soup, BeautifulSoup)
    assert soup.p.text == "Example"  # type: ignore
