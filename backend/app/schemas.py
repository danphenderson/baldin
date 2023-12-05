import uuid
from datetime import datetime

from fastapi_users import schemas
from pydantic import UUID4
from pydantic import BaseModel as _BaseModel


class BaseModel(_BaseModel):
    class Config:
        orm_mode = True
        extra = "allow"


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
    notes: str | None = None
    user: UserRead


class LeadReadSearch(LeadRead):
    searches: list["JobSearchRead"]


class LeadCreate(BaseLead):
    url: str


class LeadUpdate(BaseLead):
    id: UUID4


class BaseJobSearch(BaseModel):
    keywords: str | None = None
    platform: str | None = None
    location: str | None = None


class JobSearchRead(BaseJobSearch, BaseRead):
    pass


class JobSearchReadLeads(JobSearchRead):
    leads: list[LeadRead]


class JobSearchCreate(BaseJobSearch):
    pass


class JobSearchUpdate(BaseJobSearch):
    id: UUID4


class BaseJobApplication(BaseModel):
    cover_letter: str | None = None
    resume: str | None = None


class JobApplicationRead(BaseJobApplication, BaseRead):
    lead: LeadRead
    user: UserRead


class JobApplicationCreate(BaseJobApplication):
    lead_id: UUID4


class JobApplicationUpdate(BaseJobApplication):
    id: UUID4


class BaseJobSearchPipeline(BaseModel):
    name: str | None = None
    query: str | None = None
    description: str | None = None
    platform: str | None = None
    location: str | None = None
    status: str | None = None

    # TODO: Add validators for the status field, e.g. running, success, failure


class JobSearchPipelineRead(BaseJobSearchPipeline, BaseRead):
    searches: list[JobSearchRead]


class JobSearchPipelineCreate(BaseJobSearchPipeline):
    pass


class JobSearchPipelineUpdate(BaseJobSearchPipeline):
    id: UUID4
