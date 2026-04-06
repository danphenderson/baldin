---
sidebar_position: 4
slug: /reference/resources
title: Documentation Resources
description: Links to all Baldin documentation assets — API docs, admin, repo files, and related guides.
---

<!-- last-verified: 2026-04-06 -->

# Documentation Resources

This page collects links to every Baldin documentation asset in one place. Use it as a quick-reference hub when you need to jump to a specific tool, interface, or source file.

## Local Interfaces (requires running stack)

These links work when the local Docker Compose stack is running (`docker-compose up --build`):

| Resource | URL | Description |
|----------|-----|-------------|
| **Frontend** | [http://localhost:5173](http://localhost:5173) | React/Vite application UI |
| **Swagger UI** | [http://localhost:8004/docs](http://localhost:8004/docs) | Interactive API explorer |
| **ReDoc** | [http://localhost:8004/redoc](http://localhost:8004/redoc) | Readable API reference |
| **OpenAPI JSON** | [http://localhost:8004/openapi.json](http://localhost:8004/openapi.json) | Machine-readable API spec |
| **Admin UI** | [http://localhost:8004/admin](http://localhost:8004/admin) | Starlette Admin interface (superuser credentials required) |

## Repository Documentation

| Resource | Location | Description |
|----------|----------|-------------|
| **README** | [`README.md`](https://github.com/danphenderson/baldin/blob/main/README.md) | Repository overview, quickstart, and status |
| **Contributing Guide** | [`docs/docs/getting-started/contributing.md`](https://github.com/danphenderson/baldin/blob/main/docs/docs/getting-started/contributing.md) | Contributor workflow, validation expectations, and scope rules |
| **Execution Plan** | [`plans/REPO_EXECUTION_PLAN.md`](https://github.com/danphenderson/baldin/blob/main/plans/REPO_EXECUTION_PLAN.md) | Seven-phase release roadmap |
| **License** | [`LICENSE`](https://github.com/danphenderson/baldin/blob/main/LICENSE) | MIT License |

## Generated Artifacts

| Artifact | Location | Regeneration |
|----------|----------|--------------|
| **OpenAPI Spec** | [`openapi.json`](https://github.com/danphenderson/baldin/blob/main/openapi.json) | `scripts/update_frontend_schemas.sh` |
| **TypeScript Types** | [`frontend/src/schema.d.ts`](https://github.com/danphenderson/baldin/blob/main/frontend/src/schema.d.ts) | `scripts/update_frontend_schemas.sh` |

See [Regenerate API Contracts](../engineering/contract-management.md) for when and how to regenerate these files.

## Infrastructure References

| Resource | Location | Status |
|----------|----------|--------|
| **Docker Compose** | [`docker-compose.yml`](https://github.com/danphenderson/baldin/blob/main/docker-compose.yml) | Supported local development surface |
| **Backend Dockerfile** | [`backend/Dockerfile`](https://github.com/danphenderson/baldin/blob/main/backend/Dockerfile) | Candidate image build |
| **Dev Dockerfile** | [`backend/Dockerfile.dev`](https://github.com/danphenderson/baldin/blob/main/backend/Dockerfile.dev) | Local development with hot reload |
| **Frontend Dockerfile** | [`frontend/Dockerfile`](https://github.com/danphenderson/baldin/blob/main/frontend/Dockerfile) | Dev server container |
| **CDK Stacks** | [`cdk/`](https://github.com/danphenderson/baldin/blob/main/cdk/) | Reference only — not production-approved |
| **Environment Template** | [`backend/.env.example`](https://github.com/danphenderson/baldin/blob/main/backend/.env.example) | Starting point for `backend/.env` |

## Developer Scripts

| Script | Purpose | Status |
|--------|---------|--------|
| [`scripts/update_frontend_schemas.sh`](https://github.com/danphenderson/baldin/blob/main/scripts/update_frontend_schemas.sh) | Regenerate OpenAPI spec and TypeScript types | Active |
| [`scripts/reset_local_db.sh`](https://github.com/danphenderson/baldin/blob/main/scripts/reset_local_db.sh) | Reset local development databases | Active |
| [`scripts/sync_frontend_to_s3.sh`](https://github.com/danphenderson/baldin/blob/main/scripts/sync_frontend_to_s3.sh) | Legacy S3 deployment | Intentionally disabled |

## Documentation Site

| Resource | Description |
|----------|-------------|
| **This site** | Docusaurus documentation at `docs/` — architecture, engineering, features, and reference |
| **Source files** | [`docs/docs/`](https://github.com/danphenderson/baldin/blob/main/docs/docs/) — Markdown sources for all pages |

## Related Docs

- [Boot The Stack](../getting-started/quickstart.md) — Get the local stack running
- [Open The API Docs](./api-reference.md) — Interactive API documentation details
- [Look Up Settings](./environment-variables.md) — Backend and frontend configuration reference
- [Contribute Safely](../getting-started/contributing.md) — Contributor workflow and expectations
