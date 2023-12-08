import random
import string

from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from pydantic.networks import EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User
from app.schemas import UserRead


def random_lower_string(length: int = 32) -> str:
    return "".join(random.choices(string.ascii_lowercase, k=length))


def random_email(length: int = 10) -> str:
    return f"{random_lower_string(length)}@{random_lower_string(length)}.com"


async def create_db_user(
    email: str,
    hashed_password: str,
    session: AsyncSession,
    is_superuser: bool = False,
    is_verified: bool = True,
) -> UserRead:

    new_user = await SQLAlchemyUserDatabase(session, User).create(
        {
            "email": email,
            "hashed_password": hashed_password,
            "is_superuser": is_superuser,
            "is_verified": is_verified,
        }
    )
    return UserRead(**new_user.__dict__)
