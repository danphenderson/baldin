# app/api/applications.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app import models, schemas
from app.api.deps import get_async_session, get_current_user

router: APIRouter = APIRouter()


@router.post("/", status_code=201, response_model=schemas.ApplicationRead)
async def create_application(
    payload: schemas.ApplicationCreate,
    db=Depends(get_async_session),
    user=Depends(get_current_user),
):
    # Check if application already exists for the given lead_id and user
    existing_application = await db.execute(
        select(models.Application).where(
            models.Application.lead_id == payload.lead_id,
            models.Application.user_id == user.id,
        )
    )
    existing_application = existing_application.scalars().first()

    if existing_application:
        # Application for this lead already exists for the user, return an error response
        raise HTTPException(
            status_code=400, detail="Application for this lead already exists"
        )

    # Create a new application
    application_data = payload.dict()
    application_data["user_id"] = user.id  # Set the user_id from the current user
    application = models.Application(**application_data)
    db.add(application)
    await db.commit()
    await db.refresh(application)

    # Eagerly load related objects (lead and user) for serialization
    result = await db.execute(
        select(models.Application)
        .options(
            joinedload(models.Application.lead), joinedload(models.Application.user)
        )
        .where(models.Application.id == application.id)
    )
    application = result.scalars().first()

    return application


@router.get("/", response_model=list[schemas.ApplicationRead])
async def get_applications(
    db=Depends(get_async_session), user=Depends(get_current_user)
):
    """Get all applications for the current user."""
    result = await db.execute(
        select(models.Application)
        .where(models.Application.user_id == user.id)  # Filter by current user's ID
        .options(
            joinedload(models.Application.lead), joinedload(models.Application.user)
        )
    )
    applications = result.scalars().all()

    if not applications:
        raise HTTPException(
            status_code=404, detail="No applications found for the current user"
        )

    return applications


@router.patch("/{id}", status_code=200, response_model=schemas.ApplicationRead)
async def update_application(
    id: UUID4, payload: schemas.ApplicationUpdate, db=Depends(get_async_session)
):
    # Retrieve the existing application
    application = await db.get(models.Application, id)

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Update the application's attributes
    for var, value in payload.dict(exclude_unset=True).items():
        setattr(application, var, value)

    await db.commit()
    await db.refresh(application)

    # Eagerly load related objects (lead and user) for serialization
    result = await db.execute(
        select(models.Application)
        .options(
            joinedload(models.Application.lead), joinedload(models.Application.user)
        )
        .where(models.Application.id == id)
    )
    application = result.scalars().first()

    return application


@router.delete("/{id}", status_code=204)
async def delete_application(id: UUID4, db=Depends(get_async_session)):
    # Retrieve the existing application
    application = await db.get(models.Application, id)
    await db.delete(application)
    await db.commit()
    return {"message": "Application deleted successfully"}
