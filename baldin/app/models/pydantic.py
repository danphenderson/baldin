
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
    search_id : int


class LeadResponseSchema(LeadPayloadSchema, BaseResponseSchema):
    pass


class LeadUpdatePayloadSchema(LeadPayloadSchema):
    title: str
    company: str
    description: str
    

class SearchPayloadSchema(BaseModel):
    keywords: str
    platform: str


class SearchResponseSchema(SearchPayloadSchema, BaseResponseSchema):
    pass

