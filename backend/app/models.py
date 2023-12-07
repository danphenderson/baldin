# app/models.py

from datetime import datetime
from uuid import uuid4

from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from sqlalchemy import UUID, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    """
    Base model for all database entities.
    Provides common attributes like ID, creation, and update timestamps.
    Inherits from SQLAlchemy's DeclarativeBase.
    """

    id = Column(UUID, primary_key=True, default=uuid4)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ETLEvent(Base):
    """
    Model for ETL (Extract, Transform, Load) events.
    Tracks job names, status, start and end times, error messages.
    Useful for monitoring and debugging ETL processes.
    """

    __tablename__ = "etl_events"
    job_name = Column(String)
    status = Column(String)  # running, success, failure
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    error_message = Column(Text)


class Lead(Base):
    """
    Represents a job lead.
    Includes URL, title, company, description, location, salary, etc.
    Linked to job applications via one-to-many relationship.
    """

    __tablename__ = "leads"
    url = Column(String, unique=True, index=True)
    title = Column(String)
    company = Column(String)
    description = Column(String)
    location = Column(String)
    salary = Column(String)
    job_function = Column(String)
    industry = Column(String, index=True)
    employment_type = Column(String)
    experience_level = Column(String)
    education_level = Column(String)
    notes = Column(Text)
    application = relationship("Application", back_populates="lead")


class Skill(Base):
    """
    Model for user skills.
    Each skill associated with a user via many-to-one relationship.
    """

    __tablename__ = "user_skills"
    name = Column(String)
    category = Column(String)
    user_id = Column(UUID, ForeignKey("users.id"))
    user = relationship("User", back_populates="skills")


class Experience(Base):
    """
    Represents user's professional experience.
    Links to user with job title, company, duration details.
    """

    __tablename__ = "user_experiences"
    title = Column(String)
    company = Column(String)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    description = Column(Text)
    user_id = Column(UUID, ForeignKey("users.id"))
    user = relationship("User", back_populates="experiences")


class Application(Base):
    """
    Model for job applications.
    Contains cover letter, resume, notes, status.
    Linked to users and job leads through many-to-one relationships.
    """

    __tablename__ = "applications"
    cover_letter = Column(Text)
    resume = Column(Text)
    notes = Column(Text)
    status = Column(String)
    lead_id = Column(UUID, ForeignKey("leads.id"), index=True)
    user_id = Column(UUID, ForeignKey("users.id"))
    lead = relationship("Lead", back_populates="application", uselist=False)
    user = relationship("User", back_populates="applications")


class Contact(Base):
    """
    Represents a contact associated with a user.
    Stores details like name, phone, email, notes.
    """

    __tablename__ = "contacts"
    first_name = Column(String)
    last_name = Column(String)
    phone_number = Column(String)
    email = Column(String)
    time_zone = Column(String)
    notes = Column(Text)
    user_id = Column(UUID, ForeignKey("users.id"))
    user = relationship("User", back_populates="contacts")


class Resume(Base):
    """
    Represents a user's resume.
    Contains name, content, type.
    Linked to users and job applications via many-to-one and many-to-many relationships.
    """

    __tablename__ = "resumes"
    name = Column(String)
    content = Column(Text)
    content_type = Column(String)  # Add validator in schemas.py BaseResume
    user_id = Column(UUID, ForeignKey("users.id"))
    user = relationship("User", back_populates="resumes")


class ResumeXApplication(Base):
    """
    Crosswalk table for resumes and job applications many-to-many relationship.
    """

    __tablename__ = "resumes_x_applications"
    application_id = Column(UUID, ForeignKey("applications.id"), primary_key=True)
    resume_id = Column(UUID, ForeignKey("resumes.id"), primary_key=True)


class CoverLetter(Base):
    """
    Represents a user's cover letter.
    Includes name, content, type.
    Linked to users and job applications via many-to-one and many-to-many relationships.
    """

    __tablename__ = "cover_letters"
    name = Column(String)
    content = Column(Text)
    content_type = Column(String)  # Add validator in schemas.py BaseResume
    user_id = Column(UUID, ForeignKey("users.id"))
    user = relationship("User", back_populates="cover_letters")


class CoverLetterXApplication(Base):
    """
    Crosswalk table for cover letters and job applications many-to-many relationship.
    """

    __tablename__ = "cover_letters_x_applications"
    application_id = Column(UUID, ForeignKey("applications.id"), primary_key=True)
    cover_letter_id = Column(UUID, ForeignKey("cover_letters.id"), primary_key=True)


class User(SQLAlchemyBaseUserTableUUID, Base):  # type: ignore
    """
    Extended user model with additional fields like name, contact information, and address.
    Core of user-related operations, linked to applications, skills, experiences, etc.
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
    time_zone = Column(String)
    applications = relationship("Application", back_populates="user")
    contacts = relationship("Contact", back_populates="user")
    skills = relationship("Skill", back_populates="user")
    experiences = relationship("Experience", back_populates="user")
    resumes = relationship("Resume", back_populates="user")
    cover_letters = relationship("CoverLetter", back_populates="user")
