import uuid

from pydantic import BaseModel as _BaseModel, UUID4
from datetime import datetime 

from fastapi_users import schemas

class BaseModel(_BaseModel):
    class Config:
        orm_mode = True
        extra='allow'

class BaseRead(BaseModel):
    id: UUID4 | str
    created_at: datetime
    updated_at: datetime


class UserRead(schemas.BaseUser[uuid.UUID]):
    # TODO: FastAPI-Users should implement a UUID4 type
    # reference documentation for details.
    pass

class UserCreate(schemas.BaseUserCreate):
    pass

class UserUpdate(schemas.BaseUserUpdate):
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