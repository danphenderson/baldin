# project/app/api/crud.py

from app.models.pydantic import LeadPayloadSchema, LeadUpdatePayloadSchema
from app.models.tortoise import TextLead
from typing import Union

from app.summarizer import generate_lead

async def post(payload: LeadPayloadSchema) -> int:
    lead = TextLead(url=payload.url, lead="")
    await lead.save()
    return lead.id # type: ignore

async def get(id: int) -> Union[dict, None]:
    lead = await TextLead.filter(id=id).first().values()
    if lead:
        return lead
    return None

async def get_all() -> list:
    summaries = await TextLead.all().values()
    return summaries


async def delete(id: int) -> int:
    lead = await TextLead.filter(id=id).delete()
    return lead

async def put(id: int, payload: LeadPayloadSchema) -> Union[dict, None]:
    lead = await TextLead.filter(id=id).update(url=payload.url, lead=payload.lead)
    if lead:
        updated_lead = await TextLead.filter(id=id).first().values()
        return updated_lead
    return None