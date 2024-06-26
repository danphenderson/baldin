# app/api/api.py

from fastapi import APIRouter

from app.api.deps import fastapi_users, schemas, security
from app.api.routes import (
    applications,
    certificate,
    companies,
    contacts,
    cover_letters,
    data_orchestration,
    db_management,
    education,
    experiences,
    extractor,
    leads,
    resumes,
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
    db_management.router, prefix="/db-management", tags=["db-management"]
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
    companies.router,
    prefix="/companies",
    tags=["companies"],
)
api_router.include_router(
    data_orchestration.router,
    prefix="/data_orchestration",
    tags=["data_orchestration"],
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
api_router.include_router(
    extractor.router,
    prefix="/extractor",
    tags=["extractor"],
)
