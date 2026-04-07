# app/api/routes/activity_feed.py

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import String, and_, cast, func, or_, select
from sqlalchemy.orm import selectinload

from app import models, schemas
from app.api.deps import AsyncSession, get_async_session, get_current_user
from app.core.datetime_utils import (
    ensure_utc,
    now_utc,
    now_utc_naive,
    parse_utc_datetime,
)

router: APIRouter = APIRouter()


def _application_status_text_expression():
    return func.lower(cast(models.Application.__table__.c.status, String))


@router.get("/", response_model=schemas.ActivityFeedRead)
async def get_activity_feed(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    since: datetime | None = None,
    entity_type: str | None = None,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    if since is None:
        since = now_utc() - timedelta(days=7)
    else:
        since = ensure_utc(since)

    # Database timestamp columns are stored as naive UTC datetimes today, so
    # query cutoffs need to drop tzinfo after normalizing the instant to UTC.
    db_since = since.replace(tzinfo=None)

    items: list[schemas.ActivityFeedItem] = []

    # 1. Application status changes (from status_history JSONB)
    if entity_type is None or entity_type == "application":
        result = await db.execute(
            select(
                models.Application.id,
                models.Application.status_history,
                models.Lead.title,
            )
            .outerjoin(models.Lead, models.Lead.id == models.Application.lead_id)
            .where(models.Application.user_id == user.id)
        )
        for application_id, status_history, lead_title in result.all():
            history = status_history or []
            for entry in history:
                changed_at_raw = entry.get("changed_at")
                if not changed_at_raw:
                    continue
                changed_at = parse_utc_datetime(changed_at_raw)
                if changed_at is None:
                    continue
                if changed_at < since:
                    continue
                items.append(
                    schemas.ActivityFeedItem(
                        type="status_change",
                        entity_type="application",
                        entity_id=application_id,
                        title=lead_title or "Application",
                        detail=f"{entry.get('from', 'none')} → {entry.get('to', 'unknown')}",
                        timestamp=changed_at,
                    )
                )

    # 2. Messages
    if entity_type is None or entity_type == "conversation":
        result = await db.execute(
            select(models.Message)
            .join(
                models.ConversationParticipant,
                models.ConversationParticipant.conversation_id
                == models.Message.conversation_id,
            )
            .options(selectinload(models.Message.author))
            .where(
                models.ConversationParticipant.user_id == user.id,
                models.Message.created_at >= db_since,
            )
        )
        messages = result.scalars().unique().all()
        for msg in messages:
            author_name = (
                msg.author.first_name
                if msg.author and msg.author.first_name
                else "Message"
            )
            items.append(
                schemas.ActivityFeedItem(
                    type="message",
                    entity_type="conversation",
                    entity_id=msg.conversation_id,
                    title=author_name,
                    detail=msg.content[:100] if msg.content else None,
                    timestamp=ensure_utc(msg.created_at),
                )
            )

    # 3. Document versions
    if entity_type is None or entity_type == "document":
        result = await db.execute(
            select(models.DocumentVersion)
            .join(
                models.Document,
                models.Document.id == models.DocumentVersion.document_id,
            )
            .options(
                selectinload(models.DocumentVersion.document),
            )
            .where(
                models.Document.user_id == user.id,
                models.DocumentVersion.created_at >= db_since,
            )
        )
        versions = result.scalars().all()
        for ver in versions:
            doc = ver.document
            items.append(
                schemas.ActivityFeedItem(
                    type="document_update",
                    entity_type="document",
                    entity_id=doc.id,
                    title=doc.title,
                    detail=f"Version {ver.version_number}",
                    timestamp=ensure_utc(ver.created_at),
                )
            )

    # 4. Connections
    if entity_type is None or entity_type == "connection":
        result = await db.execute(
            select(models.Connection).where(
                or_(
                    models.Connection.requester_id == user.id,
                    models.Connection.addressee_id == user.id,
                ),
                models.Connection.updated_at >= db_since,
            )
        )
        connections = result.scalars().all()
        for conn in connections:
            items.append(
                schemas.ActivityFeedItem(
                    type="connection",
                    entity_type="connection",
                    entity_id=conn.id,
                    title="Connection request",
                    detail=conn.status,
                    timestamp=ensure_utc(conn.updated_at),
                )
            )

    # 5. ActionItem completions
    if entity_type is None or entity_type == "action_item":
        result = await db.execute(
            select(models.ActionItem).where(
                models.ActionItem.user_id == user.id,
                models.ActionItem.status == "completed",
                models.ActionItem.completed_at >= db_since,
            )
        )
        completed_items = result.scalars().all()
        for ai in completed_items:
            items.append(
                schemas.ActivityFeedItem(
                    type="action_completed",
                    entity_type="action_item",
                    entity_id=ai.id,
                    title=ai.title,
                    timestamp=ensure_utc(ai.completed_at),
                )
            )

    # Sort by timestamp descending
    items.sort(key=lambda x: x.timestamp, reverse=True)

    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = items[start:end]

    return schemas.ActivityFeedRead(
        items=page_items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/summary", response_model=schemas.CommandCenterSummary)
async def get_command_center_summary(
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    now = now_utc_naive()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    application_status_text = _application_status_text_expression()

    # Lead counts
    lead_count_q = (
        select(func.count())
        .select_from(models.LeadRegistration)
        .where(models.LeadRegistration.user_id == user.id)
    )
    lead_count = (await db.execute(lead_count_q)).scalar() or 0

    # Registered leads with no application
    applied_lead_ids_q = select(models.Application.lead_id).where(
        models.Application.user_id == user.id
    )
    unapplied_q = (
        select(func.count())
        .select_from(models.LeadRegistration)
        .where(
            models.LeadRegistration.user_id == user.id,
            ~models.LeadRegistration.lead_id.in_(applied_lead_ids_q),
        )
    )
    unapplied_lead_count = (await db.execute(unapplied_q)).scalar() or 0

    # Application counts
    app_count_q = (
        select(func.count())
        .select_from(models.Application)
        .where(models.Application.user_id == user.id)
    )
    application_count = (await db.execute(app_count_q)).scalar() or 0

    active_app_q = (
        select(func.count())
        .select_from(models.Application)
        .where(
            models.Application.user_id == user.id,
            ~application_status_text.in_(
                [
                    schemas.ApplicationStatus.REJECTED.value,
                    schemas.ApplicationStatus.WITHDRAWN.value,
                ]
            ),
        )
    )
    active_application_count = (await db.execute(active_app_q)).scalar() or 0

    # Status breakdown
    breakdown_status = func.coalesce(application_status_text, "unknown")
    breakdown_q = (
        select(breakdown_status, func.count())
        .where(models.Application.user_id == user.id)
        .group_by(breakdown_status)
    )
    breakdown_result = await db.execute(breakdown_q)
    status_breakdown = {(row[0] or "unknown"): row[1] for row in breakdown_result.all()}

    # ActionItem counts
    pending_ai_q = (
        select(func.count())
        .select_from(models.ActionItem)
        .where(
            models.ActionItem.user_id == user.id,
            models.ActionItem.status.in_(["pending", "in_progress"]),
        )
    )
    pending_action_items = (await db.execute(pending_ai_q)).scalar() or 0

    overdue_ai_q = (
        select(func.count())
        .select_from(models.ActionItem)
        .where(
            models.ActionItem.user_id == user.id,
            models.ActionItem.due_at < now,
            ~models.ActionItem.status.in_(["completed", "dismissed"]),
        )
    )
    overdue_action_items = (await db.execute(overdue_ai_q)).scalar() or 0

    due_today_q = (
        select(func.count())
        .select_from(models.ActionItem)
        .where(
            models.ActionItem.user_id == user.id,
            models.ActionItem.due_at >= today_start,
            models.ActionItem.due_at < today_end,
        )
    )
    action_items_due_today = (await db.execute(due_today_q)).scalar() or 0

    # Pending connections (incoming)
    pending_conn_q = (
        select(func.count())
        .select_from(models.Connection)
        .where(
            models.Connection.addressee_id == user.id,
            models.Connection.status == "pending",
        )
    )
    pending_connections = (await db.execute(pending_conn_q)).scalar() or 0

    # Unread messages (same pattern as messages route)
    parts_q = select(models.ConversationParticipant).where(
        models.ConversationParticipant.user_id == user.id,
    )
    parts_result = await db.execute(parts_q)
    participations = parts_result.scalars().all()

    unread_messages = 0
    for part in participations:
        msg_filter = models.Message.conversation_id == part.conversation_id
        if part.last_read_at is not None:
            msg_filter = and_(msg_filter, models.Message.created_at > part.last_read_at)
        count_q = select(func.count()).select_from(models.Message).where(msg_filter)
        count_result = await db.execute(count_q)
        unread_messages += count_result.scalar() or 0

    # Profile completion: skills, experiences, education, certificates (25% each)
    profile_completion = 0
    for model_cls in [
        models.Skill,
        models.Experience,
        models.Education,
        models.Certificate,
    ]:
        exists_q = (
            select(func.count())
            .select_from(model_cls)
            .where(model_cls.user_id == user.id)
        )
        if (await db.execute(exists_q)).scalar():
            profile_completion += 25

    # Documents
    docs_q = (
        select(func.count())
        .select_from(models.Document)
        .where(models.Document.user_id == user.id)
    )
    documents_count = (await db.execute(docs_q)).scalar() or 0

    draft_docs_q = (
        select(func.count())
        .select_from(models.Document)
        .where(
            models.Document.user_id == user.id,
            models.Document.status == "draft",
        )
    )
    draft_documents_count = (await db.execute(draft_docs_q)).scalar() or 0

    return schemas.CommandCenterSummary(
        lead_count=lead_count,
        unapplied_lead_count=unapplied_lead_count,
        application_count=application_count,
        active_application_count=active_application_count,
        status_breakdown=status_breakdown,
        pending_action_items=pending_action_items,
        overdue_action_items=overdue_action_items,
        action_items_due_today=action_items_due_today,
        pending_connections=pending_connections,
        unread_messages=unread_messages,
        profile_completion=profile_completion,
        documents_count=documents_count,
        draft_documents_count=draft_documents_count,
    )
