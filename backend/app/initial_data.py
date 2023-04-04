"""
Put here any Python code that must be runned before application startup.
It is included in `init.sh` script.

By defualt `main` create a superuser if it does not exist.
"""

import asyncio
from typing import Optional

from fastapi_users.password import get_password_hash
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from sqlalchemy import select

from app import schemas
from app.core import conf
from app.models import UserTable
from app.session import async_session


async def main() -> None:
    print("Start initial data")
    async with async_session() as session: # type: ignore
        result = await session.execute(
            select(UserTable).where(
                UserTable.email == conf.settings.FIRST_SUPERUSER_EMAIL
            )
        )
        user: Optional[UserTable] = result.scalars().first()

        if user is None:
            await SQLAlchemyUserDatabase(schemas.UserDB, session, UserTable).create(
                schemas.UserDB(
                    email=conf.settings.FIRST_SUPERUSER_EMAIL,
                    is_superuser=True,
                    is_verified=True,
                    hashed_password=get_password_hash(
                        conf.settings.FIRST_SUPERUSER_PASSWORD
                    ),
                )
            )
            print("Superuser was created")
        else:
            print("Superuser already exists in database")

        print("Initial data created")


if __name__ == "__main__":
    asyncio.run(main())
