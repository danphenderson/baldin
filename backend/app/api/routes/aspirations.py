from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import desc, func, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import (
    AsyncSession,
    get_aspiration,
    get_async_session,
    get_current_user,
    models,
    schemas,
)
from app.core import conf
from app.core.rate_limit import limiter

router: APIRouter = APIRouter()


def _duplicate_error() -> HTTPException:
    return HTTPException(
        status_code=409,
        detail="An aspiration with this kind and label already exists.",
    )


async def _get_duplicate_aspiration(
    *,
    db: AsyncSession,
    user_id: object,
    kind: schemas.AspirationKind,
    label: str,
    exclude_id: object | None = None,
) -> models.Aspiration | None:
    query = select(models.Aspiration).where(
        models.Aspiration.user_id == user_id,
        models.Aspiration.kind == kind.value,
        models.Aspiration.label == label,
    )
    if exclude_id is not None:
        query = query.where(models.Aspiration.id != exclude_id)
    result = await db.execute(query)
    return result.scalars().first()


@router.get("", response_model=schemas.PaginatedResponse[schemas.AspirationSummaryRead])
async def list_aspirations(
    kind: schemas.AspirationKind | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    base = select(models.Aspiration).where(models.Aspiration.user_id == user.id)
    if kind is not None:
        base = base.where(models.Aspiration.kind == kind.value)

    count_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = count_result.scalar_one()
    result = await db.execute(
        base.order_by(desc(models.Aspiration.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    return schemas.PaginatedResponse[schemas.AspirationSummaryRead](
        items=result.scalars().all(),
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", status_code=201, response_model=schemas.AspirationRead)
async def create_aspiration(
    payload: schemas.AspirationCreate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    if (
        await _get_duplicate_aspiration(
            db=db,
            user_id=user.id,
            kind=payload.kind,
            label=payload.label,
        )
        is not None
    ):
        raise _duplicate_error()

    aspiration = models.Aspiration(
        **payload.model_dump(mode="python", exclude={"kind"}),
        kind=payload.kind.value,
        user_id=user.id,
    )
    db.add(aspiration)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise _duplicate_error() from exc

    await db.refresh(aspiration)
    return aspiration


@router.post("/match", response_model=schemas.AspirationMatchResponse)
async def match_aspirations(
    payload: schemas.AspirationMatchRequest,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    from app.core.rag.match_aspirations import AspirationMatcherService

    service = AspirationMatcherService(db)
    return await service.match(payload, user)


@router.post("/suggest", response_model=schemas.AspirationSuggestResponse)
@limiter.limit("5/minute")
async def suggest_aspirations(
    request: Request,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    del request
    from app.core.rag.match_aspirations.suggest import AspirationSuggestionService

    conf.openai.require_enabled("Aspiration suggestion")
    service = AspirationSuggestionService(db)
    return await service.suggest(user)


@router.get("/{id}", response_model=schemas.AspirationRead)
async def get_user_aspiration(
    aspiration: models.Aspiration = Depends(get_aspiration),
):
    return aspiration


@router.patch("/{id}", response_model=schemas.AspirationRead)
async def update_aspiration(
    payload: schemas.AspirationUpdate,
    aspiration: models.Aspiration = Depends(get_aspiration),
    db: AsyncSession = Depends(get_async_session),
):
    update_data = payload.model_dump(exclude_unset=True, mode="python")
    target_kind = update_data.get("kind", aspiration.kind)
    if isinstance(target_kind, schemas.AspirationKind):
        target_kind = target_kind.value

    target_label = update_data.get("label", aspiration.label)
    if target_label is not None:
        duplicate = await _get_duplicate_aspiration(
            db=db,
            user_id=aspiration.user_id,
            kind=schemas.AspirationKind(target_kind),
            label=target_label,
            exclude_id=aspiration.id,
        )
        if duplicate is not None:
            raise _duplicate_error()

    for field, value in update_data.items():
        if isinstance(value, schemas.AspirationKind):
            value = value.value
        setattr(aspiration, field, value)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise _duplicate_error() from exc

    await db.refresh(aspiration)
    return aspiration


@router.delete("/{id}", status_code=204)
async def delete_aspiration(
    aspiration: models.Aspiration = Depends(get_aspiration),
    db: AsyncSession = Depends(get_async_session),
):
    await db.delete(aspiration)
    await db.commit()
    return None
