# app/api/searches.py
from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import UUID4
from sqlalchemy import select

from app import models, schemas
from app.api.deps import get_lead, get_search
from app.core.db import get_async_session
from app.logging import console_log

router: APIRouter = APIRouter(tags=["searches"])


@router.post("/", status_code=201, response_model=UUID4)
async def create_search(
    payload: schemas.JobSearchCreate, db=Depends(get_async_session)
):
    # TODO: test that a 208 status code is returned when a lead url already exists
    search = models.JobSearch(**payload.dict())
    db.add(search)
    await db.commit()
    await db.refresh(search)
    return search.id


@router.get("/{id}/", status_code=202, response_model=schemas.JobSearchRead)
async def read_search(id: UUID4, search=Depends(get_search)):
    return schemas.JobSearchRead.from_orm(
        search
    )  # Is it necessary to use from_orm here?


@router.get("/{id}/leads/", response_model=list)
async def read_leads_by_search(id: UUID4, search=Depends(get_search)):
    return search.leads


@router.patch("/{id}/leads/{lead_id}", status_code=206)  # Status code may be incorrect
async def register_lead(id: UUID4, lead_id: UUID4, db=Depends(get_async_session)):
    search_x_lead = models.SearchXLead(search_id=id, lead_id=lead_id)
    db.add(search_x_lead)
    await db.commit()
    await db.refresh(search_x_lead)


@router.delete("/{id}/", status_code=202)
async def delete_search(id: UUID4, db=Depends(get_async_session)):
    search = await db.get(models.JobSearch, id)
    await db.delete(search)
    await db.commit()
