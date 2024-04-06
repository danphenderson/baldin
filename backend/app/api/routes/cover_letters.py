# app/api/routes/cover_letters.py


from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import UUID4
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.api.deps import (
    AsyncSession,
    generate_cover_letter,
    get_async_session,
    get_cover_letter,
    get_current_user,
    get_lead,
    models,
    schemas,
)
from app.logging import console_log as log

router: APIRouter = APIRouter()


@router.post("/generate", response_model=schemas.CoverLetterRead)
async def generate_user_cover_letter(
    lead_id: UUID4,
    template_id: str
    | None = Query(None, description="Template ID for the cover letter"),
    user: schemas.UserRead = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    # Fetch the lead details
    lead = await get_lead(lead_id, db)

    log.info(f"Generating cover letter for {lead.title} for user {user.id}")

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
    lead_json = json.dumps(model_to_dict(lead))

    log.info(f"User profile: {user_profile_json}")

    # Get the template if a template_id is provided
    template_content = ""
    if template_id:
        template = await db.get(models.CoverLetter, template_id)
        if template and template.content_type == "template":
            template_content = template.content

    # Ensure template_content is a JSON string
    template_json = json.dumps({"content": template_content})

    log.info(f"Template content: {template_json}")

    # Generate the cover letter
    generated_content = generate_cover_letter(
        profile=user_profile_json, job=lead_json, template=template_json
    )

    # Create a new cover letter entry in the database
    new_cover_letter = models.CoverLetter(
        name=f"Cover Letter for {lead.title}",
        content=generated_content,
        content_type="generated",
        user_id=user.id,
    )
    db.add(new_cover_letter)
    await db.commit()
    await db.refresh(new_cover_letter)

    return new_cover_letter


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
