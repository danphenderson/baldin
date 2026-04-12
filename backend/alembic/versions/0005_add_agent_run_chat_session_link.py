"""Add chat session audit link to agent runs.

Revision ID: 0005
Revises: 0004
Create Date: 2026-04-12 10:30:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "agent_runs",
        sa.Column("chat_session_id", sa.UUID(), nullable=True),
    )
    op.create_index(
        op.f("ix_agent_runs_chat_session_id"),
        "agent_runs",
        ["chat_session_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_agent_runs_chat_session_id_agent_chat_sessions",
        "agent_runs",
        "agent_chat_sessions",
        ["chat_session_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_agent_runs_chat_session_id_agent_chat_sessions",
        "agent_runs",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_agent_runs_chat_session_id"), table_name="agent_runs")
    op.drop_column("agent_runs", "chat_session_id")
