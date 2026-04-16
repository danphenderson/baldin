# Backend ETL Agent Instructions

## Owner

- `baldin_backend`.

## Scope

- Applies to backend ETL jobs, loaders, and ETL utilities.

## Do

- Keep jobs local-first and fixture-friendly.
- Protect idempotency and database migration assumptions.

## Do Not

- Do not introduce production scheduler or cloud orchestration unless requested.
- Do not edit runtime data directories.

## Validation

- Prefer focused ETL tests or dry-run style checks when available.
- Document data fixture changes.

## Handback Notes

- Call out source, destination, and idempotency effects.
