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


class UserRead(schemas.BaseUser[UUID4], BaseUser):  # type: ignore
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
    pass


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
    pass


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
    time_zone: str | None = None
    notes: str | None = None


class ContactRead(BaseContact, BaseRead):
    user: UserRead | None = None


class ContactCreate(BaseContact):
    pass


class ContactUpdate(BaseContact):
    id: UUID4


class BaseChatCompletion(BaseModel):
    name: str | None = None
    description: str | None = None
    prompt: str | None = None


class ChatCompletionCreate(BaseChatCompletion):
    pass


class ChatCompletionRead(BaseChatCompletion, BaseRead):
    completion: str


class ChatCompletionUpdate(BaseChatCompletion):
    id: UUID4


# End Schema definitions for model CRUD
