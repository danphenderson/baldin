"""timezone-aware timestamps with server defaults

Converts all TIMESTAMP columns to TIMESTAMP WITH TIME ZONE, interpreting
existing naive values as UTC.  Adds server_default=now() to created_at
and updated_at columns on all Base-inheriting tables.

Revision ID: 0012
Revises: 0011
Create Date: 2026-04-10
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ---------------------------------------------------------------------------
# Tables that inherit from Base and thus have created_at / updated_at.
# Junction tables (leads_x_companies, documents_x_applications) no longer
# have these columns after migration 0011.
# ---------------------------------------------------------------------------
_BASE_TABLES = [
    "orchestration_events",
    "orchestration_pipelines",
    "crawler_pipelines",
    "crawler_runs",
    "extractor_examples",
    "extractors",
    "extractor_versions",
    "lead_registrations",
    "companies",
    "leads",
    "lead_comments",
    "user_skills",
    "user_experiences",
    "user_education",
    "user_certificates",
    "applications",
    # application_status_history is excluded — created in 0008 without
    # created_at/updated_at; its changed_at is already TIMESTAMPTZ.
    "contacts",
    "documents",
    "document_versions",
    "document_shares",
    "document_activities",
    "document_embeddings",
    "action_items",
    "users",
    "connections",
    "conversations",
    "conversation_participants",
    "messages",
]

# Additional non-Base timestamp columns: (table, column)
_EXTRA_TIMESTAMP_COLS = [
    ("crawler_runs", "scheduled_for"),
    ("crawler_runs", "started_at"),
    ("crawler_runs", "finished_at"),
    ("user_experiences", "start_date"),
    ("user_experiences", "end_date"),
    ("user_education", "start_date"),
    ("user_education", "end_date"),
    ("user_certificates", "expiration_date"),
    ("user_certificates", "issued_date"),
    ("applications", "next_step_due"),
    ("action_items", "due_at"),
    ("action_items", "completed_at"),
    ("users", "subscription_expires_at"),
    ("users", "placement_date"),
    ("conversation_participants", "joined_at"),
    ("conversation_participants", "last_read_at"),
    ("messages", "edited_at"),
]


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Convert created_at / updated_at to TIMESTAMPTZ on all Base tables
    for table in _BASE_TABLES:
        # application_status_history.changed_at is already TIMESTAMPTZ;
        # its created_at/updated_at still need conversion.
        for col in ("created_at", "updated_at"):
            conn.execute(
                sa.text(
                    f"ALTER TABLE {table} "
                    f"ALTER COLUMN {col} TYPE TIMESTAMP WITH TIME ZONE "
                    f"USING {col} AT TIME ZONE 'UTC'"
                )
            )
        # Add server defaults
        conn.execute(
            sa.text(f"ALTER TABLE {table} ALTER COLUMN created_at SET DEFAULT now()")
        )
        conn.execute(
            sa.text(f"ALTER TABLE {table} ALTER COLUMN updated_at SET DEFAULT now()")
        )

    # 2. Convert additional timestamp columns
    for table, col in _EXTRA_TIMESTAMP_COLS:
        conn.execute(
            sa.text(
                f"ALTER TABLE {table} "
                f"ALTER COLUMN {col} TYPE TIMESTAMP WITH TIME ZONE "
                f"USING {col} AT TIME ZONE 'UTC'"
            )
        )


def downgrade() -> None:
    conn = op.get_bind()

    # Revert additional timestamp columns
    for table, col in reversed(_EXTRA_TIMESTAMP_COLS):
        conn.execute(
            sa.text(
                f"ALTER TABLE {table} "
                f"ALTER COLUMN {col} TYPE TIMESTAMP WITHOUT TIME ZONE"
            )
        )

    # Revert Base table created_at / updated_at
    for table in reversed(_BASE_TABLES):
        conn.execute(
            sa.text(f"ALTER TABLE {table} ALTER COLUMN created_at DROP DEFAULT")
        )
        conn.execute(
            sa.text(f"ALTER TABLE {table} ALTER COLUMN updated_at DROP DEFAULT")
        )
        for col in ("created_at", "updated_at"):
            conn.execute(
                sa.text(
                    f"ALTER TABLE {table} "
                    f"ALTER COLUMN {col} TYPE TIMESTAMP WITHOUT TIME ZONE"
                )
            )
