# Backend ETL Service Agent Instructions

## Owner

- `baldin_backend`.

## Scope

- Applies to ETL service orchestration inside the backend app.

## Do

- Preserve idempotency, retry, and local fixture behavior.
- Keep database writes migration-safe.

## Do Not

- Do not make ETL changes depend on unavailable cloud services.
- Do not change API contracts as a hidden side effect.

## Validation

- Prefer focused ETL service tests.
- Check host-vs-Compose DB hostname assumptions when tests touch the database.

## Handback Notes

- Report idempotency and data-migration considerations.
