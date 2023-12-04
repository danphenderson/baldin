"""
SQL Alchemy models declaration.

Note, imported by alembic migrations logic, see `alembic/env.py`
"""
from datetime import datetime
from uuid import uuid4

from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from sqlalchemy import UUID, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    """
    Base model declaration, contains common columns for all tables.
    """

    id = Column(UUID, primary_key=True, default=uuid4)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Search(Base):
    """
    Model representing a search for leads.
    """

    __tablename__ = "searches"

    keywords = Column(String)
    platform = Column(String)
    location = Column(String)
    leads = relationship(
        "Lead", secondary="searches_x_leads", back_populates="searches"
    )


class Lead(Base):
    """
    Model representing a lead generated from a search.
    """

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
    searches = relationship(
        Search, secondary="searches_x_leads", back_populates="leads"
    )
    applications = relationship("Application", back_populates="lead")


class SearchXLead(Base):
    """
    Association table for many-to-many relationship between searches and leads.
    """

    __tablename__ = "searches_x_leads"

    search_id = Column(UUID, ForeignKey("searches.id"))
    lead_id = Column(UUID, ForeignKey("leads.id"))


# Begin region: User Models


class User(SQLAlchemyBaseUserTableUUID, Base):
    """
    Auth user model contain optional fields for user-related operations.
    """

    __tablename__ = "users"

    first_name = Column(String)
    last_name = Column(String)
    phone_number = Column(String)
    address_line_1 = Column(String)
    address_line_2 = Column(String)
    city = Column(String)
    state = Column(String)
    zip_code = Column(String)
    country = Column(String)


class Application(Base):
    """
    Represents a user's application for a job lead.
    """

    __tablename__ = "applications"
    lead_id = Column(UUID, ForeignKey("leads.id"))
    cover_letter = Column(Text)  # Storing cover letter content as text
    resume = Column(Text)  # Storing resume content or link as text
    lead = relationship("Lead", back_populates="applications")


class CoverLetterTemplate(Base):
    """
    Represents a cover letter template for generating a user's
    cover letter. There is a many-to-one relationship between
    a cover letter template and a user.
    """

    __tablename__ = "cover_letter_templates"

    content = Column(Text)  # Storing template content as text


class ResumeTemplate(Base):
    """
    Represents a resume template for generating a user's
    resume. There is a many-to-one relationship between
    a resume template and a user.
    """

    __tablename__ = "resume_templates"

    content = Column(Text)  # Storing template content as text


# Begin region: User Models
