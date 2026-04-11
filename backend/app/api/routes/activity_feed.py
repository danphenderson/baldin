# app/api/routes/activity_feed.py

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import String, and_, func, or_, select
from sqlalchemy.orm import selectinload

from app import models, schemas
from app.api.deps import AsyncSession, get_async_session, get_current_user
from app.core.datetime_utils import (
    ensure_utc,
    now_utc,
    now_utc_naive,
)

router: APIRouter = APIRouter()

_APPLICATION_STAGE_ORDER = [stage.value for stage in models.ApplicationStage]
_APPLICATION_STAGE_INDEX = {
    stage: index for index, stage in enumerate(_APPLICATION_STAGE_ORDER)
}
_FUNNEL_STAGE_ORDER = [
    models.ApplicationStage.APPLIED.value,
    models.ApplicationStage.SCREENING.value,
    models.ApplicationStage.INTERVIEW.value,
    models.ApplicationStage.OFFER.value,
]
_FUNNEL_STAGE_INDEX = {stage: index for index, stage in enumerate(_FUNNEL_STAGE_ORDER)}


def _stage_value(stage) -> str | None:
    """Normalize an ApplicationStage (or raw string) to its string value."""
    if stage is None:
        return None
    if isinstance(stage, models.ApplicationStage):
        return stage.value
    return str(stage).lower()


def _build_history_entries_from_table(
    history_rows: list[models.ApplicationStatusHistory],
) -> list[tuple[str, "datetime"]]:
    """Build (stage_value, changed_at) pairs from ApplicationStatusHistory rows.

    Entries that record a terminal outcome use the outcome value as the
    stage label (e.g. ``"rejected"``).  These won't match any stage in
    ``_APPLICATION_STAGE_ORDER`` so they are ignored for velocity
    accumulation but still act as endpoints for the preceding stage.
    """
    entries: list[tuple[str, datetime]] = []
    for row in history_rows:
        if row.outcome is not None:
            label = (
                row.outcome.value
                if isinstance(row.outcome, models.ApplicationOutcome)
                else str(row.outcome).lower()
            )
        else:
            label = _stage_value(row.stage)
        if label is None:
            continue
        entries.append((label, ensure_utc(row.changed_at)))
    entries.sort(key=lambda item: item[1])
    return entries


def _build_avg_days_per_stage(
    application_rows: list[
        tuple[
            list[models.ApplicationStatusHistory],
            models.ApplicationStage | None,
            datetime,
        ]
    ],
    *,
    current_time: datetime,
) -> list[schemas.CommandCenterStageVelocity]:
    totals = {stage: 0.0 for stage in _APPLICATION_STAGE_ORDER}
    counts = {stage: 0 for stage in _APPLICATION_STAGE_ORDER}

    for history_rows, current_stage, created_at in application_rows:
        history_entries = _build_history_entries_from_table(history_rows)

        if not history_entries:
            fallback = _stage_value(current_stage)
            if fallback is not None:
                history_entries.append((fallback, ensure_utc(created_at)))

        for index, (stage, started_at) in enumerate(history_entries):
            if stage not in _APPLICATION_STAGE_INDEX:
                continue

            ended_at = (
                history_entries[index + 1][1]
                if index + 1 < len(history_entries)
                else current_time
            )
            if ended_at < started_at:
                continue

            totals[stage] += (ended_at - started_at).total_seconds() / 86_400
            counts[stage] += 1

    return [
        schemas.CommandCenterStageVelocity(
            stage=stage,
            avg_days=round(totals[stage] / counts[stage], 1),
            sample_size=counts[stage],
        )
        for stage in _APPLICATION_STAGE_ORDER
        if counts[stage] > 0
    ]


def _build_offer_conversion_funnel(
    application_rows: list[
        tuple[
            list[models.ApplicationStatusHistory],
            models.ApplicationStage | None,
            datetime,
        ]
    ],
) -> list[schemas.CommandCenterFunnelStage]:
    counts = {stage: 0 for stage in _FUNNEL_STAGE_ORDER}

    for history_rows, current_stage, created_at in application_rows:
        history_entries = _build_history_entries_from_table(history_rows)

        if not history_entries:
            fallback = _stage_value(current_stage)
            if fallback is not None:
                history_entries.append((fallback, ensure_utc(created_at)))

        highest_stage_index = -1
        current = _stage_value(current_stage)
        if current in _FUNNEL_STAGE_INDEX:
            highest_stage_index = _FUNNEL_STAGE_INDEX[current]

        for stage, _ in history_entries:
            stage_index = _FUNNEL_STAGE_INDEX.get(stage)
            if stage_index is not None:
                highest_stage_index = max(highest_stage_index, stage_index)

        if highest_stage_index < 0:
            continue

        for stage in _FUNNEL_STAGE_ORDER[: highest_stage_index + 1]:
            counts[stage] += 1

    applied_count = counts[_FUNNEL_STAGE_ORDER[0]]
    funnel: list[schemas.CommandCenterFunnelStage] = []
    previous_count: int | None = None

    for stage in _FUNNEL_STAGE_ORDER:
        reached_count = counts[stage]
        funnel.append(
            schemas.CommandCenterFunnelStage(
                stage=stage,
                reached_count=reached_count,
                conversion_from_previous=(
                    None
                    if previous_count is None or previous_count == 0
                    else round((reached_count / previous_count) * 100, 1)
                ),
                conversion_from_applied=(
                    None
                    if applied_count == 0
                    else round((reached_count / applied_count) * 100, 1)
                ),
            )
        )
        previous_count = reached_count

    return funnel


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

    # 1. Application status changes (from application_status_history table)
    if entity_type is None or entity_type == "application":
        result = await db.execute(
            select(
                models.ApplicationStatusHistory.application_id,
                models.ApplicationStatusHistory.stage,
                models.ApplicationStatusHistory.outcome,
                models.ApplicationStatusHistory.changed_at,
                models.Lead.title,
            )
            .join(
                models.Application,
                models.Application.id == models.ApplicationStatusHistory.application_id,
            )
            .outerjoin(models.Lead, models.Lead.id == models.Application.lead_id)
            .where(
                models.Application.user_id == user.id,
                models.ApplicationStatusHistory.changed_at >= since,
            )
        )
        for application_id, stage, outcome, changed_at, lead_title in result.all():
            display_value = (
                outcome.value if outcome else stage.value if stage else "unknown"
            )
            items.append(
                schemas.ActivityFeedItem(
                    type="status_change",
                    entity_type="application",
                    entity_id=application_id,
                    title=lead_title or "Application",
                    detail=display_value,
                    timestamp=ensure_utc(changed_at),
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
    analytics_now = now_utc()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

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
            models.Application.outcome.is_(None),
        )
    )
    active_application_count = (await db.execute(active_app_q)).scalar() or 0

    # Status breakdown by stage + outcome
    stage_breakdown_q = (
        select(
            func.lower(func.cast(models.Application.stage, String)),
            func.count(),
        )
        .where(models.Application.user_id == user.id)
        .group_by(models.Application.stage)
    )
    breakdown_result = await db.execute(stage_breakdown_q)
    status_breakdown: dict[str, int] = {
        (row[0] or "unknown"): row[1] for row in breakdown_result.all()
    }
    # Add outcome counts
    outcome_breakdown_q = (
        select(
            func.lower(func.cast(models.Application.outcome, String)),
            func.count(),
        )
        .where(
            models.Application.user_id == user.id,
            models.Application.outcome.is_not(None),
        )
        .group_by(models.Application.outcome)
    )
    outcome_result = await db.execute(outcome_breakdown_q)
    for row in outcome_result.all():
        status_breakdown[row[0] or "unknown"] = (
            status_breakdown.get(row[0] or "unknown", 0) + row[1]
        )

    # Analytics: stage velocity and funnel from history table
    analytics_apps = await db.execute(
        select(models.Application)
        .options(selectinload(models.Application.status_history))
        .where(models.Application.user_id == user.id)
    )
    analytics_rows = [
        (list(app.status_history), app.stage, app.created_at)
        for app in analytics_apps.scalars().unique().all()
    ]
    avg_days_per_stage = _build_avg_days_per_stage(
        analytics_rows,
        current_time=analytics_now,
    )
    offer_conversion_funnel = _build_offer_conversion_funnel(analytics_rows)

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
        avg_days_per_stage=avg_days_per_stage,
        offer_conversion_funnel=offer_conversion_funnel,
        pending_action_items=pending_action_items,
        overdue_action_items=overdue_action_items,
        action_items_due_today=action_items_due_today,
        pending_connections=pending_connections,
        unread_messages=unread_messages,
        profile_completion=profile_completion,
        documents_count=documents_count,
        draft_documents_count=draft_documents_count,
    )
