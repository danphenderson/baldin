"""DB-enforced enums for bare-string domain fields

Adds CHECK constraints to bare-string columns that represent closed
enumeration domains.  Each constraint validates existing data before
being applied; downgrade drops the constraint.

Revision ID: 0005
Revises: 0004
Create Date: 2026-04-10
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (constraint_name, table, column, allowed_values)
_CHECKS: list[tuple[str, str, str, list[str]]] = [
    (
        "ck_documents_kind",
        "documents",
        "kind",
        ["resume", "cover_letter", "follow_up", "reference_sheet", "freeform"],
    ),
    (
        "ck_documents_status",
        "documents",
        "status",
        ["draft", "active", "archived"],
    ),
    (
        "ck_document_shares_role",
        "document_shares",
        "role",
        ["viewer", "editor"],
    ),
    (
        "ck_connections_status",
        "connections",
        "status",
        ["pending", "accepted", "declined", "blocked"],
    ),
    (
        "ck_action_items_status",
        "action_items",
        "status",
        ["pending", "in_progress", "completed", "dismissed"],
    ),
    (
        "ck_action_items_kind",
        "action_items",
        "kind",
        [
            "follow_up",
            "prepare_document",
            "send_message",
            "review_lead",
            "schedule_interview",
            "custom",
        ],
    ),
    (
        "ck_action_items_priority",
        "action_items",
        "priority",
        ["low", "medium", "high", "urgent"],
    ),
    (
        "ck_orchestration_events_status",
        "orchestration_events",
        "status",
        ["pending", "running", "success", "failure", "pending_review"],
    ),
    (
        "ck_conversations_type",
        "conversations",
        "type",
        ["direct", "group"],
    ),
    (
        "ck_conversation_participants_role",
        "conversation_participants",
        "role",
        ["member", "admin"],
    ),
    (
        "ck_document_versions_content_format",
        "document_versions",
        "content_format",
        ["plain_text", "tiptap_json"],
    ),
]


def upgrade() -> None:
    for ck_name, table, column, values in _CHECKS:
        # Validate existing data — set any invalid value to the first allowed value
        quoted = ", ".join(f"'{v}'" for v in values)
        op.execute(
            sa.text(
                f"UPDATE {table} SET {column} = :fallback "
                f"WHERE {column} IS NOT NULL AND {column} NOT IN ({quoted})"
            ).bindparams(fallback=values[0])
        )
        # Add CHECK constraint
        in_clause = ", ".join(f"'{v}'" for v in values)
        op.create_check_constraint(
            ck_name,
            table,
            sa.text(f"{column} IN ({in_clause})"),
        )


def downgrade() -> None:
    for ck_name, table, _column, _values in reversed(_CHECKS):
        op.drop_constraint(ck_name, table, type_="check")
