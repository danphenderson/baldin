"""
Glassdoor crawler adapter.

Preserves selector knowledge from the legacy Glassdoor class and normalizes
output to CrawlerResult instances for downstream LeadCreate construction.

Credential Configuration
------------------------
Glassdoor crawling may require environment variables for authenticated access:

    GLASSDOOR_USERNAME : str
        Glassdoor account email for login. Leave empty for guest browsing.
    GLASSDOOR_PASSWORD : str
        Glassdoor account password for login. Leave empty for guest browsing.

These variables are loaded via Pydantic settings from the backend/.env file.
See app/core/conf.py for the Glassdoor settings class.

Note: The current implementation primarily uses guest browsing with modal
bypass. Full authentication support can be added if needed for protected
content access.
"""

from __future__ import annotations

from typing import AsyncIterator

from app.logging import get_logger
from etl.base import DEFAULT_MAX_RETRIES, CrawlerBase, CrawlerResult

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
    max_retries : int
        Maximum retry attempts for navigation failures (default: 3).

    Credential Requirements
    -----------------------
    Set these environment variables for authenticated access (optional):
        - GLASSDOOR_USERNAME: Account email
        - GLASSDOOR_PASSWORD: Account password

    The current implementation primarily uses guest browsing with automatic
    login modal bypass. Credentials are only needed for accessing protected
    content that requires authentication.
    """

    def __init__(
        self,
        keywords: str = "",
        location: str = "",
        headless: bool = True,
        max_retries: int = DEFAULT_MAX_RETRIES,
    ) -> None:
        super().__init__(headless=headless)
        self.keywords = keywords
        self.location = location
        self.max_retries = max_retries

    # -- authentication / modals ---------------------------------------------

    async def login(self) -> None:
        """Submit Glassdoor credentials if a login wall appears.

        Note: Currently bypasses the login modal for guest browsing.
        For authenticated access, set GLASSDOOR_USERNAME and
        GLASSDOOR_PASSWORD environment variables and extend this method.
        """
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
        validate_results: bool = True,
    ) -> AsyncIterator[CrawlerResult]:
        """Search Glassdoor and yield CrawlerResult for each listing found.

        Parameters
        ----------
        keywords : str, optional
            Search keywords, overrides constructor value if provided.
        location : str, optional
            Location filter, overrides constructor value if provided.
        validate_results : bool
            If True, log warnings for invalid results but still yield them.

        Yields
        ------
        CrawlerResult
            Normalized job posting data for each listing found.
        """
        kw = keywords if keywords is not None else self.keywords
        loc = location if location is not None else self.location

        await self.navigate_with_retry(
            GLASSDOOR_SEARCH_URL, max_retries=self.max_retries
        )

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
                if validate_results:
                    validation = result.validate()
                    if not validation.is_valid:
                        logger.warning(
                            "Invalid Glassdoor result: %s", validation.errors
                        )
                    elif validation.warnings:
                        logger.debug(
                            "Glassdoor result warnings: %s", validation.warnings
                        )
                yield result
            except Exception:
                logger.exception("Error scraping Glassdoor listing")
                await self.bypass_login_modal()

    # -- single-listing scraper ----------------------------------------------

    async def scrape_job(self, element) -> CrawlerResult:
        """Click a listing element, expand, and extract structured fields.

        Parameters
        ----------
        element
            Playwright locator for the job listing element to scrape.

        Returns
        -------
        CrawlerResult
            Extracted job data. Use result.validate() to check completeness.
        """
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
