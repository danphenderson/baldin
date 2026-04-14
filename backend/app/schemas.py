# Path: app/schemas.py
import json
from datetime import datetime
from enum import Enum
from typing import Any, Generic, Literal, Optional, TypeVar

from fastapi import UploadFile
from fastapi_users import schemas
from pydantic import (
    UUID4,
    AnyHttpUrl,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)
from pydantic import BaseModel as _BaseModel

from app import utils
from app.core.url_safety import validate_url_safe_for_fetch
from app.models import (
    ApplicationOutcome,
    ApplicationStage,
    CrawlerRunStatus,
    LeadReviewStatus,
)


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


PAGINATION_MAX_PAGE_SIZE = 100
MATCH_ASPIRATIONS_MAX_LEADS = 20


class Pagination(BaseSchema):
    page: int = Field(1, ge=1, description="The page number")
    page_size: int = Field(
        10,
        ge=1,
        le=PAGINATION_MAX_PAGE_SIZE,
        description="The number of items per page",
    )
    request_count: bool = Field(False, description="Request a query for total count")


_T = TypeVar("_T")


class PaginatedResponse(BaseSchema, Generic[_T]):
    items: list[_T] = Field(default_factory=list, description="Paginated items")
    total: int = Field(0, description="Total number of matching records")
    page: int = Field(1, ge=1, description="Current page number")
    page_size: int = Field(20, ge=1, description="Items per page")


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


OrchestrationEventPaginatedRead = PaginatedResponse[OrchestrationEventRead]


class SeedOperationAccepted(BaseSchema):
    event_id: UUID4 = Field(description="Accepted orchestration event ID")
    pipeline_id: UUID4 = Field(description="Seed orchestration pipeline ID")
    status: OrchestrationEventStatusType = Field(
        description="Current orchestration event status"
    )
    poll_url: str = Field(description="Relative URL to poll for event status")


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
    subskills: list[str] | None = Field(None, description="Sub-Skills")

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
    projects: list[str] | None = Field(None, description="Projects involved")

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def parse_date(cls, value: Any) -> Any:
        if isinstance(value, str):
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return value


class ExperienceRead(BaseExperience, BaseRead):
    pass


class ExperienceCreate(BaseExperience):
    @field_validator("projects", mode="before")
    @classmethod
    def parse_projects(cls, value: Any) -> Any:
        if not value:
            return value
        if isinstance(value, str):
            return [v.strip() for v in value.split(",") if v.strip()]
        return value


class ExperienceUpdate(BaseExperience):
    pass


class BaseEducation(BaseSchema):
    university: str | None = Field(None, description="University name")
    degree: str | None = Field(None, description="Degree name")
    grade_point: str | None = Field(None, description="Grade point")
    activities: list[str] | None = Field(None, description="Activities involved")
    achievements: list[str] | None = Field(None, description="Achievements")
    start_date: datetime | None = Field(None, description="Start date of the education")
    end_date: datetime | None = Field(None, description="End date of the education")

    @field_validator("start_date", "end_date", mode="before")
    @classmethod
    def parse_date(cls, value: Any) -> Any:
        if isinstance(value, str):
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return value


class EducationRead(BaseEducation, BaseRead):
    pass


class EducationCreate(BaseEducation):
    @field_validator("achievements", "activities", mode="before")
    @classmethod
    def parse_list_fields(cls, value: Any) -> Any:
        if not value:
            return value
        if isinstance(value, str):
            return [v.strip() for v in value.split(",") if v.strip()]
        return value


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
        return value


class CertificateRead(BaseCertificate, BaseRead):
    pass


class CertificateCreate(BaseCertificate):
    pass


class CertificateUpdate(BaseCertificate):
    pass


def _normalize_aspiration_label(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise ValueError("Label cannot be blank")
    return normalized


def _normalize_optional_aspiration_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


class AspirationKind(str, Enum):
    ROLE = "role"
    COMPANY = "company"


class BaseAspiration(BaseSchema):
    kind: AspirationKind
    label: str
    reason: str | None = None
    notes: str | None = None
    priority: int = 0
    extracted_attributes: dict[str, Any] | None = None

    @field_validator("label")
    @classmethod
    def normalize_label(cls, value: str) -> str:
        return _normalize_aspiration_label(value)

    @field_validator("reason", "notes")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        return _normalize_optional_aspiration_text(value)


class AspirationCreate(BaseAspiration):
    pass


class AspirationUpdate(BaseSchema):
    kind: AspirationKind | None = None
    label: str | None = None
    reason: str | None = None
    notes: str | None = None
    priority: int | None = None
    extracted_attributes: dict[str, Any] | None = None

    @field_validator("label")
    @classmethod
    def normalize_optional_label(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _normalize_aspiration_label(value)

    @field_validator("reason", "notes")
    @classmethod
    def normalize_update_optional_text(cls, value: str | None) -> str | None:
        return _normalize_optional_aspiration_text(value)

    @model_validator(mode="after")
    def validate_non_nullable_updates(self) -> "AspirationUpdate":
        if "kind" in self.model_fields_set and self.kind is None:
            raise ValueError("kind cannot be null")
        if "label" in self.model_fields_set and self.label is None:
            raise ValueError("label cannot be null")
        if "priority" in self.model_fields_set and self.priority is None:
            raise ValueError("priority cannot be null")
        return self


class AspirationSummaryRead(BaseRead):
    kind: AspirationKind
    label: str
    reason: str | None = None
    notes: str | None = None
    priority: int = 0


class AspirationRead(AspirationSummaryRead):
    extracted_attributes: dict[str, Any] | None = None


class AspirationSuggestionDraft(BaseAspiration):
    pass


class AspirationSuggestResponse(BaseSchema):
    suggestions: list[AspirationSuggestionDraft] = Field(
        default_factory=list,
        description="Non-persisted aspiration drafts suggested from the user's profile",
    )


class AspirationMatchInput(BaseAspiration):
    client_key: str | None = Field(
        None,
        description="Caller-supplied correlation key for unsaved aspirations",
    )

    @field_validator("client_key")
    @classmethod
    def normalize_client_key(cls, value: str | None) -> str | None:
        return _normalize_optional_aspiration_text(value)


class AspirationLeadMatch(BaseSchema):
    lead_id: UUID4 = Field(description="Lead identifier")
    match_score: int = Field(..., ge=1, le=10, description="Aspiration match score")
    explanation: str = Field(
        ...,
        min_length=20,
        max_length=400,
        description="Why the lead matches this aspiration",
    )


class AspirationMatchResult(AspirationMatchInput):
    lead_matches: list[AspirationLeadMatch] = Field(
        default_factory=list,
        description="Lead matches for this aspiration",
    )
    total: int = Field(0, ge=0, description="Total lead matches before pagination")
    page: int = Field(1, ge=1, description="Current page for this aspiration result")
    page_size: int = Field(1, ge=1, description="Page size for this aspiration result")


class AspirationMatchResponse(BaseSchema):
    results: list[AspirationMatchResult] = Field(
        default_factory=list,
        description="Per-aspiration lead matching results",
    )


class BaseCompany(BaseSchema):
    name: str | None = Field(None, description="Company name")
    industry: str | None = Field(None, description="Industry of the company")
    size: str | None = Field(None, description="Size of the company")
    location: str | None = Field(None, description="Location of the company")
    description: str | None = Field(None, description="Description of the company")


class CompanyRead(BaseCompany, BaseRead):
    creator_user_id: UUID4 | None = Field(
        None,
        description="User who created this company record, if known",
    )
    can_manage: bool = Field(
        False,
        description="Whether the current user can edit or delete this company",
    )


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


class LeadSummaryRead(BaseRead, BaseLeadShared):
    url: str = Field(description="Job posting URL")
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


class LeadRead(LeadSummaryRead):
    canonical_url: str = Field(description="Canonical lead URL used for deduplication")


class LeadDetailRead(LeadRead):
    viewer_registration: LeadRegistrationRead | None = Field(
        None, description="The current viewer's lead registration, if present"
    )
    participant_summaries: list[LeadParticipantSummaryRead] = Field(
        default_factory=list,
        description="Registered participants who opted to expose their profile",
    )


LeadsPaginatedRead = PaginatedResponse[LeadSummaryRead]


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


# ---------------------------------------------------------------------------
#  Unified Document schemas (versioned, multi-kind)
# ---------------------------------------------------------------------------


class DocumentKind(str, Enum):
    RESUME = "resume"
    COVER_LETTER = "cover_letter"
    FOLLOW_UP = "follow_up"
    REFERENCE_SHEET = "reference_sheet"
    FREEFORM = "freeform"
    CELL_DOC = "cell_doc"


class DocumentStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class DocumentActivityType(str, Enum):
    DOCUMENT_CREATED = "document_created"
    DOCUMENT_UPLOADED = "document_uploaded"
    VERSION_SAVED = "version_saved"
    AGENT_TASK_REQUESTED = "agent_task_requested"
    AGENT_TASK_APPLIED = "agent_task_applied"
    AGENT_TASK_FAILED = "agent_task_failed"
    AGENT_TASK_DISMISSED = "agent_task_dismissed"
    SHARE_CREATED = "share_created"
    SHARE_UPDATED = "share_updated"
    SHARE_REVOKED = "share_revoked"
    DOCUMENT_ARCHIVED = "document_archived"
    DOCUMENT_UNARCHIVED = "document_unarchived"
    DOCUMENT_PINNED = "document_pinned"
    DOCUMENT_UNPINNED = "document_unpinned"
    BLOCK_CREATED = "block_created"
    BLOCK_UPDATED = "block_updated"
    BLOCK_DELETED = "block_deleted"
    BLOCK_REORDERED = "block_reordered"
    BLOCK_TYPE_CHANGED = "block_type_changed"


class DocumentBlockType(str, Enum):
    PARAGRAPH = "paragraph"
    HEADING = "heading"
    BULLET_LIST = "bullet_list"
    ORDERED_LIST = "ordered_list"
    LIST_ITEM = "list_item"
    TASK_LIST = "task_list"
    TASK_ITEM = "task_item"
    BLOCKQUOTE = "blockquote"
    CODE_BLOCK = "code_block"
    CALLOUT = "callout"
    TOGGLE = "toggle"
    TABLE = "table"
    TABLE_ROW = "table_row"
    TABLE_CELL = "table_cell"
    DIVIDER = "divider"
    MENTION = "mention"
    EMBED = "embed"


class DocumentReferenceKind(str, Enum):
    MENTION = "mention"
    EMBED = "embed"


class DocumentReferenceTargetKind(str, Enum):
    USER = "user"
    DOCUMENT = "document"
    AGENT = "agent"


class DocumentEmbedCandidateKind(str, Enum):
    DOCUMENT = "document"
    BLOCK = "block"


class DocumentReferenceResolveStatus(str, Enum):
    RESOLVED = "resolved"
    UNAVAILABLE = "unavailable"
    INVALID = "invalid"


class DocumentBlockSnapshotRead(BaseSchema):
    id: UUID4 = Field(description="Stable block identifier captured in the version")
    block_type: DocumentBlockType = Field(description="Stable block kind")
    content: Any | None = Field(None, description="Block content payload")
    properties: dict[str, Any] = Field(
        default_factory=dict,
        description="Extensible block properties payload",
    )
    position: int = Field(description="Zero-based sibling position")
    children: list["DocumentBlockSnapshotRead"] = Field(
        default_factory=list,
        description="Nested child blocks ordered by position",
    )


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


class DocumentVersionDetailRead(DocumentVersionRead):
    block_snapshot: list[DocumentBlockSnapshotRead] | None = Field(
        None,
        description="Recursive block snapshot for cell-doc versions",
    )


class DocumentVersionSummaryRead(BaseSchema):
    id: UUID4 = Field(description="Current head version identifier")
    content: str | None = Field(None, description="Current version content")
    content_type: ContentType | None = Field(None, description="Content origin type")
    content_format: str | None = Field(
        None, description="Content format: plain_text or tiptap_json"
    )
    source_file: str | None = Field(
        None, description="Relative path to uploaded source file"
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
    restore_version_id: UUID4 | None = Field(
        None,
        description="Optional source version to restore block state from for cell-doc saves",
    )


class DocumentSummaryRead(BaseRead):
    kind: DocumentKind = Field(description="Document kind discriminator")
    title: str = Field(description="Document title")
    status: DocumentStatus = Field(description="Document lifecycle status")
    is_pinned: bool = Field(
        False, description="Whether this is the active document for its kind"
    )
    head_version: DocumentVersionSummaryRead | None = Field(
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


class DocumentRead(DocumentSummaryRead):
    head_version: DocumentVersionRead | None = Field(
        None, description="Current head version inline"
    )


class DocumentDetailRead(DocumentRead):
    versions: list[DocumentVersionDetailRead] = Field(
        default_factory=list, description="Full version history, oldest first"
    )


class DocumentCollaborationBootstrapRead(BaseSchema):
    status: DocumentCollaborationBootstrapStatus = Field(
        description="How the client should proceed with collaborative bootstrap"
    )
    collaboration_token: str | None = Field(
        None,
        description="Short-lived collaboration session token used for the follow-up WebSocket connection",
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


class DocumentBlockRead(BaseRead):
    document_id: UUID4 = Field(description="Parent document identifier")
    parent_block_id: UUID4 | None = Field(
        None, description="Parent block identifier for nested blocks"
    )
    block_type: DocumentBlockType = Field(description="Stable block kind")
    content: Any | None = Field(None, description="Block content payload")
    properties: dict[str, Any] = Field(
        default_factory=dict,
        description="Extensible block properties payload",
    )
    position: int = Field(description="Zero-based sibling position")
    children: list["DocumentBlockRead"] = Field(
        default_factory=list,
        description="Nested child blocks ordered by position",
    )


class DocumentBlockCreate(BaseSchema):
    parent_block_id: UUID4 | None = Field(
        None, description="Optional parent block for nested insertion"
    )
    block_type: DocumentBlockType = Field(description="Block kind to create")
    content: Any | None = Field(None, description="Block content payload")
    properties: dict[str, Any] = Field(
        default_factory=dict,
        description="Extensible block properties payload",
    )
    position: int | None = Field(
        None,
        ge=0,
        description="Optional zero-based sibling position; omit to append",
    )


class DocumentBlockUpdate(BaseSchema):
    block_type: DocumentBlockType | None = Field(None, description="Updated block kind")
    content: Any = Field(default=None, description="Updated block content payload")
    properties: dict[str, Any] | None = Field(
        None,
        description="Replacement block properties payload; null resets to {}",
    )


class DocumentBlockReorderItem(BaseSchema):
    block_id: UUID4 = Field(description="Block to reposition")
    parent_block_id: UUID4 | None = Field(
        None,
        description="New parent block identifier; null moves the block to the root",
    )
    position: int = Field(description="Zero-based sibling position", ge=0)


class DocumentBlockReorderRequest(BaseSchema):
    items: list[DocumentBlockReorderItem] = Field(
        min_length=1,
        description="Batch of block moves to apply atomically",
    )


class DocumentBlockSyncRequest(BaseSchema):
    tiptap_json: dict[str, Any] = Field(
        description="TipTap document JSON to sync into document_blocks rows"
    )
    preserve_ids: bool = Field(
        True,
        description="Reuse existing block UUIDs for matching block paths when possible",
    )


class DocumentMentionCandidateRead(BaseSchema):
    target_kind: DocumentReferenceTargetKind = Field(
        description="Reference target type"
    )
    target_id: UUID4 = Field(description="Referenced entity identifier")
    label: str = Field(description="Human-friendly target label")
    subtitle: str | None = Field(
        None,
        description="Optional secondary line shown in mention pickers",
    )
    href: str | None = Field(
        None,
        description="Canonical frontend route for the resolved target",
    )


class DocumentEmbedCandidateRead(BaseSchema):
    candidate_kind: DocumentEmbedCandidateKind = Field(
        description="Whether this candidate represents a source document or source block"
    )
    document_id: UUID4 = Field(description="Source cell-doc identifier")
    document_title: str = Field(description="Source document title")
    block_id: UUID4 | None = Field(
        None,
        description="Source block identifier when the candidate is a block",
    )
    source_version_id: UUID4 | None = Field(
        None,
        description="Current saved head version for the source document",
    )
    label: str = Field(description="Human-friendly label for the candidate")
    preview_text: str | None = Field(
        None,
        description="Saved or computed preview text for the candidate",
    )


class DocumentReferenceResolveItem(BaseSchema):
    kind: DocumentReferenceKind = Field(description="Reference type to resolve")
    block_id: UUID4 | None = Field(
        None,
        description="Owning block identifier when the caller is resolving a live editor node",
    )
    target_kind: DocumentReferenceTargetKind | None = Field(
        None,
        description="Mention target type when resolving a mention block",
    )
    target_id: UUID4 | None = Field(
        None,
        description="Mention target identifier when resolving a mention block",
    )
    source_document_id: UUID4 | None = Field(
        None,
        description="Source document identifier when resolving an embed block",
    )
    source_block_id: UUID4 | None = Field(
        None,
        description="Source block identifier when resolving an embed block",
    )
    saved_label: str | None = Field(
        None,
        description="Saved label snapshot stored on the referencing block",
    )
    saved_preview_text: str | None = Field(
        None,
        description="Saved preview-text snapshot stored on the referencing block",
    )


class DocumentReferenceResolveRequest(BaseSchema):
    references: list[DocumentReferenceResolveItem] = Field(
        min_length=1,
        description="Reference blocks to resolve in a single request",
    )


class DocumentReferenceResolvedRead(BaseSchema):
    kind: DocumentReferenceKind = Field(description="Resolved reference type")
    status: DocumentReferenceResolveStatus = Field(
        description="Resolution status for the reference"
    )
    block_id: UUID4 | None = Field(
        None,
        description="Owning block identifier when provided by the caller",
    )
    label: str | None = Field(
        None,
        description="Best-available current label for the reference",
    )
    subtitle: str | None = Field(
        None,
        description="Optional secondary descriptive line for the reference",
    )
    href: str | None = Field(
        None,
        description="Frontend route for the current reference target when accessible",
    )
    preview_text: str | None = Field(
        None,
        description="Current or saved preview text for embed references",
    )
    target_kind: DocumentReferenceTargetKind | None = Field(
        None,
        description="Mention target type when applicable",
    )
    target_id: UUID4 | None = Field(
        None,
        description="Mention target identifier when applicable",
    )
    source_document_id: UUID4 | None = Field(
        None,
        description="Source document identifier for embed references",
    )
    source_block_id: UUID4 | None = Field(
        None,
        description="Source block identifier for embed references",
    )
    source_version_id: UUID4 | None = Field(
        None,
        description="Current saved head version for the source document when resolved",
    )
    unavailable_reason: str | None = Field(
        None,
        description="Reason the live reference could not be resolved",
    )


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
    block_id: UUID4 | None = Field(
        None,
        description="Associated block identifier when the activity targets a block",
    )
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


DocumentBlockSnapshotRead.model_rebuild()
DocumentBlockRead.model_rebuild()


# ---------------------------------------------------------------------------
#  Document embedding & semantic search schemas
# ---------------------------------------------------------------------------


class DocumentEmbeddingRead(BaseRead):
    document_id: UUID4 = Field(description="Owning document identifier")
    document_version_id: UUID4 = Field(description="Version that was embedded")
    chunk_index: int = Field(description="Chunk position within the document")
    chunk_text: str = Field(description="The text content of this chunk")


class DocumentSearchRequest(BaseSchema):
    query: str = Field(
        ..., min_length=1, max_length=1000, description="Natural-language search query"
    )
    k: int = Field(5, ge=1, le=50, description="Number of results to return")


class DocumentSearchResult(BaseSchema):
    id: UUID4 = Field(description="Embedding row identifier")
    document_id: UUID4 = Field(description="Source document identifier")
    document_version_id: UUID4 = Field(description="Version that was embedded")
    chunk_index: int = Field(description="Chunk position within the document")
    chunk_text: str = Field(description="Matching text chunk")
    score: float = Field(description="Cosine similarity score (0-1, higher is better)")


class DocumentSearchResponse(BaseSchema):
    query: str = Field(description="Original search query")
    results: list[DocumentSearchResult] = Field(
        default_factory=list, description="Ranked search results"
    )


class DocumentEmbedRequest(BaseSchema):
    version_id: UUID4 | None = Field(
        None,
        description="Specific version to embed. Defaults to the head version.",
    )


class DocumentEmbedResponse(BaseSchema):
    document_id: UUID4
    document_version_id: UUID4
    chunks_embedded: int = Field(description="Number of text chunks embedded")


class LeadEnrichRequest(BaseSchema):
    lead_description: str = Field(..., min_length=1, description="Lead description")
    k: int = Field(5, ge=1, le=20, description="Context chunks to retrieve")


class LeadEnrichResponse(BaseSchema):
    enrichment: str = Field(description="AI-generated enrichment analysis")


class LeadRankInput(BaseSchema):
    id: UUID4 = Field(description="Lead identifier")
    title: str = Field(..., min_length=1, description="Lead title")
    description: str | None = Field(None, description="Lead description")


class LeadRankedEntryRead(BaseSchema):
    lead_id: UUID4 = Field(description="Lead identifier")
    lead_index: int = Field(..., ge=1, description="1-based lead position from input")
    title: str = Field(..., min_length=1, description="Lead title")
    relevance_score: int = Field(..., ge=1, le=10, description="Relevance score")
    explanation: str = Field(
        ..., min_length=20, max_length=400, description="Why the lead was ranked here"
    )
    aspiration_alignment: str | None = Field(
        None,
        description="How the lead aligns to the user's aspirations, if any",
    )


class LeadRankRequest(BaseSchema):
    leads: list[LeadRankInput] = Field(
        ..., min_length=1, description="List of typed leads to rank"
    )
    k: int = Field(5, ge=1, le=20, description="Context chunks per lead")


class LeadRankResponse(BaseSchema):
    ranking: str = Field(description="AI-generated lead ranking")
    ranked_leads: list[LeadRankedEntryRead] = Field(
        default_factory=list,
        description="Structured ranked lead entries for frontend consumption",
    )


class AspirationMatchRequest(BaseSchema):
    aspirations: list[AspirationMatchInput] = Field(
        ..., min_length=1, description="Aspirations to match against the input leads"
    )
    leads: list[LeadRankInput] = Field(
        ...,
        min_length=1,
        max_length=MATCH_ASPIRATIONS_MAX_LEADS,
        description="Typed leads to score for each aspiration",
    )
    k: int = Field(5, ge=1, le=20, description="Context chunks to retrieve")
    page: int | None = Field(
        None, ge=1, description="Optional page for single-aspiration matching"
    )
    page_size: int | None = Field(
        None,
        ge=1,
        le=PAGINATION_MAX_PAGE_SIZE,
        description="Optional page size for single-aspiration matching",
    )

    @model_validator(mode="after")
    def normalize_pagination(self) -> "AspirationMatchRequest":
        if self.page is None and self.page_size is not None:
            self.page = 1
        if self.page is not None and self.page_size is None:
            self.page_size = 20
        return self


class CompanySummarizeRequest(BaseSchema):
    url: str = Field(..., min_length=1, description="Company website URL")


class CompanySummarizeResponse(BaseSchema):
    url: str = Field(description="Website URL that was summarized")
    summary: str = Field(description="AI-generated company summary")


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
    avatar_uri: str | None = Field(None, description="Avatar URI")
    headline: str | None = Field(None, description="Short professional tagline")
    bio: str | None = Field(None, description="Longer about-me blurb")
    is_discoverable: bool = Field(
        False, description="Whether the user appears in the directory"
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
    @model_validator(mode="after")
    def default_superuser_discoverability(self) -> "UserCreate":
        if self.is_superuser and "is_discoverable" not in self.model_fields_set:
            self.is_discoverable = True
        return self


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

    code: str = Field(..., min_length=6, max_length=6, description="6-digit TOTP code")


class MFAStatusResponse(BaseSchema):
    """Current MFA enrolment status."""

    mfa_enabled: bool = Field(..., description="Whether MFA is currently active")


class BearerResponse(BaseSchema):
    """Returned when password auth completes without an MFA challenge."""

    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field("bearer", description="Bearer token type")


class MFALoginRequired(BaseSchema):
    """Returned at login when MFA verification is still needed."""

    mfa_required: bool = Field(True, description="Always True")
    mfa_token: str = Field(
        ..., description="Short-lived token to present with the TOTP code"
    )


class MFALoginVerifyRequest(BaseSchema):
    """Payload for the second step of MFA login."""

    mfa_token: str = Field(..., description="MFA challenge token from login response")
    code: str = Field(..., min_length=6, max_length=6, description="6-digit TOTP code")


class MFAAdminResetResponse(BaseSchema):
    """Returned when a superuser resets MFA for another account."""

    user_id: UUID4 = Field(..., description="User whose MFA state was reset")
    mfa_enabled: bool = Field(
        False, description="Always false after a successful admin reset"
    )


class PlacementUpdate(BaseSchema):
    model_config = ConfigDict(extra="forbid")

    placement_status: PlacementStatus = Field(
        description="Target placement status (active, graduated, alumni)"
    )


class UserDirectoryRead(BaseSchema):
    user_id: UUID4 = Field(description="User identifier")
    display_name: str = Field(description="Public display name")
    is_superuser: bool = Field(description="Whether the user is a Baldin superuser")
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


UserDirectoryPaginatedRead = PaginatedResponse[UserDirectoryRead]


class UserPublicProfileRead(BaseSchema):
    user_id: UUID4 = Field(description="User identifier")
    display_name: str = Field(description="Public display name")
    is_superuser: bool = Field(description="Whether the user is a Baldin superuser")
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


class CommandCenterStageVelocity(BaseSchema):
    stage: ApplicationStage = Field(
        description="Pipeline stage measured from application status history"
    )
    avg_days: float = Field(
        ge=0,
        description="Average number of days applications spent in this stage",
    )
    sample_size: int = Field(
        ge=0,
        description="Number of recorded stage spans included in the average",
    )


class CommandCenterFunnelStage(BaseSchema):
    stage: ApplicationStage = Field(
        description="Pipeline stage included in the offer conversion funnel"
    )
    reached_count: int = Field(
        ge=0,
        description="Number of applications that reached this stage or a later stage",
    )
    conversion_from_previous: float | None = Field(
        None,
        ge=0,
        le=100,
        description="Percent of the previous funnel stage that advanced to this stage",
    )
    conversion_from_applied: float | None = Field(
        None,
        ge=0,
        le=100,
        description="Percent of applied applications that eventually reached this stage",
    )


class CommandCenterSummary(BaseSchema):
    lead_count: int
    unapplied_lead_count: int
    application_count: int
    active_application_count: int
    status_breakdown: dict[str, int]
    avg_days_per_stage: list[CommandCenterStageVelocity]
    offer_conversion_funnel: list[CommandCenterFunnelStage]
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
    is_superuser: bool = Field(description="Whether the user is a Baldin superuser")
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


ConnectionsPaginatedRead = PaginatedResponse[ConnectionRead]


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


ConversationsPaginatedRead = PaginatedResponse[ConversationRead]


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
    domains: list["DbManagementPurgeDomain"] = Field(
        default_factory=list,
        description="Cleanup domains applied to the operation",
    )
    cleared_profile_fields: int = Field(
        0, description="Number of profile fields cleared from the retained user"
    )
    deleted_records: dict[str, int] = Field(
        default_factory=dict,
        description="Deleted record counts grouped by table or association",
    )


class DbManagementPurgeDomain(str, Enum):
    PROFILE = "profile"
    LEADS = "leads"
    APPLICATIONS = "applications"
    DOCUMENTS = "documents"
    AGENTS = "agents"
    EXTRACTORS = "extractors"
    ORCHESTRATION = "orchestration"


class UserDataOperationPreview(BaseSchema):
    user_id: UUID4 = Field(description="User affected by the previewed operation")
    domains: list[DbManagementPurgeDomain] = Field(
        default_factory=list,
        description="Cleanup domains represented by the preview",
    )
    cleared_profile_fields: int = Field(
        0, description="Number of profile fields that would be cleared"
    )
    deleted_records: dict[str, int] = Field(
        default_factory=dict,
        description="Deleted record counts grouped by table or association",
    )
    delete_allowed: bool = Field(
        description="Whether the user can be deleted under the current safeguards"
    )
    delete_block_reason: Literal["self_delete", "last_remaining_superuser"] | None = (
        Field(
            None,
            description="Reason deletion is blocked, when applicable",
        )
    )
    purge_allowed: bool = Field(
        description=("Whether the requested purge can run under the current safeguards")
    )
    purge_block_reason: Literal["self_delete", "last_remaining_superuser"] | None = (
        Field(
            None,
            description="Reason the requested purge is blocked, when applicable",
        )
    )


class DbManagementUserSummaryRead(BaseSchema):
    user_id: UUID4 = Field(description="User identifier")
    email: EmailStr = Field(description="User email address")
    display_name: str = Field(description="Resolved display name for admin workflows")
    is_active: bool = Field(description="Whether the user is active")
    is_superuser: bool = Field(description="Whether the user is a Baldin superuser")
    is_discoverable: bool = Field(
        description="Whether the user is discoverable in the public directory"
    )
    created_at: datetime = Field(description="When the user was created")


DbManagementUserPaginatedRead = PaginatedResponse[DbManagementUserSummaryRead]


class DbManagementStatusRead(BaseSchema):
    current_revision: str | None = Field(
        None, description="Alembic revision currently stamped in the database"
    )
    head_revision: str | None = Field(
        None, description="Latest Alembic revision available in the repo"
    )
    is_at_head: bool = Field(
        description="Whether the current database revision matches the repo head"
    )
    public_table_count: int = Field(
        description="Number of base tables currently in the public schema"
    )


class DbManagementTableSummaryRead(BaseSchema):
    table_name: str = Field(description="Table name in the public schema")
    column_count: int = Field(description="Number of columns on the table")
    row_count: int = Field(description="Exact row count for the table")


class DbManagementColumnRead(BaseSchema):
    name: str = Field(description="Column name")
    data_type: str = Field(description="Database type name")
    is_nullable: bool = Field(description="Whether the column accepts null values")
    default: str | None = Field(None, description="Column default expression")


class DbManagementTableDetailRead(BaseSchema):
    table_name: str = Field(description="Table name in the public schema")
    row_count: int = Field(description="Exact row count for the table")
    columns: list[DbManagementColumnRead] = Field(
        default_factory=list,
        description="Ordered column metadata for the table",
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


def _normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None

    stripped = value.strip()
    return stripped or None


class ApplicationStatusHistoryEntry(BaseSchema):
    """Read schema for a row in the application_status_history table."""

    id: UUID4 = Field(description="History entry identifier")
    application_id: UUID4 = Field(description="Application identifier")
    stage: ApplicationStage = Field(description="Stage at this point in history")
    outcome: ApplicationOutcome | None = Field(
        None, description="Outcome at this point, null while active"
    )
    changed_by_user_id: UUID4 | None = Field(
        None, description="User who made the change"
    )
    changed_at: datetime = Field(description="When the transition was recorded")
    note: str | None = Field(None, description="Optional note about the transition")


class ApplicationDocumentMetadata(BaseSchema):
    total_count: int = Field(
        0,
        ge=0,
        description="Number of attached documents the caller can access",
    )
    has_resume: bool = Field(
        False, description="Whether an attached resume is accessible"
    )
    has_cover_letter: bool = Field(
        False,
        description="Whether an attached cover letter is accessible",
    )
    kinds: list[DocumentKind] = Field(
        default_factory=list,
        description="Distinct attached document kinds the caller can access",
    )


class ApplicationSummaryRead(BaseRead):
    lead_id: UUID4
    user_id: UUID4
    lead: LeadSummaryRead
    stage: ApplicationStage = Field(
        description="Current pipeline stage (registered → applied → screening → interview → offer)",
    )
    outcome: ApplicationOutcome | None = Field(
        None, description="Terminal closure (rejected or withdrawn), null while active"
    )
    next_step: str | None = Field(None, description="Next action for this application")
    next_step_due: datetime | None = Field(
        None, description="When the next step is due"
    )
    document_metadata: ApplicationDocumentMetadata = Field(
        default_factory=ApplicationDocumentMetadata,
        description="Summary of attached documents the caller can access",
    )


class ApplicationRead(ApplicationSummaryRead):
    lead: LeadRead
    user: UserRead
    notes: str | None = Field(None, description="Free-form user notes")
    outcome_reason: str | None = Field(
        None,
        description="Why the application was rejected or withdrawn",
    )
    status_history: list[ApplicationStatusHistoryEntry] = Field(
        default_factory=list,
        description="Append-only log of status transitions",
    )

    @field_validator("outcome_reason", mode="before")
    @classmethod
    def _normalize_outcome_reason(cls, value: str | None) -> str | None:
        return _normalize_optional_text(value)

    @model_validator(mode="after")
    def _clear_outcome_reason_when_active(self) -> "ApplicationRead":
        """Clear outcome_reason when the application is not in a terminal state."""
        if self.outcome is None:
            self.outcome_reason = None
        return self


class ApplicationCreate(BaseSchema):
    lead_id: UUID4
    stage: ApplicationStage = Field(
        ApplicationStage.REGISTERED, description="Initial pipeline stage"
    )
    outcome: ApplicationOutcome | None = None
    notes: str | None = None
    next_step: str | None = None
    next_step_due: datetime | None = None
    outcome_reason: str | None = Field(
        None,
        description="Why the application was rejected or withdrawn",
    )
    document_ids: list[UUID4] | None = None

    @field_validator("outcome_reason", mode="before")
    @classmethod
    def _normalize_outcome_reason(cls, value: str | None) -> str | None:
        return _normalize_optional_text(value)

    @model_validator(mode="after")
    def _validate(self) -> "ApplicationCreate":
        if self.outcome_reason is not None and self.outcome is None:
            raise ValueError(
                "outcome_reason can only be set for rejected or withdrawn applications"
            )
        return self


class ApplicationUpdate(BaseSchema):
    stage: ApplicationStage | None = None
    outcome: ApplicationOutcome | None = None
    notes: str | None = None
    next_step: str | None = None
    next_step_due: datetime | None = None
    outcome_reason: str | None = Field(
        None,
        description="Why the application was rejected or withdrawn",
    )
    reopen: bool = Field(
        False,
        description=(
            "Set true when moving a rejected or withdrawn application back into an active stage"
        ),
    )

    @field_validator("outcome_reason", mode="before")
    @classmethod
    def _normalize_outcome_reason(cls, value: str | None) -> str | None:
        return _normalize_optional_text(value)


ActionItemDetailRead.model_rebuild()


class AgentKind(str, Enum):
    COVER_LETTER = "cover_letter"
    FOLLOW_UP = "follow_up"
    OUTREACH = "outreach"
    CUSTOM = "custom"


class AgentRunTriggerKind(str, Enum):
    MANUAL = "manual"
    EVENT = "event"
    SURFACE_MENTION = "surface_mention"


class AgentRunStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AgentRunSourceSurfaceKind(str, Enum):
    CELL_DOC_EDITOR = "cell_doc_editor"
    RICH_TEXT_EDITOR = "rich_text_editor"
    MULTILINE_TEXT_FIELD = "multiline_text_field"


class AgentRunApplyStatus(str, Enum):
    PENDING = "pending"
    APPLIED = "applied"
    DISMISSED = "dismissed"


class AgentRunApplyMode(str, Enum):
    INSERT_AFTER_ANCHOR = "insert_after_anchor"
    REPLACE_SELECTION = "replace_selection"
    APPEND_TO_SURFACE = "append_to_surface"


class AgentChatSessionStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"


class AgentChatMessageRole(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


class AgentModelOptionRead(BaseSchema):
    name: str = Field(description="Resolved model identifier")
    label: str = Field(description="Human-readable model label")


class AgentModelListRead(BaseSchema):
    default_model_name: str = Field(
        description="Resolved model identifier used when an agent has no model override",
    )
    default_model_label: str = Field(
        description="Human-readable label for the default agent model",
    )
    models: list[AgentModelOptionRead] = Field(
        default_factory=list,
        description="Available agent models that can be selected per agent",
    )


class AgentSummaryRead(BaseRead):
    user_id: UUID4 = Field(description="Owner identifier")
    name: str = Field(description="Agent definition name")
    description: str | None = Field(None, description="Optional agent summary")
    kind: AgentKind = Field(description="Workflow family")
    is_enabled: bool = Field(description="Whether the agent can be launched")


class AgentRead(AgentSummaryRead):
    instructions: str | None = Field(
        None,
        description="Optional workflow instructions that guide generated sessions",
    )
    configuration: dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Workflow-specific configuration payload. Supports optional "
            "`model_name` to override the default model for this agent."
        ),
    )


class AgentCreate(BaseSchema):
    name: str = Field(description="Agent definition name")
    description: str | None = Field(None, description="Optional agent summary")
    kind: AgentKind = Field(description="Workflow family")
    instructions: str | None = Field(
        None,
        description="Optional workflow instructions that guide generated sessions",
    )
    configuration: dict[str, Any] = Field(
        default_factory=dict,
        description=(
            "Workflow-specific configuration payload. Supports optional "
            "`model_name` to override the default model for this agent."
        ),
    )
    is_enabled: bool = Field(True, description="Whether the agent can be launched")


class AgentUpdate(BaseSchema):
    name: str | None = Field(None, description="Agent definition name")
    description: str | None = Field(None, description="Optional agent summary")
    instructions: str | None = Field(
        None,
        description="Optional workflow instructions that guide generated sessions",
    )
    configuration: dict[str, Any] | None = Field(
        None,
        description=(
            "Workflow-specific configuration payload. Supports optional "
            "`model_name` to override the default model for this agent."
        ),
    )
    is_enabled: bool | None = Field(
        None,
        description="Whether the agent can be launched",
    )


class AgentRunSessionDocumentRead(BaseSchema):
    id: UUID4 = Field(description="Session document identifier")
    title: str = Field(description="Session document title")
    kind: DocumentKind = Field(description="Document kind discriminator")
    status: DocumentStatus = Field(description="Document lifecycle status")


class AgentRunSessionVersionRead(BaseRead):
    version_number: int = Field(description="Produced session version number")
    name: str | None = Field(None, description="Snapshot title")
    content_format: str | None = Field(
        None,
        description="Content format: plain_text or tiptap_json",
    )


class AgentSurfaceEntityRef(BaseSchema):
    kind: str = Field(description="Explicit host-provided entity kind")
    id: str = Field(description="Explicit host-provided entity identifier")
    label: str | None = Field(
        None,
        description="Optional display label for the referenced entity",
    )


class AgentSuggestedEditWrite(BaseSchema):
    operation: AgentRunApplyMode = Field(
        description="Requested surface apply operation for the suggestion",
    )
    content_format: ContentFormat = Field(
        description="Suggested edit content format",
    )
    content: str = Field(description="Suggested plain-text edit content")
    summary: str | None = Field(
        None,
        description="Compact preview summary for the suggested edit",
    )


class AgentSuggestedEditRead(AgentSuggestedEditWrite):
    pass


class AgentRunSummaryRead(BaseRead):
    agent_id: UUID4 = Field(description="Owning agent definition")
    user_id: UUID4 = Field(description="Owner identifier")
    application_id: UUID4 | None = Field(
        None,
        description="Optional source application identifier",
    )
    chat_session_id: UUID4 | None = Field(
        None,
        description="Source agent chat session identifier when the run came from a chat export",
    )
    parent_run_id: UUID4 | None = Field(
        None,
        description="Optional prior run in the same session lineage",
    )
    trigger_kind: AgentRunTriggerKind = Field(description="How the run was started")
    status: AgentRunStatus = Field(description="Current execution status")
    source_surface_kind: AgentRunSourceSurfaceKind | None = Field(
        None,
        description="Surface type that originated the run",
    )
    source_document_id: UUID4 | None = Field(
        None,
        description="Source document identifier when the run came from a document surface",
    )
    source_field_key: str | None = Field(
        None,
        description="Host-defined surface field key for non-document surfaces",
    )
    source_route: str | None = Field(
        None,
        description="Host route where the run was requested",
    )
    source_anchor_id: str | None = Field(
        None,
        description="Optional source anchor or block identifier within the surface",
    )
    apply_status: AgentRunApplyStatus = Field(
        description="Whether the suggestion is pending, applied, or dismissed",
    )
    applied_at: datetime | None = Field(
        None,
        description="When the suggestion was marked applied",
    )
    suggested_edit: AgentSuggestedEditRead | None = Field(
        None,
        description="Previewable suggested edit payload returned by the backend",
    )
    session_document_id: UUID4 | None = Field(
        None,
        description="Session document created or updated by the run",
    )
    session_version_id: UUID4 | None = Field(
        None,
        description="Exact document version produced by the run",
    )
    session_document: AgentRunSessionDocumentRead | None = Field(
        None,
        description="Session document summary when available",
    )
    session_version: AgentRunSessionVersionRead | None = Field(
        None,
        description="Produced version summary when available",
    )
    error_summary: str | None = Field(
        None,
        description="Compact error message when a run fails",
    )
    completed_at: datetime | None = Field(
        None,
        description="When the run finished successfully or failed",
    )


class AgentRunRead(AgentRunSummaryRead):
    input_context: dict[str, Any] = Field(
        default_factory=dict,
        description="Structured context payload captured for the run",
    )


class AgentRunExecuteRequest(BaseSchema):
    application_id: UUID4 = Field(description="Application context used for the run")
    session_document_id: UUID4 | None = Field(
        None,
        description="Existing cell-doc session to append a new version to",
    )


class AgentSurfaceRunRequest(BaseSchema):
    surface_kind: AgentRunSourceSurfaceKind = Field(
        description="Frontend surface type that originated the mention task",
    )
    source_route: str = Field(description="Frontend route where the run was requested")
    source_document_id: UUID4 | None = Field(
        None,
        description="Source document identifier for persisted document surfaces",
    )
    source_field_key: str | None = Field(
        None,
        description="Host-defined field key for the originating surface",
    )
    anchor_id: str | None = Field(
        None,
        description="Optional block or anchor identifier within the originating surface",
    )
    content_format: ContentFormat = Field(
        description="Format of the provided surface snapshot",
    )
    surface_content: str = Field(description="Full current surface snapshot")
    selection_text: str | None = Field(
        None,
        description="Optional selected text inside the surface",
    )
    selection_start: int | None = Field(
        None,
        ge=0,
        description="Optional selection start offset for plain-text surfaces",
    )
    selection_end: int | None = Field(
        None,
        ge=0,
        description="Optional selection end offset for plain-text surfaces",
    )
    entity_refs: list[AgentSurfaceEntityRef] = Field(
        default_factory=list,
        description="Explicit host-provided entity references for the surface context",
    )
    application_id: UUID4 | None = Field(
        None,
        description="Optional application context when the host already has one",
    )
    prompt_text: str = Field(description="Explicit user instructions for the task")
    requested_apply_mode: AgentRunApplyMode = Field(
        description="Requested frontend apply behavior for the suggestion",
    )


class AgentSurfaceRunApplyRequest(BaseSchema):
    session_document_id: UUID4 | None = Field(
        None,
        description="Document identifier to link when a document surface apply creates a new version",
    )
    session_version_id: UUID4 | None = Field(
        None,
        description="Version identifier to link when a document surface apply creates a new version",
    )


class AgentRunCreate(BaseSchema):
    """Internal schema — not user-facing."""

    agent_id: UUID4 = Field(description="Owning agent definition")
    user_id: UUID4 = Field(description="Owner identifier")
    application_id: UUID4 | None = Field(
        None,
        description="Optional source application identifier",
    )
    parent_run_id: UUID4 | None = Field(
        None,
        description="Optional prior run in the same session lineage",
    )
    trigger_kind: AgentRunTriggerKind = Field(
        AgentRunTriggerKind.MANUAL,
        description="How the run was started",
    )
    status: AgentRunStatus = Field(
        AgentRunStatus.PENDING,
        description="Current execution status",
    )
    input_context: dict[str, Any] = Field(
        default_factory=dict,
        description="Structured context payload captured for the run",
    )
    source_surface_kind: AgentRunSourceSurfaceKind | None = Field(
        None,
        description="Source surface kind for mention-driven runs",
    )
    source_document_id: UUID4 | None = Field(
        None,
        description="Source document identifier for mention-driven runs",
    )
    source_field_key: str | None = Field(
        None,
        description="Host-defined source field key for mention-driven runs",
    )
    source_route: str | None = Field(
        None,
        description="Source route where the run was requested",
    )
    source_anchor_id: str | None = Field(
        None,
        description="Source anchor identifier inside the surface",
    )
    apply_status: AgentRunApplyStatus = Field(
        AgentRunApplyStatus.PENDING,
        description="Whether the suggested edit has been applied or dismissed",
    )
    applied_at: datetime | None = Field(
        None,
        description="When the suggested edit was applied",
    )
    suggested_edit: AgentSuggestedEditWrite | None = Field(
        None,
        description="Suggested edit payload produced for the run",
    )
    session_document_id: UUID4 | None = Field(
        None,
        description="Session document created or updated by the run",
    )
    session_version_id: UUID4 | None = Field(
        None,
        description="Exact document version produced by the run",
    )
    error_summary: str | None = Field(
        None,
        description="Compact error message when a run fails",
    )
    completed_at: datetime | None = Field(
        None,
        description="When the run finished successfully or failed",
    )


class AgentChatMessageRead(BaseSchema):
    id: UUID4 = Field(description="Chat message identifier")
    role: AgentChatMessageRole = Field(description="LLM chat role for this message")
    content: str = Field(description="Persisted message content")
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        validation_alias="metadata_",
        description="Structured metadata such as token usage or model version",
    )
    created_at: datetime = Field(description="When the message was created")


class AgentChatMessageHistoryRead(BaseSchema):
    has_more_before: bool = Field(
        False,
        description="Whether older messages exist before the current oldest message",
    )
    next_before: str | None = Field(
        None,
        description="Opaque cursor for loading older messages before the current slice",
    )


class AgentChatHistoryPageRead(BaseSchema):
    items: list[AgentChatMessageRead] = Field(
        default_factory=list,
        description="Chronologically ascending chat messages for this history slice",
    )
    has_more_before: bool = Field(
        False,
        description="Whether another older history slice exists before this page",
    )
    next_before: str | None = Field(
        None,
        description="Opaque cursor for loading the next older history slice",
    )


class AgentChatRetrievalRequest(BaseSchema):
    document_ids: list[UUID4] = Field(
        default_factory=list,
        max_length=5,
        description="Optional document identifiers to search for this message",
    )
    lookup_url: str | None = Field(
        None,
        description="Optional explicit URL to fetch and use as ephemeral context",
    )
    k: int = Field(
        5,
        ge=1,
        le=8,
        description="Maximum number of document chunks to retrieve",
    )

    @field_validator("document_ids", mode="after")
    @classmethod
    def dedupe_document_ids(cls, value: list[UUID4]) -> list[UUID4]:
        deduped: list[UUID4] = []
        seen: set[UUID4] = set()
        for document_id in value:
            if document_id in seen:
                continue
            seen.add(document_id)
            deduped.append(document_id)
        return deduped

    @field_validator("lookup_url", mode="before")
    @classmethod
    def normalize_lookup_url(cls, value: str | None) -> str | None:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value

    @field_validator("lookup_url", mode="after")
    @classmethod
    def validate_lookup_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return validate_url_safe_for_fetch(value)

    @model_validator(mode="after")
    def require_at_least_one_source(self) -> "AgentChatRetrievalRequest":
        if self.document_ids or self.lookup_url:
            return self
        raise ValueError("retrieval must include document_ids or lookup_url")


class AgentChatMessageCreate(BaseSchema):
    content: str = Field(description="User-authored message content")
    retrieval: AgentChatRetrievalRequest | None = Field(
        None,
        description="Optional retrieval inputs used only for this message",
    )

    @field_validator("content")
    @classmethod
    def clean_content(cls, value: str) -> str:
        cleaned = _clean_optional_wrapped_text(value)
        if not cleaned:
            raise ValueError("Chat message content cannot be empty")
        return cleaned


class AgentChatSessionSummaryRead(BaseRead):
    agent_id: UUID4 = Field(description="Owning agent definition")
    title: str | None = Field(
        None,
        description="Optional session title, typically derived from the first prompt",
    )
    model_name: str | None = Field(
        None,
        description="Snapshot of the model configured for the session",
    )
    status: AgentChatSessionStatus = Field(description="Session lifecycle status")
    message_count: int = Field(description="Denormalized total number of messages")
    last_message_at: datetime | None = Field(
        None,
        description="Timestamp of the most recent message in the session",
    )
    application_id: UUID4 | None = Field(
        None,
        description="Optional application context associated with the session",
    )


class AgentChatSessionRead(AgentChatSessionSummaryRead):
    user_id: UUID4 = Field(description="Owner identifier")
    messages: list[AgentChatMessageRead] = Field(
        default_factory=list,
        description="Recent messages loaded alongside the session",
    )
    message_history: AgentChatMessageHistoryRead | None = Field(
        None,
        description="Cursor metadata for paging older chat history",
    )


class AgentChatSessionCreate(BaseSchema):
    application_id: UUID4 | None = Field(
        None,
        description="Optional application context used to seed the chat session",
    )
    title: str | None = Field(
        None,
        description="Optional session title. When omitted, the server may derive one.",
    )


class AgentChatSessionUpdate(BaseSchema):
    title: str | None = Field(
        None,
        description="Optional session title override. Set to null to clear it.",
    )
    status: AgentChatSessionStatus | None = Field(
        None,
        description="Updated session lifecycle status",
    )

    @model_validator(mode="after")
    def reject_null_status(self) -> "AgentChatSessionUpdate":
        if "status" in self.model_fields_set and self.status is None:
            raise ValueError("status cannot be null")
        return self


class AgentChatSaveToDocumentRequest(BaseSchema):
    title: str | None = Field(
        None,
        description="Optional document title override for the exported chat transcript",
    )
    application_id: UUID4 | None = Field(
        None,
        description="Optional application context to attach to the saved document",
    )

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str | None) -> str | None:
        return _clean_optional_wrapped_text(value)


class AgentChatSaveToDocumentRead(BaseSchema):
    document_id: UUID4 = Field(description="Newly created cell-doc document identifier")
    version_id: UUID4 = Field(description="Version identifier created for the export")


# Crawler schemas


class CrawlerSourceType(str, Enum):
    LINKEDIN = "linkedin"
    GLASSDOOR = "glassdoor"


class CrawlerTriggerType(str, Enum):
    MANUAL = "manual"
    SCHEDULED = "scheduled"


# Re-export LeadReviewStatus from models as ReviewStatus for schema use
ReviewStatus = LeadReviewStatus


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


CrawlerRunsPaginatedRead = PaginatedResponse[CrawlerRunRead]


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


class CrawlerRuntimeDependencyRead(BaseSchema):
    configured: bool = Field(description="Whether the dependency is configured")
    reachable: bool = Field(description="Whether the dependency is reachable now")
    detail: str | None = Field(None, description="Optional diagnostic detail")


class CrawlerEnqueueFailureSampleRead(BaseSchema):
    run_id: UUID4 | None = Field(None, description="Crawler run ID when known")
    created_at: datetime = Field(description="When the failure was recorded")
    fallback_mode: str = Field(
        description="How execution recovered after enqueue failure"
    )
    error_summary: str = Field(description="Short enqueue failure summary")


class CrawlerRuntimeStatusRead(BaseSchema):
    execution_mode: Literal["inline", "worker"] = Field(
        description="Current crawler execution mode"
    )
    scheduler_enabled: bool = Field(description="Whether the scheduler loop is enabled")
    reaper_enabled: bool = Field(description="Whether the reaper loop is enabled")
    redis: CrawlerRuntimeDependencyRead = Field(description="Redis queue health")
    etl_service: CrawlerRuntimeDependencyRead = Field(description="ETL service health")
    queue_backlog: int | None = Field(
        None, description="Pending Redis jobs when worker mode is enabled"
    )
    stale_run_count: int = Field(
        description="Crawler runs older than the stale threshold"
    )
    stale_event_count: int = Field(
        description="Orchestration events older than the stale threshold"
    )
    enqueue_failure_count: int = Field(
        description="Recent crawler queue handoff failures captured in orchestration events"
    )
    recent_enqueue_failures: list[CrawlerEnqueueFailureSampleRead] = Field(
        default_factory=list,
        description="Most recent enqueue failure samples",
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
