from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import UUID4
from sqlalchemy import select

from app.api.deps import (
    get_async_session,
    get_cover_letter,
    get_current_user,
    models,
    schemas,
)

router: APIRouter = APIRouter()


@router.get("/", response_model=list[schemas.CoverLetterRead])
async def get_current_user_cover_letters(
    user: schemas.UserRead = Depends(get_current_user),
    db=Depends(get_async_session),
):
    cover_letters = await db.execute(
        select(models.CoverLetter).filter(models.CoverLetter.user_id == user.id)
    )
    return cover_letters.scalars().all()


@router.get("/{cover_letter_id}", response_model=schemas.CoverLetterRead)
async def get_cover_letter_by_id(
    cover_letter: schemas.CoverLetterRead = Depends(get_cover_letter),
):
    return cover_letter


@router.post("/", status_code=201, response_model=schemas.CoverLetterRead)
async def create_user_cover_letter(
    payload: schemas.CoverLetterCreate,
    user: schemas.UserRead = Depends(get_current_user),
    db=Depends(get_async_session),
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
    db=Depends(get_async_session),
):
    for field, value in payload:
        setattr(cover_letter, field, value)
    await db.commit()
    await db.refresh(cover_letter)
    return cover_letter
