# Path: app/api/routes/applications.py
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import UUID4
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.api.deps import (
    AsyncSession,
    generate_cover_letter,
    get_application,
    get_async_session,
    get_current_user,
    model_to_dict,
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
            joinedload(models.Application.lead).options(
                joinedload(models.Lead.companies)
            ),
            joinedload(models.Application.user),
        )
    )
    # Ensure that unique rows are considered to avoid duplicates due to joinedload
    applications = result.scalars().unique().all()

    if not applications:
        raise HTTPException(
            status_code=404, detail="No applications found for the current user"
        )
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
    application: schemas.ApplicationRead = Depends(get_application),
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
    db: AsyncSession = Depends(get_async_session),
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


@router.post(
    "/{id}/cover_letters/generate",
    status_code=201,
    response_model=schemas.CoverLetterRead,
)
async def generate_cover_letter_for_application(
    id: UUID4,
    template_id: str
    | None = Query(None, description="Template ID for cover letter generation"),
    db: AsyncSession = Depends(get_async_session),  # noqa
    user: schemas.UserRead = Depends(get_current_user),
):

    # Eagerly load the lead with the application
    app = await db.execute(
        select(models.Application)
        .options(joinedload(models.Application.lead))
        .where(models.Application.id == id)
    )
    app = app.scalars().first()

    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if app.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to generate a cover letter for this application",
        )

    # Fetch the user profile details
    user_details = await db.execute(
        select(models.User)
        .options(
            joinedload(models.User.education),
            joinedload(models.User.certificates),
            joinedload(models.User.skills),
            joinedload(models.User.experiences),
        )
        .filter(models.User.id == user.id)  # type: ignore
    )
    user_profile = user_details.scalars().first()

    # Convert user_profile and lead to JSON
    user_profile_json = json.dumps(model_to_dict(user_profile))
    lead_json = json.dumps(model_to_dict(app.lead))

    # Get the cover letter template if a template_id is provided
    template_content = ""
    if template_id:
        template = await db.get(models.CoverLetter, template_id)
        if template and template.content_type == "template":
            template_content = template.content

    # Ensure template_content is a JSON string
    template_json = json.dumps({"content": template_content})

    # Generate the cover letter
    generated_content = generate_cover_letter(
        profile=user_profile_json, job=lead_json, template=template_json
    )

    # Create a new cover letter entry in the database
    cover_letter = models.CoverLetter(
        name=f"Cover Letter for {app.lead.title}",
        content=generated_content,
        content_type="generated",
        user_id=user.id,
    )
    db.add(cover_letter)
    await db.commit()
    await db.refresh(cover_letter)

    # Create an association between the cover letter and the application
    association = models.CoverLetterXApplication(
        application_id=app.id, cover_letter_id=cover_letter.id
    )
    db.add(association)
    await db.commit()
    return cover_letter


@router.get("/{id}", response_model=schemas.ApplicationRead)
async def get_application_by_id(
    application: schemas.ApplicationRead = Depends(get_application),
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
):
    # Fetch user and lead details for the application
    result = await db.execute(
        select(models.Application)
        .options(
            joinedload(models.Application.lead).options(
                joinedload(models.Lead.companies)
            ),
            joinedload(models.Application.user),
        )
        .where(models.Application.id == application.id)
    )

    application = result.scalars().first()  # type: ignore

    # Fetch company details for the application

    return application
