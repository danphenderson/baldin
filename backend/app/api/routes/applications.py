# app/api/applications.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import select

from app import models, schemas
from app.api.deps import get_application, get_async_session

router: APIRouter = APIRouter()
