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

    There is a many-to-many relationship between
    a job search and a lead.

    There is a many-to-one relationship between
    a job search and a job search pipeline.
    """

    __tablename__ = "searches"

    query = Column(String)
    platform = Column(String)
    location = Column(String)
    status = Column(String)  # running, success, failure

    leads = relationship(
        "Lead", secondary="searches_x_leads", back_populates="searches"
    )
    job_search_pipeline_id = Column(UUID, ForeignKey("job_search_pipelines.id"))
    job_search_pipeline = relationship("JobSearchPipeline", back_populates="searches")


class JobSearchPipeline(Base):
    """
    Represents the state of the ETL execution of a user
    job search event.

    There is a one-to-many relationship between
    a job search pipeline and a job search.
    """

    __tablename__ = "job_search_pipelines"

    name = Column(String)
    platform = Column(String)
    location = Column(String)
    query = Column(String)
    status = Column(String)  # running, success, failure

    user_id = Column(UUID, ForeignKey("users.id"))  # Foreign key to User table
    user = relationship("User", back_populates="job_search_pipelines")
    searches = relationship("Search", back_populates="job_search_pipeline")


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
    searches = relationship(
        Search, secondary="searches_x_leads", back_populates="leads"
    )
    job_application = relationship(
        "JobApplication", back_populates="lead", uselist=False
    )


class SearchXLead(Base):
    """
    Association table for many-to-many relationship between job_searches and leads.
    """

    __tablename__ = "searches_x_leads"

    search_id = Column(UUID, ForeignKey("searches.id"))
    lead_id = Column(UUID, ForeignKey("leads.id"))


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
    job_search_pipelines = relationship("JobSearchPipeline", back_populates="user")
    job_applications = relationship("JobApplication", back_populates="user")
    cover_letter_templates = relationship("CoverLetterTemplate", back_populates="user")
    resume_templates = relationship("ResumeTemplate", back_populates="user")


class JobApplication(Base):
    """
    Represents a job application for a user.

    There is a many-to-one relationship between
    a job application and a user.

    There is a one-to-one relationship between
    a job application and a lead.
    """

    __tablename__ = "job_applications"

    cover_letter = Column(Text)  # Storing cover letter content as text
    resume = Column(Text)  # Storing resume content or link as text

    # keys, relationships
    lead_id = Column(UUID, ForeignKey("leads.id"))
    user_id = Column(UUID, ForeignKey("users.id"))  # Foreign key to User table
    lead = relationship("Lead", back_populates="job_application", uselist=False)
    user = relationship("User", back_populates="job_applications")


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
