# Path: app/api/routes/db_management.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    DataBaseManager,
    get_async_session,
    get_current_superuser,
    models,
)

router = APIRouter()


@router.get("/list-tables", response_model=list[str])
async def list_tables(
    session: AsyncSession = Depends(get_async_session),
    _: models.User = Depends(get_current_superuser),
):
    db_manager = DataBaseManager(session)
    return await db_manager.list_tables()


@router.get("/table-details/{table_name}", response_model=dict[str, str])
async def get_table_details(
    table_name: str,
    session: AsyncSession = Depends(get_async_session),
    _: models.User = Depends(get_current_superuser),
):
    db_manager = DataBaseManager(session)
    return await db_manager.get_table_details(table_name)
