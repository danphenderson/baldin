"""Tests for etl.linkedin — LinkedInCrawler URL building, scraping, error handling.

All browser interactions are mocked; no real network calls are made.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

from etl.base import CrawlerResult
from etl.linkedin import (
    LINKEDIN_CRITERIA_CLASS,
    LINKEDIN_DESCRIPTION_CLASS,
    LINKEDIN_EXPAND_BUTTON_XPATH,
    LINKEDIN_GUEST_SEARCH_API,
    LINKEDIN_LOGIN_URL,
    LINKEDIN_MAX_OFFSET,
    LINKEDIN_PAGE_SIZE,
    LINKEDIN_TRACKING_SUFFIX,
    LinkedInCrawler,
)

# ---------------------------------------------------------------------------
# Construction
# ---------------------------------------------------------------------------


class TestLinkedInCrawlerConstruction:
    """Verify constructor stores parameters."""

    def test_defaults(self) -> None:
        crawler = LinkedInCrawler()
        assert crawler.keywords == []
        assert crawler.location == ""
        assert crawler.page_start == 1
        assert crawler.page_end == 5
        assert crawler._headless is True

    def test_custom_params(self) -> None:
        crawler = LinkedInCrawler(
            keywords=["python", "backend"],
            location="Remote",
            page_start=2,
            page_end=10,
            headless=False,
            max_retries=5,
        )
        assert crawler.keywords == ["python", "backend"]
        assert crawler.location == "Remote"
        assert crawler.page_start == 2
        assert crawler.page_end == 10
        assert crawler.max_retries == 5


# ---------------------------------------------------------------------------
# _build_search_url
# ---------------------------------------------------------------------------


class TestBuildSearchUrl:
    """URL construction for LinkedIn guest API."""

    def test_basic_url_with_keywords_and_location(self) -> None:
        crawler = LinkedInCrawler(keywords=["python"], location="Remote")
        url = crawler._build_search_url(start=0)
        assert url.startswith(LINKEDIN_GUEST_SEARCH_API)
        assert "keywords=python" in url
        assert "location=Remote" in url
        assert "start=0" in url

    def test_multiple_keywords_joined(self) -> None:
        crawler = LinkedInCrawler(keywords=["python", "backend", "senior"])
        url = crawler._build_search_url(start=0)
        assert "keywords=python+backend+senior" in url

    def test_empty_keywords_omits_param(self) -> None:
        crawler = LinkedInCrawler(keywords=[], location="NYC")
        url = crawler._build_search_url(start=25)
        assert "keywords" not in url
        assert "location=NYC" in url
        assert "start=25" in url

    def test_empty_location_omits_param(self) -> None:
        crawler = LinkedInCrawler(keywords=["java"], location="")
        url = crawler._build_search_url(start=0)
        assert "location" not in url.split("?")[1]

    def test_override_params_at_call_time(self) -> None:
        crawler = LinkedInCrawler(keywords=["python"], location="Remote")
        url = crawler._build_search_url(start=50, keywords=["go"], location="Berlin")
        assert "keywords=go" in url
        assert "location=Berlin" in url
        assert "start=50" in url

    def test_start_offset_calculated(self) -> None:
        crawler = LinkedInCrawler()
        url = crawler._build_search_url(start=75)
        assert "start=75" in url


# ---------------------------------------------------------------------------
# Selector constants
# ---------------------------------------------------------------------------


class TestLinkedInSelectors:
    """Selector and URL constants are sane."""

    def test_guest_api_url(self) -> None:
        assert LINKEDIN_GUEST_SEARCH_API.startswith("https://www.linkedin.com/")

    def test_login_url(self) -> None:
        assert LINKEDIN_LOGIN_URL.startswith("https://www.linkedin.com/login")

    def test_page_size_is_positive(self) -> None:
        assert LINKEDIN_PAGE_SIZE > 0

    def test_max_offset_is_positive(self) -> None:
        assert LINKEDIN_MAX_OFFSET > 0

    def test_tracking_suffix_is_string(self) -> None:
        assert isinstance(LINKEDIN_TRACKING_SUFFIX, str)


# ---------------------------------------------------------------------------
# _extract_job_urls
# ---------------------------------------------------------------------------


class TestExtractJobUrls:
    """Page-level helper that pulls hrefs from job card elements."""

    async def test_extracts_and_cleans_urls(self) -> None:
        crawler = LinkedInCrawler()
        mock_page = MagicMock()

        raw_href = f"https://linkedin.com/jobs/view/123{LINKEDIN_TRACKING_SUFFIX}"
        card = AsyncMock()
        card.get_attribute = AsyncMock(return_value=raw_href)

        mock_page.query_selector_all = AsyncMock(return_value=[card])
        crawler.page = mock_page

        urls = await crawler._extract_job_urls()
        assert len(urls) == 1
        assert LINKEDIN_TRACKING_SUFFIX not in urls[0]
        assert "123" in urls[0]

    async def test_skips_none_hrefs(self) -> None:
        crawler = LinkedInCrawler()
        mock_page = MagicMock()

        card = AsyncMock()
        card.get_attribute = AsyncMock(return_value=None)

        mock_page.query_selector_all = AsyncMock(return_value=[card])
        crawler.page = mock_page

        urls = await crawler._extract_job_urls()
        assert urls == []


# ---------------------------------------------------------------------------
# scrape_job result normalization
# ---------------------------------------------------------------------------

# Sample HTML matching LinkedIn's DOM structure for the description section.
_SAMPLE_SECTION_HTML = f"""
<div>
  <div class="{LINKEDIN_DESCRIPTION_CLASS}">
    <p>We are looking for a Backend Engineer.</p>
  </div>
  <span class="{LINKEDIN_CRITERIA_CLASS}">Mid-Senior level</span>
  <span class="{LINKEDIN_CRITERIA_CLASS}">Full-time</span>
  <span class="{LINKEDIN_CRITERIA_CLASS}">Engineering</span>
</div>
"""


class TestLinkedInScrapeJob:
    """scrape_job navigates, expands, and parses structured fields."""

    async def test_returns_crawler_result_with_fields(self) -> None:
        crawler = LinkedInCrawler()
        mock_page = MagicMock()

        expand_locator = MagicMock()
        expand_locator.click = AsyncMock()

        section_locator = MagicMock()
        section_locator.inner_html = AsyncMock(return_value=_SAMPLE_SECTION_HTML)

        def locator_side_effect(sel: str):
            if LINKEDIN_EXPAND_BUTTON_XPATH in sel:
                return expand_locator
            return section_locator

        mock_page.locator = MagicMock(side_effect=locator_side_effect)
        crawler.page = mock_page
        crawler.navigate_with_retry = AsyncMock()
        crawler.wait_for_load_state = AsyncMock()

        with patch("etl.linkedin.sleep", new_callable=AsyncMock):
            result = await crawler.scrape_job("https://linkedin.com/jobs/view/123")

        assert isinstance(result, CrawlerResult)
        assert result.url == "https://linkedin.com/jobs/view/123"
        assert "Backend Engineer" in (result.description or "")
        assert result.seniority_level == "Mid-Senior level"
        assert result.employment_type == "Full-time"
        assert result.job_function == "Engineering"

    async def test_handles_expand_button_failure(self) -> None:
        """When the expand button is missing, scraping still proceeds."""
        crawler = LinkedInCrawler()
        mock_page = MagicMock()

        expand_locator = MagicMock()
        expand_locator.click = AsyncMock(side_effect=Exception("no button"))

        section_locator = MagicMock()
        section_locator.inner_html = AsyncMock(return_value=_SAMPLE_SECTION_HTML)

        mock_page.locator = MagicMock(
            side_effect=lambda sel: (
                expand_locator
                if LINKEDIN_EXPAND_BUTTON_XPATH in sel
                else section_locator
            )
        )
        crawler.page = mock_page
        crawler.navigate_with_retry = AsyncMock()
        crawler.wait_for_load_state = AsyncMock()

        with patch("etl.linkedin.sleep", new_callable=AsyncMock):
            result = await crawler.scrape_job("https://linkedin.com/jobs/view/456")

        assert isinstance(result, CrawlerResult)
        assert result.description is not None

    async def test_handles_description_extraction_failure(self) -> None:
        """When description section is missing, fields default to None."""
        crawler = LinkedInCrawler()
        mock_page = MagicMock()

        expand_locator = MagicMock()
        expand_locator.click = AsyncMock(side_effect=Exception("no btn"))

        section_locator = MagicMock()
        section_locator.inner_html = AsyncMock(side_effect=Exception("no section"))

        mock_page.locator = MagicMock(
            side_effect=lambda sel: (
                expand_locator
                if LINKEDIN_EXPAND_BUTTON_XPATH in sel
                else section_locator
            )
        )
        crawler.page = mock_page
        crawler.navigate_with_retry = AsyncMock()
        crawler.wait_for_load_state = AsyncMock()

        with patch("etl.linkedin.sleep", new_callable=AsyncMock):
            result = await crawler.scrape_job("https://linkedin.com/jobs/view/789")

        assert isinstance(result, CrawlerResult)
        assert result.url == "https://linkedin.com/jobs/view/789"
        assert result.description is None
        assert result.seniority_level is None
        assert result.employment_type is None
        assert result.job_function is None

    async def test_partial_criteria_mapping(self) -> None:
        """When fewer than 3 criteria are present, missing ones are None."""
        partial_html = f"""
        <div>
          <div class="{LINKEDIN_DESCRIPTION_CLASS}">Job description here</div>
          <span class="{LINKEDIN_CRITERIA_CLASS}">Entry level</span>
        </div>
        """
        crawler = LinkedInCrawler()
        mock_page = MagicMock()

        expand_locator = MagicMock()
        expand_locator.click = AsyncMock(side_effect=Exception("no btn"))

        section_locator = MagicMock()
        section_locator.inner_html = AsyncMock(return_value=partial_html)

        mock_page.locator = MagicMock(
            side_effect=lambda sel: (
                expand_locator
                if LINKEDIN_EXPAND_BUTTON_XPATH in sel
                else section_locator
            )
        )
        crawler.page = mock_page
        crawler.navigate_with_retry = AsyncMock()
        crawler.wait_for_load_state = AsyncMock()

        with patch("etl.linkedin.sleep", new_callable=AsyncMock):
            result = await crawler.scrape_job("https://linkedin.com/jobs/view/999")

        assert result.seniority_level == "Entry level"
        assert result.employment_type is None
        assert result.job_function is None
