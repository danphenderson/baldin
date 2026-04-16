# Backend Agent Instructions

## Owner

- `baldin_backend` for backend-only work; `baldin_full_stack_architect` when contracts or frontend consumers move.

## Scope

- Applies to backend application code, backend ETL, migrations, fixtures, and backend tests.

## Do

- Preserve FastAPI, SQLAlchemy, Alembic, and OpenAPI correctness.
- Use `127.0.0.1:5431` for host-run backend tests and `test_db` inside Compose.
- Regenerate frontend contracts when backend API routes or schemas change.

## Do Not

- Do not hand-edit `openapi.json` or `frontend/src/schema.d.ts`.
- Do not widen backend-only work into frontend changes without a handoff.
- Do not add cloud-scale architecture unless explicitly required.

## Validation

- Prefer the narrowest relevant pytest scope.
- Report when schema regeneration is required, run, deferred, or unchanged.

## Handback Notes

- Call out API/schema impact explicitly.
