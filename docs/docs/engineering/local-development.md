---
sidebar_position: 1
slug: /engineering/local-development
title: Work Locally
description: Work locally with Docker Compose or outside-container loops and the shortest next steps.
---

<!-- last-verified: 2026-04-06 -->

# Work Locally

Baldin uses Docker Compose as the local-first entry point. All six services start with a single command.

If you use Baldin's workspace skills, `/baldin-local-stack-doctor` helps triage local Compose failures, `test_db` connectivity problems, schema-drift resets, and PostgreSQL collation-repair decisions.

## Services

| Service | Container | Port | Volume |
|---------|-----------|------|--------|
| `db` | PostgreSQL 15 | 5432 | `./backend/public/db` |
| `test_db` | PostgreSQL 15 | 5431 | `./backend/public/test_db` |
| `redis` | Redis 7 | 6379 | none |
| `web` | FastAPI (Uvicorn, hot-reload) | 8004→8000 | `./backend` mounted |
| `crawler-worker` | Python background worker | none | `./backend` mounted |
| `frontend` | Vite dev server | 5173 | `./frontend` mounted |

## Starting the Stack

```bash
docker-compose up --build
```

The backend mounts `./backend` as a volume and runs Uvicorn with `--reload`, so Python changes take effect immediately. The frontend mounts `./frontend` and uses Vite's HMR.

Redis backs the local background-job queue, and `crawler-worker` consumes crawler and seed jobs from that queue while the API stays responsive.

Use [Boot The Stack](../getting-started/quickstart.md) for first boot. This page is the day-two reference once the stack already makes sense to you.

## Resetting Databases

When schema changes cause drift, reset both developer databases:

```bash
./scripts/reset_local_db.sh
```

This script:
1. Stops Docker Compose and removes orphan containers.
2. Clears `backend/public/db` and `backend/public/test_db`.
3. Restarts the stack with fresh databases.

If startup logs show a PostgreSQL `collation version mismatch` warning after a Docker image or base-OS change and you want to keep local data, repair the local clusters in place:

```bash
./scripts/repair_local_db_collation.sh
```

This reindexes `postgres`, `template1`, and the app database in both local Postgres clusters, then refreshes PostgreSQL's stored collation version metadata. If you do not need to preserve local data, `./scripts/reset_local_db.sh` remains the simpler option.

## Working Outside Containers

You can also run backend or frontend outside Docker:

### Backend

```bash
cd backend
pipenv install --dev
pipenv shell
uvicorn app.main:app --reload --port 8004
```

Requires a running PostgreSQL instance matching the `backend/.env` connection settings.

If you want worker-mode background execution outside Docker, run Redis separately and start the worker in another shell:

```bash
cd backend
pipenv install --dev
pipenv run python -m app.crawler_worker
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Requires `VITE_API_URL` to be set (defaults to `http://localhost:8004` for local development).

## Related Local Tasks

| Task | Command |
| --- | --- |
| Reset local databases | `./scripts/reset_local_db.sh` |
| Regenerate API contracts | `./scripts/update_frontend_schemas.sh` |
| Build docs site | `npm --prefix docs run build` |

## Related Docs

- [Boot The Stack](../getting-started/quickstart.md)
- [Run The Right Checks](./testing.md)
- [Regenerate API Contracts](./contract-management.md)
- [Look Up Settings](../reference/environment-variables.md)

## Useful Local URLs

| URL | What |
|-----|------|
| http://localhost:5173 | Frontend |
| http://localhost:8004 | API root |
| http://localhost:8004/docs | Swagger UI |
| http://localhost:8004/redoc | ReDoc |
| http://localhost:8004/admin | Starlette Admin |
