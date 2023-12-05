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


# begin region: Platform models


class ETLEvent(Base):
    """
    Represents an ETL event for the platform.
    """

    __tablename__ = "etl_events"

    job_name = Column(String)
    job_payload = Column(String)
    status = Column(String)  # running, success, failure


class Lead(Base):
    """
    Model representing a lead generated from a search.

    There is a many-to-many relationship between
    a lead and a job search.

    There is a one-to-one relationship between
    a lead and an application.
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
    notes = Column(Text)

    # keys, relationships
    application = relationship("Application", back_populates="lead", uselist=False)


# end region: Platform models


# begin region: User models


class User(SQLAlchemyBaseUserTableUUID, Base):
    """
    User model contain optional fields for user-related operations.
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
    skills = Column(String)  # FIXME: going to be a list of strings

    # keys, relationships
    applications = relationship("Application", back_populates="user")
    cover_letter_templates = relationship("CoverLetterTemplate", back_populates="user")
    resume_templates = relationship("ResumeTemplate", back_populates="user")


class Application(Base):
    """
    Represents a application for a user's job lead.

    There is a many-to-one relationship between
    a job application and a user.

    There is a one-to-one relationship between
    a job application and a lead.
    """

    __tablename__ = "applications"

    cover_letter = Column(Text)  # Storing cover letter content as text
    resume = Column(Text)  # Storing resume content or link as text

    # keys, relationships
    lead_id = Column(UUID, ForeignKey("leads.id"))
    user_id = Column(UUID, ForeignKey("users.id"))  # Foreign key to User table
    lead = relationship("Lead", back_populates="application", uselist=False)
    user = relationship("User", back_populates="applications")


class CoverLetterTemplate(Base):
    """
    Represents a cover letter template for generating a user's
    cover letter.

    There is a many-to-one relationship between
    a cover letter template and a user.
    """

    __tablename__ = "cover_letter_templates"

    content = Column(Text)  # Storing template content as text

    # keys, relationships
    user_id = Column(UUID, ForeignKey("users.id"))  # Foreign key to User table
    user = relationship("User", back_populates="cover_letter_templates")


class ResumeTemplate(Base):
    """
    Represents a resume template for generating a user's
    resume.

    There is a many-to-one relationship between
    a resume template and a user.
    """

    __tablename__ = "resume_templates"

    name = Column(String)
    description = Column(String)
    content = Column(Text)  # Storing template content as text

    # keys, relationships
    user_id = Column(UUID, ForeignKey("users.id"))  # Foreign key to User table
    user = relationship("User", back_populates="resume_templates")
