from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app import models
from app.api.deps import model_to_dict
from app.core.db import AsyncSession


def build_user_profile_query(*, user_id: object):
    return (
        select(models.User)
        .options(
            selectinload(models.User.skills),
            selectinload(models.User.experiences),
            selectinload(models.User.education),
            selectinload(models.User.certificates),
        )
        .where(models.User.id == user_id)
    )


async def load_user_profile(
    db: AsyncSession,
    *,
    user_id: object,
) -> models.User:
    result = await db.execute(build_user_profile_query(user_id=user_id))
    user_profile = result.scalars().unique().first()
    if not user_profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    return user_profile


def serialize_user_profile(user_profile: models.User) -> dict[str, Any]:
    return {
        **(model_to_dict(user_profile) or {}),
        "skills": [model_to_dict(skill) for skill in user_profile.skills],
        "experiences": [
            model_to_dict(experience) for experience in user_profile.experiences
        ],
        "education": [model_to_dict(education) for education in user_profile.education],
        "certificates": [
            model_to_dict(certificate) for certificate in user_profile.certificates
        ],
    }
