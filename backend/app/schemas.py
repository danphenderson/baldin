# Path: app/schemas.py
import json
from datetime import datetime
from enum import Enum
from io import BytesIO
from pathlib import Path  # TODO: Use Literal for performance improvement
from typing import Any, Literal, Optional, Sequence, TypeVar

from fastapi import UploadFile
from fastapi_users import schemas
from pydantic import UUID4, AnyHttpUrl
from pydantic import BaseModel as _BaseModel
from pydantic import ConfigDict, EmailStr, Field, field_validator, model_validator
from PyPDF2 import PdfReader

from app import utils
from app.core.url_safety import validate_url_safe_for_fetch


# Base Model
class BaseSchema(_BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        protected_namespaces=(),
    )


# Types, properties, and shared models


BaseSchemaSubclass = TypeVar("BaseSchemaSubclass", bound=BaseSchema)


class ContentType(str, Enum):
    CUSTOM = "custom"
    GENERATED = "generated"
    TEMPLATE = "template"


class ContentFormat(str, Enum):
    PLAIN_TEXT = "plain_text"
    TIPTAP_JSON = "tiptap_json"


class DocumentCollaborationBootstrapStatus(str, Enum):
    CONNECT = "connect"
    PENDING = "pending"
    SEED = "seed"


class OrchestrationEventStatusType(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failure"
    PENDING_REVIEW = "pending_review"


class URIType(str, Enum):
    FILE = "filepath"
    DATALAKE = "datalake"
    DATABASE = "database"
    API = "api"
    URL = "url"


class SubscriptionTier(str, Enum):
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"


class PlacementStatus(str, Enum):
    ACTIVE = "active"
    GRADUATED = "graduated"
    ALUMNI = "alumni"


class ConnectionStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    BLOCKED = "blocked"


class URI(BaseSchema):
    name: str
    type: URIType

    @field_validator("type", mode="before")
    @classmethod
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

    @field_validator("source_uri", "destination_uri", mode="before")
    @classmethod
    def validate_uri(cls, v: Any) -> URI | None:
        if isinstance(v, str):
            return URI(**json.loads(v))
        if isinstance(v, dict):
            return URI(**v)
        return v


class OrchestrationEventRead(BaseOrchestrationEvent, BaseRead):
    version_hash: str | None = Field(
        None, description="Extractor version hash used for this run"
    )
    retry_of_id: UUID4 | None = Field(
        None, description="ID of the original event this is a retry of"
    )

    @field_validator("payload", mode="before")
    @classmethod
    def load_json(cls, v: Any) -> Any:
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

    @field_validator("source_uri", "destination_uri", mode="before")
    @classmethod
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

    @field_validator("json_schema")
    @classmethod
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

    @field_validator("yoe", mode="before")
    @classmethod
    def validate_yoe(cls, v: Any) -> Any:
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

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def parse_date(cls, value: Any) -> Any:
        if isinstance(value, str):
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if isinstance(value, datetime):
            return value.replace(tzinfo=None) if value.tzinfo else value
        return value


class ExperienceRead(BaseExperience, BaseRead):
    pass


class ExperienceCreate(BaseExperience):
    @field_validator("projects", mode="before")
    @classmethod
    def parse_projects(cls, value: Any) -> Any:
        if not value:
            return value
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

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def parse_date(cls, value: Any) -> Any:
        if isinstance(value, str):
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if isinstance(value, datetime):
            return value.replace(tzinfo=None) if value.tzinfo else value
        return value


class EducationRead(BaseEducation, BaseRead):
    pass


class EducationCreate(BaseEducation):
    @field_validator("achievements", "activities", mode="before")
    @classmethod
    def parse_achievements(cls, value: Any) -> Any:
        if not value:
            return value
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

    @field_validator("expiration_date", "issued_date", mode="before")
    @classmethod
    def parse_date(cls, value: Any) -> Any:
        if isinstance(value, str):
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if isinstance(value, datetime):
            return value.replace(tzinfo=None) if value.tzinfo else value
        return value


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
    is_connected: bool = Field(
        False,
        description="Whether the viewer has an accepted connection with this participant",
    )
    connection_id: UUID4 | None = Field(
        None,
        description="Connection record id, if an accepted connection exists",
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

    @field_validator("url")
    @classmethod
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

    @field_validator("content")
    @classmethod
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


# ---------------------------------------------------------------------------
#  Unified Document schemas (versioned, multi-kind)
# ---------------------------------------------------------------------------


class DocumentKind(str, Enum):
    RESUME = "resume"
    COVER_LETTER = "cover_letter"
    FOLLOW_UP = "follow_up"
    REFERENCE_SHEET = "reference_sheet"
    FREEFORM = "freeform"


class DocumentStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class DocumentActivityType(str, Enum):
    DOCUMENT_CREATED = "document_created"
    DOCUMENT_UPLOADED = "document_uploaded"
    VERSION_SAVED = "version_saved"
    SHARE_CREATED = "share_created"
    SHARE_UPDATED = "share_updated"
    SHARE_REVOKED = "share_revoked"
    DOCUMENT_ARCHIVED = "document_archived"
    DOCUMENT_UNARCHIVED = "document_unarchived"
    DOCUMENT_PINNED = "document_pinned"
    DOCUMENT_UNPINNED = "document_unpinned"


class DocumentVersionRead(BaseRead):
    document_id: UUID4 = Field(description="Parent document identifier")
    version_number: int = Field(description="Monotonically incrementing version number")
    name: str | None = Field(None, description="Snapshot title")
    content: str | None = Field(None, description="Version content")
    content_type: ContentType | None = Field(None, description="Content origin type")
    content_format: str | None = Field(
        None, description="Content format: plain_text or tiptap_json"
    )
    source_file: str | None = Field(
        None, description="Relative path to uploaded source file"
    )
    change_summary: str | None = Field(
        None, description="User or system note for this version"
    )


class DocumentVersionCreate(BaseSchema):
    name: str | None = Field(None, description="Snapshot title")
    content: str | None = Field(None, description="Version content")
    content_type: ContentType | None = Field(None, description="Content origin type")
    content_format: ContentFormat = Field(
        ContentFormat.PLAIN_TEXT,
        description="Content format: plain_text or tiptap_json",
    )
    change_summary: str | None = Field(
        None, description="User or system note for this version"
    )


class DocumentRead(BaseRead):
    kind: DocumentKind = Field(description="Document kind discriminator")
    title: str = Field(description="Document title")
    status: DocumentStatus = Field(description="Document lifecycle status")
    is_pinned: bool = Field(
        False, description="Whether this is the active document for its kind"
    )
    head_version: DocumentVersionRead | None = Field(
        None, description="Current head version inline"
    )
    version_count: int = Field(0, description="Total number of versions")
    viewer_role: Optional["DocumentShareRole"] = Field(
        None,
        description="Effective share role for the viewer (null means owner)",
    )
    owner_user_id: UUID4 | None = Field(
        None,
        description="Owner identifier when the document is shared with the viewer",
    )
    owner_full_name: str | None = Field(
        None,
        description="Owner full name when the document is shared with the viewer",
    )
    owner_email: EmailStr | None = Field(
        None,
        description="Owner email when the document is shared with the viewer",
    )
    shared_by_user_id: UUID4 | None = Field(
        None,
        description="User who granted access to the viewer",
    )
    shared_by_full_name: str | None = Field(
        None,
        description="Full name of the user who granted access to the viewer",
    )
    shared_by_email: EmailStr | None = Field(
        None,
        description="Email of the user who granted access to the viewer",
    )
    shared_at: datetime | None = Field(
        None,
        description="Timestamp when the viewer was granted access",
    )
    share_updated_at: datetime | None = Field(
        None,
        description="Timestamp when the share was last updated",
    )


class DocumentDetailRead(DocumentRead):
    versions: list[DocumentVersionRead] = Field(
        default_factory=list, description="Full version history, oldest first"
    )


class DocumentCollaborationBootstrapRead(BaseSchema):
    status: DocumentCollaborationBootstrapStatus = Field(
        description="How the client should proceed with collaborative bootstrap"
    )
    retry_after_ms: int | None = Field(
        None,
        ge=0,
        description="How long the client should wait before retrying bootstrap when another claim is still active",
    )
    content: str | None = Field(
        None,
        description="Authoritative rich-text content to seed when the bootstrap status is seed",
    )
    content_format: ContentFormat | None = Field(
        None,
        description="Content format for the collaborative bootstrap payload when the bootstrap status is seed",
    )


class DocumentCreate(BaseSchema):
    kind: DocumentKind = Field(description="Document kind discriminator")
    title: str = Field(description="Document title")
    status: DocumentStatus = Field(
        DocumentStatus.DRAFT, description="Initial lifecycle status"
    )
    content: str | None = Field(None, description="Initial version content")
    content_type: ContentType | None = Field(
        None, description="Content origin type for the initial version"
    )
    content_format: ContentFormat = Field(
        ContentFormat.PLAIN_TEXT,
        description="Content format: plain_text or tiptap_json",
    )


class DocumentUpdate(BaseSchema):
    title: str | None = Field(None, description="Updated title")
    status: DocumentStatus | None = Field(None, description="Updated lifecycle status")


class DocumentPinRequest(BaseSchema):
    pinned: bool = Field(True, description="Whether to pin or unpin the document")


class ApplicationDocumentAttach(BaseSchema):
    document_id: UUID4 = Field(description="Document to attach")
    version_id: UUID4 | None = Field(
        None,
        description="Specific version to pin for this application (default: head)",
    )


class DocumentGenerateRequest(BaseSchema):
    kind: DocumentKind = Field(description="Document kind to generate")
    lead_id: UUID4 = Field(description="Lead to generate content from")
    document_id: UUID4 | None = Field(
        None,
        description="Existing document to append a new version to (omit to create a new document)",
    )
    template_version_id: UUID4 | None = Field(
        None,
        description="Optional template version to use for generation",
    )


# ---------------------------------------------------------------------------
#  Document sharing schemas
# ---------------------------------------------------------------------------


class DocumentShareRole(str, Enum):
    VIEWER = "viewer"
    EDITOR = "editor"


class DocumentShareCandidateRead(BaseSchema):
    id: UUID4 = Field(description="Share candidate identifier")
    full_name: str = Field(description="Best-available human label for the user")
    email: EmailStr = Field(description="Candidate email address")
    headline: str | None = Field(None, description="Candidate headline")
    avatar_uri: str | None = Field(None, description="Candidate avatar URI")


class DocumentShareCreate(BaseSchema):
    shared_with_user_id: UUID4 = Field(description="User to share the document with")
    role: DocumentShareRole = Field(
        DocumentShareRole.VIEWER, description="Access level to grant"
    )


class DocumentShareRead(BaseRead):
    document_id: UUID4 = Field(description="Document identifier")
    shared_with_user_id: UUID4 = Field(description="User the document is shared with")
    shared_by_user_id: UUID4 = Field(description="User who created the share")
    role: DocumentShareRole = Field(description="Access role: viewer or editor")
    shared_with_full_name: str = Field(
        description="Best-available name for the shared user"
    )
    shared_with_email: EmailStr = Field(description="Email for the shared user")
    shared_with_headline: str | None = Field(
        None,
        description="Headline for the shared user",
    )
    shared_by_full_name: str = Field(
        description="Best-available name for the sharing user"
    )
    shared_by_email: EmailStr = Field(description="Email for the sharing user")


class DocumentShareUpdate(BaseSchema):
    role: DocumentShareRole = Field(description="New access level")


class DocumentActivityRead(BaseRead):
    document_id: UUID4 = Field(description="Document identifier")
    activity_type: DocumentActivityType = Field(description="Activity event type")
    message: str = Field(description="Human-readable activity summary")
    details: dict[str, Any] = Field(
        default_factory=dict,
        description="Structured activity metadata for UI rendering",
    )
    actor_user_id: UUID4 | None = Field(
        None,
        description="User who triggered the activity, when available",
    )
    actor_full_name: str | None = Field(
        None,
        description="Best-available display label for the actor",
    )
    actor_email: EmailStr | None = Field(
        None,
        description="Actor email address",
    )


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
    headline: str | None = Field(None, description="Short professional tagline")
    bio: str | None = Field(None, description="Longer about-me blurb")
    is_discoverable: bool = Field(
        True, description="Whether the user appears in the directory"
    )
    subscription_tier: SubscriptionTier = Field(
        SubscriptionTier.FREE, description="Subscription tier"
    )
    subscription_expires_at: datetime | None = Field(
        None, description="When the current subscription expires"
    )
    placement_status: PlacementStatus = Field(
        PlacementStatus.ACTIVE, description="Job-seeker lifecycle status"
    )
    placement_date: datetime | None = Field(
        None, description="Date when the user transitioned to graduated/alumni"
    )


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


# ---------------------------------------------------------------------------
# MFA (Two-Factor Authentication) schemas
# ---------------------------------------------------------------------------

class MFASetupResponse(BaseSchema):
    """Returned when the user requests MFA setup (before verification)."""

    secret: str = Field(..., description="Base-32 encoded TOTP secret")
    provisioning_uri: str = Field(
        ..., description="otpauth:// URI for import into an authenticator app"
    )


class MFAVerifyRequest(BaseSchema):
    """Payload for verifying a TOTP code (setup confirmation or login)."""

    code: str = Field(
        ..., min_length=6, max_length=6, description="6-digit TOTP code"
    )


class MFAStatusResponse(BaseSchema):
    """Current MFA enrolment status."""

    mfa_enabled: bool = Field(..., description="Whether MFA is currently active")


class MFALoginRequired(BaseSchema):
    """Returned at login when MFA verification is still needed."""

    mfa_required: bool = Field(True, description="Always True")
    mfa_token: str = Field(
        ..., description="Short-lived token to present with the TOTP code"
    )


class MFALoginVerifyRequest(BaseSchema):
    """Payload for the second step of MFA login."""

    mfa_token: str = Field(..., description="MFA challenge token from login response")
    code: str = Field(
        ..., min_length=6, max_length=6, description="6-digit TOTP code"
    )


class PlacementUpdate(BaseSchema):
    model_config = ConfigDict(extra="forbid")

    placement_status: PlacementStatus = Field(
        description="Target placement status (active, graduated, alumni)"
    )


class UserDirectoryRead(BaseSchema):
    user_id: UUID4 = Field(description="User identifier")
    display_name: str = Field(description="Public display name")
    headline: str | None = Field(None, description="Professional tagline")
    avatar_uri: str | None = Field(None, description="Avatar URI")
    city: str | None = Field(None, description="City")
    state: str | None = Field(None, description="State")
    country: str | None = Field(None, description="Country")
    placement_status: PlacementStatus = Field(description="Lifecycle status")
    subscription_tier: SubscriptionTier = Field(description="Subscription tier")
    skills_summary: list[str] = Field(
        default_factory=list, description="Top skill names"
    )


class UserDirectoryPaginatedRead(BaseSchema):
    items: list[UserDirectoryRead] = Field(
        default_factory=list, description="Paginated user directory entries"
    )
    total: int = Field(0, description="Total matching users")
    page: int = Field(1, ge=1, description="Current page number")
    page_size: int = Field(20, ge=1, description="Items per page")


class UserPublicProfileRead(BaseSchema):
    user_id: UUID4 = Field(description="User identifier")
    display_name: str = Field(description="Public display name")
    headline: str | None = Field(None, description="Professional tagline")
    bio: str | None = Field(None, description="About-me blurb")
    avatar_uri: str | None = Field(None, description="Avatar URI")
    city: str | None = Field(None, description="City")
    state: str | None = Field(None, description="State")
    country: str | None = Field(None, description="Country")
    placement_status: PlacementStatus = Field(description="Lifecycle status")
    skills: list[SkillRead] = Field(default_factory=list, description="User skills")
    experiences: list[ExperienceRead] = Field(
        default_factory=list, description="Work experiences"
    )


# ---------------------------------------------------------------------------
#  ActionItem schemas
# ---------------------------------------------------------------------------


class ActionItemKind(str, Enum):
    FOLLOW_UP = "follow_up"
    PREPARE_DOCUMENT = "prepare_document"
    SEND_MESSAGE = "send_message"
    REVIEW_LEAD = "review_lead"
    SCHEDULE_INTERVIEW = "schedule_interview"
    CUSTOM = "custom"


class ActionItemStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DISMISSED = "dismissed"


class ActionItemPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class ActionItemCreate(BaseSchema):
    title: str
    description: str | None = None
    kind: ActionItemKind
    status: ActionItemStatus = ActionItemStatus.PENDING
    priority: ActionItemPriority = ActionItemPriority.MEDIUM
    due_at: datetime | None = None
    sort_order: int = 0
    application_id: UUID4 | None = None
    lead_id: UUID4 | None = None
    document_id: UUID4 | None = None
    conversation_id: UUID4 | None = None


class ActionItemUpdate(BaseSchema):
    title: str | None = None
    description: str | None = None
    kind: ActionItemKind | None = None
    status: ActionItemStatus | None = None
    priority: ActionItemPriority | None = None
    due_at: datetime | None = None
    sort_order: int | None = None
    application_id: UUID4 | None = None
    lead_id: UUID4 | None = None
    document_id: UUID4 | None = None
    conversation_id: UUID4 | None = None


class ActionItemRead(BaseRead):
    user_id: UUID4
    title: str
    description: str | None = None
    kind: ActionItemKind
    status: ActionItemStatus
    priority: ActionItemPriority
    due_at: datetime | None = None
    completed_at: datetime | None = None
    sort_order: int = 0
    application_id: UUID4 | None = None
    lead_id: UUID4 | None = None
    document_id: UUID4 | None = None
    conversation_id: UUID4 | None = None


class ActionItemReorder(BaseSchema):
    item_ids: list[UUID4]


class ActionItemDetailRead(ActionItemRead):
    application: "ApplicationRead | None" = None
    lead: "LeadRead | None" = None
    document: "DocumentRead | None" = None
    conversation: "ConversationRead | None" = None


# ---------------------------------------------------------------------------
#  Activity feed & Command Center summary schemas
# ---------------------------------------------------------------------------


class ActivityFeedItem(BaseSchema):
    type: str
    entity_type: str
    entity_id: UUID4
    title: str
    detail: str | None = None
    timestamp: datetime
    metadata: dict | None = None


class ActivityFeedRead(BaseSchema):
    items: list[ActivityFeedItem]
    total: int
    page: int
    page_size: int


class CommandCenterSummary(BaseSchema):
    lead_count: int
    unapplied_lead_count: int
    application_count: int
    active_application_count: int
    status_breakdown: dict[str, int]
    pending_action_items: int
    overdue_action_items: int
    action_items_due_today: int
    pending_connections: int
    unread_messages: int
    profile_completion: int
    documents_count: int
    draft_documents_count: int


# ---------------------------------------------------------------------------
# Connection schemas
# ---------------------------------------------------------------------------


class ConnectionCreate(BaseSchema):
    model_config = ConfigDict(extra="forbid")

    addressee_id: UUID4 = Field(description="User to send the connection request to")
    message: str | None = Field(
        None, description="Optional note accompanying the request"
    )


class ConnectionUserSummaryRead(BaseSchema):
    user_id: UUID4 = Field(description="User identifier")
    display_name: str = Field(description="Public display name")
    headline: str | None = Field(None, description="Professional tagline")
    avatar_uri: str | None = Field(None, description="Avatar URI")
    city: str | None = Field(None, description="City")
    state: str | None = Field(None, description="State")
    country: str | None = Field(None, description="Country")


class ConnectionRead(BaseRead):
    requester: ConnectionUserSummaryRead = Field(
        description="The user who sent the request"
    )
    addressee: ConnectionUserSummaryRead = Field(
        description="The user who received the request"
    )
    status: ConnectionStatus = Field(description="Connection status")
    message: str | None = Field(None, description="Optional note from the requester")


class ConnectionsPaginatedRead(BaseSchema):
    items: list[ConnectionRead] = Field(
        default_factory=list, description="Paginated connection records"
    )
    total: int = Field(0, description="Total matching connections")
    page: int = Field(1, ge=1, description="Current page number")
    page_size: int = Field(20, ge=1, description="Items per page")


# ---------------------------------------------------------------------------
# Messaging schemas
# ---------------------------------------------------------------------------


class ConversationType(str, Enum):
    DIRECT = "direct"
    GROUP = "group"


class ConversationParticipantRole(str, Enum):
    MEMBER = "member"
    ADMIN = "admin"


class ConversationCreate(BaseSchema):
    model_config = ConfigDict(extra="forbid")

    participant_user_ids: list[UUID4] = Field(
        description="User IDs of the other participants (creator is auto-added)"
    )
    type: ConversationType = Field(
        ConversationType.DIRECT, description="Conversation type"
    )
    title: str | None = Field(None, description="Title (required for group)")

    @model_validator(mode="after")
    def validate_participants(self) -> "ConversationCreate":
        if self.type == ConversationType.DIRECT:
            if len(self.participant_user_ids) != 1:
                raise ValueError(
                    "Direct conversations must have exactly 1 other participant"
                )
        else:
            if len(self.participant_user_ids) < 2:
                raise ValueError(
                    "Group conversations require at least 2 other participants"
                )
            if not self.title or not self.title.strip():
                raise ValueError("Group conversations require a title")
        return self


class MessageCreate(BaseSchema):
    model_config = ConfigDict(extra="forbid")

    content: str = Field(
        ..., min_length=1, max_length=5000, description="Message content"
    )
    parent_message_id: UUID4 | None = Field(
        None, description="Parent message ID for threaded replies"
    )


class MessageEdit(BaseSchema):
    model_config = ConfigDict(extra="forbid")

    content: str = Field(
        ..., min_length=1, max_length=5000, description="Updated message content"
    )


class MessageAuthorRead(BaseSchema):
    user_id: UUID4 = Field(description="Author user identifier")
    display_name: str = Field(description="Author display name")
    avatar_uri: str | None = Field(None, description="Author avatar URI")


class MessageRead(BaseRead):
    author: MessageAuthorRead = Field(description="Message author")
    content: str = Field(description="Message content")
    edited_at: datetime | None = Field(
        None, description="When the message was last edited"
    )
    parent_message_id: UUID4 | None = Field(
        None, description="Parent message ID for threaded replies"
    )


class ConversationParticipantRead(BaseSchema):
    user_id: UUID4 = Field(description="Participant user identifier")
    display_name: str = Field(description="Participant display name")
    avatar_uri: str | None = Field(None, description="Participant avatar URI")
    role: ConversationParticipantRole = Field(description="Participant role")
    joined_at: datetime = Field(description="When the participant joined")


class ConversationRead(BaseRead):
    type: ConversationType = Field(description="Conversation type")
    title: str | None = Field(None, description="Conversation title")
    participants: list[ConversationParticipantRead] = Field(
        default_factory=list, description="Conversation participants"
    )
    last_message: MessageRead | None = Field(
        None, description="Most recent message preview"
    )
    unread_count: int = Field(0, description="Unread messages for current user")


class ConversationDetailRead(BaseRead):
    type: ConversationType = Field(description="Conversation type")
    title: str | None = Field(None, description="Conversation title")
    participants: list[ConversationParticipantRead] = Field(
        default_factory=list, description="Conversation participants"
    )
    messages: list[MessageRead] = Field(
        default_factory=list, description="Paginated messages"
    )
    total_messages: int = Field(0, description="Total message count")


class ConversationsPaginatedRead(BaseSchema):
    items: list[ConversationRead] = Field(
        default_factory=list, description="Paginated conversations"
    )
    total: int = Field(0, description="Total matching conversations")
    page: int = Field(1, ge=1, description="Current page number")
    page_size: int = Field(20, ge=1, description="Items per page")


class UnreadCountRead(BaseSchema):
    total_unread: int = Field(description="Total unread messages across conversations")


class ProfileExtractSource(BaseSchema):
    """A single extraction source — exactly one of url, file, or text."""

    url: AnyHttpUrl | None = Field(None, description="URL to extract from")
    file: UploadFile | None = Field(None, description="File to extract from")
    text: str | None = Field(None, description="Raw text to extract from")

    @field_validator("url")
    @classmethod
    def validate_fetch_url(cls, value: AnyHttpUrl | None) -> AnyHttpUrl | None:
        if value is None:
            return value

        validate_url_safe_for_fetch(str(value))
        return value


class ProfileExtractResponse(BaseSchema):
    """Response from the unified profile extraction endpoint."""

    user: dict = Field(
        default_factory=dict,
        description="Extracted core user fields (first_name, last_name, etc.)",
    )
    skills: list[SkillRead] = Field([], description="Extracted and persisted skills")
    experiences: list[ExperienceRead] = Field(
        [], description="Extracted and persisted experiences"
    )
    education: list[EducationRead] = Field(
        [], description="Extracted and persisted education records"
    )
    certificates: list[CertificateRead] = Field(
        [], description="Extracted and persisted certificates"
    )
    content_too_long: bool = Field(
        False, description="True if any source exceeded extraction limits"
    )
    sources_count: int = Field(1, description="Number of sources that were processed")


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
    requires_approval: bool = Field(
        False, description="Whether extraction results require human approval"
    )

    @field_validator("json_schema", mode="before")
    @classmethod
    def validate_schema(cls, v: Any) -> dict[str, Any] | None:
        """Validate the schema."""
        if isinstance(v, str):
            v = json.loads(v)
        if v:
            utils.validate_json_schema(v)
        return v


class ExtractorRead(BaseRead, BaseExtractor):
    pass


class ExtractorVersionRead(BaseRead):
    extractor_id: UUID4 = Field(description="Parent extractor ID")
    version_number: int = Field(description="Version sequence number")
    instruction: str | None = Field(None, description="Instruction at this version")
    json_schema: dict | None = Field(None, description="JSON schema at this version")
    version_hash: str = Field(description="SHA-256 hash of instruction + schema")


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
    sources: list[ProfileExtractSource] | None = Field(
        None,
        description="Multiple sources to extract from in a single batch. When provided, url/file/text are ignored.",
    )

    @field_validator("url")
    @classmethod
    def validate_fetch_url(cls, value: AnyHttpUrl | None) -> AnyHttpUrl | None:
        if value is None:
            return value

        validate_url_safe_for_fetch(str(value))
        return value


class ApplicationRead(BaseRead):
    lead_id: UUID4
    user_id: UUID4
    lead: LeadRead
    user: UserRead
    status: str | None = Field(None, description="Application status")
    notes: str | None = Field(None, description="Free-form user notes")
    next_step: str | None = Field(None, description="Next action for this application")
    next_step_due: datetime | None = Field(
        None, description="When the next step is due"
    )
    status_history: list[dict] | None = Field(
        default=[], description="Append-only log of status transitions"
    )


class ApplicationCreate(BaseSchema):
    lead_id: UUID4
    status: str
    notes: str | None = None
    next_step: str | None = None
    next_step_due: datetime | None = None
    document_ids: list[UUID4] | None = None


class ApplicationUpdate(BaseSchema):
    status: str | None = None
    notes: str | None = None
    next_step: str | None = None
    next_step_due: datetime | None = None


class ApplicationResumeAttach(BaseSchema):
    resume_id: UUID4


class ApplicationCoverLetterAttach(BaseSchema):
    cover_letter_id: UUID4


ActionItemDetailRead.model_rebuild()


# Crawler schemas


class CrawlerSourceType(str, Enum):
    LINKEDIN = "linkedin"
    GLASSDOOR = "glassdoor"


class CrawlerTriggerType(str, Enum):
    MANUAL = "manual"
    SCHEDULED = "scheduled"


class CrawlerRunStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"
    PENDING_REVIEW = "pending_review"


class ReviewStatus(str, Enum):
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class CrawlerPipelineCreate(BaseSchema):
    name: str = Field(description="Pipeline name")
    description: str | None = Field(None, description="Pipeline description")
    source: CrawlerSourceType = Field(description="Crawl source platform")
    query_definition: dict = Field(description="Source-specific search parameters")
    schedule_definition: dict | None = Field(
        None, description="Schedule cadence definition"
    )
    enabled: bool = Field(True, description="Whether the pipeline is active")
    execution_policy: dict | None = Field(
        None, description="Concurrency, timeouts, headless mode"
    )
    extraction_policy: dict | None = Field(
        None, description="Whether to run LLM extraction on crawled leads"
    )
    requires_approval: bool = Field(
        False, description="Whether runs require human approval"
    )


class CrawlerPipelineUpdate(BaseSchema):
    name: str | None = Field(None, description="Pipeline name")
    description: str | None = Field(None, description="Pipeline description")
    query_definition: dict | None = Field(
        None, description="Source-specific search parameters"
    )
    schedule_definition: dict | None = Field(
        None, description="Schedule cadence definition"
    )
    enabled: bool | None = Field(None, description="Whether the pipeline is active")
    execution_policy: dict | None = Field(
        None, description="Concurrency, timeouts, headless mode"
    )
    extraction_policy: dict | None = Field(
        None, description="Whether to run LLM extraction on crawled leads"
    )
    requires_approval: bool | None = Field(
        None, description="Whether runs require human approval"
    )


class CrawlerPipelineRead(BaseRead):
    name: str = Field(description="Pipeline name")
    description: str | None = Field(None, description="Pipeline description")
    source: CrawlerSourceType = Field(description="Crawl source platform")
    query_definition: dict = Field(description="Source-specific search parameters")
    schedule_definition: dict | None = Field(
        None, description="Schedule cadence definition"
    )
    enabled: bool = Field(description="Whether the pipeline is active")
    execution_policy: dict | None = Field(
        None, description="Concurrency, timeouts, headless mode"
    )
    extraction_policy: dict | None = Field(
        None, description="Whether to run LLM extraction on crawled leads"
    )
    requires_approval: bool = Field(
        False, description="Whether runs require human approval"
    )
    created_by_user_id: UUID4 = Field(description="Superuser who created the pipeline")
    last_run_status: CrawlerRunStatus | None = Field(
        None, description="Status of the most recent run"
    )
    last_run_at: datetime | None = Field(
        None, description="Timestamp of the most recent run"
    )
    run_count: int = Field(0, description="Total number of runs")

    @model_validator(mode="before")
    @classmethod
    def compute_run_summary(cls, data: Any) -> Any:
        runs = None
        if hasattr(data, "runs"):
            runs = data.runs
        elif isinstance(data, dict):
            runs = data.get("runs")
        if runs:
            run_count = len(runs)
            latest = max(
                runs,
                key=lambda r: getattr(
                    r,
                    "created_at",
                    r.get("created_at") if isinstance(r, dict) else datetime.min,
                ),
            )
            if hasattr(latest, "status"):
                last_status = latest.status
                last_at = latest.created_at
            else:
                last_status = latest.get("status")
                last_at = latest.get("created_at")
            if isinstance(data, dict):
                data["run_count"] = run_count
                data["last_run_status"] = last_status
                data["last_run_at"] = last_at
            else:
                # ORM object — set via returned dict
                pass
        return data


class CrawlerRunRead(BaseRead):
    crawler_pipeline_id: UUID4 = Field(description="Parent pipeline ID")
    trigger_type: CrawlerTriggerType = Field(description="How the run was triggered")
    status: CrawlerRunStatus = Field(description="Current run status")
    scheduled_for: datetime | None = Field(
        None, description="When the run was scheduled for"
    )
    started_at: datetime | None = Field(None, description="When the run started")
    finished_at: datetime | None = Field(None, description="When the run finished")
    stats: dict | None = Field(None, description="Run statistics")
    error_summary: str | None = Field(None, description="Error summary if failed")
    retry_of_id: UUID4 | None = Field(
        None, description="ID of the original run this is a retry of"
    )


class CrawlerRunCreate(BaseSchema):
    """Internal schema — not user-facing."""

    crawler_pipeline_id: UUID4
    trigger_type: CrawlerTriggerType = Field(
        CrawlerTriggerType.MANUAL, description="Trigger type"
    )
    status: CrawlerRunStatus = Field(
        CrawlerRunStatus.PENDING, description="Initial status"
    )
    scheduled_for: datetime | None = Field(None, description="Scheduled time")


class OrchestrationEventSummary(BaseSchema):
    """Lightweight summary of an OrchestrationEvent for embedding in CrawlerRunDetailRead."""

    status: str | None = Field(None, description="Event status")
    message: str | None = Field(None, description="Event message")
    created_at: datetime = Field(description="When the event was created")


class CrawlerRunDetailRead(CrawlerRunRead):
    """Extended read schema for single-run detail endpoint with linked events."""

    events: list[OrchestrationEventSummary] = Field(
        [], description="Linked orchestration events"
    )


# ---------------------------------------------------------------------------
#  Human review queue schemas
# ---------------------------------------------------------------------------


class ReviewItemType(str, Enum):
    CRAWLER_RUN = "crawler_run"
    EXTRACTION_EVENT = "extraction_event"
    LEAD = "lead"


class ReviewItemRead(BaseSchema):
    item_type: ReviewItemType = Field(description="Type of review item")
    item_id: UUID4 = Field(description="ID of the item")
    created_at: datetime = Field(description="When the item was created")
    summary: str | None = Field(None, description="Brief summary of the item")
    detail: dict | None = Field(None, description="Additional context")


class ReviewAction(str, Enum):
    APPROVE = "approve"
    REJECT = "reject"


class ReviewBatchItem(BaseSchema):
    item_type: ReviewItemType = Field(description="Type of review item")
    item_id: UUID4 = Field(description="Item ID")
    action: ReviewAction = Field(description="approve or reject")


class ReviewBatchRequest(BaseSchema):
    items: list[ReviewBatchItem] = Field(description="Batch of review actions")


class ReviewBatchResponse(BaseSchema):
    processed: int = Field(description="Number of items processed")
    errors: list[str] = Field([], description="Errors encountered")
