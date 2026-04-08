# Baldin

[![Docs](https://img.shields.io/badge/docs-live-06b6d4)](https://danphenderson.github.io/baldin/)

**AI-Powered Employment Autopilot** — a local-first, developer-preview job-search automation workspace.

> Take control of your job search. Track applications, extract leads, collaborate on Agentic Workflows, and discover your network — all running locally under your control.

**[Landing Page](https://danphenderson.github.io/baldin/)** · **[Documentation](https://danphenderson.github.io/baldin/docs)** · **[Release Posture](plans/REPO_EXECUTION_PLAN.md)**

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
- Release posture: [docs/docs/engineering/release-roadmap.md](docs/docs/engineering/release-roadmap.md) and [plans/REPO_EXECUTION_PLAN.md](plans/REPO_EXECUTION_PLAN.md)

If you use the published docs site, the same material is available at **[danphenderson.github.io/baldin/docs](https://danphenderson.github.io/baldin/docs)**.

## Local Quickstart

### Requirements

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Setup

1. Clone the repository.
2. Copy `backend/.env.example` to `backend/.env`.
3. Review the backend environment variables you need for local development.
4. Start the local stack from the repository root:

```bash
docker-compose up --build
```

If you hit local schema drift after pulling breaking model changes, reset the developer databases and restart the stack:

```bash
./scripts/reset_local_db.sh
```

5. Open the local services:
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - API: [http://localhost:8004](http://localhost:8004)
   - Swagger UI: [http://localhost:8004/docs](http://localhost:8004/docs)
   - ReDoc: [http://localhost:8004/redoc](http://localhost:8004/redoc)
   - Admin: [http://localhost:8004/admin](http://localhost:8004/admin) using the bootstrapped superuser email and password from `FIRST_SUPERUSER_EMAIL` and `FIRST_SUPERUSER_PASSWORD`

For deeper setup, service topology, and environment details, use [docs/docs/getting-started/quickstart.md](docs/docs/getting-started/quickstart.md), [docs/docs/engineering/local-development.md](docs/docs/engineering/local-development.md), and [docs/docs/reference/environment-variables.md](docs/docs/reference/environment-variables.md).

## Contributing

Use the normal branch-and-pull-request flow against `main`, and install hooks before your first commit:

```bash
pre-commit install
```

If you change backend API routes or schemas, regenerate contracts with `./scripts/update_frontend_schemas.sh` instead of editing `openapi.json` or `frontend/src/schema.d.ts` by hand. The canonical contributor workflow lives in [docs/docs/getting-started/contributing.md](docs/docs/getting-started/contributing.md).

## Status And Caveats

Baldin is still early. Expect rough edges, evolving APIs, breaking data-model changes, and unfinished automation workflows.

The supported development path today is the local Docker Compose stack. The material under [cdk/](cdk/) is reference-only while Baldin narrows and rebuilds its deployment path inside this repository.

Launch sequencing, release-boundary work, and remaining runtime hardening are tracked in [plans/REPO_EXECUTION_PLAN.md](plans/REPO_EXECUTION_PLAN.md).

If you hit something confusing or broken, raise it through the current Baldin issue workflow.
