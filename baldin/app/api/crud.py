# app/api/crud.py

from typing import Tuple

from app.models.pydantic import (
    LeadPayloadSchema,
    LeadUpdatePayloadSchema,
    SearchPayloadSchema,
)
from app.models.tortoise import Lead, Search
from typing import Union


class LeadCRUD:

    @staticmethod
    async def post(payload: LeadPayloadSchema) -> Tuple:
        lead = Lead(
            url=payload.url,
            search_id=payload.search_id,
            title="",
            company="",
            description=""
        ) # empty fields will be filled in by the background task
        await lead.save()
        return lead.id, payload.search_id, lead.created_at, lead.updated_at # type: ignore

    @staticmethod
    async def get(id: int) -> Union[dict, None]:
        lead = await Lead.filter(id=id).first().values()
        if lead:
            return lead
        return None

    @staticmethod
    async def get_all() -> list:
        summaries = await Lead.all().values()
        return summaries

    @staticmethod
    async def delete(id: int) -> int:
        lead = await Lead.filter(id=id).delete()
        return lead

    @staticmethod
    async def put(id: int, payload: LeadUpdatePayloadSchema) -> Union[dict, None]:
        lead = await Lead.filter(id=id).update(url=payload.url, title=payload.title, company=payload.company, description=payload.description) # type: ignore
        if lead:
            updated_lead = await Lead.filter(id=id).first().values()
            return updated_lead
        return None


class SearchCRUD:

    @staticmethod
    async def post(payload: SearchPayloadSchema) -> Tuple:
        search = Search(
            keywords=payload.keywords,
            platform=payload.platform,
        )
        await search.save()
        return search.id, search.created_at, search.updated_at 
        

    @staticmethod
    async def get(id: int) -> Union[dict, None]:
        search = await Search.filter(id=id).first().values()
        if search:
            return search
        return None

    @staticmethod
    async def get_all() -> list:
        searches = await Search.all().values()
        return searches

    @staticmethod
    async def delete(id: int) -> int:
        search = await Search.filter(id=id).delete()
        return search
