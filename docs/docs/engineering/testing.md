---
sidebar_position: 4
slug: /engineering/testing
title: Testing
---

# Testing

## Backend Tests

Backend tests use `pytest` with a dedicated PostgreSQL test database.

### Running tests

```bash
cd backend
pipenv run test       # standard run
pipenv run testv      # verbose output
```

Or directly:

```bash
cd backend
pipenv run pytest --cov=app --cov=etl --cov-report=term-missing
```

### Coverage gate

CI enforces a **40% minimum coverage** threshold across `app/` and `etl/`:

```bash
pytest --cov=app --cov=etl --cov-report=term-missing --cov-fail-under=40
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

## Frontend Tests

Frontend tests use Vitest with React Testing Library.

### Running tests

```bash
cd frontend
npm run test          # single run
npm run test:watch    # watch mode
```

### TypeScript validation

```bash
cd frontend
npx tsc --noEmit
```

This is a strict check — all TypeScript errors must be resolved before merge. CI runs this as a separate job.

### Production build validation

```bash
cd frontend
VITE_API_URL=https://api.preview.invalid npm run build
```

The build guard rejects missing or localhost `VITE_API_URL` values. Use any non-localhost origin for local build testing.
