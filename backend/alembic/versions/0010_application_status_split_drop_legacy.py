"""application status split — drop legacy columns

Drops the old status column, status_history JSONB column, and the
applicationstatus Postgres enum type now that data has been migrated
to stage/outcome columns and application_status_history table.

Revision ID: 0010
Revises: 0009
Create Date: 2026-04-10
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_OLD_STATUS_VALUES = (
    "registered",
    "applied",
    "screening",
    "interview",
    "offer",
    "rejected",
    "withdrawn",
)


def upgrade() -> None:
    # Drop the JSONB status_history column
    op.drop_column("applications", "status_history")

    # Drop the old status column
    op.drop_column("applications", "status")

    # Drop the old applicationstatus enum type
    sa.Enum(*_OLD_STATUS_VALUES, name="applicationstatus").drop(
        op.get_bind(), checkfirst=True
    )


def downgrade() -> None:
    # Re-create the old enum type
    old_enum = sa.Enum(*_OLD_STATUS_VALUES, name="applicationstatus")
    old_enum.create(op.get_bind(), checkfirst=True)

    # Re-add status column
    op.add_column(
        "applications",
        sa.Column(
            "status",
            old_enum,
            nullable=True,
        ),
    )

    # Re-add status_history JSONB column
    op.add_column(
        "applications",
        sa.Column(
            "status_history",
            JSONB(),
            server_default="[]",
            nullable=True,
        ),
    )

    # Back-populate status from stage/outcome
    conn = op.get_bind()
    conn.execute(
        sa.text("""
            UPDATE applications
            SET status = COALESCE(outcome::text, stage::text)::applicationstatus
        """)
    )
