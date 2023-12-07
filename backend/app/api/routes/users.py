from fastapi import APIRouter

from app.api.deps import fastapi_users
from app.schemas import UserRead, UserUpdate

"""
TODO: Implement
Certain resources are directly related to a user (like skills, experiences,
resumes, cover letters, applications, and contacts), you can nest these routes
under a user route. This clearly indicates the relationship between these resources and a user.

For example:

users/{user_id}/applications for job applications related to a specific user.
users/{user_id}/skills for skills of a specific user.
users/{user_id}/experiences for professional experiences of a user.
....
"""


router: APIRouter = APIRouter()

router.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)
