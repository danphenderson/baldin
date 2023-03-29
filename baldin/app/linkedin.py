# app/linkedin.py


import asyncio


from app.models.tortoise import Lead, Search

from app import conf


async def generate_search(search_id, keywords) -> None:
    """
    Perform a job leads search on LinkedIn, creating associated leads in the database.
    """
    # A search entry already exists in the database, but it has no leads.
    # TODO: We need to execute the search and create the leads.
    await asyncio.sleep(10)



async def generate_lead(lead_id: int, url: str) -> None:
    lead_generator = LeadGenerator(url) # type: ignore
    title = await lead_generator.get_title()
    company = await lead_generator.get_company()
    description = await lead_generator.get_description()
    await Lead.filter(id=lead_id).update(title=title, company=company, description=description)


class LeadGenerator:

    def __init__(self, url) -> None:
        self.url = url
    
    async def get_title(self) -> str:
        return "title"

    async def get_company(self) -> str:
        return "company"

    async def get_description(self) -> str:
        return "description"