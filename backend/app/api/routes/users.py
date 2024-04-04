# app/api/routes/users.py

from fastapi import Depends, HTTPException
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload


from app.api.deps import (
    fastapi_users,
    get_current_user,
    models,
    schemas,
    AsyncSession,
    get_async_session,
)

from app.logging import console_log as log

router = fastapi_users.get_users_router(schemas.UserRead, schemas.UserUpdate)


@router.get("/me/profile", response_model=schemas.UserProfileRead)
async def read_profile(
    db: AsyncSession = Depends(get_async_session),
    current_user: models.User = Depends(get_current_user),
) -> schemas.UserProfileRead:

    # Use async loading of related objects
    result = await db.execute(
        select(models.User)
        .options(
            selectinload(models.User.skills),
            selectinload(models.User.experiences),
            selectinload(models.User.education),
            selectinload(models.User.certificates),
        )
        .where(models.User.id == current_user.id)
    )
    user_with_details = result.scalars().first()

    if not user_with_details:
        raise HTTPException(status_code=404, detail="User not found")

    return schemas.UserProfileRead.from_orm(user_with_details)
