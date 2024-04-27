# app/api/routes/users.py

import json

from aiofiles import open as aopen
from fastapi import Depends, HTTPException
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api.deps import (
    AsyncSession,
    conf,
    create_user,
    fastapi_users,
    get_async_session,
    get_current_superuser,
    get_current_user,
    models,
    schemas,
)

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
        .where(models.User.id == current_user.id)  # type: ignore
    )  # type: ignore
    user_with_details = result.scalars().first()

    if not user_with_details:
        raise HTTPException(status_code=404, detail="User not found")

    return schemas.UserProfileRead.from_orm(user_with_details)


@router.post("/seed", response_model=str)
async def seed_users(
    db: AsyncSession = Depends(get_async_session),
    _: models.User = Depends(get_current_superuser),
) -> str:
    async with aopen(conf.settings.SEEDS_PATH / "users.json", "r") as f:
        users = json.loads(await f.read())
    for user in users:
        await create_user(schemas.UserCreate(**user))
    return f"Seeded Users table with {len(users)} records."
