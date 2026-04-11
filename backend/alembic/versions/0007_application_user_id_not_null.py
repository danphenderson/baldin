"""application non-null user_id with CASCADE

Sets applications.user_id to NOT NULL with ondelete=CASCADE.
Deletes any orphan rows with NULL user_id first.

Revision ID: 0007
Revises: 0006
Create Date: 2026-04-10
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLE = "applications"
_COL = "user_id"
_OLD_FK = "applications_user_id_fkey"
_NEW_FK = "applications_user_id_fkey"


def upgrade() -> None:
    # Remove any orphan applications with NULL user_id
    op.execute(sa.text("DELETE FROM applications WHERE user_id IS NULL"))

    # Drop existing FK (no ondelete)
    op.drop_constraint(_OLD_FK, _TABLE, type_="foreignkey")

    # Set NOT NULL
    op.alter_column(_TABLE, _COL, existing_type=sa.UUID(), nullable=False)

    # Re-create with CASCADE
    op.create_foreign_key(_NEW_FK, _TABLE, "users", [_COL], ["id"], ondelete="CASCADE")


def downgrade() -> None:
    op.drop_constraint(_NEW_FK, _TABLE, type_="foreignkey")
    op.alter_column(_TABLE, _COL, existing_type=sa.UUID(), nullable=True)
    op.create_foreign_key(_OLD_FK, _TABLE, "users", [_COL], ["id"])
