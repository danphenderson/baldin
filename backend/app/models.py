"""
SQL Alchemy models declaration.

Note, imported by alembic migrations logic, see `alembic/env.py`
"""
from uuid import uuid4
from datetime import datetime
from sqlalchemy import Column, DateTime,  String, UUID, ForeignKey
from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from sqlalchemy.orm import DeclarativeBase, relationship

class Base(DeclarativeBase):
    id = Column(UUID, primary_key=True, default=uuid4)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class User(SQLAlchemyBaseUserTableUUID, Base):
    # FIXME: Disregarding user-to-model relationships for now.
    pass


class Search(Base):
    __tablename__ = "searches"

    keywords = Column(String)
    platform = Column(String)
    location = Column(String)
    leads = relationship("Lead", secondary="searches_x_leads", back_populates="searches")

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
    searches = relationship(Search, secondary="searches_x_leads", back_populates="leads")


class SearchXLead(Base):
    __tablename__ = "searches_x_leads"

    search_id = Column(UUID, ForeignKey("searches.id"))
    lead_id = Column(UUID, ForeignKey("leads.id"))