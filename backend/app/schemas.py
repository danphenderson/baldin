# Path: app/schemas.py
import json
from datetime import datetime
from enum import Enum
from io import BytesIO
from pathlib import Path  # TODO: Use Literal for performance improvement
from typing import Any, Literal, Sequence, TypeVar

from fastapi import UploadFile
from fastapi_users import schemas
from pydantic import UUID4, AnyHttpUrl
from pydantic import BaseModel as _BaseModel
from pydantic import ConfigDict, EmailStr, Field, model_validator, validator
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
    URL = "url"


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
    run_count: int = Field(0, description="Total number of runs")
    failure_count: int = Field(0, description="Number of failed runs")
    last_run_status: str | None = Field(
        None, description="Status of the most recent run"
    )
    last_run_at: datetime | None = Field(
        None, description="Timestamp of the most recent run"
    )

    @model_validator(mode="after")
    def compute_summary(self) -> "OrchestrationPipelineRead":
        events = self.events or []
        self.run_count = len(events)
        self.failure_count = sum(
            1
            for e in events
            if getattr(e, "status", None)
            in (OrchestrationEventStatusType.FAILED, "failure")
        )
        if events:
            latest = max(events, key=lambda e: e.created_at)
            self.last_run_status = (
                latest.status.value
                if isinstance(latest.status, OrchestrationEventStatusType)
                else latest.status
            )
            self.last_run_at = latest.created_at
        return self


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


class OrchestrationEventUpdate(BaseSchema):
    """Update schema for orchestration events.

    pipeline_id is intentionally excluded — runs cannot be reassigned
    to a different workflow after creation.
    """

    message: str | None = Field(None, description="Error message")
    payload: dict | None = Field(None, description="Payload of the triggering event")
    environment: str | None = Field(None, description="Application environment setting")
    source_uri: URI | None = Field(None, description="Source of the pipeline")
    destination_uri: URI | None = Field(None, description="Destination of the pipeline")
    status: OrchestrationEventStatusType | None = Field(
        None, description="Status of the event"
    )

    @validator("source_uri", "destination_uri", pre=True)
    def validate_uri(cls, v: Any) -> URI | None:
        if isinstance(v, str):
            return URI(**json.loads(v))
        if isinstance(v, dict):
            return URI(**v)
        return v


class OrchestrationEventPaginatedRead(BaseSchema):
    items: list[OrchestrationEventRead] = Field(
        [], description="Paginated list of orchestration events"
    )
    total: int = Field(0, description="Total number of matching events")
    page: int = Field(1, ge=1, description="Current page number")
    page_size: int = Field(20, ge=1, description="Items per page")


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

    @validator("yoe", pre=True)
    def validate_yoe(cls, v) -> int:
        if v:
            v = int(v)
            if v < 0:
                raise ValueError("Years of experience must be a positive integer")
        return v


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

    @validator("start_date", "end_date", pre=True)
    def parse_date(cls, value):
        if isinstance(value, str):
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if isinstance(value, datetime):
            return value.replace(tzinfo=None) if value.tzinfo else value


class ExperienceRead(BaseExperience, BaseRead):
    pass


class ExperienceCreate(BaseExperience):
    @validator("projects", pre=True)
    def parse_projects(cls, value):
        if not value:
            return
        elif isinstance(value, list):
            value = ", ".join(value)
        return utils.wrap_text(value)


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

    @validator("start_date", "end_date", pre=True)
    def parse_date(cls, value):
        if isinstance(value, str):
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if isinstance(value, datetime):
            return value.replace(tzinfo=None) if value.tzinfo else value


class EducationRead(BaseEducation, BaseRead):
    pass


class EducationCreate(BaseEducation):
    @validator("achievements", "activities", pre=True)
    def parse_achievements(cls, value):
        if not value:
            return
        elif isinstance(value, list):
            value = ", ".join(value)
        return utils.wrap_text(value)


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

    @validator("expiration_date", "issued_date", pre=True)
    def parse_date(cls, value):
        if isinstance(value, str):
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if isinstance(value, datetime):
            return value.replace(tzinfo=None) if value.tzinfo else value


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


LEAD_SHARED_TEXT_FIELDS = (
    "title",
    "description",
    "location",
    "salary",
    "job_function",
    "employment_type",
    "seniority_level",
    "education_level",
    "hiring_manager",
)


def _clean_optional_wrapped_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = utils.clean_text(value)
    if not cleaned:
        return None
    return utils.wrap_text(cleaned)


def _normalize_lead_text_fields(model: Any) -> Any:
    for field in LEAD_SHARED_TEXT_FIELDS:
        if field not in model.model_fields_set:
            continue
        setattr(model, field, _clean_optional_wrapped_text(getattr(model, field)))
    return model


class BaseLeadShared(BaseSchema):
    title: str | None = Field(None, description="Job title")
    description: str | None = Field(None, description="Job description")
    location: str | None = Field(None, description="Job location")
    salary: str | None = Field(None, description="Salary range")
    job_function: str | None = Field(None, description="Job function")
    employment_type: str | None = Field(None, description="Type of employment")
    seniority_level: str | None = Field(None, description="Seniority level")
    education_level: str | None = Field(None, description="Required education level")
    hiring_manager: str | None = Field(None, description="Hiring manager")


class LeadViewerPermissionsRead(BaseSchema):
    can_register: bool = Field(False, description="Whether the viewer can register")
    can_leave_registration: bool = Field(
        False, description="Whether the viewer can remove their registration"
    )
    can_update_registration: bool = Field(
        False, description="Whether the viewer can edit their registration metadata"
    )
    can_update_shared_fields: bool = Field(
        False, description="Whether the viewer can update shared lead fields"
    )
    can_clear_or_overwrite_shared_fields: bool = Field(
        False,
        description="Whether the viewer can clear or overwrite populated shared fields",
    )
    can_delete_shared_lead: bool = Field(
        False, description="Whether the viewer can delete the shared lead"
    )
    can_view_comments: bool = Field(
        False, description="Whether the viewer can read comments on the lead"
    )
    can_post_comments: bool = Field(
        False, description="Whether the viewer can post comments on the lead"
    )


class LeadParticipantPublicProfileRead(BaseSchema):
    user_id: UUID4 = Field(description="User identifier")
    display_name: str = Field(description="Public display name for the participant")
    city: str | None = Field(None, description="Participant city")
    state: str | None = Field(None, description="Participant state")
    country: str | None = Field(None, description="Participant country")
    avatar_uri: str | None = Field(None, description="Participant avatar URI")


class LeadParticipantSummaryRead(BaseSchema):
    registered_at: datetime = Field(
        description="When the participant registered interest in the lead"
    )
    public_profile: LeadParticipantPublicProfileRead = Field(
        description="The participant's exposed public profile"
    )


class LeadRegistrationRead(BaseSchema):
    lead_id: UUID4 = Field(description="Lead identifier")
    user_id: UUID4 = Field(description="User identifier")
    internal_notes: str | None = Field(
        None, description="Viewer-scoped notes for this registration"
    )
    expose_profile: bool = Field(
        False, description="Whether the viewer exposes their profile to participants"
    )
    created_at: datetime = Field(description="When the registration was created")
    updated_at: datetime = Field(description="When the registration was last updated")


class LeadRegistrationUpdate(BaseSchema):
    model_config = ConfigDict(extra="forbid")

    internal_notes: str | None = Field(
        None, description="Viewer-scoped notes for this registration"
    )
    expose_profile: bool | None = Field(
        None, description="Whether the viewer exposes their profile to participants"
    )

    @model_validator(mode="after")
    def clean_internal_notes(self) -> "LeadRegistrationUpdate":
        if "internal_notes" in self.model_fields_set:
            self.internal_notes = _clean_optional_wrapped_text(self.internal_notes)
        return self


class LeadRead(BaseRead, BaseLeadShared):
    url: str = Field(description="Job posting URL")
    canonical_url: str = Field(description="Canonical lead URL used for deduplication")
    companies: list[CompanyRead] = Field(
        default_factory=list,
        description="List of companies associated with the lead",
    )
    interest_count: int = Field(
        0, description="How many viewers are currently registered on the lead"
    )
    comment_count: int = Field(
        0, description="How many comments and replies exist for the lead"
    )
    viewer_is_registered: bool = Field(
        False, description="Whether the current viewer is registered on the lead"
    )
    viewer_permissions: LeadViewerPermissionsRead = Field(
        default_factory=LeadViewerPermissionsRead,
        description="Current-viewer permissions for this lead",
    )


class LeadDetailRead(LeadRead):
    viewer_registration: LeadRegistrationRead | None = Field(
        None, description="The current viewer's lead registration, if present"
    )
    participant_summaries: list[LeadParticipantSummaryRead] = Field(
        default_factory=list,
        description="Registered participants who opted to expose their profile",
    )


class LeadsPaginatedRead(BaseSchema):
    leads: Sequence[LeadRead]
    pagination: Pagination
    total_count: int | None = Field(
        ..., description="Total number of leads, if pagination requested"
    )


class LeadCreate(BaseLeadShared):
    model_config = ConfigDict(extra="forbid")

    url: str
    company_ids: list[UUID4] | None = Field(None, description="Company IDs")

    @validator("url")
    def validate_url(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Lead URL is required")
        utils.canonicalize_lead_url(cleaned)
        return cleaned

    @model_validator(mode="after")
    def clean_and_wrap_text_fields(self) -> "LeadCreate":
        return _normalize_lead_text_fields(self)


class LeadSharedUpdate(BaseLeadShared):
    model_config = ConfigDict(extra="forbid")

    company_ids: list[UUID4] | None = Field(None, description="Company IDs")

    @model_validator(mode="after")
    def clean_and_wrap_text_fields(self) -> "LeadSharedUpdate":
        return _normalize_lead_text_fields(self)


class LeadUpdate(LeadSharedUpdate):
    pass


class LeadCommentRead(BaseRead):
    lead_id: UUID4 = Field(description="Lead identifier")
    parent_comment_id: UUID4 | None = Field(
        None, description="Parent comment identifier for replies"
    )
    content: str = Field(description="Comment content")
    anonymous: bool = Field(
        True, description="Whether the comment hides the author's public profile"
    )
    author_public_profile: LeadParticipantPublicProfileRead | None = Field(
        None,
        description="The author's public profile, when the comment is non-anonymous",
    )
    replies: list["LeadCommentRead"] = Field(
        default_factory=list,
        description="Replies to this top-level comment",
    )


class LeadCommentCreate(BaseSchema):
    model_config = ConfigDict(extra="forbid")

    content: str = Field(description="Comment content")
    anonymous: bool = Field(
        True, description="Whether the comment hides the author's public profile"
    )

    @validator("content")
    def clean_content(cls, value: str) -> str:
        cleaned = _clean_optional_wrapped_text(value)
        if not cleaned:
            raise ValueError("Comment content cannot be empty")
        return cleaned


class LeadExtractDisposition(str, Enum):
    CREATED = "created"
    MATCHED_EXISTING_JOINED = "matched_existing_joined"
    MATCHED_EXISTING_ALREADY_REGISTERED = "matched_existing_already_registered"


class LeadExtractResponse(BaseSchema):
    lead: LeadRead = Field(description="The resulting lead record")
    disposition: LeadExtractDisposition = Field(
        description="Whether extraction created a lead or matched an existing one"
    )
    submitted_url: str = Field(description="The URL submitted for extraction")
    normalized_url: str = Field(
        description="The canonicalized URL used for deduplication"
    )


LeadCommentRead.model_rebuild()


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
    education: list[EducationRead] = Field(
        [], description="User's educational background"
    )
    certificates: list[CertificateRead] = Field([], description="User's certificates")


class UserCreate(schemas.BaseUserCreate, BaseUser):
    pass


class UserUpdate(schemas.BaseUserUpdate, BaseUser):
    pass


class UserDataOperationResult(BaseSchema):
    user_id: UUID4 = Field(description="User affected by the data-management operation")
    user_deleted: bool = Field(description="Whether the user row was removed")
    cleared_profile_fields: int = Field(
        0, description="Number of profile fields cleared from the retained user"
    )
    deleted_records: dict[str, int] = Field(
        default_factory=dict,
        description="Deleted record counts grouped by table or association",
    )


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


class ExtractorRun(BaseSchema):
    """Request to run an extractor."""

    mode: Literal["entire_document", "retrieval"] = Field(
        "entire_document",
        description="Mode to run the extractor in. 'entire_document' extracts information from the entire document. 'retrieval' extracts information from a specific section of the document.",
    )
    file: UploadFile | None = Field(
        None,
        description="A file to extract information from. If provided, the file will be processed and the text extracted.",
    )
    text: str | None = Field(
        None,
        description="Text to extract information from. If provided, the text will be processed and the information extracted.",
    )
    url: AnyHttpUrl | None = Field(
        None,
        description="A URL to extract information from. If provided, the URL will be processed and the information extracted.",
    )
    llm: str | None = Field(
        None,
        description="The language model to use for the extraction.",
    )


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


class ApplicationResumeAttach(BaseSchema):
    resume_id: UUID4


class ApplicationCoverLetterAttach(BaseSchema):
    cover_letter_id: UUID4
