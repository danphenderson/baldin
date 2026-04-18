"""Add id tie-breaker to agent chat message history index.

Revision ID: 0006
Revises: 0005
Create Date: 2026-04-12 13:00:00.000000
"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index(
        "ix_agent_chat_messages_session_created",
        table_name="agent_chat_messages",
    )
    op.create_index(
        "ix_agent_chat_messages_session_created",
        "agent_chat_messages",
        ["session_id", "created_at", "id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_agent_chat_messages_session_created",
        table_name="agent_chat_messages",
    )
    op.create_index(
        "ix_agent_chat_messages_session_created",
        "agent_chat_messages",
        ["session_id", "created_at"],
        unique=False,
    )
