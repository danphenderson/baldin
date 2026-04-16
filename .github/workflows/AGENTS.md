# GitHub Workflows Agent Instructions

## Owner

- `baldin_full_stack_architect`.

## Scope

- Applies to GitHub Actions workflows.

## Do

- Keep CI path filters aligned with agentic assets and generated-artifact ownership.
- Use least permissions needed for workflow jobs.

## Do Not

- Do not assume CODEOWNERS blocks merges without branch protection requiring code owner review.
- Do not add broad CI gates unrelated to changed surfaces.

## Validation

- Run workflow or validator checks when requested.
- Confirm path-filter coverage for instruction changes.

## Handback Notes

- Report trigger, permission, and required-review assumptions.
