"""
SQL Alchemy models declaration.

Note, imported by alembic migrations logic, see `alembic/env.py`
"""
from datetime import datetime
import time
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
    status = Column(String)  # running, success, failure


class Lead(Base):
    """
    Model representing a job lead.

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


class User(SQLAlchemyBaseUserTableUUID, Base): # type: ignore
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
    contacts = relationship("Contact", back_populates="user")
    generative_templates = relationship("GenerativeTemplate", back_populates="user")

class Application(Base):
    """
    Represents a users application for a job lead.

    There is a many-to-one relationship between
    a job application and a user.

    There is a one-to-one relationship between
    a job application and a lead.
    """

    __tablename__ = "applications"

    cover_letter = Column(Text)  # Storing cover letter content as text
    resume = Column(Text)  # Storing resume content or link as text
    notes = Column(Text)
    status = Column(String)  # applied, interviewing, offer, rejected

    # keys, relationships
    lead_id = Column(UUID, ForeignKey("leads.id"))
    user_id = Column(UUID, ForeignKey("users.id"))  # Foreign key to User table
    lead = relationship("Lead", back_populates="application", uselist=False)
    user = relationship("User", back_populates="applications")


class GenerativeTemplate(Base):
    """
    Represents a generative template for helping a user
    generate a cover letter, resume, etc.

    There is a many-to-one relationship between
    a genertive template and a user.
    """

    __tablename__ = "generative_templates"

    name = Column(String)
    description = Column(String)
    content = Column(Text)  # Storing template content as text

    # keys, relationships
    user_id = Column(UUID, ForeignKey("users.id"))  # Foreign key to User table
    user = relationship("User", back_populates="generative_templates")


class Contact(Base):
    """
    Represents a User Contact.
    """

    __tablename__ = "contacts"

    first_name = Column(String)
    last_name = Column(String)
    phone_number = Column(String)
    email = Column(String)
    time_zone = Column(String)
    notes = Column(Text)
    # keys, relationships
    user_id = Column(UUID, ForeignKey("users.id"))  # Foreign key to User table
    user = relationship("User", back_populates="contacts")
