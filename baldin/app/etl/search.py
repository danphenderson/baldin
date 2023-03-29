from pathlib import Path
from selenium.common.exceptions import NoSuchElementException, ElementClickInterceptedException
from app.core.chrome import Driver
from bs4 import BeautifulSoup
from selenium.webdriver.remote.webelement import WebElement
from app.core.conf import linkedin, settings
from app.etl.models.job import Job


async def search_results():
    res = []
    async def recursive_search(path):
        for file in path.iterdir():
            if file.is_dir():
                return await recursive_search(file)
            try:    
                res.append(await Job.load(str(file)))
            except Exception as e:
                print(f"Error loading {file}: {e}")
                continue
        return res
    return await recursive_search(Path(settings.public_asset_path) / "leads")


class JobSearch:
    def __init__(self, driver: Driver):
        if not isinstance(driver, Driver):
            raise TypeError("driver must be an instance of AsyncDriver")
        self.chrome = driver


class LinkedIn(JobSearch):
    
    @classmethod
    def redirect_job_search(cls) -> str:
        if not linkedin.search_endpoint.startswith("https://www.linkedin.com/jobs/search/"):
            raise ValueError("url must be a valid linkedin search url")
        return linkedin.search_endpoint.replace(
            "https://www.linkedin.com/jobs/search/",
            "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
        )

    @classmethod
    def redirect_job_page(cls, page) -> str:
       return f"{cls.redirect_job_search()}?page={page}"

    async def scrape_job_post(self, job_post: str) -> None:
        await self.chrome.get(job_post, wait=3)
        # Expand job description and wait for dynamic content to load.
        element = await self.chrome.element('//*[@id="main-content"]/section[1]/div/div/section[1]/div/div/section/button[1]', by='xpath')
        element.click() # type: ignore
        await self.chrome.wait(3) # Lowering this value causes rate limiting

        # Extract hidden job description content from the page
        desc = await self.chrome.element('//*[@id="main-content"]/section[1]/div/div/section[1]', 'xpath') # type: ignore
        if not isinstance(desc, WebElement):
            raise ValueError("Job description not found")
        soup = BeautifulSoup(desc.get_attribute('innerHTML'), 'html.parser') 
        data = await self.chrome.run_async(
            lambda : [s.text
                for s in [
                    soup.find(class_="show-more-less-html__markup"),
                    *soup.find_all(class_='description__job-criteria-text description__job-criteria-text--criteria'),
                ]
            ]
        )

        # Parse data into job the model dict-payload
        job_dict = dict(zip(["description", "seniority_level", "employment_type", "job_function", "industries"], data)) # type: ignore
        job_dict['url'] = job_post
        
        # Create model instance and dump to json (Validate data)
        async with Job(**job_dict) as job:
            await job.dump()

    async def scrape_job_page(self, page_number: int) -> None:
        def get_job_cards(soup) -> list[BeautifulSoup]:
            job_cards = soup.find_all('a', class_="base-card__full-link")
            if not job_cards:
                raise ValueError("soup contents do not contain any job cards")
            return job_cards

        def get_job_urls(soup) -> list:
            job_urls = [card.get("href") for card in get_job_cards(soup)]
            if not job_urls:
                raise ValueError("job cards do not contain any job urls")
            return [str(job).replace("&trk=public_jobs_jserp-result_search-card", "") for job in job_urls]

        while True: # Iterate through the pages
            start = 0
            await self.chrome.get(f"{self.redirect_job_page(page_number)}&start={start}", wait=3)
            soup = await self.chrome.page_soup()
            # Iterate through the jobs on the page
            for job_url in get_job_urls(soup):
                await self.scrape_job_post(job_url)
            start += 25
            if start >= 800:
                break

    async def scrape_job_search(self, start: int = 1, end: int = 5) -> None:

        # Retrieve the pagination endpoint from the search url
        await self.chrome.get(self.redirect_job_search(), wait=3)

        # Iterate through the search pages
        for page_number in range(start, end):
            await self.scrape_job_page(page_number)


class Glassdoor(JobSearch):
    # https://www.kaggle.com/code/rashikrahmanpritom/scrapping-glassdoor-job-posts-using-selenium
    
    async def bypass_signin(self) -> None:
        await self.chrome.wait(0.5)
        try:
            element = await self.chrome.element('//*[@id="JAModal"]/div/div[2]/span', 'xpath')
            element.click() # type: ignore
        except (ElementClickInterceptedException, NoSuchElementException):
            pass
        await self.chrome.wait(3)

    async def expand_job_description(self) -> None:
        try:
            element = await self.chrome.element('//*[@id="JobDescriptionContainer"]/div[2]', 'xpath')
            element.click() # type: ignore
        except (ElementClickInterceptedException, NoSuchElementException):
            pass
        await self.chrome.wait(3)
    
    async def scrape_job_post(self, job_button: WebElement) -> dict[str, str]:
        try:
            job_button.click()
            await self.bypass_signin()
            await self.expand_job_description()
            job_info = job_button.text.split('\n')
            job_desc = await self.chrome.element('//*[@id="JobDescriptionContainer"]', 'xpath')
            print("Succesfully scraped job post: ", job_info)
            return {'description': job_desc.text, 'company': job_info[1], 'title': job_info[2], 'location': job_info[3]} # type: ignore
        except Exception as e:
                print(f"Error: {e}")
        return {}

    async def paginate_search(self) -> bool:
        try:
            element = await self.chrome.element('.//div[@class="tbl fill padHorz margVert"]')
            page = element.text.split() # type: ignore
            if page[1]==page[3]:
                button = await self.chrome.element('.//li[@class="next"]//a', 'xpath')
                button.click() # type: ignore
                await self.chrome.wait(3)
                return True
        except NoSuchElementException:
            print("Unable to paginate search results, no more pages found. Terminating search...")
        return False

    async def scrape_search(self, keyword: str, pages: int = 1):
        await self.chrome.get("https://www.glassdoor.com/Job/jobs.htm?suggestCount=0&suggestChosen=false&clickSource=searchBtn&typedKeyword="+keyword+"&sc.keyword="+keyword+"&locT=&locId=&jobType=", wait=3)
        await self.bypass_signin()

        url = self.chrome.current_url

        # Get the job cards
        job_buttons = await self.chrome.elements('react-job-listing', by='class name')
        
        if not job_buttons or not isinstance(job_buttons, list):
            raise ValueError("No job cards found")

        # Iterate through the job cards     
        for job_button in job_buttons:
            job_payload = await self.scrape_job_post(job_button)
            if not job_payload:
                continue
            job_payload['url'] = url
            async with Job(**job_payload) as job:# type: ignore
                await job.dump()



class Indeed(JobSearch):
    # It appears there is an API for this
    pass