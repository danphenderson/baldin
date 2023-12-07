# app/api/cover_letters.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import select

from app import models, schemas
from app.api.deps import get_async_session

router: APIRouter = APIRouter()


@router.post("/", status_code=201, response_model=schemas.CoverLetterRead)
async def create_cover_letter(
    payload: schemas.CoverLetterCreate,
    db=Depends(get_async_session),
):
    cover_letter = models.CoverLetter(**payload.dict())
    db.add(cover_letter)
    await db.commit()
    await db.refresh(cover_letter)
    return cover_letter


@router.get("/{cover_letter_id}", response_model=schemas.CoverLetterRead)
async def get_cover_letter(
    cover_letter_id: UUID4,
    db=Depends(get_async_session),
):
    result = await db.execute(
        select(models.CoverLetter).where(models.CoverLetter.id == cover_letter_id)
    )
    cover_letter = result.scalars().first()
    if not cover_letter:
        raise HTTPException(status_code=404, detail="CoverLetter not found")
    return cover_letter


@router.get("/", response_model=list[schemas.CoverLetterRead])
async def get_cover_letters(
    db=Depends(get_async_session),
):
    result = await db.execute(select(models.CoverLetter))
    cover_letters = result.scalars().all()
    return cover_letters


@router.put("/{cover_letter_id}", response_model=schemas.CoverLetterRead)
async def update_cover_letter(
    cover_letter_id: UUID4,
    payload: schemas.CoverLetterUpdate,
    db=Depends(get_async_session),
):
    result = await db.execute(
        select(models.CoverLetter).where(models.CoverLetter.id == cover_letter_id)
    )
    cover_letter = result.scalars().first()
    if not cover_letter:
        raise HTTPException(status_code=404, detail="CoverLetter not found")
    cover_letter_data = payload.dict(exclude_unset=True)
    for field in cover_letter_data:
        setattr(cover_letter, field, cover_letter_data[field])
    await db.commit()
    await db.refresh(cover_letter)
    return cover_letter


@router.delete("/{cover_letter_id}", response_model=schemas.CoverLetterRead)
async def delete_cover_letter(
    cover_letter_id: UUID4,
    db=Depends(get_async_session),
):
    result = await db.execute(
        select(models.CoverLetter).where(models.CoverLetter.id == cover_letter_id)
    )
    cover_letter = result.scalars().first()
    if not cover_letter:
        raise HTTPException(status_code=404, detail="CoverLetter not found")
    await db.delete(cover_letter)
    await db.commit()
    return cover_letter
