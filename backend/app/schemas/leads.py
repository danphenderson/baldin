from pydantic import BaseModel, UUID4, AnyHttpUrl
from datetime import datetime 


class LeadBase(BaseModel):
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


class LeadRead(LeadBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class LeadCreate(LeadBase):
    pass