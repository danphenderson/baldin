# app/api/routes/resumes.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import (
    AsyncSession,
    get_async_session,
    get_current_user,
    get_resume,
    models,
    schemas,
)

router: APIRouter = APIRouter()


@router.get("/", response_model=list[schemas.ResumeRead])
async def get_current_user_resumes(
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    result = await db.execute(
        select(models.Resume).where(models.Resume.user_id == user.id)
    )
    resumes = result.scalars().all()
    if not resumes:
        raise HTTPException(
            status_code=404, detail="No resumes found for the current user"
        )
    return resumes


@router.post("/", status_code=201, response_model=schemas.ResumeRead)
async def create_user_resume(
    payload: schemas.ResumeCreate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    resume = models.Resume(**payload.dict(), user_id=user.id)
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume


@router.get("/{resume_id}", response_model=schemas.ResumeRead)
async def get_user_resume(
    resume: schemas.ResumeRead = Depends(get_resume),
):
    return resume


@router.patch("/{resume_id}", response_model=schemas.ResumeRead)
async def update_user_resume(
    payload: schemas.ResumeUpdate,
    resume: schemas.ResumeRead = Depends(get_resume),
    db: AsyncSession = Depends(get_async_session),
):
    resume_data = payload.dict(exclude_unset=True)
    for field in resume_data:
        setattr(resume, field, resume_data[field])
    await db.commit()
    await db.refresh(resume)
    return resume


@router.delete("/{resume_id}", status_code=204)
async def delete_user_resume(
    resume: schemas.ResumeRead = Depends(get_resume),
    db: AsyncSession = Depends(get_async_session),
):
    await db.delete(resume)
    await db.commit()
    return None
