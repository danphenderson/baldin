# project/app/summarizer.py


import asyncio

from app.models.tortoise import TextLead


async def generate_lead(lead_id: int, url: str) -> None:
    lead = "A dummy lead"

    await asyncio.sleep(10)

    await TextLead.filter(id=lead_id
   ).update(lead=lead)