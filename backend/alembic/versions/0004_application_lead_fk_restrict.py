"""application lead_id FK explicit RESTRICT

Adds explicit ondelete=RESTRICT to the applications.lead_id FK per DD-1:
lead deletion is blocked while any application references the lead.

Also sets lead_id to NOT NULL since every application must reference a lead.

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-10
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLE = "applications"
_COL = "lead_id"
_OLD_FK = "applications_lead_id_fkey"
_NEW_FK = "applications_lead_id_fkey"


def upgrade() -> None:
    # Drop existing FK (no explicit ondelete)
    op.drop_constraint(_OLD_FK, _TABLE, type_="foreignkey")

    # Ensure no NULL lead_id rows exist
    op.execute(sa.text("DELETE FROM applications WHERE lead_id IS NULL"))

    # Set column to NOT NULL
    op.alter_column(_TABLE, _COL, existing_type=sa.UUID(), nullable=False)

    # Re-create with RESTRICT
    op.create_foreign_key(_NEW_FK, _TABLE, "leads", [_COL], ["id"], ondelete="RESTRICT")


def downgrade() -> None:
    op.drop_constraint(_NEW_FK, _TABLE, type_="foreignkey")
    op.alter_column(_TABLE, _COL, existing_type=sa.UUID(), nullable=True)
    op.create_foreign_key(_OLD_FK, _TABLE, "leads", [_COL], ["id"])
