# app/api/routes/messages.py

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import UUID4
from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.orm import selectinload

from app import models, schemas, utils
from app.api.deps import AsyncSession, get_async_session, get_current_user, require_tier

router: APIRouter = APIRouter()


# ---------------------------------------------------------------------------
# Serialisation helpers
# ---------------------------------------------------------------------------


def _serialize_message_author(user: models.User) -> schemas.MessageAuthorRead:
    return schemas.MessageAuthorRead(
        user_id=user.id,
        display_name=utils.build_user_display_name(user),
        avatar_uri=user.avatar_uri,
    )


def _serialize_message(msg: models.Message) -> schemas.MessageRead:
    return schemas.MessageRead(
        id=msg.id,
        created_at=msg.created_at,
        updated_at=msg.updated_at,
        author=_serialize_message_author(msg.author),
        content=msg.content,
        edited_at=msg.edited_at,
        parent_message_id=msg.parent_message_id,
    )


def _serialize_participant(
    part: models.ConversationParticipant,
) -> schemas.ConversationParticipantRead:
    return schemas.ConversationParticipantRead(
        user_id=part.user_id,
        display_name=utils.build_user_display_name(part.user),
        avatar_uri=part.user.avatar_uri if part.user else None,
        role=schemas.ConversationParticipantRole(part.role),
        joined_at=part.joined_at,
    )


# ---------------------------------------------------------------------------
# Guard helpers
# ---------------------------------------------------------------------------


async def _get_participant_or_403(
    db: AsyncSession, conversation_id: UUID4, user_id: UUID4
) -> models.ConversationParticipant:
    """Return the ConversationParticipant row or raise 403."""
    result = await db.execute(
        select(models.ConversationParticipant).where(
            models.ConversationParticipant.conversation_id == conversation_id,
            models.ConversationParticipant.user_id == user_id,
        )
    )
    part = result.scalars().first()
    if part is None:
        raise HTTPException(
            status_code=403, detail="You are not a participant in this conversation"
        )
    return part


async def _get_conversation_or_404(
    db: AsyncSession, conversation_id: UUID4
) -> models.Conversation:
    result = await db.execute(
        select(models.Conversation)
        .where(models.Conversation.id == conversation_id)
        .options(
            selectinload(models.Conversation.participants).selectinload(
                models.ConversationParticipant.user
            ),
        )
    )
    conv = result.scalars().first()
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


async def _require_accepted_connection(
    db: AsyncSession, user_a_id: UUID4, user_b_id: UUID4
) -> None:
    """Raise 403 unless user_a and user_b have an accepted connection."""
    result = await db.execute(
        select(models.Connection).where(
            or_(
                and_(
                    models.Connection.requester_id == user_a_id,
                    models.Connection.addressee_id == user_b_id,
                ),
                and_(
                    models.Connection.requester_id == user_b_id,
                    models.Connection.addressee_id == user_a_id,
                ),
            ),
            models.Connection.status == "accepted",
        )
    )
    if result.scalars().first() is None:
        raise HTTPException(
            status_code=403,
            detail="You must have an accepted connection to start a conversation",
        )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/unread", response_model=schemas.UnreadCountRead)
async def get_total_unread(
    db: AsyncSession = Depends(get_async_session),
    user: models.User = Depends(get_current_user),
):
    """Total unread message count across all conversations (for sidebar badge)."""
    # Sub-query: each participation's unread messages
    parts_q = select(models.ConversationParticipant).where(
        models.ConversationParticipant.user_id == user.id,
    )
    result = await db.execute(parts_q)
    participations = result.scalars().all()

    total = 0
    for part in participations:
        msg_filter = models.Message.conversation_id == part.conversation_id
        if part.last_read_at is not None:
            msg_filter = and_(msg_filter, models.Message.created_at > part.last_read_at)
        count_q = select(func.count()).select_from(models.Message).where(msg_filter)
        count_result = await db.execute(count_q)
        total += count_result.scalar() or 0

    return schemas.UnreadCountRead(total_unread=total)


@router.post("/", status_code=201, response_model=schemas.ConversationRead)
async def create_conversation(
    payload: schemas.ConversationCreate,
    db: AsyncSession = Depends(get_async_session),
    user: models.User = Depends(require_tier(schemas.SubscriptionTier.STARTER)),
):
    """Create a DM or group conversation."""

    # Groups require PRO tier
    if payload.type == schemas.ConversationType.GROUP:
        tier = schemas.SubscriptionTier(user.subscription_tier)
        from app.api.deps import _TIER_ORDER

        if _TIER_ORDER[tier] < _TIER_ORDER[schemas.SubscriptionTier.PRO]:
            raise HTTPException(
                status_code=403,
                detail="Group conversations require a pro subscription or above",
            )

    # Validate all participant user IDs exist
    for pid in payload.participant_user_ids:
        if pid == user.id:
            raise HTTPException(
                status_code=400,
                detail="Do not include yourself in participant_user_ids; you are auto-added",
            )
        target = await db.get(models.User, pid)
        if target is None:
            raise HTTPException(status_code=404, detail=f"User {pid} not found")

    if payload.type == schemas.ConversationType.DIRECT:
        other_id = payload.participant_user_ids[0]

        # Require accepted connection
        await _require_accepted_connection(db, user.id, other_id)

        # Check for existing DM between the pair
        existing_q = (
            select(models.Conversation)
            .where(models.Conversation.type == "direct")
            .join(models.ConversationParticipant)
            .where(models.ConversationParticipant.user_id.in_([user.id, other_id]))
            .group_by(models.Conversation.id)
            .having(func.count(models.ConversationParticipant.user_id) == 2)
        )
        result = await db.execute(existing_q)
        existing_conv = result.scalars().first()

        if existing_conv is not None:
            conv = await _get_conversation_or_404(db, existing_conv.id)
            return _build_conversation_read(conv, user.id, [])

    # Create the conversation
    conv = models.Conversation(
        type=payload.type.value,
        title=payload.title,
        created_by_user_id=user.id,
    )
    db.add(conv)
    await db.flush()

    # Add creator as participant
    creator_role = (
        "admin" if payload.type == schemas.ConversationType.GROUP else "member"
    )
    creator_part = models.ConversationParticipant(
        conversation_id=conv.id,
        user_id=user.id,
        role=creator_role,
    )
    db.add(creator_part)

    # Add other participants
    for pid in payload.participant_user_ids:
        part = models.ConversationParticipant(
            conversation_id=conv.id,
            user_id=pid,
            role="member",
        )
        db.add(part)

    await db.commit()

    # Reload with relationships
    conv = await _get_conversation_or_404(db, conv.id)
    return _build_conversation_read(conv, user.id, [])


def _build_conversation_read(
    conv: models.Conversation,
    viewer_user_id: UUID4,
    messages: list[models.Message],
    unread_count: int = 0,
) -> schemas.ConversationRead:
    last_msg = None
    if messages:
        last_msg = _serialize_message(messages[0])

    return schemas.ConversationRead(
        id=conv.id,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        type=schemas.ConversationType(conv.type),
        title=conv.title,
        participants=[_serialize_participant(p) for p in conv.participants],
        last_message=last_msg,
        unread_count=unread_count,
    )


@router.get("/", response_model=schemas.ConversationsPaginatedRead)
async def list_conversations(
    db: AsyncSession = Depends(get_async_session),
    user: models.User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """List the current user's conversations, sorted by most recent message."""

    # IDs of conversations the user is part of
    my_conv_ids = select(models.ConversationParticipant.conversation_id).where(
        models.ConversationParticipant.user_id == user.id,
    )

    # Count
    count_q = (
        select(func.count())
        .select_from(models.Conversation)
        .where(models.Conversation.id.in_(my_conv_ids))
    )
    total = (await db.execute(count_q)).scalar() or 0

    # Latest message timestamp per conversation (for ordering)
    latest_msg = (
        select(
            models.Message.conversation_id,
            func.max(models.Message.created_at).label("latest"),
        )
        .group_by(models.Message.conversation_id)
        .subquery()
    )

    query = (
        select(models.Conversation)
        .where(models.Conversation.id.in_(my_conv_ids))
        .outerjoin(
            latest_msg,
            models.Conversation.id == latest_msg.c.conversation_id,
        )
        .options(
            selectinload(models.Conversation.participants).selectinload(
                models.ConversationParticipant.user
            ),
        )
        .order_by(
            latest_msg.c.latest.desc().nulls_last(),
            models.Conversation.created_at.desc(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    result = await db.execute(query)
    conversations = result.scalars().unique().all()

    items: list[schemas.ConversationRead] = []
    for conv in conversations:
        # Last message
        last_msg_q = (
            select(models.Message)
            .where(models.Message.conversation_id == conv.id)
            .options(selectinload(models.Message.author))
            .order_by(models.Message.created_at.desc())
            .limit(1)
        )
        last_msg_result = await db.execute(last_msg_q)
        last_msgs = last_msg_result.scalars().all()

        # Unread count
        viewer_part = next((p for p in conv.participants if p.user_id == user.id), None)
        unread = 0
        if viewer_part is not None:
            unread_filter = models.Message.conversation_id == conv.id
            if viewer_part.last_read_at is not None:
                unread_filter = and_(
                    unread_filter,
                    models.Message.created_at > viewer_part.last_read_at,
                )
            unread = (
                await db.execute(
                    select(func.count())
                    .select_from(models.Message)
                    .where(unread_filter)
                )
            ).scalar() or 0

        items.append(_build_conversation_read(conv, user.id, last_msgs, unread))

    return schemas.ConversationsPaginatedRead(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{conversation_id}", response_model=schemas.ConversationDetailRead)
async def get_conversation(
    conversation_id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: models.User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    """Get conversation detail with paginated messages. Auto-marks as read."""
    conv = await _get_conversation_or_404(db, conversation_id)
    viewer_part = await _get_participant_or_403(db, conversation_id, user.id)

    # Total messages
    total_q = (
        select(func.count())
        .select_from(models.Message)
        .where(models.Message.conversation_id == conversation_id)
    )
    total_messages = (await db.execute(total_q)).scalar() or 0

    # Paginated messages (most recent first)
    msg_q = (
        select(models.Message)
        .where(models.Message.conversation_id == conversation_id)
        .options(selectinload(models.Message.author))
        .order_by(models.Message.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    msg_result = await db.execute(msg_q)
    messages = msg_result.scalars().all()

    # Auto-mark as read
    viewer_part.last_read_at = datetime.now(timezone.utc)
    await db.commit()

    return schemas.ConversationDetailRead(
        id=conv.id,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        type=schemas.ConversationType(conv.type),
        title=conv.title,
        participants=[_serialize_participant(p) for p in conv.participants],
        messages=[_serialize_message(m) for m in messages],
        total_messages=total_messages,
    )


@router.post(
    "/{conversation_id}/messages",
    status_code=201,
    response_model=schemas.MessageRead,
)
async def send_message(
    conversation_id: UUID4,
    payload: schemas.MessageCreate,
    db: AsyncSession = Depends(get_async_session),
    user: models.User = Depends(get_current_user),
):
    """Send a message in a conversation."""
    await _get_conversation_or_404(db, conversation_id)
    await _get_participant_or_403(db, conversation_id, user.id)

    # Validate parent belongs to same conversation
    if payload.parent_message_id is not None:
        parent_result = await db.execute(
            select(models.Message).where(
                models.Message.id == payload.parent_message_id,
                models.Message.conversation_id == conversation_id,
            )
        )
        if parent_result.scalars().first() is None:
            raise HTTPException(
                status_code=400,
                detail="Parent message not found in this conversation",
            )

    msg = models.Message(
        conversation_id=conversation_id,
        author_user_id=user.id,
        content=payload.content,
        parent_message_id=payload.parent_message_id,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    # Load author relationship
    result = await db.execute(
        select(models.Message)
        .where(models.Message.id == msg.id)
        .options(selectinload(models.Message.author))
    )
    msg = result.scalars().first()
    return _serialize_message(msg)


@router.patch(
    "/{conversation_id}/messages/{message_id}",
    response_model=schemas.MessageRead,
)
async def edit_message(
    conversation_id: UUID4,
    message_id: UUID4,
    payload: schemas.MessageEdit,
    db: AsyncSession = Depends(get_async_session),
    user: models.User = Depends(get_current_user),
):
    """Edit your own message."""
    await _get_participant_or_403(db, conversation_id, user.id)

    result = await db.execute(
        select(models.Message)
        .where(
            models.Message.id == message_id,
            models.Message.conversation_id == conversation_id,
        )
        .options(selectinload(models.Message.author))
    )
    msg = result.scalars().first()
    if msg is None:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.author_user_id != user.id:
        raise HTTPException(
            status_code=403, detail="You can only edit your own messages"
        )

    msg.content = payload.content
    msg.edited_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(msg)

    return _serialize_message(msg)


@router.delete("/{conversation_id}/messages/{message_id}", status_code=204)
async def delete_message(
    conversation_id: UUID4,
    message_id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: models.User = Depends(get_current_user),
):
    """Delete your own message (hard delete)."""
    await _get_participant_or_403(db, conversation_id, user.id)

    result = await db.execute(
        select(models.Message).where(
            models.Message.id == message_id,
            models.Message.conversation_id == conversation_id,
        )
    )
    msg = result.scalars().first()
    if msg is None:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.author_user_id != user.id:
        raise HTTPException(
            status_code=403, detail="You can only delete your own messages"
        )

    await db.delete(msg)
    await db.commit()


@router.post("/{conversation_id}/read", status_code=204)
async def mark_conversation_read(
    conversation_id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: models.User = Depends(get_current_user),
):
    """Mark a conversation as read (update last_read_at)."""
    await _get_conversation_or_404(db, conversation_id)
    part = await _get_participant_or_403(db, conversation_id, user.id)

    part.last_read_at = datetime.now(timezone.utc)
    await db.commit()


@router.post(
    "/{conversation_id}/participants",
    status_code=201,
    response_model=schemas.ConversationParticipantRead,
)
async def add_participant(
    conversation_id: UUID4,
    user_id: UUID4 = Query(description="User ID to add"),
    db: AsyncSession = Depends(get_async_session),
    user: models.User = Depends(require_tier(schemas.SubscriptionTier.PRO)),
):
    """Add a participant to a group conversation. Only admins can add."""
    conv = await _get_conversation_or_404(db, conversation_id)
    if conv.type != "group":
        raise HTTPException(
            status_code=400, detail="Can only add participants to group conversations"
        )

    caller_part = await _get_participant_or_403(db, conversation_id, user.id)
    if caller_part.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can add participants")

    # Check target user exists
    target_user = await db.get(models.User, user_id)
    if target_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Check not already a participant
    existing = await db.execute(
        select(models.ConversationParticipant).where(
            models.ConversationParticipant.conversation_id == conversation_id,
            models.ConversationParticipant.user_id == user_id,
        )
    )
    if existing.scalars().first() is not None:
        raise HTTPException(status_code=409, detail="User is already a participant")

    new_part = models.ConversationParticipant(
        conversation_id=conversation_id,
        user_id=user_id,
        role="member",
    )
    db.add(new_part)
    await db.commit()
    await db.refresh(new_part)

    # Load user relationship
    result = await db.execute(
        select(models.ConversationParticipant)
        .where(
            models.ConversationParticipant.conversation_id == conversation_id,
            models.ConversationParticipant.user_id == user_id,
        )
        .options(selectinload(models.ConversationParticipant.user))
    )
    new_part = result.scalars().first()
    return _serialize_participant(new_part)


@router.delete("/{conversation_id}/participants/{target_user_id}", status_code=204)
async def remove_participant(
    conversation_id: UUID4,
    target_user_id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: models.User = Depends(get_current_user),
):
    """Remove a participant or leave a group. Admins can remove others; anyone can leave."""
    conv = await _get_conversation_or_404(db, conversation_id)
    if conv.type != "group":
        raise HTTPException(
            status_code=400,
            detail="Can only remove participants from group conversations",
        )

    caller_part = await _get_participant_or_403(db, conversation_id, user.id)

    is_self = target_user_id == user.id
    if not is_self and caller_part.role != "admin":
        raise HTTPException(
            status_code=403, detail="Only admins can remove other participants"
        )

    # Find target participant
    target_result = await db.execute(
        select(models.ConversationParticipant).where(
            models.ConversationParticipant.conversation_id == conversation_id,
            models.ConversationParticipant.user_id == target_user_id,
        )
    )
    target_part = target_result.scalars().first()
    if target_part is None:
        raise HTTPException(status_code=404, detail="Participant not found")

    await db.delete(target_part)
    await db.flush()

    # Check if any participants remain
    remaining_q = (
        select(func.count())
        .select_from(models.ConversationParticipant)
        .where(models.ConversationParticipant.conversation_id == conversation_id)
    )
    remaining = (await db.execute(remaining_q)).scalar() or 0

    if remaining == 0:
        # Delete the conversation entirely
        conv_to_delete = await db.get(models.Conversation, conversation_id)
        if conv_to_delete:
            await db.delete(conv_to_delete)

    await db.commit()
