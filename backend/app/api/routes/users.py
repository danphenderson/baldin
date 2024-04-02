# app/api/routes/users.py

from fastapi import Depends, HTTPException

from app.api.deps import fastapi_users, get_current_user, models, schemas

router = fastapi_users.get_users_router(schemas.UserRead, schemas.UserUpdate)


@router.get("/me/profile", response_model=schemas.UserProfileRead)
async def read_profile(
    current_user: models.User = Depends(get_current_user),
) -> schemas.UserProfileRead:

    user_skills = current_user.skills
    user_experiences = current_user.experiences

    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")

    return schemas.UserProfileRead(skills=user_skills, experiences=user_experiences)
