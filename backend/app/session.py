from sqlalchemy.ext.asyncio import AsyncSession,  create_async_engine
from sqlalchemy.orm.session import sessionmaker

from app.core import conf

if conf.settings.ENVIRONMENT == "PYTEST":
    sqlalchemy_database_uri = conf.settings.TEST_SQLALCHEMY_DATABASE_URI
else:
    sqlalchemy_database_uri = conf.settings.DEFAULT_SQLALCHEMY_DATABASE_URI

async_engine = create_async_engine(sqlalchemy_database_uri, pool_pre_ping=True)
async_session = sessionmaker(bind=async_engine, expire_on_commit=False, autocommit=False, autoflush=False, class_=AsyncSession)

