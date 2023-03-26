# project/app/api/summaries.py

from fastapi import APIRouter, HTTPException, Path, BackgroundTasks
from app.summarizer import generate_lead
from app.api import crud
from app.models.pydantic import LeadPayloadSchema, LeadResponseSchema, LeadUpdatePayloadSchema
from app.models.tortoise import LeadSchema

router = APIRouter()

@router.post("/", response_model=LeadResponseSchema, status_code=201)
async def create_lead(payload: LeadPayloadSchema, background_tasks: BackgroundTasks) -> LeadResponseSchema:
    lead_id = await crud.post(payload)

    background_tasks.add_task(generate_lead, lead_id, payload.url) # type: ignore

    response_object = {"id": lead_id, "url": payload.url}
    return response_object # type: ignore

@router.get("/{id}/", response_model=LeadSchema)
async def read_lead(id: int = Path(..., gt=0)):
    lead = await crud.get(id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    return lead

@router.get("/", response_model=list[LeadSchema])
async def read_all_summaries() -> list:
    return await crud.get_all()


@router.delete("/{id}/", response_model=LeadSchema)
async def delete_lead(id: int = Path(..., gt=0)):
    lead = await crud.get(id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    await crud.delete(id)
    return lead

@router.put("/{id}/", response_model=LeadSchema)
async def update_lead(payload: LeadUpdatePayloadSchema, id: int = Path(..., gt=0)):
    lead = await crud.put(id, payload)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    return lead