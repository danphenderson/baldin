# app/api/api.py

from fastapi import APIRouter

from app.api.deps import fastapi_users, schemas, security
from app.api.routes import contacts, etl, experiences, leads, resumes, services, skills

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
    fastapi_users.get_users_router(schemas.UserRead, schemas.UserUpdate),
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
    services.router,
    prefix="/services",
    tags=["services"],
)
api_router.include_router(
    contacts.router,
    prefix="/contacts",
    tags=["contacts"],
)
