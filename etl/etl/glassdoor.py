
from .conf import settings
from .base import Scrapper
from .logging import get_logger

logger = get_logger(__name__)

class Glassdoor:

    def __init__(self, scrapper: Scrapper):
        self.scrapper = scrapper

    async def bypass_login(self):
        try:
            logger.info("Bypassing login modal")
            login_modal = await self.scrapper.locator("id='LoginModal'").all()
            if login_modal:
                logger.info("Login modal found. Hitting Close Button")
                await self.scrapper.locator("button.CloseButton").click()
        except:
            pass

    async def search(self, keywords: str, location: str):
        # Navigate to glassdoor Job Search page
        await self.scrapper.goto('https://www.glassdoor.com/Job/index.htm')

        # Find the job search textbox and type the keywords
        job_textbox = self.scrapper.locator('//*[@id="searchBar-jobTitle"]')
        await job_textbox.type(keywords)

        # Find the location textbox and type the location
        location_textbox = self.scrapper.locator('//*[@id="searchBar-location"]')
        await location_textbox.type(location)

        # Enter in the search using the keyboard
        await self.scrapper.keyboard_press('Enter')

        # Wait for the page to load
        await self.scrapper.wait_for_load_state("networkidle")

        # Scrape the search results
        res = await self._scrape_search()

        return res


    async def _scrape_search(self):
        # Find the job postings
        job_buttons = await self.scrapper.locator('li[data-test="jobListing"]').all()

        logger.info(f"Found {len(job_buttons)} job postings")

        result = []

        # Scrape each job post
        for job_button in job_buttons:
            try:
                # Click on the job listing to load the job post
                await job_button.click()
                await self.scrapper.wait_for_load_state()

                # Expand the job description by clicking "Show More"
                await self.scrapper.locator('//*[@id="app-navigation"]/div[3]/div[2]/div[2]/div[1]/section/div/div[2]/button/span').click()
                await self.scrapper.wait_for_load_state()

                # Scrape the job post
                description = await self.scrapper.locator('//*[@id="app-navigation"]/div[3]/div[2]/div[2]/div[1]').inner_text()
                result.append(description)

                logger.info(f"Scraped job post: {description}")
            except:
                logger.error("Error scraping job post")
                await self.bypass_login()
                continue

        return result
