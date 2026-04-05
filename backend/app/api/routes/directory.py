# app/api/routes/directory.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api.deps import (
    AsyncSession,
    get_async_session,
    get_current_user,
    get_pagination_params,
    models,
    schemas,
)

router = APIRouter()


def _serialize_directory_entry(
    user: models.User,
) -> schemas.UserDirectoryRead:
    parts = [n for n in (user.first_name, user.last_name) if n]
    display_name = " ".join(parts) if parts else user.email

    skills_summary = [s.name for s in (user.skills or []) if s.name][:10]

    avatar = user.avatar_uri
    if avatar and hasattr(avatar, "name"):
        avatar = avatar.name

    return schemas.UserDirectoryRead(
        user_id=user.id,
        display_name=display_name,
        headline=user.headline,
        avatar_uri=str(avatar) if avatar else None,
        city=user.city,
        state=user.state,
        country=user.country,
        placement_status=schemas.PlacementStatus(user.placement_status),
        subscription_tier=schemas.SubscriptionTier(user.subscription_tier),
        skills_summary=skills_summary,
    )


@router.get("/", response_model=schemas.UserDirectoryPaginatedRead)
async def list_directory(
    db: AsyncSession = Depends(get_async_session),
    pagination: schemas.Pagination = Depends(get_pagination_params),
    _current_user: models.User = Depends(get_current_user),
    q: str | None = Query(None, description="Search by name, headline, or skill"),
    placement_status: schemas.PlacementStatus | None = Query(
        None, description="Filter by placement status"
    ),
    location: str | None = Query(None, description="Filter by city/state/country"),
):
    """Paginated, searchable user directory.

    Only users with ``is_discoverable=True`` and ``is_active=True`` are returned.
    """
    base = (
        select(models.User)
        .options(selectinload(models.User.skills))
        .where(models.User.is_discoverable.is_(True))
        .where(models.User.is_active.is_(True))
    )

    if placement_status:
        base = base.where(models.User.placement_status == placement_status.value)

    if location:
        pattern = f"%{location}%"
        base = base.where(
            models.User.city.ilike(pattern)
            | models.User.state.ilike(pattern)
            | models.User.country.ilike(pattern)
        )

    if q:
        pattern = f"%{q}%"
        base = base.where(
            models.User.first_name.ilike(pattern)
            | models.User.last_name.ilike(pattern)
            | models.User.headline.ilike(pattern)
        )

    total = 0
    if pagination.request_count:
        count_result = await db.execute(
            select(func.count()).select_from(base.subquery())
        )
        total = count_result.scalar_one()

    offset = (pagination.page - 1) * pagination.page_size
    result = await db.execute(
        base.order_by(models.User.created_at.desc())
        .offset(offset)
        .limit(pagination.page_size)
    )
    users = result.scalars().unique().all()

    return schemas.UserDirectoryPaginatedRead(
        items=[_serialize_directory_entry(u) for u in users],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/{user_id}", response_model=schemas.UserPublicProfileRead)
async def read_public_profile(
    user_id: str,
    db: AsyncSession = Depends(get_async_session),
    _current_user: models.User = Depends(get_current_user),
):
    """View another user's public profile."""
    result = await db.execute(
        select(models.User)
        .options(
            selectinload(models.User.skills),
            selectinload(models.User.experiences),
        )
        .where(models.User.id == user_id)
        .where(models.User.is_active.is_(True))
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.is_discoverable:
        raise HTTPException(status_code=403, detail="This user's profile is not public")

    parts = [n for n in (user.first_name, user.last_name) if n]
    display_name = " ".join(parts) if parts else user.email

    avatar = user.avatar_uri
    if avatar and hasattr(avatar, "name"):
        avatar = avatar.name

    return schemas.UserPublicProfileRead(
        user_id=user.id,
        display_name=display_name,
        headline=user.headline,
        bio=user.bio,
        avatar_uri=str(avatar) if avatar else None,
        city=user.city,
        state=user.state,
        country=user.country,
        placement_status=schemas.PlacementStatus(user.placement_status),
        skills=[schemas.SkillRead.model_validate(s) for s in (user.skills or [])],
        experiences=[
            schemas.ExperienceRead.model_validate(e) for e in (user.experiences or [])
        ],
    )
