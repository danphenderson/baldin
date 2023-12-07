# app/api/api.py

"""
Users and auth routers 'for free' from FastAPI Users.
https://fastapi-users.github.io/fastapi-users/configuration/routers/

You can include more of them + oauth login endpoints.

fastapi_users in defined in deps, because it also
includes useful dependencies.
"""

from fastapi import APIRouter

from app.api.routes import (
    applications,
    auth,
    contacts,
    etl,
    leads,
    services,
    users,
    cover_letters,
    resumes,
    skills,
    experiences,
    applications,
)


api_router: APIRouter = APIRouter()


api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["auth"],
)
api_router.include_router(
    users.router,
    prefix="/users",
    tags=["users"],
)
api_router.include_router(
    leads.router,
    prefix="/leads",
    tags=["leads"],
)
api_router.include_router(
    etl.router,
    prefix="/etl",
    tags=["etl"],
)
api_router.include_router(
    applications.router,
    prefix="/applications",
    tags=["applications"],
)
api_router.include_router(
    contacts.router,
    prefix="/contacts",
    tags=["contacts"],
)
api_router.include_router(
    services.router,
    prefix="/services",
    tags=["services"],
)
