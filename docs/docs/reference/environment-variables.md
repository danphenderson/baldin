---
sidebar_position: 2
slug: /reference/environment-variables
title: Look Up Settings
description: Look up runtime configuration, derived startup behavior, and the settings most likely to matter.
---

<!-- last-verified: 2026-04-12 -->

# Look Up Settings

This page documents the environment surface currently read by `backend/app/core/conf.py` and the frontend build configuration. Some behaviors that look like settings elsewhere in the docs are actually derived properties, not standalone environment variables.

Use this page as the reference source for configuration. If you are setting up the stack for the first time, start with [Boot The Stack](../getting-started/quickstart.md) instead of treating this as a setup checklist.

## Backend (`backend/.env`)

`backend/.env` is checked into the repo as a safe local-default baseline. Override it with optional `backend/.env.local` values or process env vars when you need real secrets or user-specific local settings.

Precedence order:

1. `backend/.env`
2. `backend/.env.local`
3. process environment variables

### Required

| Variable | Purpose |
|----------|---------|
| `SECRET_KEY` | Application secret key for JWT signing |
| `MFA_ENCRYPTION_KEY` | Optional dedicated key source for MFA secret encryption at rest; if unset, Baldin derives one from `SECRET_KEY` |
| `FIRST_SUPERUSER_EMAIL` | Bootstrap admin email (created on first startup) |
| `FIRST_SUPERUSER_PASSWORD` | Bootstrap admin password |

### Database

| Variable | Local example | Purpose |
|----------|---------------|---------|
| `DEFAULT_DATABASE_HOSTNAME` | `db` | Main database host |
| `DEFAULT_DATABASE_PORT` | `5432` | Main database port |
| `DEFAULT_DATABASE_DB` | `db` | Main database name |
| `DEFAULT_DATABASE_USER` | `postgres` | Main database user |
| `DEFAULT_DATABASE_PASSWORD` | `postgres` | Main database password |
| `TEST_DATABASE_HOSTNAME` | `test_db` | Test database host |
| `TEST_DATABASE_PORT` | `5431` | Test database port |
| `TEST_DATABASE_DB` | `test_db` | Test database name |
| `TEST_DATABASE_USER` | `postgres` | Test database user |
| `TEST_DATABASE_PASSWORD` | `postgres` | Test database password |

### Application

| Variable | Local example | Purpose |
|----------|---------------|---------|
| `ENVIRONMENT` | `DEV` | Runtime environment (`DEV`, `PYTEST`, `STAGE`, `PROD`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `11520` | JWT token lifetime |
| `BACKEND_CORS_ORIGINS` | `http://localhost:5173,http://localhost:8004` | Allowed CORS origins (comma-separated) |
| `MAX_CONCURRENCY` | `8` | Extraction concurrency limit |
| `MAX_CHUNKS` | `-1` | Maximum extraction chunks (-1 = unlimited) |
| `LOGGING_LEVEL` | `DEBUG` | Python logging level |
| `PUBLIC_ASSETS_DIR` | `public` | Root directory for uploads, `var/logs`, seeds, and other local persisted assets |

### AI / Extraction

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Enables AI-assisted extraction and automation features. Keep real values in process env or `backend/.env.local`. |
| `OPENAI_COMPLETION_MODEL` | Optional override for the completion model |
| `OPENAI_DEFAULT_MODEL` | Optional override for the default chat model |

### Crawlers (Optional)

| Variable | Purpose |
|----------|---------|
| `LINKEDIN_USERNAME` | LinkedIn crawler authentication |
| `LINKEDIN_PASSWORD` | LinkedIn crawler authentication |
| `GLASSDOOR_USERNAME` | Glassdoor crawler authentication |
| `GLASSDOOR_PASSWORD` | Glassdoor crawler authentication |

### Background Jobs / Redis (Optional)

| Variable | Purpose |
|----------|---------|
| `REDIS_URL` | Enables worker-mode background execution when set, for example `redis://localhost:6379/0` |
| `CRAWLER_QUEUE_NAME` | Redis list name used for crawler and seed background jobs |
| `CRAWLER_EXECUTION_MODE` | `inline` runs jobs in the API process; `worker` enqueues them to Redis |
| `CRAWLER_SCHEDULER_INTERVAL` | Poll interval, in seconds, for the recurring crawler scheduler |

### Startup Behavior

| Setting | Source | Meaning |
|----------|--------|---------|
| `SHOULD_BOOTSTRAP_ON_STARTUP` | Derived from `ENVIRONMENT` | `True` in `DEV` and `PYTEST`; controls local schema/bootstrap behavior |
| `SHOULD_RUN_CRAWLER_SCHEDULER` | Derived from `ENVIRONMENT` + `CRAWLER_SCHEDULER_ENABLED` | Disabled in `PYTEST`; otherwise follows the runtime toggle |
| `SHOULD_RUN_REAPER` | Derived from `ENVIRONMENT` + `RUN_REAPER_ENABLED` | Disabled in `PYTEST`; otherwise follows the runtime toggle |

Related runtime toggles exposed through settings:

| Variable | Code default | Purpose |
|----------|--------------|---------|
| `CRAWLER_SCHEDULER_ENABLED` | `True` | Enables the crawler scheduler outside `PYTEST` |
| `RUN_REAPER_ENABLED` | `True` | Enables the background reaper outside `PYTEST` |

## Frontend

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend API base URL. Required for production builds; must be a non-localhost origin. |

`frontend/.env` is also checked into the repo as a safe local-default baseline. Override it with `frontend/.env.local` or process env at startup when you need different local values.

For local development, `VITE_API_URL` is typically set to `http://localhost:8004` in `frontend/.env`.

## CI Environment

CI jobs set their own scoped environment variables. See [See Merge Gates](../engineering/ci-pipeline.md) for the full list. Key differences from local:

- `ENVIRONMENT=PYTEST`
- `SECRET_KEY=ci-secret-key`
- Database points to the CI PostgreSQL service on `127.0.0.1:5432`
- `OPENAI_API_KEY=test-openai-key` (non-functional placeholder)

The frontend production-style build used in CI also sets `VITE_API_URL=https://api.preview.invalid`.

## Start Here Next

- For first-time local setup: [Boot The Stack](../getting-started/quickstart.md)
- For day-to-day local workflow: [Work Locally](../engineering/local-development.md)
- For validation and build commands that depend on these settings: [Run The Right Checks](../engineering/testing.md)
- For release-path implications of runtime settings: [Track Release Readiness](../engineering/release-roadmap.md)
