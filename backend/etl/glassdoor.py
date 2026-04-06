"""
Glassdoor crawler adapter.

Preserves selector knowledge from the legacy Glassdoor class and normalizes
output to CrawlerResult instances for downstream LeadCreate construction.
"""

from __future__ import annotations

from typing import AsyncIterator

from app.logging import get_logger
from etl.base import CrawlerBase, CrawlerResult

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Selector constants — document what each one targets so future maintainers
# can update them when Glassdoor changes its markup.
# ---------------------------------------------------------------------------

# Glassdoor job search landing page.
GLASSDOOR_SEARCH_URL = "https://www.glassdoor.com/Job/index.htm"

# XPath: job-title text input on the search page.
GLASSDOOR_JOB_TITLE_INPUT_XPATH = '//*[@id="searchBar-jobTitle"]'

# XPath: location text input on the search page.
GLASSDOOR_LOCATION_INPUT_XPATH = '//*[@id="searchBar-location"]'

# CSS selector: individual job listing item in search results.
GLASSDOOR_JOB_LISTING_SELECTOR = 'li[data-test="jobListing"]'

# XPath: "Show More" button that expands the full job description.
GLASSDOOR_SHOW_MORE_XPATH = (
    '//*[@id="app-navigation"]'
    "/div[3]/div[2]/div[2]/div[1]/section/div/div[2]/button/span"
)

# XPath: container holding the job detail pane (content area).
GLASSDOOR_CONTENT_XPATH = '//*[@id="app-navigation"]/div[3]/div[2]/div[2]/div[1]'

# CSS selector: login modal overlay.
GLASSDOOR_LOGIN_MODAL_SELECTOR = "#LoginModal"

# CSS selector: close button on the login modal.
GLASSDOOR_MODAL_CLOSE_SELECTOR = "button.CloseButton"


class GlassdoorCrawler(CrawlerBase):
    """Playwright-based Glassdoor job crawler.

    Parameters
    ----------
    keywords : str
        Search term for the job-title field.
    location : str
        Geographic search filter.
    headless : bool
        Browser headless mode (default True).
    """

    def __init__(
        self,
        keywords: str = "",
        location: str = "",
        headless: bool = True,
    ) -> None:
        super().__init__(headless=headless)
        self.keywords = keywords
        self.location = location

    # -- authentication / modals ---------------------------------------------

    async def login(self) -> None:
        """Submit Glassdoor credentials if a login wall appears."""
        # Glassdoor uses email/password but in many flows the modal intercepts.
        # For now, bypass the modal; extend here if full auth is required.
        await self.bypass_login_modal()

    async def bypass_login_modal(self) -> None:
        """Close the Glassdoor login modal if it is visible."""
        try:
            page = self._require_page()
            modal = page.locator(GLASSDOOR_LOGIN_MODAL_SELECTOR)
            if await modal.count() > 0:
                logger.info("Login modal detected — closing")
                close_btn = page.locator(GLASSDOOR_MODAL_CLOSE_SELECTOR)
                await close_btn.click(timeout=3_000)
        except Exception:
            logger.debug("No login modal to dismiss (or already closed)")

    # -- search orchestration ------------------------------------------------

    async def search_jobs(
        self,
        keywords: str | None = None,
        location: str | None = None,
    ) -> AsyncIterator[CrawlerResult]:
        """Search Glassdoor and yield CrawlerResult for each listing found."""
        kw = keywords if keywords is not None else self.keywords
        loc = location if location is not None else self.location

        await self.navigate(GLASSDOOR_SEARCH_URL)

        # Fill search form.
        page = self._require_page()
        job_input = page.locator(f"xpath={GLASSDOOR_JOB_TITLE_INPUT_XPATH}")
        await job_input.fill(kw)

        loc_input = page.locator(f"xpath={GLASSDOOR_LOCATION_INPUT_XPATH}")
        await loc_input.fill(loc)

        await page.keyboard.press("Enter")
        await self.wait_for_load_state("networkidle")

        # Dismiss login modal if it appeared after navigation.
        await self.bypass_login_modal()

        # Collect job listing elements.
        listings = await page.locator(GLASSDOOR_JOB_LISTING_SELECTOR).all()
        logger.info("Found %d job listings", len(listings))

        for listing in listings:
            try:
                result = await self.scrape_job(listing)
                yield result
            except Exception:
                logger.exception("Error scraping Glassdoor listing")
                await self.bypass_login_modal()

    # -- single-listing scraper ----------------------------------------------

    async def scrape_job(self, element) -> CrawlerResult:
        """Click a listing element, expand, and extract structured fields."""
        await element.click()
        await self.wait_for_load_state()

        # Expand full description.
        try:
            page = self._require_page()
            show_more = page.locator(f"xpath={GLASSDOOR_SHOW_MORE_XPATH}")
            await show_more.click(timeout=3_000)
            await self.wait_for_load_state()
        except Exception:
            logger.debug("Show More button not found or not clickable")

        # Extract content from the detail pane.
        description: str | None = None
        try:
            page = self._require_page()
            content = page.locator(f"xpath={GLASSDOOR_CONTENT_XPATH}")
            description = await content.inner_text(timeout=5_000)
        except Exception:
            logger.exception("Failed to extract Glassdoor job description")

        return CrawlerResult(
            description=description,
        )
