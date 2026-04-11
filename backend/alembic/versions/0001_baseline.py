"""baseline

Captures the current Baldin schema as-is so that ``alembic upgrade head``
on a fresh database produces the identical schema that ``metadata.create_all``
would.  On an *existing* database, run ``alembic stamp head`` instead.

The circular FK between ``documents`` and ``document_versions`` is handled
by creating ``document_versions`` first *without* its FK to ``documents``,
then creating ``documents`` (which references ``document_versions``), and
finally adding the deferred FK from ``document_versions`` → ``documents``.

Revision ID: 0001
Revises:
Create Date: 2026-04-10
"""

from typing import Sequence, Union

import fastapi_users_db_sqlalchemy.generics
import pgvector.sqlalchemy.vector
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Extensions --------------------------------------------------------
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # =====================================================================
    # Tier 0 — root tables (no FK dependencies)
    # =====================================================================

    op.create_table(
        "companies",
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("industry", sa.String(), nullable=True),
        sa.Column("size", sa.String(), nullable=True),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "leads",
        sa.Column("url", sa.String(), nullable=False),
        sa.Column("canonical_url", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("salary", sa.String(), nullable=True),
        sa.Column("job_function", sa.String(), nullable=True),
        sa.Column("employment_type", sa.String(), nullable=True),
        sa.Column("seniority_level", sa.String(), nullable=True),
        sa.Column("education_level", sa.String(), nullable=True),
        sa.Column("hiring_manager", sa.String(), nullable=True),
        sa.Column(
            "review_status",
            sa.Enum(
                "pending_review",
                "approved",
                "rejected",
                name="leadreviewstatus",
            ),
            nullable=True,
        ),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_leads_canonical_url"), "leads", ["canonical_url"], unique=True
    )

    op.create_table(
        "users",
        sa.Column("first_name", sa.String(), nullable=True),
        sa.Column("last_name", sa.String(), nullable=True),
        sa.Column("phone_number", sa.String(), nullable=True),
        sa.Column("address_line_1", sa.String(), nullable=True),
        sa.Column("address_line_2", sa.String(), nullable=True),
        sa.Column("city", sa.String(), nullable=True),
        sa.Column("state", sa.String(), nullable=True),
        sa.Column("zip_code", sa.String(), nullable=True),
        sa.Column("country", sa.String(), nullable=True),
        sa.Column("time_zone", sa.String(), nullable=True),
        sa.Column("avatar_uri", sa.String(), nullable=True),
        sa.Column("headline", sa.Text(), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column(
            "is_discoverable",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column(
            "subscription_tier",
            sa.String(),
            server_default=sa.text("'free'"),
            nullable=False,
        ),
        sa.Column("subscription_expires_at", sa.DateTime(), nullable=True),
        sa.Column(
            "placement_status",
            sa.String(),
            server_default=sa.text("'active'"),
            nullable=False,
        ),
        sa.Column("placement_date", sa.DateTime(), nullable=True),
        sa.Column("mfa_secret", sa.String(), nullable=True),
        sa.Column(
            "mfa_enabled",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("id", fastapi_users_db_sqlalchemy.generics.GUID(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("hashed_password", sa.String(length=1024), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("is_superuser", sa.Boolean(), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # =====================================================================
    # Tier 1a — document_versions (circular FK to documents deferred)
    # =====================================================================

    op.create_table(
        "document_versions",
        sa.Column("document_id", sa.UUID(), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("content_type", sa.String(), nullable=True),
        sa.Column(
            "content_format",
            sa.String(),
            server_default=sa.text("'plain_text'"),
            nullable=False,
        ),
        sa.Column("source_file", sa.String(), nullable=True),
        sa.Column("change_summary", sa.String(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("document_id", "version_number"),
    )
    op.create_index(
        op.f("ix_document_versions_document_id"),
        "document_versions",
        ["document_id"],
        unique=False,
    )

    # =====================================================================
    # Tier 1b — documents (depends on users, document_versions)
    # =====================================================================

    op.create_table(
        "documents",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column(
            "status",
            sa.String(),
            server_default=sa.text("'draft'"),
            nullable=False,
        ),
        sa.Column(
            "is_pinned",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("head_version_id", sa.UUID(), nullable=True),
        sa.Column("yjs_state", sa.LargeBinary(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["head_version_id"], ["document_versions.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_documents_kind"), "documents", ["kind"], unique=False)
    op.create_index(
        op.f("ix_documents_user_id"), "documents", ["user_id"], unique=False
    )

    # --- deferred FK: document_versions.document_id → documents.id ---------
    op.create_foreign_key(
        "fk_document_versions_document_id",
        "document_versions",
        "documents",
        ["document_id"],
        ["id"],
    )

    # =====================================================================
    # Tier 1 — tables that depend only on root tables
    # =====================================================================

    op.create_table(
        "applications",
        sa.Column(
            "status",
            sa.Enum(
                "registered",
                "applied",
                "screening",
                "interview",
                "offer",
                "rejected",
                "withdrawn",
                name="applicationstatus",
            ),
            nullable=True,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("next_step", sa.String(), nullable=True),
        sa.Column("next_step_due", sa.DateTime(), nullable=True),
        sa.Column("outcome_reason", sa.Text(), nullable=True),
        sa.Column(
            "status_history",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default="[]",
            nullable=True,
        ),
        sa.Column("lead_id", sa.UUID(), nullable=True),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_applications_lead_id"), "applications", ["lead_id"], unique=False
    )

    op.create_table(
        "connections",
        sa.Column("requester_id", sa.UUID(), nullable=False),
        sa.Column("addressee_id", sa.UUID(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["addressee_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["requester_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("requester_id", "addressee_id"),
    )
    op.create_index(
        op.f("ix_connections_addressee_id"),
        "connections",
        ["addressee_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_connections_requester_id"),
        "connections",
        ["requester_id"],
        unique=False,
    )

    op.create_table(
        "contacts",
        sa.Column("first_name", sa.String(), nullable=True),
        sa.Column("last_name", sa.String(), nullable=True),
        sa.Column("phone_number", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("time_zone", sa.String(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "conversations",
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "crawler_pipelines",
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("query_definition", sa.JSON(), nullable=False),
        sa.Column("schedule_definition", sa.JSON(), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("execution_policy", sa.JSON(), nullable=True),
        sa.Column("extraction_policy", sa.JSON(), nullable=True),
        sa.Column(
            "requires_approval",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("created_by_user_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_crawler_pipelines_name"),
        "crawler_pipelines",
        ["name"],
        unique=False,
    )

    op.create_table(
        "document_activities",
        sa.Column("document_id", sa.UUID(), nullable=False),
        sa.Column("actor_user_id", sa.UUID(), nullable=True),
        sa.Column("activity_type", sa.String(), nullable=False),
        sa.Column("message", sa.String(), nullable=False),
        sa.Column(
            "details",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_document_activities_activity_type"),
        "document_activities",
        ["activity_type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_document_activities_actor_user_id"),
        "document_activities",
        ["actor_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_document_activities_document_id"),
        "document_activities",
        ["document_id"],
        unique=False,
    )

    op.create_table(
        "document_embeddings",
        sa.Column("document_id", sa.UUID(), nullable=False),
        sa.Column("document_version_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column(
            "embedding",
            pgvector.sqlalchemy.vector.VECTOR(dim=1536),
            nullable=False,
        ),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["document_version_id"],
            ["document_versions.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_document_embeddings_document_id"),
        "document_embeddings",
        ["document_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_document_embeddings_document_version_id"),
        "document_embeddings",
        ["document_version_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_document_embeddings_user_id"),
        "document_embeddings",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_document_embeddings_vector",
        "document_embeddings",
        ["embedding"],
        unique=False,
        postgresql_using="hnsw",
        postgresql_with={"m": 16, "ef_construction": 64},
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )

    op.create_table(
        "document_shares",
        sa.Column("document_id", sa.UUID(), nullable=False),
        sa.Column("shared_with_user_id", sa.UUID(), nullable=False),
        sa.Column("shared_by_user_id", sa.UUID(), nullable=False),
        sa.Column(
            "role",
            sa.String(),
            server_default=sa.text("'viewer'"),
            nullable=False,
        ),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["shared_by_user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["shared_with_user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "document_id", "shared_with_user_id", name="uq_document_share_user"
        ),
    )
    op.create_index(
        op.f("ix_document_shares_document_id"),
        "document_shares",
        ["document_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_document_shares_shared_with_user_id"),
        "document_shares",
        ["shared_with_user_id"],
        unique=False,
    )

    op.create_table(
        "extractors",
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "json_schema",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("instruction", sa.Text(), nullable=True),
        sa.Column(
            "requires_approval",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_extractors_name"), "extractors", ["name"], unique=False)

    op.create_table(
        "lead_comments",
        sa.Column("lead_id", sa.UUID(), nullable=False),
        sa.Column("author_user_id", sa.UUID(), nullable=False),
        sa.Column("parent_comment_id", sa.UUID(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("anonymous", sa.Boolean(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["author_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.id"]),
        sa.ForeignKeyConstraint(["parent_comment_id"], ["lead_comments.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_lead_comments_author_user_id"),
        "lead_comments",
        ["author_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_lead_comments_lead_id"),
        "lead_comments",
        ["lead_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_lead_comments_parent_comment_id"),
        "lead_comments",
        ["parent_comment_id"],
        unique=False,
    )

    op.create_table(
        "lead_registrations",
        sa.Column("lead_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("internal_notes", sa.Text(), nullable=True),
        sa.Column("expose_profile", sa.Boolean(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("lead_id", "user_id"),
    )
    op.create_index(
        op.f("ix_lead_registrations_lead_id"),
        "lead_registrations",
        ["lead_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_lead_registrations_user_id"),
        "lead_registrations",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "leads_x_companies",
        sa.Column("lead_id", sa.UUID(), nullable=False),
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.id"]),
        sa.PrimaryKeyConstraint("lead_id", "company_id", "id"),
    )

    op.create_table(
        "orchestration_pipelines",
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("definition", sa.JSON(), nullable=True),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "name"),
    )
    op.create_index(
        op.f("ix_orchestration_pipelines_name"),
        "orchestration_pipelines",
        ["name"],
        unique=False,
    )

    op.create_table(
        "user_certificates",
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("issuer", sa.String(), nullable=True),
        sa.Column("expiration_date", sa.DateTime(), nullable=True),
        sa.Column("issued_date", sa.DateTime(), nullable=True),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "user_education",
        sa.Column("university", sa.String(), nullable=True),
        sa.Column("degree", sa.String(), nullable=True),
        sa.Column("gradePoint", sa.String(), nullable=True),
        sa.Column("activities", sa.JSON(), nullable=True),
        sa.Column("achievements", sa.JSON(), nullable=True),
        sa.Column("start_date", sa.DateTime(), nullable=True),
        sa.Column("end_date", sa.DateTime(), nullable=True),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "user_experiences",
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("company", sa.String(), nullable=True),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("start_date", sa.DateTime(), nullable=True),
        sa.Column("end_date", sa.DateTime(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("projects", sa.String(), nullable=True),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "user_skills",
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("yoe", sa.Integer(), nullable=True),
        sa.Column("subskills", sa.String(), nullable=True),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # =====================================================================
    # Tier 2 — tables that depend on Tier 1 tables
    # =====================================================================

    op.create_table(
        "action_items",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("priority", sa.String(), nullable=False),
        sa.Column("due_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("application_id", sa.UUID(), nullable=True),
        sa.Column("lead_id", sa.UUID(), nullable=True),
        sa.Column("document_id", sa.UUID(), nullable=True),
        sa.Column("conversation_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.CheckConstraint(
            "((application_id IS NOT NULL)::int"
            " + (lead_id IS NOT NULL)::int"
            " + (document_id IS NOT NULL)::int"
            " + (conversation_id IS NOT NULL)::int) <= 1",
            name="ck_action_items_at_most_one_fk",
        ),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"]),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"]),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"]),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_action_items_due_at"), "action_items", ["due_at"], unique=False
    )
    op.create_index(
        op.f("ix_action_items_kind"), "action_items", ["kind"], unique=False
    )
    op.create_index(
        op.f("ix_action_items_user_id"),
        "action_items",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "conversation_participants",
        sa.Column("conversation_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column(
            "joined_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column("last_read_at", sa.DateTime(), nullable=True),
        sa.Column("role", sa.String(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["conversation_id"], ["conversations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("conversation_id", "user_id", "id"),
        sa.UniqueConstraint("conversation_id", "user_id"),
    )

    op.create_table(
        "crawler_runs",
        sa.Column("crawler_pipeline_id", sa.UUID(), nullable=False),
        sa.Column("trigger_type", sa.String(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "pending",
                "running",
                "success",
                "failed",
                "cancelled",
                "paused",
                "pending_review",
                name="crawlerrunstatus",
            ),
            nullable=False,
        ),
        sa.Column("scheduled_for", sa.DateTime(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
        sa.Column("checkpoint", sa.JSON(), nullable=True),
        sa.Column("stats", sa.JSON(), nullable=True),
        sa.Column("error_summary", sa.Text(), nullable=True),
        sa.Column("retry_of_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["crawler_pipeline_id"], ["crawler_pipelines.id"]),
        sa.ForeignKeyConstraint(["retry_of_id"], ["crawler_runs.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_crawler_runs_crawler_pipeline_id"),
        "crawler_runs",
        ["crawler_pipeline_id"],
        unique=False,
    )

    op.create_table(
        "documents_x_applications",
        sa.Column("application_id", sa.UUID(), nullable=False),
        sa.Column("document_id", sa.UUID(), nullable=False),
        sa.Column("version_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"]),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"]),
        sa.ForeignKeyConstraint(["version_id"], ["document_versions.id"]),
        sa.PrimaryKeyConstraint("application_id", "document_id", "id"),
        sa.UniqueConstraint("application_id", "document_id"),
    )

    op.create_table(
        "extractor_examples",
        sa.Column(
            "content",
            sa.Text(),
            nullable=False,
            comment="The input portion of the example.",
        ),
        sa.Column(
            "output",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            comment="The output associated with the example.",
        ),
        sa.Column("extractor_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["extractor_id"], ["extractors.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "extractor_versions",
        sa.Column("extractor_id", sa.UUID(), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("instruction", sa.Text(), nullable=True),
        sa.Column(
            "json_schema",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("version_hash", sa.String(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["extractor_id"], ["extractors.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "extractor_id",
            "version_number",
            name="uq_extractor_versions_extractor_id_version_number",
        ),
    )
    op.create_index(
        op.f("ix_extractor_versions_extractor_id"),
        "extractor_versions",
        ["extractor_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_extractor_versions_version_hash"),
        "extractor_versions",
        ["version_hash"],
        unique=False,
    )

    op.create_table(
        "messages",
        sa.Column("conversation_id", sa.UUID(), nullable=False),
        sa.Column("author_user_id", sa.UUID(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("parent_message_id", sa.UUID(), nullable=True),
        sa.Column("edited_at", sa.DateTime(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["author_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(
            ["conversation_id"], ["conversations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["parent_message_id"], ["messages.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_messages_conversation_created",
        "messages",
        ["conversation_id", "created_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_messages_conversation_id"),
        "messages",
        ["conversation_id"],
        unique=False,
    )

    op.create_table(
        "orchestration_events",
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("environment", sa.String(), nullable=True),
        sa.Column("source_uri", sa.JSON(), nullable=True),
        sa.Column("destination_uri", sa.JSON(), nullable=True),
        sa.Column("version_hash", sa.String(), nullable=True),
        sa.Column("retry_of_id", sa.UUID(), nullable=True),
        sa.Column("pipeline_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["pipeline_id"], ["orchestration_pipelines.id"]),
        sa.ForeignKeyConstraint(["retry_of_id"], ["orchestration_events.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    # Tier 2
    op.drop_table("orchestration_events")
    op.drop_index(op.f("ix_messages_conversation_id"), table_name="messages")
    op.drop_index("ix_messages_conversation_created", table_name="messages")
    op.drop_table("messages")
    op.drop_index(
        op.f("ix_extractor_versions_version_hash"),
        table_name="extractor_versions",
    )
    op.drop_index(
        op.f("ix_extractor_versions_extractor_id"),
        table_name="extractor_versions",
    )
    op.drop_table("extractor_versions")
    op.drop_table("extractor_examples")
    op.drop_table("documents_x_applications")
    op.drop_index(
        op.f("ix_crawler_runs_crawler_pipeline_id"), table_name="crawler_runs"
    )
    op.drop_table("crawler_runs")
    op.drop_table("conversation_participants")
    op.drop_index(op.f("ix_action_items_user_id"), table_name="action_items")
    op.drop_index(op.f("ix_action_items_kind"), table_name="action_items")
    op.drop_index(op.f("ix_action_items_due_at"), table_name="action_items")
    op.drop_table("action_items")

    # Tier 1
    op.drop_table("user_skills")
    op.drop_table("user_experiences")
    op.drop_table("user_education")
    op.drop_table("user_certificates")
    op.drop_index(
        op.f("ix_orchestration_pipelines_name"),
        table_name="orchestration_pipelines",
    )
    op.drop_table("orchestration_pipelines")
    op.drop_table("leads_x_companies")
    op.drop_index(
        op.f("ix_lead_registrations_user_id"),
        table_name="lead_registrations",
    )
    op.drop_index(
        op.f("ix_lead_registrations_lead_id"),
        table_name="lead_registrations",
    )
    op.drop_table("lead_registrations")
    op.drop_index(
        op.f("ix_lead_comments_parent_comment_id"),
        table_name="lead_comments",
    )
    op.drop_index(op.f("ix_lead_comments_lead_id"), table_name="lead_comments")
    op.drop_index(op.f("ix_lead_comments_author_user_id"), table_name="lead_comments")
    op.drop_table("lead_comments")
    op.drop_index(op.f("ix_extractors_name"), table_name="extractors")
    op.drop_table("extractors")
    op.drop_index(
        op.f("ix_document_shares_shared_with_user_id"),
        table_name="document_shares",
    )
    op.drop_index(op.f("ix_document_shares_document_id"), table_name="document_shares")
    op.drop_table("document_shares")
    op.drop_index(
        "ix_document_embeddings_vector",
        table_name="document_embeddings",
        postgresql_using="hnsw",
        postgresql_with={"m": 16, "ef_construction": 64},
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )
    op.drop_index(
        op.f("ix_document_embeddings_user_id"),
        table_name="document_embeddings",
    )
    op.drop_index(
        op.f("ix_document_embeddings_document_version_id"),
        table_name="document_embeddings",
    )
    op.drop_index(
        op.f("ix_document_embeddings_document_id"),
        table_name="document_embeddings",
    )
    op.drop_table("document_embeddings")
    op.drop_index(
        op.f("ix_document_activities_document_id"),
        table_name="document_activities",
    )
    op.drop_index(
        op.f("ix_document_activities_actor_user_id"),
        table_name="document_activities",
    )
    op.drop_index(
        op.f("ix_document_activities_activity_type"),
        table_name="document_activities",
    )
    op.drop_table("document_activities")
    op.drop_index(op.f("ix_crawler_pipelines_name"), table_name="crawler_pipelines")
    op.drop_table("crawler_pipelines")
    op.drop_table("conversations")
    op.drop_table("contacts")
    op.drop_index(op.f("ix_connections_requester_id"), table_name="connections")
    op.drop_index(op.f("ix_connections_addressee_id"), table_name="connections")
    op.drop_table("connections")
    op.drop_index(op.f("ix_applications_lead_id"), table_name="applications")
    op.drop_table("applications")

    # Break circular FK before dropping document tables
    op.drop_constraint(
        "fk_document_versions_document_id",
        "document_versions",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_documents_user_id"), table_name="documents")
    op.drop_index(op.f("ix_documents_kind"), table_name="documents")
    op.drop_table("documents")
    op.drop_index(
        op.f("ix_document_versions_document_id"),
        table_name="document_versions",
    )
    op.drop_table("document_versions")

    # Tier 0
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
    op.drop_index(op.f("ix_leads_canonical_url"), table_name="leads")
    op.drop_table("leads")
    op.drop_table("companies")

    # Enum types
    sa.Enum(name="applicationstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="crawlerrunstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="leadreviewstatus").drop(op.get_bind(), checkfirst=True)
