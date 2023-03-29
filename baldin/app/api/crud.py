# app/api/crud.py

from typing import Tuple

from app.models.pydantic import (
    LeadPayloadSchema,
    SearchPayloadSchema,
)
from app.models.tortoise import Lead, Search, Loader
from typing import Union


class LeadCRUD:

    @staticmethod
    async def post(payload: LeadPayloadSchema) -> int:
        lead = Lead(
            url=str(payload.url),
            title=payload.title,
            company=payload.company,
            description=payload.description,
            location=payload.location,
            salary=payload.salary,
            job_function=payload.job_function,
            industries=payload.industries,
            employment_type=payload.employment_type,
            seniority_level=payload.seniority_level,
        ) # empty fields will be filled in by the background task
        await lead.save()
        return lead # type: ignore

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
    async def get_latest() -> Union[dict, None]:
        lead = await Lead.all().order_by("-id").first().values()
        if lead:
            return lead
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



class LoaderCRUD:

    @staticmethod
    async def post() -> dict:
        loader = Loader(completed=False)
        await loader.save()
        return loader.__dict__

    @staticmethod
    async def get(id: int) -> Union[dict, None]:
        loader = await Loader.filter(id=id).first().values()
        if loader:
            return loader
        return None

    @staticmethod
    async def get_all() -> list:
        loaders = await Loader.all().values()
        return loaders

    @staticmethod
    async def get_latest() -> Union[dict, None]:
        loader = await Loader.all().order_by("-id").first().values()
        if loader:
            return loader
        return None

    @staticmethod
    async def get_complete(id: int) -> Union[dict, None]:
        loader = await Loader.filter(id=id).first().values()
        if loader:
            return loader
        return None

