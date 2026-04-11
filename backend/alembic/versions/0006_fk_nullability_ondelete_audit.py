"""FK nullability and ondelete audit pass

Applies the nullability/ondelete policy to every FK in models.py.
Changes are grouped by family: profile, orchestration, crawler/extractor,
lead, application, document, action_item, connection, messaging.

Revision ID: 0006
Revises: 0005
Create Date: 2026-04-10
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Helper: re-create FK with new ondelete
def _replace_fk(
    table: str,
    col: str,
    ref_table: str,
    ref_col: str,
    old_fk_name: str,
    new_fk_name: str,
    ondelete: str,
    nullable: bool | None = None,
) -> None:
    """Drop and re-create a FK constraint, optionally adjusting nullable.

    If the old constraint does not exist yet (column was bare), skip the drop.
    """
    conn = op.get_bind()
    has_fk = conn.execute(
        sa.text("SELECT 1 FROM pg_constraint WHERE conname = :name LIMIT 1"),
        {"name": old_fk_name},
    ).scalar()
    if has_fk:
        op.drop_constraint(old_fk_name, table, type_="foreignkey")
    if nullable is not None:
        # Fix NULL rows before setting NOT NULL
        if not nullable:
            op.execute(sa.text(f"DELETE FROM {table} WHERE {col} IS NULL"))
        op.alter_column(table, col, existing_type=sa.UUID(), nullable=nullable)
    op.create_foreign_key(
        new_fk_name, table, ref_table, [col], [ref_col], ondelete=ondelete
    )


def _restore_fk(
    table: str,
    col: str,
    ref_table: str,
    ref_col: str,
    old_fk_name: str,
    new_fk_name: str,
    nullable: bool | None = None,
    *,
    had_original_fk: bool = True,
) -> None:
    """Reverse a _replace_fk: remove new FK, optionally restore original without ondelete."""
    op.drop_constraint(new_fk_name, table, type_="foreignkey")
    if nullable is not None:
        op.alter_column(table, col, existing_type=sa.UUID(), nullable=nullable)
    if had_original_fk:
        op.create_foreign_key(old_fk_name, table, ref_table, [col], [ref_col])


# =========================================================================
# FK changes grouped by family.  Each tuple is:
#   (table, column, ref_table, ref_col, old_fk_name, new_fk_name, ondelete,
#    nullable_upgrade, nullable_downgrade, had_original_fk)
# nullable_upgrade/downgrade are the UPGRADE / DOWNGRADE nullable targets.
# None means "don't touch nullable".
# had_original_fk=False means the column had no FK constraint before this migration.
# =========================================================================

_FK_CHANGES: list[
    tuple[str, str, str, str, str, str, str, bool | None, bool | None, bool]
] = [
    # --- Profile family ---------------------------------------------------
    (
        "user_skills",
        "user_id",
        "users",
        "id",
        "user_skills_user_id_fkey",
        "user_skills_user_id_fkey",
        "CASCADE",
        False,
        True,
        True,
    ),
    (
        "user_experiences",
        "user_id",
        "users",
        "id",
        "user_experiences_user_id_fkey",
        "user_experiences_user_id_fkey",
        "CASCADE",
        False,
        True,
        True,
    ),
    (
        "user_education",
        "user_id",
        "users",
        "id",
        "user_education_user_id_fkey",
        "user_education_user_id_fkey",
        "CASCADE",
        False,
        True,
        True,
    ),
    (
        "user_certificates",
        "user_id",
        "users",
        "id",
        "user_certificates_user_id_fkey",
        "user_certificates_user_id_fkey",
        "CASCADE",
        False,
        True,
        True,
    ),
    (
        "contacts",
        "user_id",
        "users",
        "id",
        "contacts_user_id_fkey",
        "contacts_user_id_fkey",
        "CASCADE",
        False,
        True,
        True,
    ),
    # --- Orchestration family ---------------------------------------------
    (
        "orchestration_events",
        "pipeline_id",
        "orchestration_pipelines",
        "id",
        "orchestration_events_pipeline_id_fkey",
        "orchestration_events_pipeline_id_fkey",
        "CASCADE",
        None,
        None,
        True,
    ),
    (
        "orchestration_events",
        "retry_of_id",
        "orchestration_events",
        "id",
        "orchestration_events_retry_of_id_fkey",
        "orchestration_events_retry_of_id_fkey",
        "SET NULL",
        None,
        None,
        False,
    ),
    (
        "orchestration_pipelines",
        "user_id",
        "users",
        "id",
        "orchestration_pipelines_user_id_fkey",
        "orchestration_pipelines_user_id_fkey",
        "CASCADE",
        False,
        True,
        True,
    ),
    # --- Crawler & Extractor family ---------------------------------------
    (
        "crawler_runs",
        "crawler_pipeline_id",
        "crawler_pipelines",
        "id",
        "crawler_runs_crawler_pipeline_id_fkey",
        "crawler_runs_crawler_pipeline_id_fkey",
        "CASCADE",
        None,
        None,
        True,
    ),
    (
        "crawler_runs",
        "retry_of_id",
        "crawler_runs",
        "id",
        "crawler_runs_retry_of_id_fkey",
        "crawler_runs_retry_of_id_fkey",
        "SET NULL",
        None,
        None,
        False,
    ),
    (
        "extractor_examples",
        "extractor_id",
        "extractors",
        "id",
        "extractor_examples_extractor_id_fkey",
        "extractor_examples_extractor_id_fkey",
        "CASCADE",
        False,
        True,
        True,
    ),
    (
        "extractors",
        "user_id",
        "users",
        "id",
        "extractors_user_id_fkey",
        "extractors_user_id_fkey",
        "CASCADE",
        False,
        True,
        True,
    ),
    (
        "extractor_versions",
        "extractor_id",
        "extractors",
        "id",
        "extractor_versions_extractor_id_fkey",
        "extractor_versions_extractor_id_fkey",
        "CASCADE",
        None,
        None,
        True,
    ),
    # --- Lead family ------------------------------------------------------
    (
        "leads_x_companies",
        "lead_id",
        "leads",
        "id",
        "leads_x_companies_lead_id_fkey",
        "leads_x_companies_lead_id_fkey",
        "CASCADE",
        None,
        None,
        True,
    ),
    (
        "leads_x_companies",
        "company_id",
        "companies",
        "id",
        "leads_x_companies_company_id_fkey",
        "leads_x_companies_company_id_fkey",
        "CASCADE",
        None,
        None,
        True,
    ),
    (
        "lead_registrations",
        "lead_id",
        "leads",
        "id",
        "lead_registrations_lead_id_fkey",
        "lead_registrations_lead_id_fkey",
        "CASCADE",
        None,
        None,
        True,
    ),
    (
        "lead_registrations",
        "user_id",
        "users",
        "id",
        "lead_registrations_user_id_fkey",
        "lead_registrations_user_id_fkey",
        "CASCADE",
        None,
        None,
        True,
    ),
    (
        "lead_comments",
        "lead_id",
        "leads",
        "id",
        "lead_comments_lead_id_fkey",
        "lead_comments_lead_id_fkey",
        "CASCADE",
        None,
        None,
        True,
    ),
    (
        "lead_comments",
        "author_user_id",
        "users",
        "id",
        "lead_comments_author_user_id_fkey",
        "lead_comments_author_user_id_fkey",
        "CASCADE",
        None,
        None,
        True,
    ),
    (
        "lead_comments",
        "parent_comment_id",
        "lead_comments",
        "id",
        "lead_comments_parent_comment_id_fkey",
        "lead_comments_parent_comment_id_fkey",
        "CASCADE",
        None,
        None,
        True,
    ),
    # --- Document family --------------------------------------------------
    (
        "documents",
        "user_id",
        "users",
        "id",
        "documents_user_id_fkey",
        "documents_user_id_fkey",
        "CASCADE",
        None,
        None,
        True,
    ),
    (
        "documents",
        "head_version_id",
        "document_versions",
        "id",
        "documents_head_version_id_fkey",
        "documents_head_version_id_fkey",
        "SET NULL",
        None,
        None,
        True,
    ),
    (
        "document_versions",
        "document_id",
        "documents",
        "id",
        "document_versions_document_id_fkey",
        "document_versions_document_id_fkey",
        "CASCADE",
        None,
        None,
        True,
    ),
    (
        "documents_x_applications",
        "application_id",
        "applications",
        "id",
        "documents_x_applications_application_id_fkey",
        "documents_x_applications_application_id_fkey",
        "CASCADE",
        None,
        None,
        True,
    ),
    (
        "documents_x_applications",
        "document_id",
        "documents",
        "id",
        "documents_x_applications_document_id_fkey",
        "documents_x_applications_document_id_fkey",
        "CASCADE",
        None,
        None,
        True,
    ),
    (
        "documents_x_applications",
        "version_id",
        "document_versions",
        "id",
        "documents_x_applications_version_id_fkey",
        "documents_x_applications_version_id_fkey",
        "SET NULL",
        None,
        None,
        True,
    ),
    # --- ActionItem family ------------------------------------------------
    (
        "action_items",
        "user_id",
        "users",
        "id",
        "action_items_user_id_fkey",
        "action_items_user_id_fkey",
        "CASCADE",
        None,
        None,
        True,
    ),
    (
        "action_items",
        "application_id",
        "applications",
        "id",
        "action_items_application_id_fkey",
        "action_items_application_id_fkey",
        "CASCADE",
        None,
        None,
        True,
    ),
    (
        "action_items",
        "lead_id",
        "leads",
        "id",
        "action_items_lead_id_fkey",
        "action_items_lead_id_fkey",
        "CASCADE",
        None,
        None,
        True,
    ),
    (
        "action_items",
        "document_id",
        "documents",
        "id",
        "action_items_document_id_fkey",
        "action_items_document_id_fkey",
        "CASCADE",
        None,
        None,
        True,
    ),
    (
        "action_items",
        "conversation_id",
        "conversations",
        "id",
        "action_items_conversation_id_fkey",
        "action_items_conversation_id_fkey",
        "CASCADE",
        None,
        None,
        True,
    ),
    # --- Connection family ------------------------------------------------
    (
        "connections",
        "requester_id",
        "users",
        "id",
        "connections_requester_id_fkey",
        "connections_requester_id_fkey",
        "CASCADE",
        None,
        None,
        True,
    ),
    (
        "connections",
        "addressee_id",
        "users",
        "id",
        "connections_addressee_id_fkey",
        "connections_addressee_id_fkey",
        "CASCADE",
        None,
        None,
        True,
    ),
    # --- Messaging family -------------------------------------------------
    (
        "conversations",
        "created_by_user_id",
        "users",
        "id",
        "conversations_created_by_user_id_fkey",
        "conversations_created_by_user_id_fkey",
        "CASCADE",
        None,
        None,
        True,
    ),
    (
        "messages",
        "author_user_id",
        "users",
        "id",
        "messages_author_user_id_fkey",
        "messages_author_user_id_fkey",
        "RESTRICT",
        None,
        None,
        True,
    ),
    (
        "messages",
        "parent_message_id",
        "messages",
        "id",
        "messages_parent_message_id_fkey",
        "messages_parent_message_id_fkey",
        "CASCADE",
        None,
        None,
        True,
    ),
]


def upgrade() -> None:
    for (
        table,
        col,
        ref_table,
        ref_col,
        old_fk,
        new_fk,
        ondelete,
        nullable_up,
        _nullable_down,
        _had_fk,
    ) in _FK_CHANGES:
        _replace_fk(
            table, col, ref_table, ref_col, old_fk, new_fk, ondelete, nullable_up
        )


def downgrade() -> None:
    for (
        table,
        col,
        ref_table,
        ref_col,
        old_fk,
        new_fk,
        _ondelete,
        _nullable_up,
        nullable_down,
        had_fk,
    ) in reversed(_FK_CHANGES):
        _restore_fk(
            table,
            col,
            ref_table,
            ref_col,
            old_fk,
            new_fk,
            nullable_down,
            had_original_fk=had_fk,
        )
