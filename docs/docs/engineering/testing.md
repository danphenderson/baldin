---
sidebar_position: 4
slug: /engineering/testing
title: Run The Right Checks
description: Run the smallest effective backend, frontend, contract, and docs checks.
---

<!-- last-verified: 2026-04-06 -->

# Run The Right Checks

Use the smallest validation surface that proves your change. Backend, frontend, contract, and docs work each have their own primary checks.

## Choose The Right Check

| Surface | Primary local check |
| --- | --- |
| Backend behavior | `cd backend && pipenv run pytest --cov=app --cov=etl --cov-report=term-missing` |
| Frontend behavior | `cd frontend && npm run test` |
| Frontend typing | `cd frontend && node ./node_modules/typescript/bin/tsc --noEmit` |
| Production-style frontend build | `cd frontend && VITE_API_URL=https://api.preview.invalid npm run build` |
| Contract changes | `./scripts/update_frontend_schemas.sh` plus the affected backend and frontend checks |
| Docs changes | `npm --prefix docs run build` |

## Backend Tests

Backend tests use `pytest` with a dedicated PostgreSQL test database.

### Running tests

```bash
cd backend
pipenv run pytest --cov=app --cov=etl --cov-report=term-missing
```

### Coverage gate

CI enforces a **60% minimum coverage** threshold across `app/` and `etl/`:

```bash
pytest --cov=app --cov=etl --cov-report=term-missing --cov-fail-under=60
```

### Test database

Tests run against a separate PostgreSQL instance (`test_db` on port 5431 locally, or the CI-provisioned service). The test database is configured through environment variables:

| Variable | Default (local) |
|----------|----------------|
| `TEST_DATABASE_HOSTNAME` | `127.0.0.1` |
| `TEST_DATABASE_PORT` | `5431` |
| `TEST_DATABASE_DB` | `test_db` |
| `TEST_DATABASE_USER` | `postgres` |
| `TEST_DATABASE_PASSWORD` | `postgres` |

Test fixtures use drop-and-recreate patterns via `conftest.py`.

When the local `test_db` service is unavailable, the backend now fails fast in `PYTEST` mode instead of hanging on connection attempts.

## Frontend Tests

Frontend tests use Vitest with React Testing Library.

### Running tests

```bash
cd frontend
npm run test
npm run test:watch
```

### TypeScript validation

```bash
cd frontend
node ./node_modules/typescript/bin/tsc --noEmit
```

This is a strict check. CI runs it as a separate job.

### Production build validation

```bash
cd frontend
VITE_API_URL=https://api.preview.invalid npm run build
```

The build guard rejects missing or localhost `VITE_API_URL` values. Use any non-localhost origin for local build testing.

## Docs Validation

```bash
npm --prefix docs run build
```

This catches broken links, sidebar mismatches, and Mermaid/frontmatter issues in the documentation site.

## Related Docs

- [Work Locally](./local-development.md)
- [Regenerate API Contracts](./contract-management.md)
- [See Merge Gates](./ci-pipeline.md)
