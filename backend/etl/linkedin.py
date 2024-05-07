from bs4 import BeautifulSoup

from app.core import conf
from app.logging import console_log, get_logger
from etl.base import Job, Scrapper

logger = get_logger(__name__)


class Linkedin:
    @classmethod
    def redirect_job_search(cls) -> str:
        if not conf.linkedin.search_endpoint.startswith(
            "https://www.linkedin.com/jobs/search/"
        ):
            raise ValueError("url must be a valid linkedin search url")
        return conf.linkedin.search_endpoint.replace(
            "https://www.linkedin.com/jobs/search/",
            "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search",
        )

    @classmethod
    def redirect_job_page(cls, page) -> str:
        return f"{cls.redirect_job_search()}?page={page}"

    def __init__(self, scrapper: Scrapper):
        self.scrapper = scrapper

    async def scrape_job_post(self, job_post: str) -> None:
        await self.scrapper.goto(job_post)

        # Expand job description and wait for dynamic content to load.
        element = await self.scrapper.element(
            '//*[@id="main-content"]/section[1]/div/div/section[1]/div/div/section/button[1]',
            by="xpath",
        )

        element.click()  # type: ignore

        await self.scrapper.wait(3)  # Lowering this value causes rate limiting

        # Extract hidden job description content from the page
        desc = await self.scrapper.element('//*[@id="main-content"]/section[1]/div/div/section[1]', "xpath")  # type: ignore

        soup = BeautifulSoup(desc.get_attribute("innerHTML"), "html.parser")

        data = await self.scrapper.run_async(
            lambda: [
                s.text
                for s in [
                    soup.find(class_="show-more-less-html__markup"),
                    *soup.find_all(
                        class_="description__job-criteria-text description__job-criteria-text--criteria"
                    ),
                ]
            ]
        )

        # Parse data into job the model dict-payload
        job_dict = dict(zip(["description", "seniority_level", "employment_type", "job_function", "industries"], data))  # type: ignore
        job_dict["url"] = job_post

        # Create model instance and dump to json (Validate data)
        async with Job(**job_dict) as job:
            await job.dump(
                file_path=str(conf.settings.DATALAKE_PATH / f"{job.url}.json")
            )

    async def scrape_job_page(self, page_number: int) -> None:
        def get_job_cards(soup) -> list[BeautifulSoup]:
            job_cards = soup.find_all("a", class_="base-card__full-link")
            if not job_cards:
                raise ValueError("soup contents do not contain any job cards")
            return job_cards

        def get_job_urls(soup) -> list:
            job_urls = [card.get("href") for card in get_job_cards(soup)]
            if not job_urls:
                raise ValueError("job cards do not contain any job urls")
            return [
                str(job).replace("&trk=public_jobs_jserp-result_search-card", "")
                for job in job_urls
            ]

        while True:  # Iterate through the pages
            start = 0
            await self.scrapper.goto(
                f"{self.redirect_job_page(page_number)}&start={start}", wait=3
            )
            soup = await self.scrapper.page_soup()
            # Iterate through the jobs on the page
            for job_url in get_job_urls(soup):
                try:
                    await self.scrape_job_post(job_url)
                except Exception as e:
                    print(f"Error scraping job post: {e}")

            start += 25
            if start >= 800:
                break

    async def scrape_job_search(self, start: int = 1, end: int = 5) -> None:

        # Retrieve the pagination endpoint from the search url
        await self.scrapper.goto(self.redirect_job_search())

        # Iterate through the search pages
        for page_number in range(start, end):
            console_log.info(f"Scraping page {page_number} of {end}")
            await self.scrape_job_page(page_number)
