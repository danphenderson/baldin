# app/api/api.py

from fastapi import APIRouter

from app.api.deps import fastapi_users, schemas, security
from app.api.routes import (
    applications,
    certificate,
    contacts,
    cover_letters,
    data_orchestration,
    education,
    experiences,
    leads,
    resumes,
    services,
    skills,
    users,
)

api_router: APIRouter = APIRouter()

api_router.include_router(
    fastapi_users.get_auth_router(security.AUTH_BACKEND),
    prefix="/auth/jwt",
    tags=["auth"],
)
api_router.include_router(
    fastapi_users.get_register_router(schemas.UserRead, schemas.UserCreate),
    prefix="/auth",
    tags=["auth"],
)
api_router.include_router(
    fastapi_users.get_reset_password_router(),
    prefix="/auth",
    tags=["auth"],
)
api_router.include_router(
    fastapi_users.get_verify_router(schemas.UserRead),
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
    data_orchestration.router,
    prefix="/data_orchestration",
    tags=["data_orchestration"],
)
api_router.include_router(
    services.router,
    prefix="/services",
    tags=["services"],
)
api_router.include_router(
    contacts.router,
    prefix="/contacts",
    tags=["contacts"],
)
api_router.include_router(
    experiences.router,
    prefix="/experiences",
    tags=["experiences"],
)
api_router.include_router(
    skills.router,
    prefix="/skills",
    tags=["skills"],
)
api_router.include_router(
    cover_letters.router,
    prefix="/cover_letters",
    tags=["cover_letters"],
)
api_router.include_router(
    resumes.router,
    prefix="/resumes",
    tags=["resumes"],
)
api_router.include_router(
    applications.router,
    prefix="/applications",
    tags=["applications"],
)
api_router.include_router(
    education.router,
    prefix="/education",
    tags=["education"],
)
api_router.include_router(
    certificate.router,
    prefix="/certificate",
    tags=["certificate"],
)
