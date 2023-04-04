# app/api/api.py

"""
Users and auth routers 'for free' from FastAPI Users.
https://fastapi-users.github.io/fastapi-users/configuration/routers/

You can include more of them + oauth login endpoints.

fastapi_users in defined in deps, because it also
includes useful dependencies.
"""

from typing import Awaitable
from fastapi import APIRouter

from app.api.deps import fastapi_users
from app.core import security
from app.models import Base
from app.session import async_engine


async def create_db_and_tables():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


api_router : APIRouter = APIRouter()

api_router.include_router(
    fastapi_users.get_auth_router(security.AUTH_BACKEND),
    prefix="/auth/jwt",
    tags=["auth"],
)
api_router.include_router(
    fastapi_users.get_register_router(),
    prefix="/auth",
    tags=["auth"],
)
api_router.include_router(
    fastapi_users.get_users_router(),
    prefix="/users",
    tags=["users"],
)
# api_router.include_router(
#     leads.router,
#     prefix="/leads",
#     tags=["leads"],
# )
# api_router.include_router(
#     searches.router,
#     prefix="/searches",
#     tags=["searches"],
# )