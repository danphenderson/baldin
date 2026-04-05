"""
LinkedIn crawler adapter.

Preserves selector knowledge from the legacy Linkedin class and normalizes
output to CrawlerResult instances for downstream LeadCreate construction.
"""

from __future__ import annotations

from asyncio import sleep
from typing import AsyncIterator

from bs4 import BeautifulSoup

from app.core import conf
from app.logging import get_logger
from etl.base import CrawlerBase, CrawlerResult

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Selector constants — document what each one targets so future maintainers
# can update them when LinkedIn changes its markup.
# ---------------------------------------------------------------------------

# Guest job-search API (avoids login for initial listing pages).
LINKEDIN_GUEST_SEARCH_API = (
    "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
)

# LinkedIn login page.
LINKEDIN_LOGIN_URL = "https://www.linkedin.com/login"

# CSS selector for job-card links in guest search results.
LINKEDIN_JOB_CARD_SELECTOR = "a.base-card__full-link"

# XPath: "See more" button that expands the full job description.
LINKEDIN_EXPAND_BUTTON_XPATH = (
    '//*[@id="main-content"]' "/section[1]/div/div/section[1]/div/div/section/button[1]"
)

# XPath: container holding the full job description after expansion.
LINKEDIN_DESCRIPTION_SECTION_XPATH = (
    '//*[@id="main-content"]/section[1]/div/div/section[1]'
)

# CSS class for the rich-text description block inside the section.
LINKEDIN_DESCRIPTION_CLASS = "show-more-less-html__markup"

# CSS class for the structured criteria items (seniority, type, function, industries).
LINKEDIN_CRITERIA_CLASS = (
    "description__job-criteria-text description__job-criteria-text--criteria"
)

# Tracking suffix appended to card hrefs that should be stripped.
LINKEDIN_TRACKING_SUFFIX = "&trk=public_jobs_jserp-result_search-card"

# Number of results per guest-API page.
LINKEDIN_PAGE_SIZE = 25

# Maximum offset LinkedIn's guest API will serve.
LINKEDIN_MAX_OFFSET = 800


class LinkedInCrawler(CrawlerBase):
    """Playwright-based LinkedIn job crawler.

    Parameters
    ----------
    keywords : list[str]
        Search keywords (joined with spaces).
    location : str
        Geographic search filter.
    page_start / page_end : int
        Inclusive range of search pages to crawl.
    headless : bool
        Browser headless mode (default True for CI / pipeline use).
    """

    def __init__(
        self,
        keywords: list[str] | None = None,
        location: str = "",
        page_start: int = 1,
        page_end: int = 5,
        headless: bool = True,
    ) -> None:
        super().__init__(headless=headless)
        self.keywords = keywords or []
        self.location = location
        self.page_start = page_start
        self.page_end = page_end

    # -- authentication ------------------------------------------------------

    async def login(self) -> None:
        """Navigate to LinkedIn login and submit credentials from conf."""
        await self.navigate(LINKEDIN_LOGIN_URL)
        await self.fill('input[name="session_key"]', conf.linkedin.USERNAME)
        await self.fill('input[name="session_password"]', conf.linkedin.PASSWORD)
        await self.click('button[type="submit"]')
        await self.wait_for_load_state("networkidle")
        logger.info("LinkedIn login submitted")

    # -- search orchestration ------------------------------------------------

    def _build_search_url(self, start: int = 0) -> str:
        """Build the guest search API URL with query parameters."""
        params: list[str] = []
        if self.keywords:
            params.append(f"keywords={'+'.join(self.keywords)}")
        if self.location:
            params.append(f"location={self.location}")
        params.append(f"start={start}")
        return f"{LINKEDIN_GUEST_SEARCH_API}?{'&'.join(params)}"

    async def search_jobs(
        self,
        keywords: list[str] | None = None,
        location: str | None = None,
        start_page: int | None = None,
        end_page: int | None = None,
    ) -> AsyncIterator[CrawlerResult]:
        """Iterate through LinkedIn guest search pages and yield results.

        Falls back to constructor parameters when arguments are omitted.
        """
        kw = keywords or self.keywords
        loc = location if location is not None else self.location
        sp = start_page if start_page is not None else self.page_start
        ep = end_page if end_page is not None else self.page_end

        for page_num in range(sp, ep + 1):
            offset = (page_num - 1) * LINKEDIN_PAGE_SIZE
            if offset >= LINKEDIN_MAX_OFFSET:
                logger.info("Reached max offset (%d), stopping", LINKEDIN_MAX_OFFSET)
                break

            url = self._build_search_url(start=offset)
            logger.info("Fetching search page %d (offset %d)", page_num, offset)

            try:
                await self.navigate(url, wait_until="domcontentloaded")
            except Exception:
                logger.exception("Failed to load search page %d", page_num)
                continue

            job_urls = await self._extract_job_urls()
            logger.info("Found %d job cards on page %d", len(job_urls), page_num)

            for job_url in job_urls:
                try:
                    result = await self.scrape_job(job_url)
                    yield result
                except Exception:
                    logger.exception("Error scraping job %s", job_url)

    # -- page-level helpers --------------------------------------------------

    async def _extract_job_urls(self) -> list[str]:
        """Pull all job-card hrefs from the current page."""
        page = self._require_page()
        cards = await page.query_selector_all(LINKEDIN_JOB_CARD_SELECTOR)
        urls: list[str] = []
        for card in cards:
            href = await card.get_attribute("href")
            if href:
                cleaned = href.replace(LINKEDIN_TRACKING_SUFFIX, "").strip()
                urls.append(cleaned)
        return urls

    # -- single-job scraper --------------------------------------------------

    async def scrape_job(self, url: str) -> CrawlerResult:
        """Navigate to a job posting, expand, and extract structured fields."""
        await self.navigate(url, wait_until="domcontentloaded")

        # Attempt to expand the full description.
        try:
            page = self._require_page()
            expand_btn = page.locator(f"xpath={LINKEDIN_EXPAND_BUTTON_XPATH}")
            await expand_btn.click(timeout=5_000)
        except Exception:
            logger.debug("Expand button not found or not clickable for %s", url)

        # Small delay to let dynamic content settle.
        await sleep(1)

        # Extract description HTML via the section container.
        description: str | None = None
        criteria: list[str] = []
        try:
            page = self._require_page()
            section = page.locator(f"xpath={LINKEDIN_DESCRIPTION_SECTION_XPATH}")
            section_html = await section.inner_html(timeout=5_000)
            soup = BeautifulSoup(section_html, "html.parser")

            desc_el = soup.find(class_=LINKEDIN_DESCRIPTION_CLASS)
            if desc_el:
                description = desc_el.get_text(separator="\n", strip=True)

            criteria = [
                el.get_text(strip=True)
                for el in soup.find_all(class_=LINKEDIN_CRITERIA_CLASS)
            ]
        except Exception:
            logger.exception("Failed to extract description for %s", url)

        # Map criteria in the order LinkedIn renders them.
        seniority = criteria[0] if len(criteria) > 0 else None
        employment_type = criteria[1] if len(criteria) > 1 else None
        job_function = criteria[2] if len(criteria) > 2 else None
        industries = criteria[3] if len(criteria) > 3 else None

        return CrawlerResult(
            url=url,
            description=description,
            seniority_level=seniority,
            employment_type=employment_type,
            job_function=job_function,
            # LinkedIn lists "Industries" which we map to job_function alt;
            # keep industries in description context instead.
        )
