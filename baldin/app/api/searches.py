# app/api/searches.py

from fastapi import APIRouter, HTTPException, Path, BackgroundTasks
from app.api.crud import SearchCRUD
from app.models.pydantic import SearchPayloadSchema, SearchResponseSchema
from app.logging import console_log, get_async_logger

log = get_async_logger(__name__)

router = APIRouter()

@router.post("/", status_code=201)
async def create_search(payload: SearchPayloadSchema, background_tasks: BackgroundTasks) -> dict[str, int]:
    await log.info(f"Creating search with keywords: {payload.keywords} and platform: {payload.platform}")
    search_id = await SearchCRUD.post(payload)
    return {"id": search_id}


@router.get("/{id}/", response_model=SearchResponseSchema)
async def read_search(id: int = Path(..., gt=0)):
    await log.info(f"Reading search with id: {id}")
    search = await SearchCRUD.get(id)
    if not search:
        console_log.error(f"Search with id: {id} not found")
        raise HTTPException(status_code=404, detail="Search not found")
    return search


@router.get("/", response_model=list[SearchResponseSchema]) # type: ignore
async def read_all_searches() -> list:
    await log.info("Reading all searches")
    return await SearchCRUD.get_all()


@router.delete("/{id}/", response_model=SearchResponseSchema)
async def delete_search(id: int = Path(..., gt=0)):
    await log.info(f"Deleting search with id: {id}")
    search = await SearchCRUD.get(id)
    if not search:
        console_log.error(f"Search with id: {id} not found")
        raise HTTPException(status_code=404, detail="Search not found")
    await SearchCRUD.delete(id)
    return search