# app/api/routes/cover_letters.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select

from app.api.deps import (
    AsyncSession,
    get_async_session,
    get_cover_letter,
    get_current_user,
    models,
    schemas,
)

router: APIRouter = APIRouter()


@router.get("/", response_model=list[schemas.CoverLetterRead])
async def get_current_user_cover_letters(
    content_type: schemas.ContentType
    | None = Query(None, description="Filter by content type"),
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    query = select(models.CoverLetter).filter(models.CoverLetter.user_id == user.id)
    if content_type:
        query = query.filter(models.CoverLetter.content_type == content_type)
    cover_letters = await db.execute(query)
    cover_letters = cover_letters.scalars().all()  # type: ignore

    if not cover_letters:
        raise HTTPException(
            status_code=404, detail="No cover letters found for the current user"
        )

    return cover_letters


@router.get("/{cover_letter_id}", response_model=schemas.CoverLetterRead)
async def get_cover_letter_by_id(
    cover_letter: schemas.CoverLetterRead = Depends(get_cover_letter),
):
    return cover_letter


@router.post("/", status_code=201, response_model=schemas.CoverLetterRead)
async def create_user_cover_letter(
    payload: schemas.CoverLetterCreate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    cover_letter = models.CoverLetter(**payload.dict(), user_id=user.id)
    db.add(cover_letter)
    await db.commit()
    await db.refresh(cover_letter)
    return cover_letter


@router.patch("/{cover_letter_id}", response_model=schemas.CoverLetterRead)
async def update_user_cover_letter(
    payload: schemas.CoverLetterUpdate,
    cover_letter: schemas.CoverLetterRead = Depends(get_cover_letter),
    db: AsyncSession = Depends(get_async_session),
):
    for field, value in payload:
        setattr(cover_letter, field, value)
    await db.commit()
    await db.refresh(cover_letter)
    return cover_letter


@router.delete("/{cover_letter_id}", status_code=204)
async def delete_user_cover_letter(
    cover_letter: schemas.CoverLetterRead = Depends(get_cover_letter),
    db: AsyncSession = Depends(get_async_session),
):
    await db.delete(cover_letter)
    await db.commit()
    return
