# app/api/routes/services.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import select

from app.api.deps import AsyncSession, get_async_session, get_lead, models, schemas

router: APIRouter = APIRouter()
