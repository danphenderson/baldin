from pydantic import BaseModel, AnyHttpUrl


class LeadPayloadSchema(BaseModel):
    url: AnyHttpUrl


class LeadResponseSchema(LeadPayloadSchema):
    id: int

class LeadUpdatePayloadSchema(LeadPayloadSchema):
    lead: str