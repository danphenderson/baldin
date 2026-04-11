# app/api/routes/action_items.py

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import UUID4
from sqlalchemy import asc, desc, func, select
from sqlalchemy.orm import joinedload

from app import models, schemas
from app.api.deps import AsyncSession, get_async_session, get_current_user
from app.core.datetime_utils import now_utc_naive

router: APIRouter = APIRouter()


async def _validate_entity_fks(
    payload: schemas.ActionItemCreate | schemas.ActionItemUpdate,
    user_id: UUID4,
    db: AsyncSession,
) -> None:
    """Validate that any entity FK references belong to the authenticated user."""
    checks: list[tuple[UUID4 | None, type, str]] = [
        (
            getattr(payload, "application_id", None),
            models.Application,
            "Application not found or not owned",
        ),
        (
            getattr(payload, "lead_id", None),
            models.Lead,
            "Lead not found",
        ),
        (
            getattr(payload, "document_id", None),
            models.Document,
            "Document not found or not owned",
        ),
    ]
    for fk_val, model_cls, err_msg in checks:
        if fk_val is None:
            continue
        if model_cls is models.Lead:
            # Leads are shared; verify the user has a registration
            result = await db.execute(
                select(models.LeadRegistration).where(
                    models.LeadRegistration.lead_id == fk_val,
                    models.LeadRegistration.user_id == user_id,
                )
            )
            if not result.scalars().first():
                raise HTTPException(status_code=400, detail=err_msg)
        else:
            result = await db.execute(
                select(model_cls).where(
                    model_cls.id == fk_val,
                    model_cls.user_id == user_id,
                )
            )
            if not result.scalars().first():
                raise HTTPException(status_code=400, detail=err_msg)

    # Conversation: verify user is a participant
    conversation_id = getattr(payload, "conversation_id", None)
    if conversation_id is not None:
        result = await db.execute(
            select(models.ConversationParticipant).where(
                models.ConversationParticipant.conversation_id == conversation_id,
                models.ConversationParticipant.user_id == user_id,
            )
        )
        if not result.scalars().first():
            raise HTTPException(
                status_code=400, detail="Conversation not found or not a participant"
            )


@router.post("/", status_code=201, response_model=schemas.ActionItemRead)
async def create_action_item(
    payload: schemas.ActionItemCreate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    await _validate_entity_fks(payload, user.id, db)

    item = models.ActionItem(
        **payload.model_dump(exclude_unset=True),
        user_id=user.id,
    )
    db.add(item)
    await db.commit()

    # Re-query to get consistent state
    result = await db.execute(
        select(models.ActionItem).where(models.ActionItem.id == item.id)
    )
    return result.scalars().first()


@router.get("/", response_model=schemas.PaginatedResponse[schemas.ActionItemDetailRead])
async def list_action_items(
    status: schemas.ActionItemStatus | None = None,
    kind: schemas.ActionItemKind | None = None,
    priority: schemas.ActionItemPriority | None = None,
    due_before: datetime | None = None,
    due_after: datetime | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    q = select(models.ActionItem).where(models.ActionItem.user_id == user.id)

    if status is not None:
        q = q.where(models.ActionItem.status == status.value)
    if kind is not None:
        q = q.where(models.ActionItem.kind == kind.value)
    if priority is not None:
        q = q.where(models.ActionItem.priority == priority.value)
    if due_before is not None:
        q = q.where(models.ActionItem.due_at <= due_before)
    if due_after is not None:
        q = q.where(models.ActionItem.due_at >= due_after)

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar_one()

    q = q.order_by(
        asc(models.ActionItem.sort_order),
        asc(models.ActionItem.due_at).nullslast(),
        desc(models.ActionItem.created_at),
    )

    q = q.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    return schemas.PaginatedResponse[schemas.ActionItemDetailRead](
        items=result.scalars().all(),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/reorder", status_code=204)
async def reorder_action_items(
    payload: schemas.ActionItemReorder,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Set sort_order for action items based on position in item_ids array."""
    result = await db.execute(
        select(models.ActionItem).where(
            models.ActionItem.user_id == user.id,
            models.ActionItem.id.in_(payload.item_ids),
        )
    )
    items_by_id = {item.id: item for item in result.scalars().all()}

    for idx, item_id in enumerate(payload.item_ids):
        item = items_by_id.get(item_id)
        if item:
            item.sort_order = idx
    await db.commit()


@router.get("/{id}", response_model=schemas.ActionItemDetailRead)
async def get_action_item(
    id: UUID4,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    result = await db.execute(
        select(models.ActionItem)
        .options(
            joinedload(models.ActionItem.application).joinedload(
                models.Application.lead
            ),
            joinedload(models.ActionItem.lead),
            joinedload(models.ActionItem.document),
        )
        .where(models.ActionItem.id == id)
    )
    item = result.scalars().first()
    if not item or item.user_id != user.id:
        raise HTTPException(status_code=404, detail="Action item not found")
    return item


@router.patch("/{id}", response_model=schemas.ActionItemRead)
async def update_action_item(
    id: UUID4,
    payload: schemas.ActionItemUpdate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    result = await db.execute(
        select(models.ActionItem).where(models.ActionItem.id == id)
    )
    item = result.scalars().first()
    if not item or item.user_id != user.id:
        raise HTTPException(status_code=404, detail="Action item not found")

    await _validate_entity_fks(payload, user.id, db)

    update_data = payload.model_dump(exclude_unset=True)
    new_status = update_data.get("status")

    # Auto-manage completed_at
    if new_status is not None:
        if (
            new_status == schemas.ActionItemStatus.COMPLETED.value
            and item.status != "completed"
        ):
            update_data["completed_at"] = now_utc_naive()
        elif (
            new_status != schemas.ActionItemStatus.COMPLETED.value
            and item.status == "completed"
        ):
            update_data["completed_at"] = None

    for key, value in update_data.items():
        setattr(item, key, value)

    await db.commit()

    # Re-query for consistent state
    result = await db.execute(
        select(models.ActionItem).where(models.ActionItem.id == id)
    )
    return result.scalars().first()


@router.delete("/{id}", status_code=204)
async def delete_action_item(
    id: UUID4,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    result = await db.execute(
        select(models.ActionItem).where(models.ActionItem.id == id)
    )
    item = result.scalars().first()
    if not item or item.user_id != user.id:
        raise HTTPException(status_code=404, detail="Action item not found")

    await db.delete(item)
    await db.commit()


@router.post(
    "/from-application/{application_id}",
    status_code=201,
    response_model=schemas.ActionItemRead,
)
async def create_action_item_from_application(
    application_id: UUID4,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    result = await db.execute(
        select(models.Application).where(models.Application.id == application_id)
    )
    app = result.scalars().first()
    if not app or app.user_id != user.id:
        raise HTTPException(status_code=404, detail="Application not found")

    if not app.next_step:
        raise HTTPException(
            status_code=400,
            detail="Application has no next_step defined",
        )

    item = models.ActionItem(
        user_id=user.id,
        title=app.next_step,
        kind="follow_up",
        status="pending",
        priority="medium",
        due_at=app.next_step_due,
        application_id=app.id,
    )
    db.add(item)
    await db.commit()

    result = await db.execute(
        select(models.ActionItem).where(models.ActionItem.id == item.id)
    )
    return result.scalars().first()
