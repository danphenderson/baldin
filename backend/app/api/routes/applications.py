# app/api/routes/applications.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import UUID4
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.api.deps import (
    AsyncSession,
    get_application,
    get_async_session,
    get_current_user,
    models,
    schemas,
)

router: APIRouter = APIRouter()


@router.post("/", status_code=201, response_model=schemas.ApplicationRead)
async def create_application(
    payload: schemas.ApplicationCreate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    # Check if application already exists for the given lead_id and user
    existing_application = await db.execute(
        select(models.Application).where(
            models.Application.lead_id == payload.lead_id,
            models.Application.user_id == user.id,
        )
    )
    existing_application = existing_application.scalars().first()  # type: ignore

    if existing_application:
        # Application for this lead already exists for the user, return an error response
        raise HTTPException(
            status_code=400, detail="Application for this lead already exists"
        )

    # Create a new application
    application_data = {**payload.dict(exclude_unset=True), "user_id": user.id}

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
    application = result.scalars().first()  # type: ignore

    return application


@router.get("/", response_model=list[schemas.ApplicationRead])
async def get_applications(
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
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

    # # Eagerly load related objects (cover_letters and resumes) for serialization
    # for application in applications:
    #     result = await db.execute(
    #         select(models.Resume)
    #         .join(models.ResumeXApplication)
    #         .where(models.ResumeXApplication.application_id == application.id)
    #     )
    #     resumes = result.scalars().all()
    #     application.resumes = resumes

    #     result = await db.execute(
    #         select(models.CoverLetter)
    #         .join(models.CoverLetterXApplication)
    #         .where(models.CoverLetterXApplication.application_id == application.id)
    #     )
    #     cover_letters = result.scalars().all()
    #     application.cover_letters = cover_letters

    return applications


@router.patch("/{id}", response_model=schemas.ApplicationRead)
async def update_application(
    id: UUID4,  # Ensure 'id' is extracted from the path parameter and is of the correct type
    payload: schemas.ApplicationUpdate,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    # Fetch the application to be updated using 'id'
    result = await db.execute(
        select(models.Application).where(models.Application.id == id)
    )
    application = result.scalars().first()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Check if the user owns the application
    if application.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to update this application",
        )

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
async def delete_application(
    application=Depends(get_application),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    # Confirm that the user owns the application
    if application.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete this application",
        )

    # Delete the application
    await db.delete(application)
    await db.commit()
    return {"message": "Application deleted successfully"}


@router.get("/{id}/resumes", response_model=list[schemas.ResumeRead])
async def get_application_resumes(
    app: schemas.ApplicationRead = Depends(get_application),
    db=Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):

    # Confirm that the user owns the application
    if app.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view this application",
        )

    # Fetch resumes associated with the application
    result = await db.execute(
        select(models.Resume)
        .join(models.ResumeXApplication)
        .where(models.ResumeXApplication.application_id == app.id)
    )
    resumes = result.scalars().all()

    if not resumes:
        raise HTTPException(
            status_code=404, detail="No resumes found for this application"
        )

    return resumes


@router.get("/{id}/cover_letters", response_model=list[schemas.CoverLetterRead])
async def get_application_cover_letters(
    app: schemas.ApplicationRead = Depends(get_application),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):

    # Confirm that the user owns the application
    if app.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view this application",
        )

    # Fetch cover letters associated with the application
    result = await db.execute(
        select(models.CoverLetter)
        .join(models.CoverLetterXApplication)
        .where(models.CoverLetterXApplication.application_id == app.id)
    )
    cover_letters = result.scalars().all()

    if not cover_letters:
        raise HTTPException(
            status_code=404, detail="No cover letters found for this application"
        )

    return cover_letters


@router.post("/{id}/resumes", status_code=201, response_model=schemas.ResumeRead)
async def add_resume_to_application(
    id: UUID4,
    payload: schemas.ResumeCreate,
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    # Create a new resume instance
    resume = models.Resume(**payload.dict(), user_id=user.id)

    # Add resume to the database
    db.add(resume)
    await db.commit()
    await db.refresh(resume)

    # Create an association between the resume and the application
    association = models.ResumeXApplication(application_id=id, resume_id=resume.id)
    db.add(association)
    await db.commit()

    return resume


@router.post(
    "/{id}/cover_letters", status_code=201, response_model=schemas.CoverLetterRead
)
async def add_cover_letter_to_application(
    id: UUID4,
    payload: schemas.CoverLetterCreate,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    # Create a new cover letter instance
    cover_letter = models.CoverLetter(**payload.dict(), user_id=user.id)

    # Add cover letter to the database
    db.add(cover_letter)
    await db.commit()
    await db.refresh(cover_letter)

    # Create an association between the cover letter and the application
    association = models.CoverLetterXApplication(
        application_id=id, cover_letter_id=cover_letter.id
    )
    db.add(association)
    await db.commit()

    return cover_letter


# @router.patch("/{id}/resumes/{resume_id}", status_code=200, response_model=schemas.ResumeRead)
# async def update_application_resume(
#     id: UUID4,
#     resume_id: UUID4,
#     payload: schemas.ResumeUpdate,
#     db: AsyncSession = Depends(get_async_session),
# ):
#     # Fetch the resume from the database
#     result = await db.execute(
#         select(models.Resume).where(models.Resume.id == resume_id)
#     )
#     resume = result.scalars().first()

#     if not resume:
#         raise HTTPException(status_code=404, detail="Resume not found")

#     # Update resume details
#     for var, value in payload.dict(exclude_unset=True).items():
#         setattr(resume, var, value)

#     await db.commit()
#     await db.refresh(resume)

#     return resume

# @router.patch("/{id}/cover_letters/{cover_letter_id}", status_code=200, response_model=schemas.CoverLetterRead)
# async def update_application_cover_letter(
#     id: UUID4,
#     cover_letter_id: UUID4,
#     payload: schemas.CoverLetterUpdate,
#     db: AsyncSession = Depends(get_async_session),
# ):
#     # Fetch the cover letter from the database
#     result = await db.execute(
#         select(models.CoverLetter).where(models.CoverLetter.id == cover_letter_id)
#     )
#     cover_letter = result.scalars().first()

#     if not cover_letter:
#         raise HTTPException(status_code=404, detail="Cover letter not found")

#     # Update cover letter details
#     for var, value in payload.dict(exclude_unset=True).items():
#         setattr(cover_letter, var, value)

#     await db.commit()
#     await db.refresh(cover_letter)

#     return cover_letter
