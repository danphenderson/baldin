
# app/models/pydantic.py


from pydantic import BaseModel, AnyHttpUrl, validator


class BaseResponseSchema(BaseModel):
    id: int
    created_at: str
    updated_at: str

    class Config:
        extra = "allow"
        abstract = True

    @validator("created_at", "updated_at", pre=True)
    def convert_datetime(cls, v):
        return str(v)


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


class SearchPayloadSchema(BaseModel):
    keywords: str
    platform: str


class SearchResponseSchema(SearchPayloadSchema, BaseResponseSchema):
    pass


class LoaderResponseSchema(BaseResponseSchema):
    pass

 