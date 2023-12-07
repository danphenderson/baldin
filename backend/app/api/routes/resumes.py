# app/api/resumes.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import select

from app import models, schemas
from app.api.deps import get_async_session

router: APIRouter = APIRouter()
# app/api/resumes.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import select

from app import models, schemas
from app.api.deps import get_async_session

router: APIRouter = APIRouter()


@router.post("/", status_code=201, response_model=schemas.ResumeRead)
async def create_resume(
    payload: schemas.ResumeCreate,
    db=Depends(get_async_session),
):
    resume = models.Resume(**payload.dict())
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume


@router.get("/{resume_id}", response_model=schemas.ResumeRead)
async def get_resume(
    resume_id: UUID4,
    db=Depends(get_async_session),
):
    result = await db.execute(
        select(models.Resume).where(models.Resume.id == resume_id)
    )
    resume = result.scalars().first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume


@router.get("/", response_model=list[schemas.ResumeRead])
async def get_resumes(
    db=Depends(get_async_session),
):
    result = await db.execute(select(models.Resume))
    resumes = result.scalars().all()
    return resumes


@router.put("/{resume_id}", response_model=schemas.ResumeRead)
async def update_resume(
    resume_id: UUID4,
    payload: schemas.ResumeUpdate,
    db=Depends(get_async_session),
):
    result = await db.execute(
        select(models.Resume).where(models.Resume.id == resume_id)
    )
    resume = result.scalars().first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    resume_data = payload.dict(exclude_unset=True)
    for key, value in resume_data.items():
        setattr(resume, key, value)
    await db.commit()
    await db.refresh(resume)
    return resume


@router.delete("/{resume_id}", status_code=204)
async def delete_resume(
    resume_id: UUID4,
    db=Depends(get_async_session),
):
    result = await db.execute(
        select(models.Resume).where(models.Resume.id == resume_id)
    )
    resume = result.scalars().first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    await db.delete(resume)
    await db.commit()
    return None
