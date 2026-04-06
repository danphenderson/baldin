# app/api/routes/connections.py

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import UUID4
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app import utils
from app.api.deps import (
    AsyncSession,
    get_async_session,
    get_current_user,
    get_pagination_params,
    models,
    require_tier,
    schemas,
)

router: APIRouter = APIRouter()


def _serialize_connection_user(user: models.User) -> schemas.ConnectionUserSummaryRead:
    return schemas.ConnectionUserSummaryRead(
        user_id=user.id,
        display_name=utils.build_user_display_name(user),
        headline=user.headline,
        avatar_uri=user.avatar_uri,
        city=user.city,
        state=user.state,
        country=user.country,
    )


def _serialize_connection(conn: models.Connection) -> schemas.ConnectionRead:
    return schemas.ConnectionRead(
        id=conn.id,
        created_at=conn.created_at,
        updated_at=conn.updated_at,
        requester=_serialize_connection_user(conn.requester),
        addressee=_serialize_connection_user(conn.addressee),
        status=schemas.ConnectionStatus(conn.status),
        message=conn.message,
    )


@router.post(
    "/",
    status_code=201,
    response_model=schemas.ConnectionRead,
)
async def send_connection_request(
    payload: schemas.ConnectionCreate,
    db: AsyncSession = Depends(get_async_session),
    user: models.User = Depends(require_tier(schemas.SubscriptionTier.STARTER)),
):
    """Send a connection request to another user."""
    if payload.addressee_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot connect to yourself")

    # Check that the addressee exists
    addressee = await db.get(models.User, payload.addressee_id)
    if addressee is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Check for existing connection in either direction
    existing_query = select(models.Connection).where(
        or_(
            (models.Connection.requester_id == user.id)
            & (models.Connection.addressee_id == payload.addressee_id),
            (models.Connection.requester_id == payload.addressee_id)
            & (models.Connection.addressee_id == user.id),
        )
    )
    result = await db.execute(existing_query)
    existing = result.scalars().first()

    if existing is not None:
        if existing.status == "blocked":
            raise HTTPException(
                status_code=403, detail="Unable to send connection request"
            )
        if existing.status in ("pending", "accepted"):
            raise HTTPException(
                status_code=409,
                detail=f"A connection already exists with status: {existing.status}",
            )
        # If declined, allow a new request by removing the old one
        if existing.status == "declined":
            await db.delete(existing)
            await db.flush()

    connection = models.Connection(
        requester_id=user.id,
        addressee_id=payload.addressee_id,
        status="pending",
        message=payload.message,
    )
    db.add(connection)
    await db.commit()
    result = await db.execute(
        select(models.Connection)
        .where(models.Connection.id == connection.id)
        .options(
            selectinload(models.Connection.requester),
            selectinload(models.Connection.addressee),
        )
    )
    connection = result.scalars().first()
    return _serialize_connection(connection)


@router.get("/", response_model=schemas.ConnectionsPaginatedRead)
async def list_connections(
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
    pagination: schemas.Pagination = Depends(get_pagination_params),
    status: str | None = Query(None, description="Filter by connection status"),
):
    """List connections for the current user (both sent and received)."""
    base_filter = or_(
        models.Connection.requester_id == user.id,
        models.Connection.addressee_id == user.id,
    )

    query = (
        select(models.Connection)
        .where(base_filter)
        .options(
            selectinload(models.Connection.requester),
            selectinload(models.Connection.addressee),
        )
        .order_by(models.Connection.created_at.desc())
    )
    count_query = select(func.count()).select_from(models.Connection).where(base_filter)

    if status is not None:
        query = query.where(models.Connection.status == status)
        count_query = count_query.where(models.Connection.status == status)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (pagination.page - 1) * pagination.page_size
    query = query.offset(offset).limit(pagination.page_size)

    result = await db.execute(query)
    connections = result.scalars().all()

    return schemas.ConnectionsPaginatedRead(
        items=[_serialize_connection(c) for c in connections],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.patch("/{id}/accept", response_model=schemas.ConnectionRead)
async def accept_connection(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    """Accept a pending connection request. Only the addressee can accept."""
    connection = await db.get(
        models.Connection,
        id,
        options=[
            selectinload(models.Connection.requester),
            selectinload(models.Connection.addressee),
        ],
    )
    if connection is None:
        raise HTTPException(status_code=404, detail="Connection not found")
    if connection.addressee_id != user.id:
        raise HTTPException(
            status_code=403, detail="Only the addressee can accept the request"
        )
    if connection.status != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"Connection is not pending (current status: {connection.status})",
        )

    connection.status = "accepted"
    await db.commit()
    result = await db.execute(
        select(models.Connection)
        .where(models.Connection.id == id)
        .options(
            selectinload(models.Connection.requester),
            selectinload(models.Connection.addressee),
        )
    )
    connection = result.scalars().first()
    return _serialize_connection(connection)


@router.patch("/{id}/decline", response_model=schemas.ConnectionRead)
async def decline_connection(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    """Decline a pending connection request. Only the addressee can decline."""
    connection = await db.get(
        models.Connection,
        id,
        options=[
            selectinload(models.Connection.requester),
            selectinload(models.Connection.addressee),
        ],
    )
    if connection is None:
        raise HTTPException(status_code=404, detail="Connection not found")
    if connection.addressee_id != user.id:
        raise HTTPException(
            status_code=403, detail="Only the addressee can decline the request"
        )
    if connection.status != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"Connection is not pending (current status: {connection.status})",
        )

    connection.status = "declined"
    await db.commit()
    result = await db.execute(
        select(models.Connection)
        .where(models.Connection.id == id)
        .options(
            selectinload(models.Connection.requester),
            selectinload(models.Connection.addressee),
        )
    )
    connection = result.scalars().first()
    return _serialize_connection(connection)


@router.delete("/{id}", status_code=204)
async def remove_connection(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    """Remove an accepted connection or cancel a pending request. Either party can do this."""
    connection = await db.get(
        models.Connection,
        id,
        options=[
            selectinload(models.Connection.requester),
            selectinload(models.Connection.addressee),
        ],
    )
    if connection is None:
        raise HTTPException(status_code=404, detail="Connection not found")
    if user.id not in (connection.requester_id, connection.addressee_id):
        raise HTTPException(
            status_code=403, detail="Not authorized to remove this connection"
        )
    if connection.status not in ("pending", "accepted"):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot remove a connection with status: {connection.status}",
        )

    await db.delete(connection)
    await db.commit()


@router.post("/{id}/block", response_model=schemas.ConnectionRead)
async def block_connection(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    """Block a user via an existing connection record. Sets status to blocked."""
    connection = await db.get(
        models.Connection,
        id,
        options=[
            selectinload(models.Connection.requester),
            selectinload(models.Connection.addressee),
        ],
    )
    if connection is None:
        raise HTTPException(status_code=404, detail="Connection not found")
    if user.id not in (connection.requester_id, connection.addressee_id):
        raise HTTPException(
            status_code=403, detail="Not authorized to block this connection"
        )

    connection.status = "blocked"
    await db.commit()
    result = await db.execute(
        select(models.Connection)
        .where(models.Connection.id == id)
        .options(
            selectinload(models.Connection.requester),
            selectinload(models.Connection.addressee),
        )
    )
    connection = result.scalars().first()
    return _serialize_connection(connection)
