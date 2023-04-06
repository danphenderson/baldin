"""
SQL Alchemy models declaration.

Note, imported by alembic migrations logic, see `alembic/env.py`
"""
from uuid import uuid4
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, UUID
from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from sqlalchemy.orm import DeclarativeBase, relationship

class Base(DeclarativeBase):
    pass

class User(SQLAlchemyBaseUserTableUUID, Base):
    # FIXME: Disregarding user-to-model relationships for now.
    pass



class Search(Base):
    __tablename__ = "searches"

    keywords = Column(String)
    platform = Column(String)
    id = Column(UUID, primary_key=True, default=uuid4)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Lead(Base):
    __tablename__ = "leads"

    url = Column(String, unique=True, index=True)
    title = Column(String)
    company = Column(String)
    description = Column(String)
    location = Column(String)
    salary = Column(String)
    job_function = Column(String)
    industries = Column(String)
    employment_type = Column(String)
    seniority_level = Column(String)

    id = Column(UUID, primary_key=True, default=uuid4)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
