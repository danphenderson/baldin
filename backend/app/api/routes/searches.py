from fastapi import APIRouter, Depends, HTTPException, status

from app.api import deps


router = APIRouter(tags=["searches"])