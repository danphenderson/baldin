# Path: app/models.py
import enum
from uuid import uuid4

from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Table,
    Text,
    UniqueConstraint,
    event,
    func,
    text,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, relationship

# ---------------------------------------------------------------------------
#  Native Postgres enum types
# ---------------------------------------------------------------------------


class ApplicationStage(str, enum.Enum):
    """Pipeline progression stages — only forward movement through the funnel."""

    REGISTERED = "registered"
    APPLIED = "applied"
    SCREENING = "screening"
    INTERVIEW = "interview"
    OFFER = "offer"


class ApplicationOutcome(str, enum.Enum):
    """Terminal closure states — mutually exclusive with further stage progression."""

    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class LeadReviewStatus(str, enum.Enum):
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class CrawlerRunStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"
    PENDING_REVIEW = "pending_review"


def _enum_values(enum_class: type[enum.Enum]) -> list[str]:
    return [member.value for member in enum_class]


def _string_in_check_constraint(
    column_name: str,
    values: tuple[str, ...],
    *,
    name: str,
) -> CheckConstraint:
    allowed_values = ", ".join(repr(value) for value in values)
    return CheckConstraint(f"{column_name} IN ({allowed_values})", name=name)


DOCUMENT_KIND_VALUES = (
    "resume",
    "cover_letter",
    "follow_up",
    "reference_sheet",
    "freeform",
    "cell_doc",
)
DOCUMENT_STATUS_VALUES = ("draft", "active", "archived")
DOCUMENT_CONTENT_FORMAT_VALUES = ("plain_text", "tiptap_json")
DOCUMENT_SHARE_ROLE_VALUES = ("viewer", "editor")
DOCUMENT_ACTIVITY_TYPE_VALUES = (
    "document_created",
    "document_uploaded",
    "version_saved",
    "agent_task_requested",
    "agent_task_applied",
    "agent_task_failed",
    "agent_task_dismissed",
    "share_created",
    "share_updated",
    "share_revoked",
    "document_archived",
    "document_unarchived",
    "document_pinned",
    "document_unpinned",
    "block_created",
    "block_updated",
    "block_deleted",
    "block_reordered",
    "block_type_changed",
)
DOCUMENT_BLOCK_TYPE_VALUES = (
    "paragraph",
    "heading",
    "bullet_list",
    "ordered_list",
    "list_item",
    "task_list",
    "task_item",
    "blockquote",
    "code_block",
    "callout",
    "toggle",
    "table",
    "table_row",
    "table_cell",
    "divider",
    "mention",
    "embed",
)
ORCHESTRATION_EVENT_STATUS_VALUES = (
    "pending",
    "running",
    "success",
    "failure",
    "pending_review",
)
CONNECTION_STATUS_VALUES = ("pending", "accepted", "declined", "blocked")
CONVERSATION_TYPE_VALUES = ("direct", "group")
CONVERSATION_PARTICIPANT_ROLE_VALUES = ("member", "admin")
ACTION_ITEM_STATUS_VALUES = ("pending", "in_progress", "completed", "dismissed")
ACTION_ITEM_KIND_VALUES = (
    "follow_up",
    "prepare_document",
    "send_message",
    "review_lead",
    "schedule_interview",
    "custom",
)
ACTION_ITEM_PRIORITY_VALUES = ("low", "medium", "high", "urgent")
ASPIRATION_KIND_VALUES = ("role", "company")
AGENT_KIND_VALUES = ("cover_letter", "follow_up", "outreach", "custom")
AGENT_RUN_TRIGGER_KIND_VALUES = ("manual", "event", "surface_mention")
AGENT_RUN_STATUS_VALUES = ("pending", "running", "completed", "failed")
AGENT_RUN_SOURCE_SURFACE_KIND_VALUES = (
    "cell_doc_editor",
    "rich_text_editor",
    "multiline_text_field",
)
AGENT_RUN_APPLY_STATUS_VALUES = ("pending", "applied", "dismissed")
AGENT_CHAT_SESSION_STATUS_VALUES = ("active", "archived")
AGENT_CHAT_MESSAGE_ROLE_VALUES = ("system", "user", "assistant")


class Base(DeclarativeBase):
    """
    Base model for all database entities.
    Provides common attributes like ID, creation, and update timestamps.
    Inherits from SQLAlchemy's DeclarativeBase.
    """

    __abstract__ = True

    id = Column(UUID, primary_key=True, default=uuid4)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


# Data Orchestration models


class OrchestrationEvent(Base):
    """
    Model for orchestration events.
    Contains orchestration pipeline event status, message, and reference to the pipeline.
    Useful for tracking the status of ETL jobs.
    """

    __tablename__ = "orchestration_events"
    __table_args__ = (
        _string_in_check_constraint(
            "status",
            ORCHESTRATION_EVENT_STATUS_VALUES,
            name="ck_orchestration_events_status",
        ),
        Index("ix_orchestration_events_pipeline_created", "pipeline_id", "created_at"),
    )
    status = Column(String, default="pending")  # running, success, failure
    message = Column(Text)
    payload = Column(JSON)
    environment = Column(String)
    source_uri = Column(JSON)
    destination_uri = Column(JSON)
    version_hash = Column(String, nullable=True)
    retry_of_id = Column(
        UUID, ForeignKey("orchestration_events.id", ondelete="SET NULL"), nullable=True
    )
    pipeline_id = Column(
        UUID,
        ForeignKey("orchestration_pipelines.id", ondelete="CASCADE"),
        nullable=True,
    )
    orchestration_pipeline = relationship(
        "OrchestrationPipeline", back_populates="orchestration_events"
    )


class OrchestrationPipeline(Base):
    """
    Model for ETL (Extract, Transform, Load) pipelines.
    Contains name, description, source, destination, and parameters.
    Linked to orchestration events via one-to-many relationship.
    """

    __tablename__ = "orchestration_pipelines"
    __table_args__ = (UniqueConstraint("user_id", "name"),)
    name = Column(String, index=True, nullable=False)
    description = Column(Text)
    definition = Column(JSON)
    user_id = Column(UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user = relationship("User", back_populates="orchestration_pipelines")
    orchestration_events = relationship(
        "OrchestrationEvent", back_populates="orchestration_pipeline"
    )


# Crawler models


class CrawlerPipeline(Base):
    """
    Superuser-managed crawler pipeline definition.
    Stores source, query parameters, schedule, and execution policies
    for automated lead crawling jobs.
    """

    __tablename__ = "crawler_pipelines"
    name = Column(String, index=True, nullable=False)
    description = Column(Text)
    source = Column(String, nullable=False)
    query_definition = Column(JSON, nullable=False)
    schedule_definition = Column(JSON)
    enabled = Column(Boolean, default=True, nullable=False)
    execution_policy = Column(JSON)
    extraction_policy = Column(JSON)
    requires_approval = Column(
        Boolean,
        default=False,
        server_default=text("false"),
        nullable=False,
    )
    created_by_user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    created_by = relationship("User", back_populates="crawler_pipelines")
    runs = relationship("CrawlerRun", back_populates="crawler_pipeline")


class CrawlerRun(Base):
    """
    Represents a single execution of a crawler pipeline.
    Tracks trigger type, status, timing, checkpoint for resumability,
    and aggregate stats.
    """

    __tablename__ = "crawler_runs"
    crawler_pipeline_id = Column(
        UUID,
        ForeignKey("crawler_pipelines.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    trigger_type = Column(String, nullable=False)
    status = Column(
        SAEnum(
            CrawlerRunStatus,
            name="crawlerrunstatus",
            native_enum=True,
            values_callable=_enum_values,
        ),
        nullable=False,
        default=CrawlerRunStatus.PENDING,
    )
    scheduled_for = Column(DateTime(timezone=True))
    started_at = Column(DateTime(timezone=True))
    finished_at = Column(DateTime(timezone=True))
    checkpoint = Column(JSON)
    stats = Column(JSON)
    error_summary = Column(Text)
    retry_of_id = Column(
        UUID, ForeignKey("crawler_runs.id", ondelete="SET NULL"), nullable=True
    )
    crawler_pipeline = relationship("CrawlerPipeline", back_populates="runs")


# Extractor models
class ExtractorExample(Base):
    """A representation of an example.

    Examples consist of content together with the expected output.

    The output is a JSON object that is expected to be extracted from the content.

    The JSON object should be valid according to the schema of the associated extractor.

    The JSON object is defined by the schema of the associated extractor, so
    it's perfectly fine for a given example to represent the extraction
    of multiple instances of some object from the content since
    the JSON schema can represent a list of objects.
    """

    __tablename__ = "extractor_examples"
    content = Column(Text, nullable=False, comment="The input portion of the example.")
    output = Column(JSONB, comment="The output associated with the example.")
    extractor_id = Column(
        UUID, ForeignKey("extractors.id", ondelete="CASCADE"), nullable=False
    )
    extractor = relationship("Extractor", back_populates="extractor_examples")

    def __repr__(self) -> str:
        return f"<ExtractorExample(uuid={self.id}, content={self.content[:20]}>"


class Extractor(Base):
    """
    Represents an extractor for parsing structured data from unstructured text.
    Contains name, description, schema, instruction, etc.
    Linked to users and examples via many-to-one and one-to-many relationships.
    """

    __tablename__ = "extractors"
    name = Column(String, index=True, nullable=False)
    description = Column(Text)
    json_schema = Column(JSONB)
    instruction = Column(Text)
    requires_approval = Column(
        Boolean,
        default=False,
        server_default=text("false"),
        nullable=False,
    )
    user_id = Column(UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user = relationship("User", back_populates="extractors")
    extractor_examples = relationship("ExtractorExample", back_populates="extractor")
    versions = relationship(
        "ExtractorVersion",
        back_populates="extractor",
        order_by="ExtractorVersion.version_number.desc()",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Extractor(id={self.id}, description={self.description})>"


class ExtractorVersion(Base):
    """Immutable snapshot of an Extractor's instruction and schema at a point in time."""

    __tablename__ = "extractor_versions"
    __table_args__ = (
        UniqueConstraint(
            "extractor_id",
            "version_number",
            name="uq_extractor_versions_extractor_id_version_number",
        ),
    )
    extractor_id = Column(
        UUID,
        ForeignKey("extractors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number = Column(Integer, nullable=False)
    instruction = Column(Text)
    json_schema = Column(JSONB)
    version_hash = Column(String, nullable=False, index=True)

    extractor = relationship("Extractor", back_populates="versions")


# ---------------------------------------------------------------------------
#  Junction tables — plain Table constructs, no surrogate columns
# ---------------------------------------------------------------------------

_leads_x_companies_table = Table(
    "leads_x_companies",
    Base.metadata,
    Column(
        "lead_id", UUID, ForeignKey("leads.id", ondelete="CASCADE"), primary_key=True
    ),
    Column(
        "company_id",
        UUID,
        ForeignKey("companies.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class LeadXCompany:
    """Mapped junction: leads ↔ companies. No surrogate ID or timestamps."""

    __tablename__ = "leads_x_companies"


Base.registry.map_imperatively(LeadXCompany, _leads_x_companies_table)


class LeadRegistration(Base):
    """Represents a viewer's registration or interest for a shared lead."""

    __tablename__ = "lead_registrations"
    __table_args__ = (UniqueConstraint("lead_id", "user_id"),)

    lead_id = Column(
        UUID, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id = Column(
        UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    internal_notes = Column(Text)
    expose_profile = Column(Boolean, default=False, nullable=False)

    lead = relationship("Lead", back_populates="registrations")
    user = relationship("User", back_populates="lead_registrations")


class Company(Base):
    """
    Represents a company.
    Includes company name, industry, size, location, etc.
    Linked to job leads through many-to-many relationship.
    """

    __tablename__ = "companies"
    __table_args__ = (
        Index(
            "ix_companies_name_lower_trim",
            text("lower(trim(name))"),
            unique=True,
        ),
    )
    name = Column(String, nullable=False)
    industry = Column(String)
    size = Column(String)
    location = Column(String)
    description = Column(Text)

    leads = relationship(
        "Lead", secondary="leads_x_companies", back_populates="companies"
    )


class Lead(Base):
    """
    Represents a job lead.
    Includes URL, title, company, description, location, salary, etc.
    Linked to job applications via one-to-many relationship.
    """

    __tablename__ = "leads"
    url = Column(String, nullable=False)
    canonical_url = Column(String, unique=True, index=True, nullable=False)
    title = Column(String)
    description = Column(String)
    location = Column(String)
    salary = Column(String)
    job_function = Column(String)
    employment_type = Column(String)
    seniority_level = Column(String)
    education_level = Column(String)
    hiring_manager = Column(String)
    review_status = Column(
        SAEnum(
            LeadReviewStatus,
            name="leadreviewstatus",
            native_enum=True,
            values_callable=_enum_values,
        ),
        nullable=True,
    )

    applications = relationship("Application", back_populates="lead")
    companies = relationship(
        "Company",
        secondary="leads_x_companies",
        back_populates="leads",
        lazy="selectin",
    )
    registrations = relationship(
        "LeadRegistration",
        back_populates="lead",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    users = relationship(
        "User",
        secondary="lead_registrations",
        back_populates="leads",
        viewonly=True,
    )
    comments = relationship(
        "LeadComment",
        back_populates="lead",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class LeadComment(Base):
    """Represents a lead comment or a single-level reply."""

    __tablename__ = "lead_comments"
    __table_args__ = (Index("ix_lead_comments_lead_created", "lead_id", "created_at"),)
    lead_id = Column(
        UUID, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_user_id = Column(
        UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    parent_comment_id = Column(
        UUID,
        ForeignKey("lead_comments.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    content = Column(Text, nullable=False)
    anonymous = Column(Boolean, default=True, nullable=False)

    lead = relationship("Lead", back_populates="comments")
    author = relationship("User", back_populates="lead_comments")
    parent_comment = relationship(
        "LeadComment",
        remote_side="LeadComment.id",
        back_populates="replies",
    )
    replies = relationship(
        "LeadComment",
        back_populates="parent_comment",
        cascade="all, delete-orphan",
    )


# End of system models


# User models
class Skill(Base):
    """
    Model for user skills.
    Each skill associated with a user via many-to-one relationship.
    """

    __tablename__ = "user_skills"
    name = Column(String)
    category = Column(String)
    yoe = Column(Integer)
    subskills = Column(ARRAY(Text))
    user_id = Column(UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user = relationship("User", back_populates="skills")


class Experience(Base):
    """
    Represents user's professional experience.
    Links to user with job title, company, duration details.
    """

    __tablename__ = "user_experiences"
    title = Column(String)
    company = Column(String)
    location = Column(String)
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    description = Column(Text)
    projects = Column(ARRAY(Text))

    user_id = Column(UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user = relationship("User", back_populates="experiences")


# Add Education model
class Education(Base):
    __tablename__ = "user_education"
    university = Column(String)
    degree = Column(String)
    grade_point = Column(String)
    activities = Column(ARRAY(Text))
    achievements = Column(ARRAY(Text))
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    user_id = Column(UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user = relationship("User", back_populates="education")


# Add Certificate model
class Certificate(Base):
    __tablename__ = "user_certificates"
    title = Column(String)
    issuer = Column(String)
    expiration_date = Column(DateTime(timezone=True))
    issued_date = Column(DateTime(timezone=True))
    user_id = Column(UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user = relationship("User", back_populates="certificates")


class Aspiration(Base):
    """Represents a user-owned role or company aspiration."""

    __tablename__ = "aspirations"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "kind",
            "label",
            name="uq_aspirations_user_kind_label",
        ),
        _string_in_check_constraint(
            "kind",
            ASPIRATION_KIND_VALUES,
            name="ck_aspirations_kind",
        ),
        Index("ix_aspirations_user_kind", "user_id", "kind"),
    )

    user_id = Column(
        UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind = Column(String, nullable=False)
    label = Column(String, nullable=False)
    reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    priority = Column(Integer, nullable=False, default=0, server_default="0")
    extracted_attributes = Column(JSONB, nullable=True)

    user = relationship("User", back_populates="aspirations")


class Application(Base):
    """
    Model for job applications.
    Contains notes, status, and linked versioned documents.
    Linked to users and job leads through many-to-one relationships.
    """

    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint("user_id", "lead_id", name="uq_applications_user_lead"),
        CheckConstraint(
            "outcome IS NULL OR stage IS NOT NULL",
            name="ck_applications_outcome_requires_stage",
        ),
        Index("ix_applications_user_stage", "user_id", "stage"),
        Index("ix_applications_user_outcome", "user_id", "outcome"),
    )

    stage = Column(
        SAEnum(
            ApplicationStage,
            name="applicationstage",
            native_enum=True,
            values_callable=_enum_values,
        ),
        nullable=False,
        server_default="registered",
    )
    outcome = Column(
        SAEnum(
            ApplicationOutcome,
            name="applicationoutcome",
            native_enum=True,
            values_callable=_enum_values,
        ),
        nullable=True,
    )
    notes = Column(Text)
    next_step = Column(String)
    next_step_due = Column(DateTime(timezone=True))
    outcome_reason = Column(Text)
    lead_id = Column(
        UUID, ForeignKey("leads.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    user_id = Column(UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    lead = relationship("Lead", back_populates="applications", uselist=False)
    user = relationship("User", back_populates="applications")
    documents = relationship(
        "Document",
        secondary="documents_x_applications",
        back_populates="applications",
    )
    agent_runs = relationship("AgentRun", back_populates="application")
    chat_sessions = relationship("AgentChatSession", back_populates="application")
    status_history = relationship(
        "ApplicationStatusHistory",
        back_populates="application",
        cascade="all, delete-orphan",
        order_by="ApplicationStatusHistory.changed_at",
        lazy="selectin",
    )


class ApplicationStatusHistory(Base):
    """Audit row for each application stage/outcome transition."""

    __tablename__ = "application_status_history"

    application_id = Column(
        UUID, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False
    )
    stage = Column(
        SAEnum(
            ApplicationStage,
            name="applicationstage",
            native_enum=True,
            values_callable=_enum_values,
        ),
        nullable=False,
    )
    outcome = Column(
        SAEnum(
            ApplicationOutcome,
            name="applicationoutcome",
            native_enum=True,
            values_callable=_enum_values,
        ),
        nullable=True,
    )
    changed_by_user_id = Column(
        UUID, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    changed_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    note = Column(Text, nullable=True)

    application = relationship("Application", back_populates="status_history")


class Agent(Base):
    """Persistent definition for a reusable AI workflow."""

    __tablename__ = "agents"
    __table_args__ = (
        _string_in_check_constraint(
            "kind",
            AGENT_KIND_VALUES,
            name="ck_agents_kind",
        ),
        Index("ix_agents_user_kind_enabled", "user_id", "kind", "is_enabled"),
    )

    user_id = Column(
        UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name = Column(String, nullable=False)
    description = Column(Text)
    kind = Column(String, nullable=False)
    instructions = Column(Text)
    configuration = Column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    is_enabled = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    user = relationship("User", back_populates="agents")
    runs = relationship(
        "AgentRun",
        back_populates="agent",
        order_by="AgentRun.created_at.desc()",
    )
    chat_sessions = relationship("AgentChatSession", back_populates="agent")


class AgentRun(Base):
    """Audit row for an agent execution and the session revision it produced."""

    __tablename__ = "agent_runs"
    __table_args__ = (
        _string_in_check_constraint(
            "trigger_kind",
            AGENT_RUN_TRIGGER_KIND_VALUES,
            name="ck_agent_runs_trigger_kind",
        ),
        _string_in_check_constraint(
            "status",
            AGENT_RUN_STATUS_VALUES,
            name="ck_agent_runs_status",
        ),
        _string_in_check_constraint(
            "source_surface_kind",
            AGENT_RUN_SOURCE_SURFACE_KIND_VALUES,
            name="ck_agent_runs_source_surface_kind",
        ),
        _string_in_check_constraint(
            "apply_status",
            AGENT_RUN_APPLY_STATUS_VALUES,
            name="ck_agent_runs_apply_status",
        ),
        Index("ix_agent_runs_agent_created", "agent_id", "created_at"),
        Index("ix_agent_runs_user_created", "user_id", "created_at"),
    )

    agent_id = Column(
        UUID,
        ForeignKey("agents.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    application_id = Column(
        UUID,
        ForeignKey("applications.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    chat_session_id = Column(
        UUID,
        ForeignKey("agent_chat_sessions.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    parent_run_id = Column(
        UUID,
        ForeignKey("agent_runs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    trigger_kind = Column(
        String,
        nullable=False,
        default="manual",
        server_default=text("'manual'"),
    )
    status = Column(
        String,
        nullable=False,
        default="pending",
        server_default=text("'pending'"),
    )
    input_context = Column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    source_surface_kind = Column(String, nullable=True, index=True)
    source_document_id = Column(
        UUID,
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    source_field_key = Column(String, nullable=True, index=True)
    source_route = Column(String, nullable=True, index=True)
    source_anchor_id = Column(String, nullable=True, index=True)
    apply_status = Column(
        String,
        nullable=False,
        default="pending",
        server_default=text("'pending'"),
        index=True,
    )
    applied_at = Column(DateTime(timezone=True), nullable=True)
    suggested_edit = Column(JSONB, nullable=True)
    session_document_id = Column(
        UUID,
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    session_version_id = Column(
        UUID,
        ForeignKey("document_versions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    error_summary = Column(Text)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    agent = relationship("Agent", back_populates="runs")
    user = relationship("User", back_populates="agent_runs")
    application = relationship("Application", back_populates="agent_runs")
    chat_session = relationship(
        "AgentChatSession",
        back_populates="export_runs",
        foreign_keys=[chat_session_id],
    )
    parent_run = relationship(
        "AgentRun",
        remote_side="AgentRun.id",
        back_populates="child_runs",
    )
    child_runs = relationship("AgentRun", back_populates="parent_run")
    session_document = relationship(
        "Document",
        back_populates="agent_runs",
        foreign_keys=[session_document_id],
    )
    session_version = relationship(
        "DocumentVersion",
        back_populates="agent_runs",
        foreign_keys=[session_version_id],
    )


class AgentChatSession(Base):
    """Persistent chat session for a single agent and user."""

    __tablename__ = "agent_chat_sessions"
    __table_args__ = (
        _string_in_check_constraint(
            "status",
            AGENT_CHAT_SESSION_STATUS_VALUES,
            name="ck_agent_chat_sessions_status",
        ),
        Index("ix_agent_chat_sessions_agent", "agent_id"),
        Index("ix_agent_chat_sessions_user_updated", "user_id", "updated_at"),
    )

    agent_id = Column(
        UUID, ForeignKey("agents.id", ondelete="RESTRICT"), nullable=False
    )
    user_id = Column(UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    application_id = Column(
        UUID,
        ForeignKey("applications.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title = Column(Text, nullable=True)
    model_name = Column(String, nullable=True)
    status = Column(
        String,
        nullable=False,
        default="active",
        server_default=text("'active'"),
    )
    message_count = Column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    last_message_at = Column(DateTime(timezone=True), nullable=True)

    agent = relationship("Agent", back_populates="chat_sessions")
    user = relationship("User", back_populates="chat_sessions")
    application = relationship("Application", back_populates="chat_sessions")
    messages = relationship(
        "AgentChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="AgentChatMessage.created_at.asc()",
    )
    export_runs = relationship(
        "AgentRun",
        back_populates="chat_session",
        foreign_keys="AgentRun.chat_session_id",
        order_by="AgentRun.created_at.desc()",
        passive_deletes=True,
    )


class AgentChatMessage(Base):
    """A single chat message stored inside an agent chat session."""

    __tablename__ = "agent_chat_messages"
    __table_args__ = (
        _string_in_check_constraint(
            "role",
            AGENT_CHAT_MESSAGE_ROLE_VALUES,
            name="ck_agent_chat_messages_role",
        ),
        Index(
            "ix_agent_chat_messages_session_created",
            "session_id",
            "created_at",
            "id",
        ),
    )

    session_id = Column(
        UUID,
        ForeignKey("agent_chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    metadata_ = Column(
        "metadata",
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )

    session = relationship("AgentChatSession", back_populates="messages")


class Contact(Base):
    """
    Represents a contact associated with a user.
    Stores details like name, phone, email, notes.
    """

    __tablename__ = "contacts"
    __table_args__ = (
        UniqueConstraint("user_id", "email", name="uq_contacts_user_email"),
    )
    first_name = Column(String)
    last_name = Column(String)
    phone_number = Column(String)
    email = Column(String)
    time_zone = Column(String)
    notes = Column(Text)
    user_id = Column(UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user = relationship("User", back_populates="contacts")


# ---------------------------------------------------------------------------
#  Unified Document models (versioned, multi-kind)
# ---------------------------------------------------------------------------


class Document(Base):
    """
    Unified document model replacing legacy flat material tables.
    Each document has a kind discriminator and append-only version history.
    """

    __tablename__ = "documents"
    __table_args__ = (
        _string_in_check_constraint(
            "kind",
            DOCUMENT_KIND_VALUES,
            name="ck_documents_kind",
        ),
        _string_in_check_constraint(
            "status",
            DOCUMENT_STATUS_VALUES,
            name="ck_documents_status",
        ),
        Index("ix_documents_user_kind_status", "user_id", "kind", "status"),
    )

    user_id = Column(
        UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    status = Column(
        String,
        nullable=False,
        default="draft",
        server_default=text("'draft'"),
    )
    is_pinned = Column(
        Boolean,
        default=False,
        nullable=False,
        server_default=text("false"),
    )
    head_version_id = Column(
        UUID, ForeignKey("document_versions.id", ondelete="SET NULL"), nullable=True
    )
    yjs_state = Column(LargeBinary, nullable=True)

    user = relationship("User", back_populates="documents")
    versions = relationship(
        "DocumentVersion",
        back_populates="document",
        foreign_keys="DocumentVersion.document_id",
        cascade="all, delete-orphan",
        order_by="DocumentVersion.version_number",
        lazy="selectin",
    )
    head_version = relationship(
        "DocumentVersion",
        foreign_keys=[head_version_id],
        post_update=True,
        uselist=False,
        lazy="selectin",
    )
    shares = relationship(
        "DocumentShare",
        back_populates="document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    activities = relationship(
        "DocumentActivity",
        back_populates="document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    blocks = relationship(
        "DocumentBlock",
        back_populates="document",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="DocumentBlock.position",
        lazy="selectin",
    )
    applications = relationship(
        "Application",
        secondary="documents_x_applications",
        back_populates="documents",
    )
    agent_runs = relationship(
        "AgentRun",
        back_populates="session_document",
        foreign_keys="AgentRun.session_document_id",
    )
    embeddings = relationship(
        "DocumentEmbedding",
        back_populates="document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class DocumentVersion(Base):
    """
    Immutable snapshot of document content.  Every save creates a new row.
    """

    __tablename__ = "document_versions"
    __table_args__ = (
        UniqueConstraint("document_id", "version_number"),
        _string_in_check_constraint(
            "content_format",
            DOCUMENT_CONTENT_FORMAT_VALUES,
            name="ck_document_versions_content_format",
        ),
    )

    document_id = Column(
        UUID, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version_number = Column(Integer, nullable=False)
    name = Column(String)
    content = Column(Text)
    content_type = Column(String)
    content_format = Column(
        String,
        default="plain_text",
        nullable=False,
        server_default=text("'plain_text'"),
    )
    block_snapshot = Column(JSONB, nullable=True)
    source_file = Column(String, nullable=True)
    change_summary = Column(String)

    document = relationship(
        "Document",
        back_populates="versions",
        foreign_keys=[document_id],
    )
    agent_runs = relationship(
        "AgentRun",
        back_populates="session_version",
        foreign_keys="AgentRun.session_version_id",
    )


class DocumentBlock(Base):
    """Stable block row backing cell-doc authoring and version restore."""

    __tablename__ = "document_blocks"
    __table_args__ = (
        _string_in_check_constraint(
            "block_type",
            DOCUMENT_BLOCK_TYPE_VALUES,
            name="ck_document_blocks_block_type",
        ),
        Index("ix_document_blocks_document_id", "document_id"),
        Index("ix_document_blocks_parent", "parent_block_id"),
        Index(
            "ix_document_blocks_doc_parent_pos",
            "document_id",
            "parent_block_id",
            "position",
        ),
    )

    document_id = Column(
        UUID,
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    parent_block_id = Column(
        UUID,
        ForeignKey("document_blocks.id", ondelete="CASCADE"),
        nullable=True,
    )
    block_type = Column(String, nullable=False)
    content = Column(JSONB, nullable=True)
    properties = Column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    position = Column(Integer, nullable=False, default=0, server_default=text("0"))

    document = relationship("Document", back_populates="blocks")
    parent_block = relationship(
        "DocumentBlock",
        remote_side="DocumentBlock.id",
        back_populates="children",
    )
    children = relationship(
        "DocumentBlock",
        back_populates="parent_block",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="DocumentBlock.position",
    )
    activities = relationship(
        "DocumentActivity",
        primaryjoin="DocumentBlock.id == foreign(DocumentActivity.block_id)",
        foreign_keys="DocumentActivity.block_id",
        viewonly=True,
    )


_documents_x_applications_table = Table(
    "documents_x_applications",
    Base.metadata,
    Column(
        "application_id",
        UUID,
        ForeignKey("applications.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "document_id",
        UUID,
        ForeignKey("documents.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "version_id",
        UUID,
        ForeignKey("document_versions.id", ondelete="SET NULL"),
        nullable=True,
    ),
)


class DocumentXApplication:
    """Mapped junction: documents ↔ applications. No surrogate ID or timestamps."""

    __tablename__ = "documents_x_applications"


Base.registry.map_imperatively(DocumentXApplication, _documents_x_applications_table)


class DocumentShare(Base):
    """Grants another user view or edit access to a document."""

    __tablename__ = "document_shares"
    __table_args__ = (
        UniqueConstraint(
            "document_id", "shared_with_user_id", name="uq_document_share_user"
        ),
        _string_in_check_constraint(
            "role",
            DOCUMENT_SHARE_ROLE_VALUES,
            name="ck_document_shares_role",
        ),
    )

    document_id = Column(
        UUID, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    shared_with_user_id = Column(
        UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    shared_by_user_id = Column(
        UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role = Column(
        String,
        nullable=False,
        default="viewer",
        server_default=text("'viewer'"),
    )  # viewer | editor

    document = relationship("Document", back_populates="shares")
    shared_with_user = relationship("User", foreign_keys=[shared_with_user_id])
    shared_by_user = relationship("User", foreign_keys=[shared_by_user_id])


class DocumentActivity(Base):
    """Audit-style activity event recorded against a document."""

    __tablename__ = "document_activities"
    __table_args__ = (
        _string_in_check_constraint(
            "activity_type",
            DOCUMENT_ACTIVITY_TYPE_VALUES,
            name="ck_document_activities_activity_type",
        ),
    )

    document_id = Column(
        UUID, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    block_id = Column(UUID, nullable=True, index=True)
    actor_user_id = Column(
        UUID, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    activity_type = Column(String, nullable=False, index=True)
    message = Column(String, nullable=False)
    details = Column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )

    document = relationship("Document", back_populates="activities")
    block = relationship(
        "DocumentBlock",
        primaryjoin="foreign(DocumentActivity.block_id) == DocumentBlock.id",
        foreign_keys=[block_id],
        viewonly=True,
    )
    actor = relationship("User", foreign_keys=[actor_user_id])


class DocumentEmbedding(Base):
    """Stores vector embeddings for document chunks, enabling semantic search."""

    __tablename__ = "document_embeddings"
    __table_args__ = (
        Index(
            "ix_document_embeddings_vector",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    document_id = Column(
        UUID, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    document_version_id = Column(
        UUID,
        ForeignKey("document_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    chunk_index = Column(Integer, nullable=False, default=0)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(Vector(1536), nullable=False)

    document = relationship("Document", back_populates="embeddings")
    document_version = relationship("DocumentVersion")
    user = relationship("User")


class ActionItem(Base):
    """
    Tracks user-facing tasks and follow-ups across applications, leads,
    documents, and conversations.
    """

    __tablename__ = "action_items"
    __table_args__ = (
        CheckConstraint(
            "("
            "(application_id IS NOT NULL)::int + "
            "(lead_id IS NOT NULL)::int + "
            "(document_id IS NOT NULL)::int + "
            "(conversation_id IS NOT NULL)::int"
            ") <= 1",
            name="ck_action_items_at_most_one_fk",
        ),
        _string_in_check_constraint(
            "kind",
            ACTION_ITEM_KIND_VALUES,
            name="ck_action_items_kind",
        ),
        _string_in_check_constraint(
            "status",
            ACTION_ITEM_STATUS_VALUES,
            name="ck_action_items_status",
        ),
        _string_in_check_constraint(
            "priority",
            ACTION_ITEM_PRIORITY_VALUES,
            name="ck_action_items_priority",
        ),
        Index("ix_action_items_user_status", "user_id", "status"),
        Index("ix_action_items_user_due_at", "user_id", "due_at"),
    )

    user_id = Column(
        UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    kind = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, default="pending")
    priority = Column(String, nullable=False, default="medium")
    due_at = Column(DateTime(timezone=True), nullable=True, index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")

    # Polymorphic nullable FKs
    application_id = Column(
        UUID, ForeignKey("applications.id", ondelete="CASCADE"), nullable=True
    )
    lead_id = Column(UUID, ForeignKey("leads.id", ondelete="CASCADE"), nullable=True)
    document_id = Column(
        UUID, ForeignKey("documents.id", ondelete="CASCADE"), nullable=True
    )
    conversation_id = Column(
        UUID, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=True
    )

    # Relationships
    user = relationship("User", back_populates="action_items")
    application = relationship("Application", lazy="selectin")
    lead = relationship("Lead", lazy="selectin")
    document = relationship("Document", lazy="selectin")
    conversation = relationship("Conversation", lazy="selectin")


class User(SQLAlchemyBaseUserTableUUID, Base):  # type: ignore
    """
    Extended user model with additional fields like name, contact information, and address.
    Core of user-related operations, linked to applications, skills, experiences, etc.
    """

    __tablename__ = "users"
    first_name = Column(String)
    last_name = Column(String)
    phone_number = Column(String)
    address_line_1 = Column(String)
    address_line_2 = Column(String)
    city = Column(String)
    state = Column(String)
    zip_code = Column(String)
    country = Column(String)
    time_zone = Column(String)
    avatar_uri = Column(String)

    # Social / subscription / lifecycle fields
    headline = Column(Text)
    bio = Column(Text)
    is_discoverable = Column(
        Boolean,
        default=False,
        nullable=False,
        server_default=text("false"),
    )
    subscription_tier = Column(
        String,
        default="free",
        nullable=False,
        server_default=text("'free'"),
    )
    subscription_expires_at = Column(DateTime(timezone=True))
    placement_status = Column(
        String,
        default="active",
        nullable=False,
        server_default=text("'active'"),
    )
    placement_date = Column(DateTime(timezone=True))

    # MFA / Two-Factor Authentication
    mfa_secret = Column(String, nullable=True)
    mfa_enabled = Column(
        Boolean,
        default=False,
        nullable=False,
        server_default=text("false"),
    )

    lead_registrations = relationship(
        "LeadRegistration",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    leads = relationship(
        "Lead",
        secondary="lead_registrations",
        back_populates="users",
        viewonly=True,
    )
    lead_comments = relationship(
        "LeadComment",
        back_populates="author",
        cascade="all, delete-orphan",
    )
    agents = relationship("Agent", back_populates="user")
    agent_runs = relationship("AgentRun", back_populates="user")
    applications = relationship("Application", back_populates="user")
    contacts = relationship("Contact", back_populates="user")
    skills = relationship("Skill", back_populates="user")
    experiences = relationship("Experience", back_populates="user")
    education = relationship("Education", back_populates="user")
    certificates = relationship("Certificate", back_populates="user")
    aspirations = relationship(
        "Aspiration",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    documents = relationship("Document", back_populates="user")
    extractors = relationship("Extractor", back_populates="user")
    chat_sessions = relationship("AgentChatSession", back_populates="user")
    orchestration_pipelines = relationship(
        "OrchestrationPipeline", back_populates="user"
    )
    crawler_pipelines = relationship("CrawlerPipeline", back_populates="created_by")
    action_items = relationship(
        "ActionItem",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    sent_connections = relationship(
        "Connection",
        foreign_keys="Connection.requester_id",
        back_populates="requester",
        cascade="all, delete-orphan",
    )
    received_connections = relationship(
        "Connection",
        foreign_keys="Connection.addressee_id",
        back_populates="addressee",
        cascade="all, delete-orphan",
    )


@event.listens_for(User, "before_insert")
def _apply_user_visibility_defaults(_mapper, _connection, target: User) -> None:
    if target.is_superuser and target.is_discoverable is None:
        target.is_discoverable = True


class Connection(Base):
    """Represents a peer connection request between two users.

    Bidirectional dedup decision (S-2.8): Application-layer guard prevents
    (A→B) + (B→A) duplicates.  A DB-level UNIQUE index on
    (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id))
    is the upgrade path if DB enforcement is needed later.  For the developer
    preview the route-level check is sufficient and avoids changing the
    semantic meaning of requester/addressee column ordering.
    """

    __tablename__ = "connections"
    __table_args__ = (
        UniqueConstraint("requester_id", "addressee_id"),
        _string_in_check_constraint(
            "status",
            CONNECTION_STATUS_VALUES,
            name="ck_connections_status",
        ),
        Index("ix_connections_requester_status", "requester_id", "status"),
        Index("ix_connections_addressee_status", "addressee_id", "status"),
    )

    requester_id = Column(
        UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    addressee_id = Column(
        UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status = Column(String, default="pending", nullable=False)
    message = Column(Text)

    requester = relationship(
        "User", foreign_keys=[requester_id], back_populates="sent_connections"
    )
    addressee = relationship(
        "User", foreign_keys=[addressee_id], back_populates="received_connections"
    )


# ---------------------------------------------------------------------------
#  Messaging models
# ---------------------------------------------------------------------------


class Conversation(Base):
    """Represents a direct or group messaging conversation."""

    __tablename__ = "conversations"
    __table_args__ = (
        _string_in_check_constraint(
            "type",
            CONVERSATION_TYPE_VALUES,
            name="ck_conversations_type",
        ),
    )

    type = Column(String, nullable=False)  # "direct" or "group"
    title = Column(Text, nullable=True)
    created_by_user_id = Column(
        UUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    created_by = relationship("User")
    participants = relationship(
        "ConversationParticipant",
        back_populates="conversation",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class ConversationParticipant(Base):
    """Junction table linking users to conversations."""

    __tablename__ = "conversation_participants"
    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id"),
        _string_in_check_constraint(
            "role",
            CONVERSATION_PARTICIPANT_ROLE_VALUES,
            name="ck_conversation_participants_role",
        ),
    )

    conversation_id = Column(
        UUID,
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        primary_key=True,
    )
    user_id = Column(
        UUID,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        primary_key=True,
    )
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    last_read_at = Column(DateTime(timezone=True), nullable=True)
    role = Column(String, default="member")  # "member" or "admin"

    conversation = relationship("Conversation", back_populates="participants")
    user = relationship("User")


class Message(Base):
    """A single message within a conversation."""

    __tablename__ = "messages"
    __table_args__ = (
        Index("ix_messages_conversation_created", "conversation_id", "created_at"),
    )

    conversation_id = Column(
        UUID,
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_user_id = Column(
        UUID, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    content = Column(Text, nullable=False)
    parent_message_id = Column(
        UUID, ForeignKey("messages.id", ondelete="CASCADE"), nullable=True
    )
    edited_at = Column(DateTime(timezone=True), nullable=True)

    conversation = relationship("Conversation", back_populates="messages")
    author = relationship("User")
    parent = relationship(
        "Message",
        remote_side="Message.id",
        back_populates="replies",
    )
    replies = relationship(
        "Message",
        back_populates="parent",
        cascade="all, delete-orphan",
    )
