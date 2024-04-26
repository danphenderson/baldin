# Path: app/models.py
from uuid import uuid4

from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    """
    Base model for all database entities.
    Provides common attributes like ID, creation, and update timestamps.
    Inherits from SQLAlchemy's DeclarativeBase.
    """

    __abstract__ = True

    id = Column(UUID, primary_key=True, default=uuid4)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# Data Orchestration models


class OrchestrationEvent(Base):
    """
    Model for orchestration events.
    Contains orchestration pipeline event status, message, and reference to the pipeline.
    Useful for tracking the status of ETL jobs.
    """

    __tablename__ = "orchestration_events"
    status = Column(String, default="pending")  # running, success, failure
    message = Column(Text)
    payload = Column(JSON)
    environment = Column(String)
    source_uri = Column(JSON)
    destination_uri = Column(JSON)
    pipeline_id = Column(UUID, ForeignKey("orchestration_pipelines.id"))
    orchestration_pipeline = relationship(
        "OrchestrationPipeline", back_populates="orchestration_events"
    )


class OrchestrationPipeline(Base):
    """
    Model for ETL (Extract, Transform, Load) pipelines.
    Contains name, description, source, destination, and parameters.
    Linked to orchestration events via one-to-many relationship.
    """

    __tablename__ = "orchestration_pipelines"
    name = Column(String)
    description = Column(Text)
    definition = Column(JSON)
    user_id = Column(UUID, ForeignKey("users.id"))
    user = relationship("User", back_populates="orchestration_pipelines")
    orchestration_events = relationship(
        "OrchestrationEvent", back_populates="orchestration_pipeline"
    )


# Extractor models
class ExtractorExample(Base):
    """A representation of an example.

    Examples consist of content together with the expected output.

    The output is a JSON object that is expected to be extracted from the content.

    The JSON object should be valid according to the schema of the associated extractor.

    The JSON object is defined by the schema of the associated extractor, so
    it's perfectly fine for a given example to represent the extraction
    of multiple instances of some object from the content since
    the JSON schema can represent a list of objects.
    """

    __tablename__ = "extractor_examples"
    content = Column(Text, nullable=False, comment="The input portion of the example.")
    output = Column(JSONB, comment="The output associated with the example.")
    extractor_id = Column(UUID, ForeignKey("extractors.id"))
    extractor = relationship("Extractor", back_populates="extractor_examples")

    def __repr__(self) -> str:
        return f"<ExtractorExample(uuid={self.id}, content={self.content[:20]}>"


class Extractor(Base):
    """
    Represents an extractor for parsing structured data from unstructured text.
    Contains name, description, schema, instruction, etc.
    Linked to users and examples via many-to-one and one-to-many relationships.
    """

    __tablename__ = "extractors"
    name = Column(String)
    description = Column(Text)
    json_schema = Column(JSONB)
    instruction = Column(Text)
    user_id = Column(UUID, ForeignKey("users.id"))
    user = relationship("User", back_populates="extractors")
    extractor_examples = relationship("ExtractorExample", back_populates="extractor")

    def __repr__(self) -> str:
        return f"<Extractor(id={self.id}, description={self.description})>"


class LeadXCompany(Base):

    __tablename__ = "leads_x_companies"
    lead_id = Column(UUID, ForeignKey("leads.id"), primary_key=True)
    company_id = Column(UUID, ForeignKey("companies.id"), primary_key=True)


class Company(Base):
    """
    Represents a company.
    Includes company name, industry, size, location, etc.
    Linked to job leads through many-to-many relationship.
    """

    __tablename__ = "companies"
    name = Column(String, nullable=False)
    industry = Column(String)
    size = Column(String)
    location = Column(String)
    description = Column(Text)

    leads = relationship(
        "Lead", secondary="leads_x_companies", back_populates="companies"
    )


class Lead(Base):
    """
    Represents a job lead.
    Includes URL, title, company, description, location, salary, etc.
    Linked to job applications via one-to-many relationship.
    """

    __tablename__ = "leads"
    url = Column(String, unique=True, index=True)
    title = Column(String)
    description = Column(String)
    location = Column(String)
    salary = Column(String)
    job_function = Column(String)
    employment_type = Column(String)
    seniority_level = Column(String)
    education_level = Column(String)
    notes = Column(Text)
    hiring_manager = Column(String)

    application = relationship("Application", back_populates="lead")
    companies = relationship(
        "Company", secondary="leads_x_companies", back_populates="leads"
    )


# End of system models

# User models
class Skill(Base):
    """
    Model for user skills.
    Each skill associated with a user via many-to-one relationship.
    """

    __tablename__ = "user_skills"
    name = Column(String)
    category = Column(String)
    yoe = Column(Integer)
    subskills = Column(String)
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
    location = Column(String)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    description = Column(Text)
    projects = Column(String)

    user_id = Column(UUID, ForeignKey("users.id"))
    user = relationship("User", back_populates="experiences")


# Add Education model
class Education(Base):
    __tablename__ = "user_education"
    university = Column(String)
    degree = Column(String)
    gradePoint = Column(String)
    activities = Column(JSON)  # Assuming activities are stored as JSON
    achievements = Column(JSON)  # Assuming achievements are stored as JSON
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    user_id = Column(UUID, ForeignKey("users.id"))
    user = relationship("User", back_populates="education")


# Add Certificate model
class Certificate(Base):
    __tablename__ = "user_certificates"
    title = Column(String)
    issuer = Column(String)
    expiration_date = Column(DateTime)  # Assuming date is stored as a DateTime
    issued_date = Column(DateTime)  # Assuming date is stored as a DateTime
    user_id = Column(UUID, ForeignKey("users.id"))
    user = relationship("User", back_populates="certificates")


class Application(Base):
    """
    Model for job applications.
    Contains cover letter, resume, notes, status.
    Linked to users and job leads through many-to-one relationships.
    """

    __tablename__ = "applications"
    status = Column(String)
    lead_id = Column(UUID, ForeignKey("leads.id"), index=True)
    user_id = Column(UUID, ForeignKey("users.id"))
    lead = relationship("Lead", back_populates="application", uselist=False)
    user = relationship("User", back_populates="applications")
    resumes = relationship(
        "Resume", secondary="resumes_x_applications", back_populates="applications"
    )
    cover_letters = relationship(
        "CoverLetter",
        secondary="cover_letters_x_applications",
        back_populates="applications",
    )


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
    applications = relationship(
        "Application",
        secondary="resumes_x_applications",
        back_populates="resumes",
    )


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
    Linked to users and job applications via many-to-one and many-to-many relationships, respectively.
    """

    __tablename__ = "cover_letters"
    name = Column(String)
    content = Column(Text)
    content_type = Column(String)  # Add validator in schemas.py BaseResume
    user_id = Column(UUID, ForeignKey("users.id"))
    user = relationship("User", back_populates="cover_letters")
    applications = relationship(
        "Application",
        secondary="cover_letters_x_applications",
        back_populates="cover_letters",
    )


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
    avatar_uri = Column(String)
    applications = relationship("Application", back_populates="user")
    contacts = relationship("Contact", back_populates="user")
    skills = relationship("Skill", back_populates="user")
    experiences = relationship("Experience", back_populates="user")
    resumes = relationship("Resume", back_populates="user")
    education = relationship("Education", back_populates="user")
    certificates = relationship("Certificate", back_populates="user")
    cover_letters = relationship("CoverLetter", back_populates="user")
    extractors = relationship("Extractor", back_populates="user")
    orchestration_pipelines = relationship(
        "OrchestrationPipeline", back_populates="user"
    )


# Table Models Mapp
table_models = {
    "users": User,
    "applications": Application,
    "contacts": Contact,
    "user_skills": Skill,
    "user_experiences": Experience,
    "user_education": Education,
    "user_certificates": Certificate,
    "resumes": Resume,
    "cover_letters": CoverLetter,
    "extractors": Extractor,
    "extractor_examples": ExtractorExample,
    "leads": Lead,
    "companies": Company,
    "leads_x_companies": LeadXCompany,
    "orchestration_pipelines": OrchestrationPipeline,
    "orchestration_events": OrchestrationEvent,
    "resumes_x_applications": ResumeXApplication,
    "cover_letters_x_applications": CoverLetterXApplication,
}
