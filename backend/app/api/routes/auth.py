from fastapi import APIRouter

from app.api.deps import fastapi_users
from app.core import security
from app.schemas import UserCreate, UserRead

router: APIRouter = APIRouter()

router.include_router(
    fastapi_users.get_auth_router(security.AUTH_BACKEND),
    prefix="/jwt",
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_reset_password_router(),
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_verify_router(UserRead),
    tags=["auth"],
)
