"""junction table cleanup — drop surrogate columns from junction tables

LeadXCompany and DocumentXApplication inherited Base, which gave them
surplus id, created_at, updated_at columns alongside their composite PKs.
This migration drops those columns and rebuilds the primary keys as
pure composites.

Revision ID: 0011
Revises: 0010
Create Date: 2026-04-10
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- leads_x_companies ---
    # Drop old composite PK (id, lead_id, company_id) and surrogate columns
    op.drop_constraint("leads_x_companies_pkey", "leads_x_companies", type_="primary")
    op.drop_column("leads_x_companies", "id")
    op.drop_column("leads_x_companies", "created_at")
    op.drop_column("leads_x_companies", "updated_at")
    # Create new composite PK on (lead_id, company_id)
    op.create_primary_key(
        "leads_x_companies_pkey", "leads_x_companies", ["lead_id", "company_id"]
    )

    # --- documents_x_applications ---
    # Drop old composite PK (id, application_id, document_id) and surrogate columns
    op.drop_constraint(
        "documents_x_applications_pkey", "documents_x_applications", type_="primary"
    )
    op.drop_column("documents_x_applications", "id")
    op.drop_column("documents_x_applications", "created_at")
    op.drop_column("documents_x_applications", "updated_at")
    # Create new composite PK on (application_id, document_id)
    op.create_primary_key(
        "documents_x_applications_pkey",
        "documents_x_applications",
        ["application_id", "document_id"],
    )
    # Drop the now-redundant unique constraint (PK already enforces uniqueness)
    op.execute(
        "ALTER TABLE documents_x_applications "
        "DROP CONSTRAINT IF EXISTS documents_x_applications_application_id_document_id_key"
    )


def downgrade() -> None:
    # --- documents_x_applications ---
    # Re-add the unique constraint
    op.create_unique_constraint(
        "documents_x_applications_application_id_document_id_key",
        "documents_x_applications",
        ["application_id", "document_id"],
    )
    # Drop composite PK, add surrogate columns back, restore old PK
    op.drop_constraint(
        "documents_x_applications_pkey", "documents_x_applications", type_="primary"
    )
    op.add_column(
        "documents_x_applications",
        sa.Column("id", UUID, server_default=sa.text("gen_random_uuid()")),
    )
    op.add_column(
        "documents_x_applications",
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
        ),
    )
    op.add_column(
        "documents_x_applications",
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
        ),
    )
    op.create_primary_key(
        "documents_x_applications_pkey",
        "documents_x_applications",
        ["id", "application_id", "document_id"],
    )

    # --- leads_x_companies ---
    op.drop_constraint("leads_x_companies_pkey", "leads_x_companies", type_="primary")
    op.add_column(
        "leads_x_companies",
        sa.Column("id", UUID, server_default=sa.text("gen_random_uuid()")),
    )
    op.add_column(
        "leads_x_companies",
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
        ),
    )
    op.add_column(
        "leads_x_companies",
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
        ),
    )
    op.create_primary_key(
        "leads_x_companies_pkey",
        "leads_x_companies",
        ["id", "lead_id", "company_id"],
    )
