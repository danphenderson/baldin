import uuid

from pydantic import BaseModel as _BaseModel, UUID4, AnyHttpUrl
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
    url: str
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
    pass

class LeadCreate(BaseLead):
    pass



class BaseSearch(BaseModel):
    keywords: str
    platform: str

class SearchRead(BaseSearch, BaseRead):
    pass

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