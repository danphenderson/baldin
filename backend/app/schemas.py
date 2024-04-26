# Path: app/schemas.py
import json
from datetime import datetime
from enum import Enum
from io import BytesIO
from pathlib import Path  # TODO: Use Literal for performance improvement
from typing import Any, Sequence, TypeVar

from fastapi_users import schemas
from pydantic import UUID4, AnyHttpUrl
from pydantic import BaseModel as _BaseModel
from pydantic import EmailStr, Field, model_validator, validator
from PyPDF2 import PdfReader

from app import utils


# Base Model
class BaseSchema(_BaseModel):
    class Config:
        from_attributes = True
        protected_namespaces = ()  # Setting protected namespaces to empty


# Types, properties, and shared models


BaseSchemaSubclass = TypeVar("BaseSchemaSubclass", bound=BaseSchema)


class ContentType(str, Enum):
    CUSTOM = "custom"
    GENERATED = "generated"
    TEMPLATE = "template"


class OrchestrationEventStatusType(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failure"


class URIType(str, Enum):
    FILE = "filepath"
    DATALAKE = "datalake"
    DATABASE = "database"
    API = "api"


class URI(BaseSchema):
    name: str
    type: URIType

    class Config:
        json_encoders = {
            "URI": lambda v: v.dict(),
        }

    @validator("type", pre=True)  # Not sure if pre=True is neccessary?
    def validate_type(cls, v: str) -> URIType:
        return URIType(v)


class BaseRead(BaseSchema):
    id: UUID4 = Field(description="The unique uuid4 record identifier.")
    created_at: datetime = Field(description="The time the item was created")
    updated_at: datetime = Field(description="The time the item was last updated")


class Pagination(BaseSchema):
    page: int = Field(1, ge=1, description="The page number")
    page_size: int = Field(10, ge=1, description="The number of items per page")
    request_count: bool = Field(False, description="Request a query for total count")


# Model CRUD Schemas
class BaseOrchestrationPipeline(BaseSchema):
    name: str | None = Field(None, description="Name of the pipeline")
    description: str | None = Field(None, description="Description of the pipeline")
    definition: dict | None = Field(None, description="Parameters for the pipeline")


class OrchestrationPipelineRead(BaseOrchestrationPipeline, BaseRead):
    events: list["OrchestrationEventRead"] = Field(
        [], description="Events in the pipeline", alias="orchestration_events"
    )


class OrchestrationPipelineCreate(BaseOrchestrationPipeline):
    pass


class OrchestrationPipelineUpdate(BaseOrchestrationPipeline):
    events: list["OrchestrationEventRead"] = Field(
        [], description="Events in the pipeline"
    )


class BaseOrchestrationEvent(BaseSchema):
    message: str | None = Field(None, description="Error message")
    payload: dict | None = Field(None, description="Payload of the triggering event")
    environment: str | None = Field(None, description="Application environment setting")
    source_uri: URI | None = Field(None, description="Source of the pipeline")
    destination_uri: URI | None = Field(None, description="Destination of the pipeline")
    status: OrchestrationEventStatusType | None = Field(
        None, description="Status of the event"
    )
    pipeline_id: UUID4 | None = Field(None, description="Pipeline ID")

    @validator("source_uri", "destination_uri", pre=True)
    def validate_uri(cls, v: Any) -> URI | None:
        if isinstance(v, str):
            return URI(**json.loads(v))
        if isinstance(v, dict):
            return URI(**v)
        return v


class OrchestrationEventRead(BaseOrchestrationEvent, BaseRead):
    @validator("payload", pre=True)
    def load_json(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                raise ValueError("Payload must be a valid JSON")
        return v


class OrchestrationEventCreate(BaseOrchestrationEvent):
    pipeline_id: UUID4


class OrchestrationEventUpdate(BaseOrchestrationEvent):
    pass


class ExtractorRequest(BaseSchema):
    llm_name: str | None = Field("gpt-3.5-turbo", description="Model name")
    examples: list["ExtractorExampleRead"] = Field(
        [], description="Extraction examples"
    )
    instructions: str | None = Field(None, description="Extraction instruction")
    json_schema: dict | None = Field(None, description="JSON schema", alias="schema")
    text: str | None = Field(None, description="Text to extract from")

    @validator("json_schema")
    def validate_schema(cls, v: Any) -> dict[str, Any]:
        """Validate the schema."""
        utils.validate_json_schema(v)
        return v


class ExtractorResponse(BaseSchema):
    data: list[Any] = Field([], description="Extracted data")
    content_too_long: bool = Field(False, description="Content too long to extract")


class BaseSkill(BaseSchema):
    name: str | None = Field(None, description="Name of the skill")
    category: str | None = Field(None, description="Category of the skill")
    yoe: int | None = Field(None, description="Years of Experience")
    subskills: str | None = Field(None, description="Sub-Skills")


class SkillRead(BaseRead, BaseSkill):
    pass


class SkillCreate(BaseSkill):
    pass


class SkillUpdate(BaseSkill):
    pass


class BaseExperience(BaseSchema):
    title: str | None = Field(None, description="Job title")
    company: str | None = Field(None, description="Company name")
    start_date: datetime | None = Field(
        None, description="Start date of the experience"
    )
    end_date: datetime | None = Field(None, description="End date of the experience")
    description: str | None = Field(None, description="Description of the experience")
    location: str | None = Field(None, description="Location of the experience")
    projects: str | None = Field(None, description="Projects involved")


class ExperienceRead(BaseExperience, BaseRead):
    pass


class ExperienceCreate(BaseExperience):
    pass


class ExperienceUpdate(BaseExperience):
    pass


class BaseEducation(BaseSchema):
    university: str | None = Field(None, description="University name")
    degree: str | None = Field(None, description="Degree name")
    gradePoint: str | None = Field(None, description="Grade point")
    activities: str | None = Field(None, description="Activities involved")
    achievements: str | None = Field(None, description="Achievements")
    start_date: datetime | None = Field(None, description="Start date of the education")
    end_date: datetime | None = Field(None, description="End date of the education")


class EducationRead(BaseEducation, BaseRead):
    pass


class EducationCreate(BaseEducation):
    pass


class EducationUpdate(BaseEducation):
    pass


class BaseCertificate(BaseSchema):
    title: str | None = Field(None, description="Certificate title")
    issuer: str | None = Field(None, description="Issuer of the certificate")
    expiration_date: datetime | None = Field(
        None, description="Expiration date of the certificate"
    )
    issued_date: datetime | None = Field(
        None, description="Issued date of the certificate"
    )


class CertificateRead(BaseCertificate, BaseRead):
    pass


class CertificateCreate(BaseCertificate):
    pass


class CertificateUpdate(BaseCertificate):
    pass


class BaseCompany(BaseSchema):
    name: str | None = Field(None, description="Company name")
    industry: str | None = Field(None, description="Industry of the company")
    size: str | None = Field(None, description="Size of the company")
    location: str | None = Field(None, description="Location of the company")
    description: str | None = Field(None, description="Description of the company")


class CompanyRead(BaseCompany, BaseRead):
    pass


class CompanyCreate(BaseCompany):
    pass


class CompanyUpdate(BaseCompany):
    pass


class BaseLead(BaseSchema):
    title: str | None = Field(None, description="Job title")
    description: str | None = Field(None, description="Job description")
    location: str | None = Field(None, description="Job location")
    salary: str | None = Field(None, description="Salary range")
    job_function: str | None = Field(None, description="Job function")
    industries: str | None = Field(None, description="Industries involved")
    employment_type: str | None = Field(None, description="Type of employment")
    seniority_level: str | None = Field(None, description="Seniority level")
    education_level: str | None = Field(None, description="Required education level")
    notes: str | None = Field(None, description="Additional notes")
    hiring_manager: str | None = Field(None, description="Hiring manager")


class LeadRead(BaseRead, BaseLead):
    url: AnyHttpUrl | str | None = Field(None, description="Job posting URL")
    companies: list[CompanyRead] = Field(
        [], description="List of companies associated with the lead"
    )


class LeadsPaginatedRead(BaseSchema):
    leads: Sequence[LeadRead]
    pagination: Pagination
    total_count: int | None = Field(
        ..., description="Total number of leads, if pagination requested"
    )


class LeadCreate(BaseLead):
    url: str
    company_ids: list[UUID4] | None = Field(None, description="Company IDs")

    @model_validator(mode="after")
    def clean_and_wrap_text_fields(self) -> Any:
        for field in self.model_fields_set:
            v = getattr(self, field)
            if isinstance(v, str):
                cleaned_value = utils.clean_text(v)
                setattr(self, field, utils.wrap_text(cleaned_value))
        return self


class LeadUpdate(BaseLead):
    company_ids: list[UUID4] = Field([], description="Company IDs")


class BaseContact(BaseSchema):
    first_name: str | None = Field(None, description="First name")
    last_name: str | None = Field(None, description="Last name")
    phone_number: str | None = Field(None, description="Phone number")
    email: EmailStr | None = Field(None, description="Email address")
    time_zone: str | None = Field(None, description="Time zone")
    notes: str | None = Field(None, description="Additional notes")


class ContactRead(BaseRead, BaseContact):
    pass


class ContactCreate(BaseContact):
    pass


class ContactUpdate(BaseContact):
    pass


class BaseResume(BaseSchema):
    name: str | None = Field(None, description="Resume name")
    content: str | None = Field(None, description="Resume content")
    content_type: ContentType | None = Field(None, description="Resume content type")


class ResumeRead(BaseRead, BaseResume):
    pass


class ResumeCreate(BaseResume):
    pass

    @classmethod
    async def from_pdf(cls, filepath: str | Path) -> ResumeRead:
        pdf_dict = await utils.pdf_to_dict(filepath)
        # TODO: content may need to be a list of strings.
        # This may only load the first page.
        return cls(name=pdf_dict["name"], content=pdf_dict["content"][0])  # type: ignore


class ResumeUpdate(BaseResume):
    pass


class BaseCoverLetter(BaseSchema):
    name: str | None = Field(None, description="Cover letter name")
    content: str | None = Field(None, description="Cover letter content")
    content_type: ContentType | None = Field(
        None, description="Cover letter content type"
    )


class CoverLetterRead(BaseRead, BaseCoverLetter):
    pass


class CoverLetterCreate(BaseCoverLetter):
    pass

    @classmethod
    async def from_pdf(cls, filepath: str) -> CoverLetterRead:
        pdf_dict = await utils.pdf_to_dict(filepath)
        # TODO: content may need to be a list of strings.
        # This may only load the first page.
        return cls(name=pdf_dict["name"], content=pdf_dict["content"][0])  # type: ignore

    @classmethod
    def from_bytes(cls, name: str, content: BytesIO) -> CoverLetterRead:
        reader = PdfReader(content)
        text_content = []
        for page_num in range(len(reader.pages)):
            page = reader.pages[page_num]
            text_content.append(page.or_text())
        return cls(name=name, content=text_content[0], content_type=ContentType.GENERATED)  # type: ignore


class CoverLetterUpdate(BaseCoverLetter):
    pass


class BaseUser(BaseSchema):
    first_name: str | None = Field(None, description="First name")
    last_name: str | None = Field(None, description="Last name")
    phone_number: str | None = Field(None, description="Phone number")
    address_line_1: str | None = Field(None, description="Address line 1")
    address_line_2: str | None = Field(None, description="Address line 2")
    city: str | None = Field(None, description="City")
    state: str | None = Field(None, description="State")
    zip_code: str | None = Field(None, description="Zip code")
    country: str | None = Field(None, description="Country")
    time_zone: str | None = Field(None, description="Time zone")
    avatar_uri: URI | None = Field(None, description="Avatar URI")


class UserRead(schemas.BaseUser[UUID4], BaseUser):  # type: ignore
    pass


# Define a schema for the user profile that includes skills and experiences
class UserProfileRead(BaseSchema):
    skills: list[SkillRead] = Field([], description="User's skills")
    experiences: list[ExperienceRead] = Field(
        [], description="User's professional experiences"
    )
    educations: list[EducationRead] = Field(
        [], description="User's educational background"
    )
    certificates: list[CertificateRead] = Field([], description="User's certificates")


class UserCreate(schemas.BaseUserCreate, BaseUser):
    pass


class UserUpdate(schemas.BaseUserUpdate, BaseUser):
    pass


class BaseExtractorExample(BaseSchema):
    content: str | None = Field(None, description="Example content")
    output: str | None = Field(None, description="Example output")


class ExtractorExampleRead(BaseRead, BaseExtractorExample):
    pass


class ExtractorExampleCreate(BaseExtractorExample):
    pass


class ExtractorExampleUpdate(BaseExtractorExample):
    pass


class BaseExtractor(BaseSchema):
    name: str | None = Field(None, description="Extractor name")
    description: str | None = Field(None, description="Extractor description")
    json_schema: dict | str | None = Field(None, description="JSON schema")
    instruction: str | None = Field(None, description="Extractor instruction")
    extractor_examples: list[ExtractorExampleRead] = Field(
        [], description="Extractor examples"
    )

    @validator("json_schema")
    def validate_schema(cls, v: Any) -> dict[str, Any]:
        """Validate the schema."""
        if isinstance(v, str):
            v = json.loads(v)
        if v:
            utils.validate_json_schema(v)
        return v


class ExtractorRead(BaseRead, BaseExtractor):
    pass


class ExtractorCreate(BaseExtractor):
    pass


class ExtractorUpdate(BaseExtractor):
    pass


class ApplicationRead(BaseRead):
    lead_id: UUID4
    user_id: UUID4
    lead: LeadRead
    user: UserRead
    status: str | None = Field(None, description="Application status")


class ApplicationCreate(BaseSchema):
    lead_id: UUID4
    status: str


class ApplicationUpdate(BaseSchema):
    status: str


table_read_map = {
    "users": UserRead,
    "skills": SkillRead,
    "experiences": ExperienceRead,
    "educations": EducationRead,
    "certificates": CertificateRead,
    "companies": CompanyRead,
    "leads": LeadRead,
    "contacts": ContactRead,
    "resumes": ResumeRead,
    "cover_letters": CoverLetterRead,
    "orchestration_pipelines": OrchestrationPipelineRead,
    "orchestration_events": OrchestrationEventRead,
    "extractors": ExtractorRead,
    "extractor_examples": ExtractorExampleRead,
    "applications": ApplicationRead,
}

table_create_map = {
    "users": UserCreate,
    "skills": SkillCreate,
    "experiences": ExperienceCreate,
    "educations": EducationCreate,
    "certificates": CertificateCreate,
    "companies": CompanyCreate,
    "leads": LeadCreate,
    "contacts": ContactCreate,
    "resumes": ResumeCreate,
    "cover_letters": CoverLetterCreate,
    "orchestration_pipelines": OrchestrationPipelineCreate,
    "orchestration_events": OrchestrationEventCreate,
    "extractors": ExtractorCreate,
    "extractor_examples": ExtractorExampleCreate,
    "applications": ApplicationCreate,
}
