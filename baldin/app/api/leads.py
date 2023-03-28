# app/api/leads.py

import logging

from fastapi import APIRouter, HTTPException, Path, BackgroundTasks


from app.linkedin import generate_lead as generate_lead_linkedin
from app.glassdoor import generate_lead as generate_lead_glassdoor
from app.indeed import generate_lead as generate_lead_indeed

from app.api.crud import LeadCRUD
from app.models.pydantic import LeadPayloadSchema, LeadResponseSchema, LeadUpdatePayloadSchema
from app.models.tortoise import LeadSchema

log = logging.getLogger("uvicorn")

async def generate_lead(id: int, url: str):
    if "linkedin" in url:
        await generate_lead_linkedin(id, url)
    elif "glassdoor" in url:
        await generate_lead_glassdoor(id, url)
    elif "indeed" in url:
        await generate_lead_indeed(id, url)
    else:
        raise HTTPException(status_code=400, detail="Platform not supported")
        # TODO: This execption is not handled properly, it is being caught by the background task and not by the API.
        # Resulting in the completion of a lead that is not from a valid platform.

router = APIRouter()


@router.post("/", response_model=LeadResponseSchema, status_code=201)
async def create_lead(payload: LeadPayloadSchema, background_tasks: BackgroundTasks):
    log.info(f"Creating lead with url: {payload.url} and search_id: {payload.search_id}")
    lead_id, search_id, created_at, updated_at = await LeadCRUD.post(payload) 
    log.info(f"Created lead with id: {lead_id} at {created_at}.")
    background_tasks.add_task(generate_lead, lead_id, payload.url) 
    return {"id": lead_id, "url": payload.url, "search_id": search_id, "created_at": created_at, "updated_at": updated_at}


@router.get("/{id}/", response_model=LeadResponseSchema)
async def read_lead(id: int = Path(..., gt=0)):
    lead = await LeadCRUD.get(id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.get("/", response_model=list[LeadResponseSchema]) 
async def read_all_leads() -> list:
    return await LeadCRUD.get_all()


@router.delete("/{id}/", response_model=LeadResponseSchema)
async def delete_lead(id: int = Path(..., gt=0)):
    lead = await LeadCRUD.get(id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    await LeadCRUD.delete(id)
    return lead


@router.put("/{id}/", response_model=LeadResponseSchema)
async def update_lead(payload: LeadUpdatePayloadSchema, id: int = Path(..., gt=0)):
    lead = await LeadCRUD.put(id, payload)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead