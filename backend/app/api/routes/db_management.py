# Path: app/api/routes/db_management.py
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import UUID4
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    DataBaseManager,
    get_async_session,
    get_capped_pagination_params,
    get_current_superuser,
    models,
    schemas,
)
from app.core.db_management_audit import (
    log_db_management_delete_blocked,
    log_db_management_destructive_operation,
    log_db_management_operation_blocked,
)

router = APIRouter(dependencies=[Depends(get_current_superuser)])

_DELETE_BLOCK_REASON_DETAILS = {
    "last_remaining_superuser": "Cannot delete the last remaining superuser.",
    "self_delete": "Superusers cannot delete their own account.",
}

_PURGE_BLOCK_REASON_DETAILS = {
    "last_remaining_superuser": (
        "Cannot fully purge the last remaining superuser. "
        "Use scoped cleanup domains for targeted cleanup."
    ),
    "self_delete": (
        "Superusers cannot fully purge their own account. "
        "Use scoped cleanup domains for targeted cleanup."
    ),
}


def _serialize_db_management_user(
    user: models.User,
) -> schemas.DbManagementUserSummaryRead:
    parts = [name for name in (user.first_name, user.last_name) if name]
    display_name = " ".join(parts) if parts else user.email
    return schemas.DbManagementUserSummaryRead(
        user_id=user.id,
        email=user.email,
        display_name=display_name,
        is_active=bool(user.is_active),
        is_superuser=bool(user.is_superuser),
        is_discoverable=bool(user.is_discoverable),
        created_at=user.created_at,
    )


def _serialize_cleanup_domains(
    domains: list[schemas.DbManagementPurgeDomain] | None,
) -> list[str] | None:
    if not domains:
        return None
    return [domain.value for domain in domains]


@router.get(
    "/list-tables",
    response_model=list[str],
    deprecated=True,
    description="Deprecated. Use `GET /api/v1/db-management/tables` instead.",
)
async def list_tables(
    session: AsyncSession = Depends(get_async_session),
):
    db_manager = DataBaseManager(session)
    return await db_manager.list_tables()


@router.get(
    "/table-details/{table_name}",
    response_model=dict[str, str],
    deprecated=True,
    description="Deprecated. Use `GET /api/v1/db-management/tables/{table_name}` instead.",
)
async def get_table_details(
    table_name: str,
    session: AsyncSession = Depends(get_async_session),
):
    db_manager = DataBaseManager(session)
    return await db_manager.get_table_details(table_name)


@router.get("/status", response_model=schemas.DbManagementStatusRead)
async def get_db_management_status(
    session: AsyncSession = Depends(get_async_session),
):
    db_manager = DataBaseManager(session)
    return await db_manager.get_database_status()


@router.get("/tables", response_model=list[schemas.DbManagementTableSummaryRead])
async def list_db_management_tables(
    session: AsyncSession = Depends(get_async_session),
):
    db_manager = DataBaseManager(session)
    return await db_manager.list_table_summaries()


@router.get(
    "/tables/{table_name}",
    response_model=schemas.DbManagementTableDetailRead,
)
async def get_db_management_table(
    table_name: str,
    session: AsyncSession = Depends(get_async_session),
):
    db_manager = DataBaseManager(session)
    details = await db_manager.get_table_summary_details(table_name)
    if details is None:
        raise HTTPException(status_code=404, detail="Table not found")
    return details


@router.get("/users", response_model=schemas.DbManagementUserPaginatedRead)
async def list_db_management_users(
    q: str | None = Query(
        None, description="Search by email, first name, or last name"
    ),
    is_superuser: bool | None = Query(
        None,
        description="Filter by superuser status",
    ),
    is_active: bool | None = Query(
        None,
        description="Filter by active status",
    ),
    pagination: schemas.Pagination = Depends(get_capped_pagination_params),
    session: AsyncSession = Depends(get_async_session),
):
    db_manager = DataBaseManager(session)
    result = await db_manager.list_users_for_db_management(
        q=q,
        is_superuser=is_superuser,
        is_active=is_active,
        page=pagination.page,
        page_size=pagination.page_size,
        request_count=pagination.request_count,
    )
    return schemas.DbManagementUserPaginatedRead(
        items=[_serialize_db_management_user(user) for user in result["items"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
    )


@router.get(
    "/users/{user_id}/cleanup-preview",
    response_model=schemas.UserDataOperationPreview,
)
async def preview_user_data_operation(
    user_id: UUID4,
    domains: list[schemas.DbManagementPurgeDomain] | None = Query(
        None,
        description=(
            "Optional cleanup domains to target. Repeat the query parameter to "
            "scope preview counts."
        ),
    ),
    session: AsyncSession = Depends(get_async_session),
    current_superuser: schemas.UserRead = Depends(get_current_superuser),
):
    db_manager = DataBaseManager(session)
    result = await db_manager.preview_user_data_operation(
        user_id,
        current_superuser.id,
        domains=_serialize_cleanup_domains(domains),
    )
    if result is None:
        raise HTTPException(status_code=404, detail="User not found")
    return result


@router.patch("/users/{user_id}/purge", response_model=schemas.UserDataOperationResult)
async def purge_user_data(
    user_id: UUID4,
    domains: list[schemas.DbManagementPurgeDomain] | None = Query(
        None,
        description=(
            "Optional cleanup domains to purge. Repeat the query parameter to "
            "scope the destructive cleanup."
        ),
    ),
    session: AsyncSession = Depends(get_async_session),
    current_superuser: schemas.UserRead = Depends(get_current_superuser),
):
    db_manager = DataBaseManager(session)
    cleanup_domains = _serialize_cleanup_domains(domains)
    try:
        result = await db_manager.purge_user_data(
            user_id,
            current_superuser.id,
            domains=cleanup_domains,
        )
    except ValueError as exc:
        block_reason = str(exc)
        await log_db_management_operation_blocked(
            operation="purge_user_data",
            actor_user_id=current_superuser.id,
            target_user_id=user_id,
            block_reason=block_reason,
        )
        raise HTTPException(
            status_code=409,
            detail=_PURGE_BLOCK_REASON_DETAILS.get(block_reason, block_reason),
        ) from exc
    if result is None:
        raise HTTPException(status_code=404, detail="User not found")
    await log_db_management_destructive_operation(
        operation="purge_user_data",
        actor_user_id=current_superuser.id,
        target_user_id=user_id,
        result=result,
    )
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

    db_manager = DataBaseManager(session)
    delete_block_reason = await db_manager.get_delete_block_reason(
        target_user,
        current_superuser.id,
    )
    if delete_block_reason is not None:
        await log_db_management_delete_blocked(
            actor_user_id=current_superuser.id,
            target_user_id=user_id,
            delete_block_reason=delete_block_reason,
        )
        raise HTTPException(
            status_code=409,
            detail=_DELETE_BLOCK_REASON_DETAILS[delete_block_reason],
        )

    result = await db_manager.delete_user(user_id)
    if result is None:
        raise HTTPException(status_code=404, detail="User not found")
    await log_db_management_destructive_operation(
        operation="delete_user",
        actor_user_id=current_superuser.id,
        target_user_id=user_id,
        result=result,
    )
    return result
