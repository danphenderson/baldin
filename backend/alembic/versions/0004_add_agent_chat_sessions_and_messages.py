"""Add agent chat session and message tables.

Revision ID: 0004
Revises: 0003
Create Date: 2026-04-11 12:30:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agent_chat_sessions",
        sa.Column("agent_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("application_id", sa.UUID(), nullable=True),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("model_name", sa.String(), nullable=True),
        sa.Column(
            "status",
            sa.String(),
            server_default=sa.text("'active'"),
            nullable=False,
        ),
        sa.Column(
            "message_count",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.CheckConstraint(
            "status IN ('active', 'archived')",
            name="ck_agent_chat_sessions_status",
        ),
        sa.ForeignKeyConstraint(["agent_id"], ["agents.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["application_id"], ["applications.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_agent_chat_sessions_agent",
        "agent_chat_sessions",
        ["agent_id"],
        unique=False,
    )
    op.create_index(
        "ix_agent_chat_sessions_user_updated",
        "agent_chat_sessions",
        ["user_id", "updated_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_agent_chat_sessions_application_id"),
        "agent_chat_sessions",
        ["application_id"],
        unique=False,
    )

    op.create_table(
        "agent_chat_messages",
        sa.Column("session_id", sa.UUID(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.CheckConstraint(
            "role IN ('system', 'user', 'assistant')",
            name="ck_agent_chat_messages_role",
        ),
        sa.ForeignKeyConstraint(
            ["session_id"], ["agent_chat_sessions.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_agent_chat_messages_session_created",
        "agent_chat_messages",
        ["session_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_agent_chat_messages_session_created", table_name="agent_chat_messages"
    )
    op.drop_table("agent_chat_messages")

    op.drop_index(
        op.f("ix_agent_chat_sessions_application_id"), table_name="agent_chat_sessions"
    )
    op.drop_index(
        "ix_agent_chat_sessions_user_updated", table_name="agent_chat_sessions"
    )
    op.drop_index("ix_agent_chat_sessions_agent", table_name="agent_chat_sessions")
    op.drop_table("agent_chat_sessions")
