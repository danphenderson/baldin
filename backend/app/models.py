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
    Text,
    UniqueConstraint,
    event,
    func,
    text,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
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


# Kept as the union of stage + outcome values for the native Postgres enum column.
# The DB column name and enum type name stay the same so existing rows remain valid.
class ApplicationStatus(str, enum.Enum):
    REGISTERED = "registered"
    APPLIED = "applied"
    SCREENING = "screening"
    INTERVIEW = "interview"
    OFFER = "offer"
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


class Base(DeclarativeBase):
    """
    Base model for all database entities.
    Provides common attributes like ID, creation, and update timestamps.
    Inherits from SQLAlchemy's DeclarativeBase.
    """

    __abstract__ = True

    id = Column(UUID, primary_key=True, default=uuid4)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


# Data Orchestration models


class OrchestrationEvent(Base):
    """
    Model for orchestration events.
    Contains orchestration pipeline event status, message, and reference to the pipeline.
    Useful for tracking the status of ETL jobs.
    """

    __tablename__ = "orchestration_events"
    status = Column(String, default="pending")  # running, success, failure
    message = Column(Text)
    payload = Column(JSON)
    environment = Column(String)
    source_uri = Column(JSON)
    destination_uri = Column(JSON)
    version_hash = Column(String, nullable=True)
    retry_of_id = Column(UUID, ForeignKey("orchestration_events.id"), nullable=True)
    pipeline_id = Column(UUID, ForeignKey("orchestration_pipelines.id"))
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
    user_id = Column(UUID, ForeignKey("users.id"))
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
        UUID, ForeignKey("crawler_pipelines.id"), nullable=False, index=True
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
    scheduled_for = Column(DateTime)
    started_at = Column(DateTime)
    finished_at = Column(DateTime)
    checkpoint = Column(JSON)
    stats = Column(JSON)
    error_summary = Column(Text)
    retry_of_id = Column(UUID, ForeignKey("crawler_runs.id"), nullable=True)
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
    extractor_id = Column(UUID, ForeignKey("extractors.id"))
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
    user_id = Column(UUID, ForeignKey("users.id"))
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
    extractor_id = Column(UUID, ForeignKey("extractors.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    instruction = Column(Text)
    json_schema = Column(JSONB)
    version_hash = Column(String, nullable=False, index=True)

    extractor = relationship("Extractor", back_populates="versions")


class LeadXCompany(Base):
    __tablename__ = "leads_x_companies"
    lead_id = Column(UUID, ForeignKey("leads.id"), primary_key=True)
    company_id = Column(UUID, ForeignKey("companies.id"), primary_key=True)


class LeadRegistration(Base):
    """Represents a viewer's registration or interest for a shared lead."""

    __tablename__ = "lead_registrations"
    __table_args__ = (UniqueConstraint("lead_id", "user_id"),)

    lead_id = Column(UUID, ForeignKey("leads.id"), nullable=False, index=True)
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False, index=True)
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

    application = relationship("Application", back_populates="lead")
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
    lead_id = Column(UUID, ForeignKey("leads.id"), nullable=False, index=True)
    author_user_id = Column(UUID, ForeignKey("users.id"), nullable=False, index=True)
    parent_comment_id = Column(UUID, ForeignKey("lead_comments.id"), index=True)
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
    subskills = Column(String)
    user_id = Column(UUID, ForeignKey("users.id"))
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
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    description = Column(Text)
    projects = Column(String)

    user_id = Column(UUID, ForeignKey("users.id"))
    user = relationship("User", back_populates="experiences")


# Add Education model
class Education(Base):
    __tablename__ = "user_education"
    university = Column(String)
    degree = Column(String)
    gradePoint = Column(String)
    activities = Column(JSON)  # Assuming activities are stored as JSON
    achievements = Column(JSON)  # Assuming achievements are stored as JSON
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    user_id = Column(UUID, ForeignKey("users.id"))
    user = relationship("User", back_populates="education")


# Add Certificate model
class Certificate(Base):
    __tablename__ = "user_certificates"
    title = Column(String)
    issuer = Column(String)
    expiration_date = Column(DateTime)  # Assuming date is stored as a DateTime
    issued_date = Column(DateTime)  # Assuming date is stored as a DateTime
    user_id = Column(UUID, ForeignKey("users.id"))
    user = relationship("User", back_populates="certificates")


class Application(Base):
    """
    Model for job applications.
    Contains notes, status, and linked versioned documents.
    Linked to users and job leads through many-to-one relationships.
    """

    __tablename__ = "applications"
    status = Column(
        SAEnum(
            ApplicationStatus,
            name="applicationstatus",
            native_enum=True,
            values_callable=_enum_values,
        ),
        nullable=True,
    )
    notes = Column(Text)
    next_step = Column(String)
    next_step_due = Column(DateTime)
    outcome_reason = Column(Text)
    status_history = Column(JSONB, server_default="[]")
    lead_id = Column(UUID, ForeignKey("leads.id"), index=True)
    user_id = Column(UUID, ForeignKey("users.id"))
    lead = relationship("Lead", back_populates="application", uselist=False)
    user = relationship("User", back_populates="applications")
    documents = relationship(
        "Document",
        secondary="documents_x_applications",
        back_populates="applications",
    )


class Contact(Base):
    """
    Represents a contact associated with a user.
    Stores details like name, phone, email, notes.
    """

    __tablename__ = "contacts"
    first_name = Column(String)
    last_name = Column(String)
    phone_number = Column(String)
    email = Column(String)
    time_zone = Column(String)
    notes = Column(Text)
    user_id = Column(UUID, ForeignKey("users.id"))
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

    user_id = Column(UUID, ForeignKey("users.id"), nullable=False, index=True)
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
    head_version_id = Column(UUID, ForeignKey("document_versions.id"))
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
    applications = relationship(
        "Application",
        secondary="documents_x_applications",
        back_populates="documents",
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
    __table_args__ = (UniqueConstraint("document_id", "version_number"),)

    document_id = Column(UUID, ForeignKey("documents.id"), nullable=False, index=True)
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
    source_file = Column(String, nullable=True)
    change_summary = Column(String)

    document = relationship(
        "Document",
        back_populates="versions",
        foreign_keys=[document_id],
    )


class DocumentXApplication(Base):
    """Junction: links a document (optionally at a specific version) to an application."""

    __tablename__ = "documents_x_applications"
    __table_args__ = (UniqueConstraint("application_id", "document_id"),)

    application_id = Column(UUID, ForeignKey("applications.id"), primary_key=True)
    document_id = Column(UUID, ForeignKey("documents.id"), primary_key=True)
    version_id = Column(UUID, ForeignKey("document_versions.id"))


class DocumentShare(Base):
    """Grants another user view or edit access to a document."""

    __tablename__ = "document_shares"
    __table_args__ = (
        UniqueConstraint(
            "document_id", "shared_with_user_id", name="uq_document_share_user"
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

    document_id = Column(
        UUID, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True
    )
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
    )

    user_id = Column(UUID, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    kind = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, default="pending")
    priority = Column(String, nullable=False, default="medium")
    due_at = Column(DateTime, nullable=True, index=True)
    completed_at = Column(DateTime, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")

    # Polymorphic nullable FKs
    application_id = Column(UUID, ForeignKey("applications.id"), nullable=True)
    lead_id = Column(UUID, ForeignKey("leads.id"), nullable=True)
    document_id = Column(UUID, ForeignKey("documents.id"), nullable=True)
    conversation_id = Column(UUID, ForeignKey("conversations.id"), nullable=True)

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
    subscription_expires_at = Column(DateTime)
    placement_status = Column(
        String,
        default="active",
        nullable=False,
        server_default=text("'active'"),
    )
    placement_date = Column(DateTime)

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
    applications = relationship("Application", back_populates="user")
    contacts = relationship("Contact", back_populates="user")
    skills = relationship("Skill", back_populates="user")
    experiences = relationship("Experience", back_populates="user")
    education = relationship("Education", back_populates="user")
    certificates = relationship("Certificate", back_populates="user")
    documents = relationship("Document", back_populates="user")
    extractors = relationship("Extractor", back_populates="user")
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
    """Represents a peer connection request between two users."""

    __tablename__ = "connections"
    __table_args__ = (UniqueConstraint("requester_id", "addressee_id"),)

    requester_id = Column(UUID, ForeignKey("users.id"), nullable=False, index=True)
    addressee_id = Column(UUID, ForeignKey("users.id"), nullable=False, index=True)
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

    type = Column(String, nullable=False)  # "direct" or "group"
    title = Column(Text, nullable=True)
    created_by_user_id = Column(UUID, ForeignKey("users.id"), nullable=False)

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
    __table_args__ = (UniqueConstraint("conversation_id", "user_id"),)

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
    joined_at = Column(DateTime, server_default=func.now())
    last_read_at = Column(DateTime, nullable=True)
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
    author_user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    parent_message_id = Column(UUID, ForeignKey("messages.id"), nullable=True)
    edited_at = Column(DateTime, nullable=True)

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
