# app/indeed.py


import asyncio


from app.models.tortoise import Lead, Search


async def generate_search(search_id, keywords) -> None:
    """
    Perform a job leads search on Indeed, creating associated leads in the database.
    """
    # A search entry already exists in the database, but it has no leads.
    # TODO: We need to execute the search and create the leads.
    await asyncio.sleep(10)

async def generate_lead(lead_id: int, url: str) -> None:
    title = "A dummy lead"
    company = "A dummy company"
    description = "A dummy description"
    await asyncio.sleep(10)
    await Lead.filter(id=lead_id).update(title=title, company=company, description=description)

