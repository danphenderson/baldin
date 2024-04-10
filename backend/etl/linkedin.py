from .base import Scrapper
from .conf import settings
from .logging import get_logger

logger = get_logger(__name__)


class Linkedin:
    def __init__(self, scrapper: Scrapper):
        self.scrapper = scrapper

    async def login(self):
        ...

    async def extract_profile(self, url: str):
        ...

    async def extract_job(self, url: str):
        ...

    async def extract_company(self, url: str):
        ...

    async def leads_search(self, keywords: str, location: str):
        ...

    async def company_search(self, keywords: str, location: str):
        ...
