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


class LeadRead(BaseLead, BaseRead):
    url: str


class LeadReadSearch(LeadRead):
    searches: list["SearchRead"]


class LeadCreate(BaseLead):
    url: str


class LeadUpdate(BaseLead):
    id: UUID4


class BaseSearch(BaseModel):
    keywords: str | None = None
    platform: str | None = None
    location: str | None = None


class SearchRead(BaseSearch, BaseRead):
    pass


class SearchReadLeads(SearchRead):
    leads: list["LeadRead"]


class SearchCreate(BaseSearch):
    pass


class BaseLoader(BaseModel):
    status: bool = False


class LoaderRead(BaseLoader, BaseRead):
    pass


class LoaderCreate(BaseLoader):
    pass


class LoaderUpdate(BaseLoader):
    pass
