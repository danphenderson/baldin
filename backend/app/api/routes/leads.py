from fastapi import APIRouter, Depends, HTTPException, status

from app.api import deps
from app.schemas import LeadCreate, LeadUpdate

router = APIRouter(tags=["leads"])