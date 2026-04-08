"""Tests for etl.glassdoor — GlassdoorCrawler URL / scraping / error handling.

All browser interactions are mocked; no real network calls are made.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

from etl.base import CrawlerResult
from etl.glassdoor import (
    GLASSDOOR_CONTENT_XPATH,
    GLASSDOOR_JOB_LISTING_SELECTOR,
    GLASSDOOR_JOB_TITLE_INPUT_XPATH,
    GLASSDOOR_LOCATION_INPUT_XPATH,
    GLASSDOOR_LOGIN_MODAL_SELECTOR,
    GLASSDOOR_MODAL_CLOSE_SELECTOR,
    GLASSDOOR_SEARCH_URL,
    GLASSDOOR_SHOW_MORE_XPATH,
    GlassdoorCrawler,
)

# ---------------------------------------------------------------------------
# Construction and defaults
# ---------------------------------------------------------------------------


class TestGlassdoorCrawlerConstruction:
    """Verify constructor stores parameters."""

    def test_defaults(self) -> None:
        crawler = GlassdoorCrawler()
        assert crawler.keywords == ""
        assert crawler.location == ""
        assert crawler._headless is True

    def test_custom_params(self) -> None:
        crawler = GlassdoorCrawler(
            keywords="python", location="NYC", headless=False, max_retries=5
        )
        assert crawler.keywords == "python"
        assert crawler.location == "NYC"
        assert crawler._headless is False
        assert crawler.max_retries == 5


# ---------------------------------------------------------------------------
# Selector constants
# ---------------------------------------------------------------------------


class TestGlassdoorSelectors:
    """Selector constants are non-empty strings."""

    def test_search_url(self) -> None:
        assert GLASSDOOR_SEARCH_URL.startswith("https://")

    def test_selectors_non_empty(self) -> None:
        for sel in [
            GLASSDOOR_JOB_TITLE_INPUT_XPATH,
            GLASSDOOR_LOCATION_INPUT_XPATH,
            GLASSDOOR_JOB_LISTING_SELECTOR,
            GLASSDOOR_SHOW_MORE_XPATH,
            GLASSDOOR_CONTENT_XPATH,
            GLASSDOOR_LOGIN_MODAL_SELECTOR,
            GLASSDOOR_MODAL_CLOSE_SELECTOR,
        ]:
            assert isinstance(sel, str) and len(sel) > 0


# ---------------------------------------------------------------------------
# bypass_login_modal
# ---------------------------------------------------------------------------


class TestBypassLoginModal:
    """Login modal dismissal uses correct selectors."""

    async def test_closes_modal_when_present(self) -> None:
        crawler = GlassdoorCrawler()
        mock_page = MagicMock()
        modal_locator = MagicMock()
        modal_locator.count = AsyncMock(return_value=1)
        close_locator = MagicMock()
        close_locator.click = AsyncMock()
        mock_page.locator = MagicMock(
            side_effect=lambda sel: (
                modal_locator
                if sel == GLASSDOOR_LOGIN_MODAL_SELECTOR
                else close_locator
            )
        )
        crawler.page = mock_page

        await crawler.bypass_login_modal()

        close_locator.click.assert_awaited_once()

    async def test_no_modal_does_not_raise(self) -> None:
        crawler = GlassdoorCrawler()
        mock_page = MagicMock()
        modal_locator = MagicMock()
        modal_locator.count = AsyncMock(return_value=0)
        mock_page.locator = MagicMock(return_value=modal_locator)
        crawler.page = mock_page

        # Should not raise
        await crawler.bypass_login_modal()


# ---------------------------------------------------------------------------
# scrape_job result normalisation
# ---------------------------------------------------------------------------


class TestGlassdoorScrapeJob:
    """scrape_job extracts description and returns CrawlerResult."""

    async def test_returns_crawler_result_with_description(self) -> None:
        crawler = GlassdoorCrawler()
        mock_page = MagicMock()

        # The content locator returns job description text
        content_locator = MagicMock()
        content_locator.inner_text = AsyncMock(
            return_value="Full job description text here"
        )

        # The show-more locator
        show_more_locator = MagicMock()
        show_more_locator.click = AsyncMock()

        def locator_side_effect(sel: str):
            if "show" in sel.lower() or GLASSDOOR_SHOW_MORE_XPATH in sel:
                return show_more_locator
            return content_locator

        mock_page.locator = MagicMock(side_effect=locator_side_effect)
        crawler.page = mock_page
        crawler.wait_for_load_state = AsyncMock()

        element = MagicMock()
        element.click = AsyncMock()

        result = await crawler.scrape_job(element)

        assert isinstance(result, CrawlerResult)
        assert result.description == "Full job description text here"

    async def test_handles_missing_show_more_button(self) -> None:
        """When show-more click fails, scraping still returns a result."""
        crawler = GlassdoorCrawler()
        mock_page = MagicMock()

        show_more_locator = MagicMock()
        show_more_locator.click = AsyncMock(side_effect=Exception("not found"))

        content_locator = MagicMock()
        content_locator.inner_text = AsyncMock(return_value="desc")

        mock_page.locator = MagicMock(
            side_effect=lambda sel: (
                show_more_locator
                if GLASSDOOR_SHOW_MORE_XPATH in sel
                else content_locator
            )
        )
        crawler.page = mock_page
        crawler.wait_for_load_state = AsyncMock()

        element = MagicMock()
        element.click = AsyncMock()

        result = await crawler.scrape_job(element)
        assert isinstance(result, CrawlerResult)
        assert result.description == "desc"

    async def test_handles_missing_description(self) -> None:
        """When description extraction fails, description is None."""
        crawler = GlassdoorCrawler()
        mock_page = MagicMock()

        show_more_locator = MagicMock()
        show_more_locator.click = AsyncMock(side_effect=Exception("no button"))

        content_locator = MagicMock()
        content_locator.inner_text = AsyncMock(side_effect=Exception("no content"))

        mock_page.locator = MagicMock(
            side_effect=lambda sel: (
                show_more_locator
                if GLASSDOOR_SHOW_MORE_XPATH in sel
                else content_locator
            )
        )
        crawler.page = mock_page
        crawler.wait_for_load_state = AsyncMock()

        element = MagicMock()
        element.click = AsyncMock()

        result = await crawler.scrape_job(element)
        assert isinstance(result, CrawlerResult)
        assert result.description is None
