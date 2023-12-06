import uuid
from datetime import datetime

from fastapi_users import schemas
from pydantic import UUID4
from pydantic import BaseModel as _BaseModel


class BaseModel(_BaseModel):
    class Config:
        from_attributes = True


class BaseRead(BaseModel):
    id: UUID4 | str
    created_at: datetime
    updated_at: datetime


# Begin Schema definitions for model CRUD


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
    skills: str | None = None  # FIXME: going to be a list of strings


class UserRead(schemas.BaseUser[uuid.UUID], BaseUser):
    pass


class UserCreate(schemas.BaseUserCreate, BaseUser):
    pass


class UserUpdate(schemas.BaseUserUpdate, BaseUser):
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
    notes: str | None = None


class LeadRead(BaseLead, BaseRead):
    url: str


class LeadCreate(BaseLead):
    url: str


class LeadUpdate(BaseLead):
    id: UUID4


class BaseApplication(BaseModel):
    cover_letter: str | None = None
    resume: str | None = None
    notes: str | None = None
    status: str | None = None


class ApplicationRead(BaseApplication, BaseRead):
    lead: LeadRead | None = None


class ApplicationCreate(BaseApplication):
    lead_id: UUID4


class ApplicationUpdate(BaseApplication):
    id: UUID4


class BaseETLEvent(BaseModel):
    job_name: str | None = None
    status: str | None = None


class ETLEventRead(BaseETLEvent, BaseRead):
    pass


class ETLEventCreate(BaseETLEvent):
    pass


class ETLEventUpdate(BaseETLEvent):
    id: UUID4


class BaseContact(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone_number: str | None = None
    email: str | None = None
    notes: str | None = None
    time_zone: str | None = None


class ContactRead(BaseContact, BaseRead):
    pass


class ContactCreate(BaseContact):
    user_id: UUID4


class ContactUpdate(BaseContact):
    id: UUID4


class BaseGenerativeTemplate(BaseModel):
    name: str | None = None
    description: str | None = None
    content: str | None = None


class GenerativeTemplateRead(BaseGenerativeTemplate, BaseRead):
    pass


class GenerativeTemplateCreate(BaseGenerativeTemplate):
    pass


class GenerativeTemplateUpdate(BaseGenerativeTemplate):
    id: UUID4


# End Schema definitions for model CRUD
