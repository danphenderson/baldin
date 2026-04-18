# Backend Alembic Agent Instructions

## Owner

- `baldin_backend`; use `baldin_full_stack_architect` if migrations affect API contracts or launch path.

## Scope

- Applies to Alembic migration scripts and migration config.

## Do

- Keep SQLAlchemy model changes and migrations aligned.
- Prefer reversible, local-safe migrations when feasible.

## Do Not

- Do not perform destructive data changes without explicit approval.
- Do not use local schema reset scripts as a substitute for migration correctness.

## Validation

- Run migration-focused checks only when requested.
- Flag when local schema drift may need reset or repair scripts.

## Handback Notes

- Describe upgrade/downgrade and data-safety implications.
