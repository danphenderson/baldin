# app/schemas.py
from datetime import datetime
from enum import Enum  # TODO: Use Literal for performance improvement
from typing import Any, Sequence

from fastapi_users import schemas
from pydantic import UUID4, AnyHttpUrl
from pydantic import BaseModel as _BaseModel
from pydantic import EmailStr, Field, model_validator

from app import utils

# TODO: Handle validation as it arrises.


# Types and properties
class ContentType(str, Enum):
    CUSTOM = "custom"
    GENERATED = "generated"
    TEMPLATE = "template"


class OrchestrationEventStatusType(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failure"


class URIType(str, Enum):
    FILE = "filepath"
    DATALAKE = "datalake"
    DATABASE = "database"
    API = "api"


# Base Models
class BaseModel(_BaseModel):
    class Config:
        from_attributes = True


class URI(BaseModel):
    name: str
    type: URIType

    class Config:
        json_encoders = {
            "URI": lambda v: v.dict(),
        }


class BaseRead(BaseModel):
    id: UUID4 = Field(description="The unique uuid4 record identifier.")
    created_at: datetime = Field(description="The time the item was created")
    updated_at: datetime = Field(description="The time the item was last updated")


class Pagination(BaseModel):
    page: int = Field(1, ge=1, description="The page number")
    page_size: int = Field(10, ge=1, description="The number of items per page")
    request_count: bool = Field(False, description="Request a query for total count")


# Model CRUD Schemas+
class BaseOrchestrationEvent(BaseModel):
    status: OrchestrationEventStatusType | None = Field(None, description="Status")
    error_message: str | None = Field(None, description="Error message, if any")


class OrchestrationEventRead(BaseRead, BaseOrchestrationEvent):
    job_name: str | None = Field(None, description="Name of the ETL job")
    source_uri: URI | None = Field(None, description="Source URI")
    destination_uri: URI | None = Field(None, description="Destination URI")


class OrchestrationEventCreate(BaseOrchestrationEvent):
    job_name: str
    source_uri: URI
    destination_uri: URI


class OrchestrationEventUpdate(BaseOrchestrationEvent):
    pass


class BaseSkill(BaseModel):
    name: str | None = Field(None, description="Name of the skill")
    category: str | None = Field(None, description="Category of the skill")


class SkillRead(BaseRead, BaseSkill):
    pass


class SkillCreate(BaseSkill):
    pass


class SkillUpdate(BaseSkill):
    pass


class BaseExperience(BaseModel):
    title: str | None = Field(None, description="Job title")
    company: str | None = Field(None, description="Company name")
    start_date: datetime | None = Field(
        None, description="Start date of the experience"
    )
    end_date: datetime | None = Field(None, description="End date of the experience")
    description: str | None = Field(None, description="Description of the experience")


class ExperienceRead(BaseExperience, BaseRead):
    pass


class ExperienceCreate(BaseExperience):
    pass


class ExperienceUpdate(BaseExperience):
    pass


class BaseLead(BaseModel):
    title: str | None = Field(None, description="Job title")
    company: str | None = Field(None, description="Company name")
    description: str | None = Field(None, description="Job description")
    location: str | None = Field(None, description="Job location")
    salary: str | None = Field(None, description="Salary range")
    job_function: str | None = Field(None, description="Job function")
    industries: str | None = Field(None, description="Industries involved")
    employment_type: str | None = Field(None, description="Type of employment")
    seniority_level: str | None = Field(None, description="Seniority level")
    education_level: str | None = Field(None, description="Required education level")
    notes: str | None = Field(None, description="Additional notes")
    hiring_manager: str | None = Field(None, description="Hiring manager")


class LeadRead(BaseRead, BaseLead):
    url: AnyHttpUrl


class LeadsPaginatedRead(BaseModel):
    leads: Sequence[LeadRead]
    pagination: Pagination
    total_count: int | None = Field(
        ..., description="Total number of leads, if pagination requested"
    )


class LeadCreate(BaseLead):
    url: str

    @model_validator(mode="after")
    def clean_and_wrap_text_fields(self) -> Any:
        for field in self.model_fields_set:
            v = getattr(self, field)
            if isinstance(v, str):
                cleaned_value = utils.clean_text(v)
                setattr(self, field, utils.wrap_text(cleaned_value))
        return self


class LeadUpdate(BaseLead):
    pass


class BaseContact(BaseModel):
    first_name: str | None = Field(None, description="First name")
    last_name: str | None = Field(None, description="Last name")
    phone_number: str | None = Field(None, description="Phone number")
    email: EmailStr | None = Field(None, description="Email address")
    time_zone: str | None = Field(None, description="Time zone")
    notes: str | None = Field(None, description="Additional notes")


class ContactRead(BaseRead, BaseContact):
    pass


class ContactCreate(BaseContact):
    pass


class ContactUpdate(BaseContact):
    pass


class BaseResume(BaseModel):
    name: str | None = Field(None, description="Resume name")
    content: str | None = Field(None, description="Resume content")
    content_type: ContentType | None = Field(None, description="Resume content type")


class ResumeRead(BaseRead, BaseResume):
    pass


class ResumeCreate(BaseResume):
    pass


class ResumeUpdate(BaseResume):
    pass


class BaseCoverLetter(BaseModel):
    name: str | None = Field(None, description="Cover letter name")
    content: str | None = Field(None, description="Cover letter content")
    content_type: ContentType | None = Field(
        None, description="Cover letter content type"
    )


class CoverLetterRead(BaseRead, BaseCoverLetter):
    pass


class CoverLetterCreate(BaseCoverLetter):
    pass


class CoverLetterUpdate(BaseCoverLetter):
    pass


class BaseUser(BaseModel):
    first_name: str | None = Field(None, description="First name")
    last_name: str | None = Field(None, description="Last name")
    phone_number: str | None = Field(None, description="Phone number")
    address_line_1: str | None = Field(None, description="Address line 1")
    address_line_2: str | None = Field(None, description="Address line 2")
    city: str | None = Field(None, description="City")
    state: str | None = Field(None, description="State")
    zip_code: str | None = Field(None, description="Zip code")
    country: str | None = Field(None, description="Country")
    time_zone: str | None = Field(None, description="Time zone")


class UserRead(schemas.BaseUser[UUID4], BaseUser):  # type: ignore
    pass


class UserCreate(schemas.BaseUserCreate, BaseUser):
    pass


class UserUpdate(schemas.BaseUserUpdate, BaseUser):
    pass


class ApplicationRead(BaseRead):
    lead_id: UUID4
    user_id: UUID4
    lead: LeadRead
    user: UserRead


class ApplicationCreate(BaseModel):
    lead_id: UUID4


class ApplicationUpdate(BaseModel):
    status: str | None = Field(None, description="Application status")
