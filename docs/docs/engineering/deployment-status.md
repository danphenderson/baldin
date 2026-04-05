---
sidebar_position: 5
slug: /engineering/deployment-status
title: Deployment Status
---

# Deployment Status

Baldin is in developer preview. Deployment automation is being rebuilt — the local Docker Compose stack is the primary supported workflow today.

## Current Artifact Contract

The deployment path starts from two application artifacts:

| Artifact | Source | Output |
|----------|--------|--------|
| Backend container image | `backend/Dockerfile` | Docker image |
| Frontend static bundle | `frontend/scripts/build-static.mjs` | `frontend/dist/` |

The CI **Build** workflow produces both artifacts on every push to `main` and on pull requests.

## CDK Directory (`cdk/`)

The `cdk/` directory contains partially restored AWS infrastructure code (VPC, ECS/Fargate, RDS, ECR, static asset hosting). It serves as **reference material only** — it is not the approved production deployment contract.

### What not to assume

- Do not assume every stack should be revived as-is.
- Do not assume CDK defaults are production-ready.
- Do not assume legacy IAM, static hosting, or image-promotion paths are valid.
- Do not use `cdk/` as an operator runbook.

### Behaviors under review

- Public S3 website hosting assumptions
- Destructive removal policies
- Broad IAM scopes and long-lived machine-user patterns
- Open or overly broad database ingress
- Disabled helper paths from the old public-repo boundary

### Safe use right now

```bash
cd cdk
pipenv install
pipenv shell
cdk ls
cdk synth
```

Treat this as review and synthesis only.

## Disabled Paths

**`scripts/sync_frontend_to_s3.sh`** — Intentionally disabled. Outputs an error message directing users to build locally. The public S3 sync was removed when the repo went private.

## Schema Management

The repo does not include Alembic migrations. Schema changes rely on SQLAlchemy `create_all` during startup. This is a known launch blocker tracked in the execution plan (Phase 5).

## Roadmap

The deployment roadmap is tracked in `plans/REPO_EXECUTION_PLAN.md`. The relevant phases:

1. ~~Phase 1: Reset baseline~~ — Complete
2. **Phase 2:** Turn CI into a real integration gate
3. **Phase 3:** Choose minimal production topology
4. **Phase 4:** Rebuild deployment automation
5. **Phase 5:** Remove runtime launch blockers
6. **Phase 6:** Add minimum production safety controls
7. **Phase 7:** Staged launch

See [Project Status](../reference/project-status.md) for the full execution plan summary.
