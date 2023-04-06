import uuid

from pydantic import BaseModel, UUID4, AnyHttpUrl
from datetime import datetime 

from fastapi_users import schemas


class UserRead(schemas.BaseUser[uuid.UUID]):
    pass


class UserCreate(schemas.BaseUserCreate):
    pass


class UserUpdate(schemas.BaseUserUpdate):
    pass


class BaseLead(BaseModel):
    url: AnyHttpUrl
    title: str | None = None
    company: str | None = None
    description: str | None = None
    location: str | None = None
    salary: str | None = None
    job_function: str | None = None
    industries: str | None = None
    employment_type: str | None = None
    seniority_level: str | None = None


class LeadRead(BaseLead):
    id: UUID4
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class LeadCreate(BaseLead):
    pass