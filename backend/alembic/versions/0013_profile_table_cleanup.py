"""profile table cleanup — rename, type conversions, contact constraint

- Renames Education.gradePoint → grade_point
- Converts Education.activities and Education.achievements from JSON to TEXT[]
- Converts Skill.subskills from VARCHAR to TEXT[]
- Converts Experience.projects from VARCHAR to TEXT[]
- Adds UniqueConstraint(user_id, email) on contacts

Revision ID: 0013
Revises: 0012
Create Date: 2026-04-10
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0013"
down_revision: Union[str, None] = "0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # --- Education ---
    # Rename camelCase column
    op.alter_column("user_education", "gradePoint", new_column_name="grade_point")

    # Convert activities: JSON → TEXT[]
    # Two-step: add new col, populate, drop old, rename.
    op.add_column(
        "user_education", sa.Column("activities_arr", sa.ARRAY(sa.Text), nullable=True)
    )
    conn.execute(
        sa.text(
            """
            UPDATE user_education
            SET activities_arr = CASE
                WHEN activities IS NULL THEN NULL
                WHEN jsonb_typeof(activities::jsonb) = 'array'
                THEN (
                    SELECT array_agg(elem)
                    FROM jsonb_array_elements_text(activities::jsonb) AS elem
                )
                ELSE ARRAY[activities::text]
            END
            """
        )
    )
    op.drop_column("user_education", "activities")
    op.alter_column("user_education", "activities_arr", new_column_name="activities")

    # Convert achievements: JSON → TEXT[]
    op.add_column(
        "user_education",
        sa.Column("achievements_arr", sa.ARRAY(sa.Text), nullable=True),
    )
    conn.execute(
        sa.text(
            """
            UPDATE user_education
            SET achievements_arr = CASE
                WHEN achievements IS NULL THEN NULL
                WHEN jsonb_typeof(achievements::jsonb) = 'array'
                THEN (
                    SELECT array_agg(elem)
                    FROM jsonb_array_elements_text(achievements::jsonb) AS elem
                )
                ELSE ARRAY[achievements::text]
            END
            """
        )
    )
    op.drop_column("user_education", "achievements")
    op.alter_column(
        "user_education", "achievements_arr", new_column_name="achievements"
    )

    # --- Skill ---
    # Convert subskills: VARCHAR → TEXT[]  (comma-delimited → array)
    conn.execute(
        sa.text(
            """
            ALTER TABLE user_skills
            ALTER COLUMN subskills TYPE TEXT[]
            USING CASE
                WHEN subskills IS NULL THEN NULL
                WHEN subskills = '' THEN '{}'::TEXT[]
                ELSE string_to_array(subskills, ',')
            END
            """
        )
    )

    # --- Experience ---
    # Convert projects: VARCHAR → TEXT[]  (comma-delimited → array)
    conn.execute(
        sa.text(
            """
            ALTER TABLE user_experiences
            ALTER COLUMN projects TYPE TEXT[]
            USING CASE
                WHEN projects IS NULL THEN NULL
                WHEN projects = '' THEN '{}'::TEXT[]
                ELSE string_to_array(projects, ',')
            END
            """
        )
    )

    # --- Contact ---
    op.create_unique_constraint(
        "uq_contacts_user_email", "contacts", ["user_id", "email"]
    )


def downgrade() -> None:
    conn = op.get_bind()

    # --- Contact ---
    op.drop_constraint("uq_contacts_user_email", "contacts", type_="unique")

    # --- Experience ---
    conn.execute(
        sa.text(
            """
            ALTER TABLE user_experiences
            ALTER COLUMN projects TYPE VARCHAR
            USING array_to_string(projects, ',')
            """
        )
    )

    # --- Skill ---
    conn.execute(
        sa.text(
            """
            ALTER TABLE user_skills
            ALTER COLUMN subskills TYPE VARCHAR
            USING array_to_string(subskills, ',')
            """
        )
    )

    # --- Education ---
    # Reverse achievements: TEXT[] → JSON
    op.add_column(
        "user_education", sa.Column("achievements_json", sa.JSON, nullable=True)
    )
    conn.execute(
        sa.text(
            """
            UPDATE user_education
            SET achievements_json = to_json(achievements)
            WHERE achievements IS NOT NULL
            """
        )
    )
    op.drop_column("user_education", "achievements")
    op.alter_column(
        "user_education", "achievements_json", new_column_name="achievements"
    )

    # Reverse activities: TEXT[] → JSON
    op.add_column(
        "user_education", sa.Column("activities_json", sa.JSON, nullable=True)
    )
    conn.execute(
        sa.text(
            """
            UPDATE user_education
            SET activities_json = to_json(activities)
            WHERE activities IS NOT NULL
            """
        )
    )
    op.drop_column("user_education", "activities")
    op.alter_column("user_education", "activities_json", new_column_name="activities")

    op.alter_column("user_education", "grade_point", new_column_name="gradePoint")
