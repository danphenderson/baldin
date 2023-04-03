
# app/models/pydantic.py


from pydantic import BaseModel, AnyHttpUrl
from datetime import datetime

class BaseResponseSchema(BaseModel):
    id: int | str
    created_at: datetime
    updated_at: datetime

    class Config:
        extra = "allow"
        abstract = True

class LeadPayloadSchema(BaseModel):
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

class LeadResponseSchema(LeadPayloadSchema, BaseResponseSchema):
    pass

class LoaderResponseSchema(BaseResponseSchema):
    pass


class SearchPayloadSchema(BaseModel):
    keywords: str
    platform: str


class SearchResponseSchema(SearchPayloadSchema, BaseResponseSchema):
    pass
