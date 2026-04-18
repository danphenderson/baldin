"""Add source-surface fields to agent runs.

Revision ID: 0007
Revises: 0006
Create Date: 2026-04-12 16:20:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(
        "ck_document_activities_activity_type",
        "document_activities",
        type_="check",
    )
    op.create_check_constraint(
        "ck_document_activities_activity_type",
        "document_activities",
        (
            "activity_type IN ("
            "'document_created', 'document_uploaded', 'version_saved', "
            "'agent_task_requested', 'agent_task_applied', 'agent_task_failed', "
            "'agent_task_dismissed', 'share_created', 'share_updated', "
            "'share_revoked', 'document_archived', 'document_unarchived', "
            "'document_pinned', 'document_unpinned', 'block_created', "
            "'block_updated', 'block_deleted', 'block_reordered', "
            "'block_type_changed'"
            ")"
        ),
    )

    op.drop_constraint("ck_agent_runs_trigger_kind", "agent_runs", type_="check")
    op.create_check_constraint(
        "ck_agent_runs_trigger_kind",
        "agent_runs",
        "trigger_kind IN ('manual', 'event', 'surface_mention')",
    )

    op.add_column(
        "agent_runs",
        sa.Column("source_surface_kind", sa.String(), nullable=True),
    )
    op.add_column(
        "agent_runs",
        sa.Column("source_document_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "agent_runs",
        sa.Column("source_field_key", sa.String(), nullable=True),
    )
    op.add_column(
        "agent_runs",
        sa.Column("source_route", sa.String(), nullable=True),
    )
    op.add_column(
        "agent_runs",
        sa.Column("source_anchor_id", sa.String(), nullable=True),
    )
    op.add_column(
        "agent_runs",
        sa.Column(
            "apply_status",
            sa.String(),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
    )
    op.add_column(
        "agent_runs",
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "agent_runs",
        sa.Column(
            "suggested_edit", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
    )

    op.create_check_constraint(
        "ck_agent_runs_source_surface_kind",
        "agent_runs",
        (
            "source_surface_kind IN ("
            "'cell_doc_editor', 'rich_text_editor', 'multiline_text_field'"
            ")"
        ),
    )
    op.create_check_constraint(
        "ck_agent_runs_apply_status",
        "agent_runs",
        "apply_status IN ('pending', 'applied', 'dismissed')",
    )
    op.create_index(
        op.f("ix_agent_runs_source_surface_kind"),
        "agent_runs",
        ["source_surface_kind"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agent_runs_source_document_id"),
        "agent_runs",
        ["source_document_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agent_runs_source_field_key"),
        "agent_runs",
        ["source_field_key"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agent_runs_source_route"),
        "agent_runs",
        ["source_route"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agent_runs_source_anchor_id"),
        "agent_runs",
        ["source_anchor_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agent_runs_apply_status"),
        "agent_runs",
        ["apply_status"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_agent_runs_source_document_id_documents",
        "agent_runs",
        "documents",
        ["source_document_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_agent_runs_source_document_id_documents",
        "agent_runs",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_agent_runs_apply_status"), table_name="agent_runs")
    op.drop_index(op.f("ix_agent_runs_source_anchor_id"), table_name="agent_runs")
    op.drop_index(op.f("ix_agent_runs_source_route"), table_name="agent_runs")
    op.drop_index(op.f("ix_agent_runs_source_field_key"), table_name="agent_runs")
    op.drop_index(op.f("ix_agent_runs_source_document_id"), table_name="agent_runs")
    op.drop_index(op.f("ix_agent_runs_source_surface_kind"), table_name="agent_runs")
    op.drop_constraint("ck_agent_runs_apply_status", "agent_runs", type_="check")
    op.drop_constraint(
        "ck_agent_runs_source_surface_kind",
        "agent_runs",
        type_="check",
    )
    op.drop_column("agent_runs", "suggested_edit")
    op.drop_column("agent_runs", "applied_at")
    op.drop_column("agent_runs", "apply_status")
    op.drop_column("agent_runs", "source_anchor_id")
    op.drop_column("agent_runs", "source_route")
    op.drop_column("agent_runs", "source_field_key")
    op.drop_column("agent_runs", "source_document_id")
    op.drop_column("agent_runs", "source_surface_kind")

    op.drop_constraint("ck_agent_runs_trigger_kind", "agent_runs", type_="check")
    op.create_check_constraint(
        "ck_agent_runs_trigger_kind",
        "agent_runs",
        "trigger_kind IN ('manual', 'event')",
    )

    op.drop_constraint(
        "ck_document_activities_activity_type",
        "document_activities",
        type_="check",
    )
    op.create_check_constraint(
        "ck_document_activities_activity_type",
        "document_activities",
        (
            "activity_type IN ("
            "'document_created', 'document_uploaded', 'version_saved', "
            "'share_created', 'share_updated', 'share_revoked', "
            "'document_archived', 'document_unarchived', 'document_pinned', "
            "'document_unpinned', 'block_created', 'block_updated', "
            "'block_deleted', 'block_reordered', 'block_type_changed'"
            ")"
        ),
    )
