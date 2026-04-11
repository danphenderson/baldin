"""high-value composite indexes

Adds composite indexes for the most common query patterns across
applications, documents, action items, lead comments, orchestration
events, and connections.

Revision ID: 0015
Revises: 0014
Create Date: 2026-04-10
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0015"
down_revision: Union[str, None] = "0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_INDEXES = [
    ("ix_applications_user_stage", "applications", ["user_id", "stage"]),
    ("ix_applications_user_outcome", "applications", ["user_id", "outcome"]),
    ("ix_documents_user_kind_status", "documents", ["user_id", "kind", "status"]),
    ("ix_action_items_user_status", "action_items", ["user_id", "status"]),
    ("ix_action_items_user_due_at", "action_items", ["user_id", "due_at"]),
    ("ix_lead_comments_lead_created", "lead_comments", ["lead_id", "created_at"]),
    (
        "ix_orchestration_events_pipeline_created",
        "orchestration_events",
        ["pipeline_id", "created_at"],
    ),
    ("ix_connections_requester_status", "connections", ["requester_id", "status"]),
    ("ix_connections_addressee_status", "connections", ["addressee_id", "status"]),
]


def upgrade() -> None:
    for name, table, columns in _INDEXES:
        op.create_index(name, table, columns)


def downgrade() -> None:
    for name, table, _columns in reversed(_INDEXES):
        op.drop_index(name, table_name=table)
