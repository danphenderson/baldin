---
sidebar_position: 2
slug: /reference/environment-variables
title: Environment Variables
---

# Environment Variables

## Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` for local development.

### Required

| Variable | Purpose |
|----------|---------|
| `SECRET_KEY` | Application secret key for JWT signing |
| `FIRST_SUPERUSER_EMAIL` | Bootstrap admin email (created on first startup) |
| `FIRST_SUPERUSER_PASSWORD` | Bootstrap admin password |

### Database

| Variable | Default | Purpose |
|----------|---------|---------|
| `DEFAULT_DATABASE_HOSTNAME` | `db` | Main database host |
| `DEFAULT_DATABASE_PORT` | `5432` | Main database port |
| `DEFAULT_DATABASE_DB` | `db` | Main database name |
| `DEFAULT_DATABASE_USER` | `postgres` | Main database user |
| `DEFAULT_DATABASE_PASSWORD` | `postgres` | Main database password |
| `TEST_DATABASE_HOSTNAME` | `test_db` | Test database host |
| `TEST_DATABASE_PORT` | `5432` | Test database port |
| `TEST_DATABASE_DB` | `test_db` | Test database name |
| `TEST_DATABASE_USER` | `postgres` | Test database user |
| `TEST_DATABASE_PASSWORD` | `postgres` | Test database password |

### Application

| Variable | Default | Purpose |
|----------|---------|---------|
| `ENVIRONMENT` | `DEV` | Runtime environment (`DEV`, `PYTEST`, `STAGING`, `PRODUCTION`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | JWT token lifetime |
| `BACKEND_CORS_ORIGINS` | `http://localhost:5173` | Allowed CORS origins (comma-separated) |
| `MAX_CONCURRENCY` | `1` | Extraction concurrency limit |
| `MAX_CHUNKS` | `-1` | Maximum extraction chunks (-1 = unlimited) |
| `LOGGING_LEVEL` | `INFO` | Python logging level |

### AI / Extraction

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Enables AI-assisted extraction and automation features |

### Crawlers (Optional)

| Variable | Purpose |
|----------|---------|
| `LINKEDIN_EMAIL` | LinkedIn crawler authentication |
| `LINKEDIN_PASSWORD` | LinkedIn crawler authentication |
| `GLASSDOOR_EMAIL` | Glassdoor crawler authentication |
| `GLASSDOOR_PASSWORD` | Glassdoor crawler authentication |

### Startup Behavior

| Variable | Default | Purpose |
|----------|---------|---------|
| `SHOULD_BOOTSTRAP_ON_STARTUP` | `True` | Create tables and default superuser on startup |
| `SHOULD_RUN_CRAWLER_SCHEDULER` | `False` | Start the background crawler scheduler |

## Frontend

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend API base URL. Required for production builds; must be a non-localhost origin. |

For local development, `VITE_API_URL` is typically set to `http://localhost:8004` in `frontend/.env`.

## CI Environment

CI jobs set their own scoped environment variables. See [CI Pipeline](../engineering/ci-pipeline.md) for the full list. Key differences from local:

- `ENVIRONMENT=PYTEST`
- `SECRET_KEY=ci-secret-key`
- Database points to the CI PostgreSQL service on `127.0.0.1:5432`
- `OPENAI_API_KEY=test-openai-key` (non-functional placeholder)
