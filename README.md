# Baldin

[![Docs](https://img.shields.io/badge/docs-live-06b6d4)](https://danphenderson.github.io/baldin/)

**AI-Powered Employment Autopilot** — a local-first, developer-preview job-search automation workspace.

> Take control of your job search. Track applications, extract leads, collaborate on Agentic Workflows, and discover your network — all running locally under your control.

**[Landing Page](https://danphenderson.github.io/baldin/)** · **[Documentation](https://danphenderson.github.io/baldin/docs)** · **[Release Posture](docs/docs/engineering/release-roadmap.md)**

---

Baldin is a private, local-first engineering monorepo for a developer-preview job-search automation workspace. It contains the FastAPI backend, the React/Vite frontend, the local Docker integration surface, the Docusaurus docs, and the release-path planning material that currently defines how the system is being hardened.

> Baldin is local-first right now.
> This repository is the main engineering workspace for the product. It supports local development, contributor workflows, architecture review, and release-path planning, but it is not a production deployment blueprint.

## Start Here

- Local setup: [docs/docs/getting-started/quickstart.md](docs/docs/getting-started/quickstart.md)
- Contributor workflow: [docs/docs/getting-started/contributing.md](docs/docs/getting-started/contributing.md)
- Architecture: [docs/docs/architecture/system-overview.md](docs/docs/architecture/system-overview.md), [docs/docs/architecture/data-model.md](docs/docs/architecture/data-model.md), [docs/docs/architecture/api-surface.md](docs/docs/architecture/api-surface.md), [docs/docs/architecture/frontend-architecture.md](docs/docs/architecture/frontend-architecture.md)
- Document editor and collaboration: [docs/docs/architecture/document-collaboration.md](docs/docs/architecture/document-collaboration.md)
- Networking and messaging: [docs/docs/architecture/networking-and-messaging.md](docs/docs/architecture/networking-and-messaging.md)
- Testing and CI: [docs/docs/engineering/testing.md](docs/docs/engineering/testing.md), [docs/docs/engineering/ci-pipeline.md](docs/docs/engineering/ci-pipeline.md)
- Release posture: [docs/docs/engineering/release-roadmap.md](docs/docs/engineering/release-roadmap.md)

If you use the published docs site, the same material is available at **[danphenderson.github.io/baldin/docs](https://danphenderson.github.io/baldin/docs)**.

## Local Quickstart

### Requirements

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Setup

1. Clone the repository.
2. Review the repo-tracked `backend/.env` and `frontend/.env` defaults.
3. Put real secrets in process env or ignored override files:

```bash
# Recommended for Codex worktrees and one-off local shells
export OPENAI_API_KEY=your-key-here

# Optional local override files for non-Codex development
cp backend/.env backend/.env.local
cp frontend/.env frontend/.env.local
```

The tracked `.env` files are safe local defaults for every worktree. Keep real secrets and user-specific credentials out of those tracked files. For local-only contract regeneration, a non-empty `OPENAI_API_KEY` in process env or `backend/.env.local` is enough.

4. Start the local stack from the repository root:

```bash
docker-compose up --build
```

Keep the stack running while you iterate. The backend reloads through Uvicorn and the frontend uses Vite HMR, so the fast path is inspect -> patch -> smoke-check instead of restarting services.

For routine local work, start with the smallest check that proves the change:

- Backend slice: `cd backend && pipenv run pytest -xvs path/to/test.py -k "case"`
- Frontend slice: `cd frontend && npm run test -- --watch`
- Backend API or schema change: `SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh`

If you hit local schema drift after pulling breaking model changes, reset the developer databases and restart the stack:

```bash
./scripts/reset_local_db.sh
```

5. Open the local services:
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Admin SPA: [http://localhost:5173/admin/](http://localhost:5173/admin/) using the bootstrapped superuser email and password from `FIRST_SUPERUSER_EMAIL` and `FIRST_SUPERUSER_PASSWORD`
   - Product docs: [http://localhost:3001/baldin/docs](http://localhost:3001/baldin/docs)
   - API: [http://localhost:8004](http://localhost:8004)
   - Swagger UI: [http://localhost:8004/docs](http://localhost:8004/docs)
   - ReDoc: [http://localhost:8004/redoc](http://localhost:8004/redoc)
   - Legacy Admin: [http://localhost:8004/admin](http://localhost:8004/admin) using the same bootstrapped superuser credentials as a backend fallback surface

The product docs now run inside the same Compose stack and are available at [http://localhost:3001/baldin/docs](http://localhost:3001/baldin/docs).

For deeper setup, service topology, and environment details, use [docs/docs/getting-started/quickstart.md](docs/docs/getting-started/quickstart.md), [docs/docs/engineering/local-development.md](docs/docs/engineering/local-development.md), and [docs/docs/reference/environment-variables.md](docs/docs/reference/environment-variables.md).

## Local Services

| Service | Description |
| --- | --- |
| `db` | PostgreSQL 15 primary application database |
| `test_db` | PostgreSQL 15 database used by pytest |
| `redis` | Redis 7 queue backing background jobs |
| `etl-service` | Internal ETL crawler execution boundary |
| `web` | FastAPI backend, API, and admin surface |
| `crawler-worker` | Background worker consuming Redis jobs |
| `frontend` | React/Vite frontend plus the dedicated admin SPA at `/admin/` |
| `docs` | Docusaurus product documentation |

## Contributing

Use the normal branch-and-pull-request flow against `main`, and install hooks before your first commit:

```bash
pre-commit install
```

If you change backend API routes or schemas, regenerate contracts with `SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh` during active iteration and the normal `./scripts/update_frontend_schemas.sh` before push or review. Do not edit `openapi.json` or `frontend/src/schema.d.ts` by hand. The canonical contributor workflow lives in [docs/docs/getting-started/contributing.md](docs/docs/getting-started/contributing.md).

## Status And Caveats

Baldin is still early. Expect rough edges, evolving APIs, breaking data-model changes, and unfinished automation workflows.

When you run the full Docker Compose stack, `docker-compose.yml` injects the local Redis queue settings for the API and worker containers. You only need to override them manually when running services outside Compose.

The supported development path today is the local Docker Compose stack. The material under [cdk/](cdk/) is reference-only while Baldin narrows and rebuilds its deployment path inside this repository.

Launch sequencing, release-boundary work, and remaining runtime hardening are tracked in [docs/docs/engineering/release-roadmap.md](docs/docs/engineering/release-roadmap.md).

If you hit something confusing or broken, raise it through the current Baldin issue workflow.
