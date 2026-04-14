"""Add creator attribution to companies.

Revision ID: 0009
Revises: 0008
Create Date: 2026-04-13 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "companies",
        sa.Column("creator_user_id", sa.UUID(), nullable=True),
    )
    op.create_index(
        op.f("ix_companies_creator_user_id"),
        "companies",
        ["creator_user_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_companies_creator_user_id_users",
        "companies",
        "users",
        ["creator_user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_companies_creator_user_id_users",
        "companies",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_companies_creator_user_id"), table_name="companies")
    op.drop_column("companies", "creator_user_id")
