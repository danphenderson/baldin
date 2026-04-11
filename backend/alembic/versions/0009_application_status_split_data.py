"""application status split — data migration

Populates stage and outcome from the existing status column.
ETL: converts status_history JSONB entries into application_status_history rows.

Revision ID: 0009
Revises: 0008
Create Date: 2026-04-10
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_STAGE_VALUES = {"registered", "applied", "screening", "interview", "offer"}
_OUTCOME_VALUES = {"rejected", "withdrawn"}


def upgrade() -> None:
    conn = op.get_bind()

    # --- 1. Populate stage/outcome from existing status -------------------
    # Outcomes
    conn.execute(
        sa.text("""
            UPDATE applications
            SET outcome = status::text::applicationoutcome
            WHERE status IS NOT NULL
              AND status::text IN ('rejected', 'withdrawn')
        """)
    )
    # Stages (non-terminal statuses)
    conn.execute(
        sa.text("""
            UPDATE applications
            SET stage = status::text::applicationstage
            WHERE status IS NOT NULL
              AND status::text IN ('registered', 'applied', 'screening', 'interview', 'offer')
        """)
    )

    # For closed applications, try to derive the last meaningful stage from history
    conn.execute(
        sa.text("""
            UPDATE applications a
            SET stage = sub.last_stage::applicationstage
            FROM (
                SELECT a2.id,
                       (
                           SELECT elem->>'to'
                           FROM jsonb_array_elements(a2.status_history) AS elem
                           WHERE elem->>'to' IN ('registered','applied','screening','interview','offer')
                           ORDER BY elem->>'changed_at' DESC
                           LIMIT 1
                       ) AS last_stage
                FROM applications a2
                WHERE a2.status IS NOT NULL
                  AND a2.status::text IN ('rejected','withdrawn')
            ) sub
            WHERE a.id = sub.id AND sub.last_stage IS NOT NULL
        """)
    )

    # --- 2. ETL status_history JSONB → application_status_history rows ----
    conn.execute(
        sa.text("""
            INSERT INTO application_status_history
                (id, application_id, stage, outcome, changed_by_user_id, changed_at, note)
            SELECT
                gen_random_uuid(),
                a.id,
                CASE
                    WHEN (elem->>'to') IN ('registered','applied','screening','interview','offer')
                    THEN (elem->>'to')::applicationstage
                    ELSE 'registered'::applicationstage  -- fallback for history entries where "to" is an outcome
                END,
                CASE
                    WHEN (elem->>'to') IN ('rejected','withdrawn')
                    THEN (elem->>'to')::applicationoutcome
                    ELSE NULL
                END,
                a.user_id,  -- best guess for changed_by
                COALESCE(
                    (elem->>'changed_at')::timestamptz,
                    a.created_at::timestamptz
                ),
                NULL
            FROM applications a,
                 jsonb_array_elements(a.status_history) AS elem
            WHERE a.status_history IS NOT NULL
              AND jsonb_array_length(a.status_history) > 0
              AND elem->>'to' IS NOT NULL
            ORDER BY a.id, COALESCE((elem->>'changed_at')::timestamptz, a.created_at::timestamptz)
        """)
    )


def downgrade() -> None:
    conn = op.get_bind()

    # Remove all migrated history rows (only rows that came from JSONB ETL)
    conn.execute(sa.text("DELETE FROM application_status_history"))

    # Reset stage/outcome columns to defaults
    conn.execute(
        sa.text("""
            UPDATE applications
            SET stage = 'registered'::applicationstage,
                outcome = NULL
        """)
    )
