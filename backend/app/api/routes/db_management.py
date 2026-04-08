# Path: app/api/routes/db_management.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    DataBaseManager,
    get_async_session,
    get_current_superuser,
    models,
    schemas,
)

router = APIRouter(dependencies=[Depends(get_current_superuser)])


@router.get("/list-tables", response_model=list[str])
async def list_tables(
    session: AsyncSession = Depends(get_async_session),
):
    db_manager = DataBaseManager(session)
    return await db_manager.list_tables()


@router.get("/table-details/{table_name}", response_model=dict[str, str])
async def get_table_details(
    table_name: str,
    session: AsyncSession = Depends(get_async_session),
):
    db_manager = DataBaseManager(session)
    return await db_manager.get_table_details(table_name)


@router.patch("/users/{user_id}/purge", response_model=schemas.UserDataOperationResult)
async def purge_user_data(
    user_id: UUID4,
    session: AsyncSession = Depends(get_async_session),
):
    db_manager = DataBaseManager(session)
    result = await db_manager.purge_user_data(user_id)
    if result is None:
        raise HTTPException(status_code=404, detail="User not found")
    return result


@router.delete("/users/{user_id}", response_model=schemas.UserDataOperationResult)
async def delete_user(
    user_id: UUID4,
    session: AsyncSession = Depends(get_async_session),
    current_superuser: schemas.UserRead = Depends(get_current_superuser),
):
    target_user = await session.get(models.User, user_id)
    if target_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user.is_superuser:
        remaining_superusers = await session.scalar(
            select(func.count())
            .select_from(models.User)
            .where(models.User.is_superuser.is_(True))
        )
        if int(remaining_superusers or 0) <= 1:
            raise HTTPException(
                status_code=409,
                detail="Cannot delete the last remaining superuser.",
            )

    if target_user.id == current_superuser.id:
        raise HTTPException(
            status_code=409,
            detail="Superusers cannot delete their own account.",
        )

    db_manager = DataBaseManager(session)
    result = await db_manager.delete_user(user_id)
    return result
