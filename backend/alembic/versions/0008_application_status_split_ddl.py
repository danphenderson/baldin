"""application status split — DDL (add stage, outcome, history table)

Adds ApplicationStage and ApplicationOutcome Postgres enum types,
adds stage (non-null, default REGISTERED) and outcome (nullable) columns
to applications, and creates the application_status_history table.

CHECK: outcome IS NULL OR stage IS NOT NULL.

Revision ID: 0008
Revises: 0007
Create Date: 2026-04-10
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_STAGE_VALUES = ("registered", "applied", "screening", "interview", "offer")
_OUTCOME_VALUES = ("rejected", "withdrawn")


def upgrade() -> None:
    # --- Create new Postgres enum types -----------------------------------
    conn = op.get_bind()

    # Use raw DDL with IF NOT EXISTS — sa.Enum.create(checkfirst=True) is
    # unreliable in the asyncpg dialect.
    conn.execute(
        sa.text(
            "DO $$ BEGIN "
            "  CREATE TYPE applicationstage AS ENUM ("
            "    'registered','applied','screening','interview','offer'"
            "  );"
            "EXCEPTION WHEN duplicate_object THEN NULL; END $$"
        )
    )
    conn.execute(
        sa.text(
            "DO $$ BEGIN "
            "  CREATE TYPE applicationoutcome AS ENUM ('rejected','withdrawn');"
            "EXCEPTION WHEN duplicate_object THEN NULL; END $$"
        )
    )

    stage_enum = postgresql.ENUM(
        *_STAGE_VALUES, name="applicationstage", create_type=False
    )
    outcome_enum = postgresql.ENUM(
        *_OUTCOME_VALUES, name="applicationoutcome", create_type=False
    )

    # --- Add columns to applications ------------------------------------
    op.add_column(
        "applications",
        sa.Column(
            "stage",
            stage_enum,
            nullable=False,
            server_default="registered",
        ),
    )
    op.add_column(
        "applications",
        sa.Column("outcome", outcome_enum, nullable=True),
    )

    # CHECK: outcome IS NULL OR stage IS NOT NULL
    op.create_check_constraint(
        "ck_applications_outcome_requires_stage",
        "applications",
        sa.text("outcome IS NULL OR stage IS NOT NULL"),
    )

    # --- Create application_status_history table --------------------------
    op.create_table(
        "application_status_history",
        sa.Column("id", UUID(), nullable=False),
        sa.Column(
            "application_id",
            UUID(),
            sa.ForeignKey("applications.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("stage", stage_enum, nullable=False),
        sa.Column("outcome", outcome_enum, nullable=True),
        sa.Column(
            "changed_by_user_id",
            UUID(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "changed_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("note", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_application_status_history_app_changed",
        "application_status_history",
        ["application_id", "changed_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_application_status_history_app_changed",
        table_name="application_status_history",
    )
    op.drop_table("application_status_history")

    op.drop_constraint(
        "ck_applications_outcome_requires_stage", "applications", type_="check"
    )
    op.drop_column("applications", "outcome")
    op.drop_column("applications", "stage")

    # Drop enum types
    sa.Enum(name="applicationoutcome").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="applicationstage").drop(op.get_bind(), checkfirst=True)
