---
sidebar_position: 1
slug: /engineering/local-development
title: Local Development
---

# Local Development

Baldin uses Docker Compose as the local-first entry point. All four services start with a single command.

## Services

| Service | Container | Port | Volume |
|---------|-----------|------|--------|
| `db` | PostgreSQL 15 | 5432 | `./backend/public/db` |
| `test_db` | PostgreSQL 15 | 5431 | `./backend/public/test_db` |
| `web` | FastAPI (Uvicorn, hot-reload) | 8004→8000 | `./backend` mounted |
| `frontend` | Vite dev server | 5173 | `./frontend` mounted |

## Starting the Stack

```bash
docker-compose up --build
```

The backend mounts `./backend` as a volume and runs Uvicorn with `--reload`, so Python changes take effect immediately. The frontend mounts `./frontend` and uses Vite's HMR.

## Resetting Databases

When schema changes cause drift, reset both developer databases:

```bash
./scripts/reset_local_db.sh
```

This script:
1. Stops Docker Compose and removes orphan containers.
2. Clears `backend/public/db` and `backend/public/test_db`.
3. Restarts the stack with fresh databases.

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

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Requires `VITE_API_URL` to be set (defaults to `http://localhost:8004` for local development).

## Useful Local URLs

| URL | What |
|-----|------|
| http://localhost:5173 | Frontend |
| http://localhost:8004 | API root |
| http://localhost:8004/docs | Swagger UI |
| http://localhost:8004/redoc | ReDoc |
| http://localhost:8004/admin | Starlette Admin |
