# app/schemas.py

from datetime import datetime

from fastapi_users import schemas
from pydantic import UUID4
from pydantic import BaseModel as _BaseModel


class BaseModel(_BaseModel):
    class Config:
        from_attributes = True


class BaseRead(BaseModel):
    id: UUID4
    created_at: datetime
    updated_at: datetime


# Model CRUD Schemas
class BaseETLEvent(BaseModel):
    job_name: str | None = None
    status: str | None = None
    error_message: str | None = None


class ETLEventRead(BaseRead, BaseETLEvent):
    pass


class ETLEventCreate(BaseETLEvent):
    pass


class ETLEventUpdate(BaseETLEvent):
    pass


class BaseSkill(BaseModel):
    name: str | None = None
    category: str | None = None


class SkillRead(BaseRead, BaseSkill):
    pass


class SkillCreate(BaseSkill):
    pass


class SkillUpdate(BaseSkill):
    pass


class BaseExperience(BaseModel):
    title: str | None = None
    company: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    description: str | None = None


class ExperienceRead(BaseExperience, BaseRead):
    pass


class ExperienceCreate(BaseExperience):
    pass


class ExperienceUpdate(BaseExperience):
    pass


class BaseLead(BaseModel):
    title: str | None = None
    company: str | None = None
    description: str | None = None
    location: str | None = None
    salary: str | None = None
    job_function: str | None = None
    industries: str | None = None
    employment_type: str | None = None
    seniority_level: str | None = None
    education_level: str | None = None
    notes: str | None = None


class LeadRead(BaseRead, BaseLead):
    url: str


class LeadCreate(BaseLead):
    url: str


class LeadUpdate(BaseLead):
    pass


class BaseApplication(BaseModel):
    cover_letter: str | None = None
    resume: str | None = None
    notes: str | None = None
    status: str | None = None


class ApplicationRead(BaseRead, BaseApplication):
    lead_id: UUID4


class ApplicationCreate(BaseApplication):
    lead_id: UUID4


class ApplicationUpdate(BaseApplication):
    pass


class BaseContact(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone_number: str | None = None
    email: str | None = None
    time_zone: str | None = None
    notes: str | None = None


class ContactRead(BaseRead, BaseContact):
    pass


class ContactCreate(BaseContact):
    pass


class ContactUpdate(BaseContact):
    pass


class BaseResume(BaseModel):
    name: str | None = None
    content: str | None = None
    content_type: str | None = None


class ResumeRead(BaseRead, BaseResume):
    pass


class ResumeCreate(BaseResume):
    pass


class ResumeUpdate(BaseResume):
    pass


class BaseCoverLetter(BaseModel):
    name: str | None = None
    content: str | None = None
    content_type: str | None = None


class CoverLetterRead(BaseRead, BaseCoverLetter):
    pass


class CoverLetterCreate(BaseCoverLetter):
    pass


class CoverLetterUpdate(BaseCoverLetter):
    pass


class BaseUser(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone_number: str | None = None
    address_line_1: str | None = None
    address_line_2: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    country: str | None = None
    time_zone: str | None = None


class UserRead(schemas.BaseUser[UUID4], BaseUser):  # type: ignore
    pass


class UserCreate(schemas.BaseUserCreate, BaseUser):
    pass


class UserUpdate(schemas.BaseUserUpdate, BaseUser):
    pass
