# app/api/contacts.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import select

from app import models, schemas
from app.core.db import get_async_session

router: APIRouter = APIRouter()
