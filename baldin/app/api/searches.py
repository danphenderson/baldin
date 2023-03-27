# app/api/searches.py

import logging

from fastapi import APIRouter, HTTPException, Path, BackgroundTasks


from app.linkedin import generate_search as generate_search_linkedin
from app.glassdoor import generate_search as generate_search_glassdoor
from app.indeed import generate_search as generate_search_indeed

from app.api.crud import SearchCRUD

from app.models.pydantic import SearchPayloadSchema, SearchResponseSchema
from app.models.tortoise import SearchSchema


log = logging.getLogger("uvicorn")

router = APIRouter()


async def generate_search(id: int, keywords: str, platform: str):
    if platform == "linkedin":
        await generate_search_linkedin(id, keywords)
    elif platform == "glassdoor":
        await generate_search_glassdoor(id, keywords)
    elif platform == "indeed":
        await generate_search_indeed(id, keywords)
    else:
        raise HTTPException(status_code=400, detail="Platform not supported")


@router.post("/", response_model=SearchResponseSchema, status_code=201)
async def create_search(payload: SearchPayloadSchema, background_tasks: BackgroundTasks):
    log.info(f"Creating search with keywords: {payload.keywords} and platform: {payload.platform}")
    
    search_id, created_at, updated_at = await SearchCRUD.post(payload)
    
    log.info(f"Created search with id: {search_id} and created_at: {created_at} (updated_at: {updated_at}))")
    
    background_tasks.add_task(generate_search, search_id, payload.keywords, payload.platform)
    
    return {"id": search_id, "keywords": payload.keywords, "platform": payload.platform, "created_at": str(created_at), "updated_at": str(updated_at)}


@router.get("/{id}/", response_model=SearchSchema)
async def read_search(id: int = Path(..., gt=0)):
    log.info(f"Reading search with id: {id}")
    search = await SearchCRUD.get(id)
    if not search:
        raise HTTPException(status_code=404, detail="Search not found")
    return search


@router.get("/", response_model=list[SearchSchema]) # type: ignore
async def read_all_searches() -> list:
    return await SearchCRUD.get_all()


@router.delete("/{id}/", response_model=SearchSchema)
async def delete_search(id: int = Path(..., gt=0)):
    log.info(f"Deleting search with id: {id}")
    search = await SearchCRUD.get(id)
    if not search:
        raise HTTPException(status_code=404, detail="Search not found")
    await SearchCRUD.delete(id)
    return search