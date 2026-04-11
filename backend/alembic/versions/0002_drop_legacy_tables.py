"""drop legacy material tables

Removes the four legacy material tables that were already being dropped at
startup by ``_drop_obsolete_tables``.  This migration makes the removal
durable and independent of application boot logic.

Tables dropped (CASCADE):
- resumes_x_applications
- cover_letters_x_applications
- resumes
- cover_letters

The downgrade recreates them as empty tables with the minimal schema needed
to satisfy FK ordering, matching the original definition closely enough for
a round-trip test without pretending data can be restored.

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-10
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Junction tables first (they reference the material tables).
    op.execute("DROP TABLE IF EXISTS resumes_x_applications CASCADE")
    op.execute("DROP TABLE IF EXISTS cover_letters_x_applications CASCADE")
    op.execute("DROP TABLE IF EXISTS resumes CASCADE")
    op.execute("DROP TABLE IF EXISTS cover_letters CASCADE")


def downgrade() -> None:
    # Recreate the material tables with a minimal compatible schema.
    # These are intentionally simplified — only the columns that other
    # tables or FK constraints would need are included.
    op.create_table(
        "resumes",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "cover_letters",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "resumes_x_applications",
        sa.Column("resume_id", sa.UUID(), nullable=False),
        sa.Column("application_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["resume_id"], ["resumes.id"]),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "cover_letters_x_applications",
        sa.Column("cover_letter_id", sa.UUID(), nullable=False),
        sa.Column("application_id", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["cover_letter_id"], ["cover_letters.id"]),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
