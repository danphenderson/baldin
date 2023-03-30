# app/api/leads.py

from fastapi import APIRouter, HTTPException, Path
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from app.logging import console_log, get_async_logger
from app.api.crud import LeadCRUD
from app.models.pydantic import LeadPayloadSchema, LeadResponseSchema

templates = Jinja2Templates(directory="templates/")

log = get_async_logger(__name__)

router = APIRouter()


@router.post("/", status_code=201)
async def create_lead(payload: LeadPayloadSchema) -> dict[str, int]:
    await log.info(f"Creating lead with payload: {payload}.")
    lead_id = await LeadCRUD.post(payload)
    return {"id": lead_id}


@router.get("/{id}/", response_model=LeadResponseSchema)
async def read_lead(id: int = Path(..., gt=0)):
    await log.info(f"Reading lead with id: {id}.")
    lead = await LeadCRUD.get(id)
    if not lead:
        console_log.error(f"Lead with id: {id} not found.")
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.get("/", response_model=HTMLResponse) 
async def read_all_leads():
    leads = await LeadCRUD.get_all()
    return templates.TemplateResponse("leads.html", {"leads": leads})


@router.delete("/{id}/", response_model=LeadResponseSchema)
async def delete_lead(id: int = Path(..., gt=0)):
    await log.info(f"Deleting lead with id: {id}.")
    lead = await LeadCRUD.get(id)
    if not lead:
        console_log.error(f"Lead with id: {id} not found.")
        raise HTTPException(status_code=404, detail="Lead not found")
    await LeadCRUD.delete(id)
    return lead



@router.get("/latest/", response_model=LeadResponseSchema)
async def read_latest_lead():
    pass
