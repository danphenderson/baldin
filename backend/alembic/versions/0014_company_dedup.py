"""company dedup — merge duplicates and add unique functional index

Merges duplicate companies (by lower(trim(name))) by reassigning
leads_x_companies associations to the winner (earliest created_at),
then deletes the losers.  Adds a unique index on lower(trim(name)).

Revision ID: 0014
Revises: 0013
Create Date: 2026-04-10
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0014"
down_revision: Union[str, None] = "0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Step 1: Merge duplicate companies.
    # For each group of companies with the same lower(trim(name)):
    #   - Pick the winner as the one with the smallest id (cast to text for ordering).
    #   - Reassign lead associations from losers to winner.
    #   - Delete losers.
    conn.execute(
        sa.text(
            """
            WITH canonical AS (
                SELECT
                    lower(trim(name)) AS canon,
                    (array_agg(id ORDER BY id::text))[1] AS winner_id
                FROM companies
                GROUP BY lower(trim(name))
                HAVING count(*) > 1
            ),
            losers AS (
                SELECT c.id AS loser_id, canonical.winner_id
                FROM companies c
                JOIN canonical ON lower(trim(c.name)) = canonical.canon
                WHERE c.id != canonical.winner_id
            )
            UPDATE leads_x_companies lxc
            SET company_id = losers.winner_id
            FROM losers
            WHERE lxc.company_id = losers.loser_id
              AND NOT EXISTS (
                  SELECT 1 FROM leads_x_companies existing
                  WHERE existing.lead_id = lxc.lead_id
                    AND existing.company_id = losers.winner_id
              )
            """
        )
    )

    # Delete orphaned junction rows that couldn't be reassigned (duplicate lead+company)
    conn.execute(
        sa.text(
            """
            WITH canonical AS (
                SELECT
                    lower(trim(name)) AS canon,
                    (array_agg(id ORDER BY id::text))[1] AS winner_id
                FROM companies
                GROUP BY lower(trim(name))
                HAVING count(*) > 1
            ),
            losers AS (
                SELECT c.id AS loser_id
                FROM companies c
                JOIN canonical ON lower(trim(c.name)) = canonical.canon
                WHERE c.id != canonical.winner_id
            )
            DELETE FROM leads_x_companies
            WHERE company_id IN (SELECT loser_id FROM losers)
            """
        )
    )

    # Delete the loser company rows
    conn.execute(
        sa.text(
            """
            WITH canonical AS (
                SELECT
                    lower(trim(name)) AS canon,
                    (array_agg(id ORDER BY id::text))[1] AS winner_id
                FROM companies
                GROUP BY lower(trim(name))
                HAVING count(*) > 1
            )
            DELETE FROM companies
            WHERE id NOT IN (SELECT winner_id FROM canonical)
              AND lower(trim(name)) IN (SELECT canon FROM canonical)
            """
        )
    )

    # Step 2: Create unique functional index
    op.create_index(
        "ix_companies_name_lower_trim",
        "companies",
        [sa.text("lower(trim(name))")],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_companies_name_lower_trim", table_name="companies")
