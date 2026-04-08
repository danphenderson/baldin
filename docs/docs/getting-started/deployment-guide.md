---
sidebar_position: 4
slug: /getting-started/deployment-guide
title: Planned Deployment
description: Current deployment posture, planned production topology, and what is supported today.
---

<!-- last-verified: 2026-04-08 -->

# Planned Deployment

Baldin is in developer preview. The only supported deployment path today is the local Docker Compose stack. Production deployment is being planned through a phased roadmap tracked in the private repo at `plans/REPO_EXECUTION_PLAN.md`.

This page explains what works today, what is planned, and what constraints shape the deployment path.

## What Works Today

### Local Docker Compose

The local stack is the supported development surface. It runs four services:

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| **db** | PostgreSQL 15 | 5432 | Main application database |
| **test_db** | PostgreSQL 15 | 5431 | Isolated test database |
| **web** | `backend/Dockerfile.dev` | 8004 → 8000 | FastAPI/Uvicorn backend with hot reload |
| **frontend** | `frontend/Dockerfile` | 5173 | React/Vite dev server with HMR |

Start the stack:

```bash
docker-compose up --build
```

See [Boot The Stack](./quickstart.md) for full setup instructions.

### CI and Build Artifacts

GitHub Actions produces two candidate artifacts on every push to `main` and on pull requests:

| Artifact | Source | Output |
|----------|--------|--------|
| Backend image | `backend/Dockerfile` | `baldin-api-candidate:${sha}` |
| Frontend bundle | `frontend/scripts/build-static.mjs` | `frontend/dist/` |

The CI workflow validates lint, tests, typecheck, build, and API contract freshness before merge. See [See Merge Gates](../engineering/ci-pipeline.md) for details.

## What Is Planned

Production deployment follows the seven-phase roadmap. Phase 2 is in progress, and Phases 3–7 are not yet started:

| Phase | Title | What It Unlocks |
|-------|-------|-----------------|
| ~~1~~ | ~~Reset Baseline~~ | ~~Complete~~ |
| 2 | CI as Integration Gate | Required checks on `main`, meaningful coverage, and contract guards |
| 3 | Minimal Production Topology | One deployment shape chosen — likely containerized compute with managed Postgres |
| 4 | Deployment Automation | Protected staging and production workflows in this repository |
| 5 | Runtime Hardening | Database migrations (replacing `create_all`), secret management, startup safety |
| 6 | Safety Controls | Rate limiting, operator visibility, backup/restore, launch-readiness checklist |
| 7 | Staged Launch | Staging smoke tests, rollback verification, controlled first release |

## What Is Not Supported

### CDK Infrastructure (`cdk/`)

The `cdk/` directory contains partially restored AWS infrastructure code (VPC, ECS/Fargate, RDS, ECR, static hosting). It is **reference material only**:

- Do not assume CDK defaults are production-ready
- Do not treat `cdk/` as an operator runbook
- Safe use today is limited to `cdk ls` and `cdk synth` for review

### Legacy S3 Sync

`scripts/sync_frontend_to_s3.sh` is intentionally disabled. The legacy S3 deployment path was removed when deployment ownership was consolidated into this repository.

### Implicit Schema Bootstrap

The backend currently runs `create_db_and_tables()` during startup. That path still relies on SQLAlchemy `create_all`, but it also performs limited additive repair for missing columns and explicitly named unique constraints on existing local tables. This remains a known launch blocker — Phase 5 will replace it with proper database migrations.

## Deployment Decision Tree

```mermaid
flowchart TD
    A[Want to run Baldin?] --> B{Local development?}
    B -- Yes --> C[docker-compose up --build]
    B -- No --> D{Production deployment?}
    D -- Yes --> E[Not yet supported]
    E --> F[Follow the release roadmap]
    F --> G[plans/REPO_EXECUTION_PLAN.md]
```

## Related Docs

- [Boot The Stack](./quickstart.md) — Local setup and first run
- [Track Release Readiness](../engineering/release-roadmap.md) — Full phase-by-phase roadmap
- [See Merge Gates](../engineering/ci-pipeline.md) — CI workflow and build artifact details
- [Look Up Settings](../reference/environment-variables.md) — Backend and frontend configuration
