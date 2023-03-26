# project/app/summarizer.py


import asyncio

from app.models.tortoise import Lead


async def generate_lead(lead_id: int, url: str) -> None:
    lead = "A dummy lead"

    await asyncio.sleep(10)

    await Lead.filter(id=lead_id).update(lead=lead)