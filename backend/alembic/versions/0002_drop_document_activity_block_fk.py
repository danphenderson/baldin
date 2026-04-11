"""Drop the document activity block foreign key.

Activities should retain historical block UUIDs even after the backing
document_blocks rows are deleted or replaced.

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-10 23:30:00.000000
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(
        "document_activities_block_id_fkey",
        "document_activities",
        type_="foreignkey",
    )


def downgrade() -> None:
    op.create_foreign_key(
        "document_activities_block_id_fkey",
        "document_activities",
        "document_blocks",
        ["block_id"],
        ["id"],
        ondelete="SET NULL",
    )
