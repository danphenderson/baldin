# Backend ETL Tests Agent Instructions

## Owner

- `baldin_backend`.

## Scope

- Applies to tests for ETL jobs and loaders.

## Do

- Use deterministic fixtures and narrow pytest scopes.
- Keep host-vs-Compose DB naming explicit.

## Do Not

- Do not rely on runtime public data directories.
- Do not require live external services.

## Validation

- Run targeted ETL pytest scopes when requested.
- Report fixture setup requirements.

## Handback Notes

- Include skipped or mocked dependency notes.
