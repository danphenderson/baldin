"""application unique constraint (user_id, lead_id)

Adds a UniqueConstraint on applications(user_id, lead_id) to prevent
duplicate applications for the same user+lead pair.

Includes an idempotent data-fix step that keeps only the most recently
updated row for each (user_id, lead_id) group before applying the
constraint.

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-10
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Data fix: remove duplicate (user_id, lead_id) rows ----------------
    # Keep the row with the latest updated_at; delete the rest.
    op.execute(
        sa.text("""
            DELETE FROM applications
            WHERE id IN (
                SELECT id FROM (
                    SELECT id,
                           ROW_NUMBER() OVER (
                               PARTITION BY user_id, lead_id
                               ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
                           ) AS rn
                    FROM applications
                    WHERE user_id IS NOT NULL AND lead_id IS NOT NULL
                ) ranked
                WHERE rn > 1
            )
        """)
    )

    op.create_unique_constraint(
        "uq_applications_user_lead",
        "applications",
        ["user_id", "lead_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_applications_user_lead", "applications", type_="unique")
