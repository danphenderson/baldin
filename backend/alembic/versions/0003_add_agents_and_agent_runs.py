"""Add agent definitions and run history tables.

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-11 12:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agents",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column(
            "configuration",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "is_enabled",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.CheckConstraint(
            "kind IN ('cover_letter', 'follow_up', 'outreach', 'custom')",
            name="ck_agents_kind",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_agents_user_id"), "agents", ["user_id"], unique=False)
    op.create_index(
        "ix_agents_user_kind_enabled",
        "agents",
        ["user_id", "kind", "is_enabled"],
        unique=False,
    )

    op.create_table(
        "agent_runs",
        sa.Column("agent_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("application_id", sa.UUID(), nullable=True),
        sa.Column("parent_run_id", sa.UUID(), nullable=True),
        sa.Column(
            "trigger_kind",
            sa.String(),
            server_default=sa.text("'manual'"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(),
            server_default=sa.text("'pending'"),
            nullable=False,
        ),
        sa.Column(
            "input_context",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("session_document_id", sa.UUID(), nullable=True),
        sa.Column("session_version_id", sa.UUID(), nullable=True),
        sa.Column("error_summary", sa.Text(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.CheckConstraint(
            "trigger_kind IN ('manual', 'event')",
            name="ck_agent_runs_trigger_kind",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'running', 'completed', 'failed')",
            name="ck_agent_runs_status",
        ),
        sa.ForeignKeyConstraint(["agent_id"], ["agents.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["application_id"], ["applications.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["parent_run_id"], ["agent_runs.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["session_document_id"], ["documents.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["session_version_id"], ["document_versions.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_agent_runs_agent_id"),
        "agent_runs",
        ["agent_id"],
        unique=False,
    )
    op.create_index(
        "ix_agent_runs_agent_created",
        "agent_runs",
        ["agent_id", "created_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agent_runs_application_id"),
        "agent_runs",
        ["application_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agent_runs_parent_run_id"),
        "agent_runs",
        ["parent_run_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agent_runs_session_document_id"),
        "agent_runs",
        ["session_document_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agent_runs_session_version_id"),
        "agent_runs",
        ["session_version_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agent_runs_user_id"),
        "agent_runs",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_agent_runs_user_created",
        "agent_runs",
        ["user_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_agent_runs_user_created", table_name="agent_runs")
    op.drop_index(op.f("ix_agent_runs_user_id"), table_name="agent_runs")
    op.drop_index(op.f("ix_agent_runs_session_version_id"), table_name="agent_runs")
    op.drop_index(op.f("ix_agent_runs_session_document_id"), table_name="agent_runs")
    op.drop_index(op.f("ix_agent_runs_parent_run_id"), table_name="agent_runs")
    op.drop_index(op.f("ix_agent_runs_application_id"), table_name="agent_runs")
    op.drop_index("ix_agent_runs_agent_created", table_name="agent_runs")
    op.drop_index(op.f("ix_agent_runs_agent_id"), table_name="agent_runs")
    op.drop_table("agent_runs")

    op.drop_index("ix_agents_user_kind_enabled", table_name="agents")
    op.drop_index(op.f("ix_agents_user_id"), table_name="agents")
    op.drop_table("agents")
