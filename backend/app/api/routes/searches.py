# app/api/searches.py
from fastapi import APIRouter, HTTPException, Path, Depends

from app.logging import console_log
from app.api.deps import get_async_session
from app import schemas, models
from pydantic import UUID4
from sqlalchemy import select


router = APIRouter(tags=["searches"])


async def get_search(id: UUID4, db = Depends(get_async_session)) -> models.Search:
    search = await db.get(models.Search, id)
    if not search:
        console_log.info(f"Search with id {id} not found")
        raise HTTPException(status_code=404, detail=f"Search with {id} not found")
    return search


@router.post("/", status_code=201, response_model=UUID4)
async def create_search(payload: schemas.SearchCreate, db = Depends(get_async_session)):
    # TODO: test that a 208 status code is returned when a lead url already exists
    search = await db.get(models.Search, id)
    search = models.Search(**payload.dict())
    db.add(search)
    await db.commit()
    await db.refresh(search)
    return search.id


@router.get("/{id}/", status_code=202, response_model=schemas.SearchRead)
async def read_search(id: UUID4, search = Depends(get_search)):
    return search

@router.get("/", response_model=list[schemas.SearchRead])
async def get_searches(db = Depends(get_async_session)):
    rows = await db.execute(select(models.Search))
    result = rows.scalars().all()
    if not result:
        raise HTTPException(status_code=404, detail="No searches found")
    return result


@router.delete("/{id}/", status_code=202)
async def delete_search(id: UUID4, db = Depends(get_async_session)):
    search = await db.get(models.Search, id)
    await db.delete(search)
    await db.commit()
