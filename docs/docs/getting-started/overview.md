---
sidebar_position: 1
slug: /getting-started/overview
title: Orient Yourself
description: Start with Baldin's current posture, repo layout, and the next docs most people need first.
---

<!-- last-verified: 2026-04-17 -->

# Orient Yourself

Baldin is a local-first job-search OS today: a private workspace for tracking applications, extracting leads, collaborating on documents, and using agent-assisted workflows from a repo-local stack.

:::note
Baldin's target direction is an applicant-side labor market observability platform, but this repository currently supports local development, contributor workflows, architecture review, and release-path planning rather than a production deployment blueprint.
:::

:::note Trust Model
Baldin keeps user-owned data local and sharing minimal by default. Discoverability is opt-in, and any future shared-signal work is intended to rely on coarse bands, aggressive time decay, and confidence tiers instead of public identity or exact counts.
:::

## What You Can Explore

- **Track** companies, leads, applications, resumes, cover letters, contacts, education, experience, and skills.
- **Exercise** extraction and orchestration workflows against a local stack.
- **Edit** versioned documents with rich-text collaboration and sharing.
- **Explore** opt-in directory profiles, connections, conversations, personal activity, and action items.
- **Inspect** the FastAPI surface through Swagger, the Admin SPA, and the legacy admin fallback.
- **Develop** against both the main Postgres database and the separate test database defined in `docker-compose.yml`.

## Repository Layout

| Directory | Purpose |
|-----------|---------|
| `backend/` | FastAPI application, legacy Starlette Admin, authentication, extractors, orchestration flows, ETL service, crawler worker, and tests |
| `frontend/` | React/Vite client for the main app plus the dedicated Admin SPA at `/admin/` |
| `operator-design/` | Standalone reference-only redesign app served separately from the main frontend |
| `docker-compose.yml` | Supported local topology for `frontend` (`/` and `/admin/`), `operator-design`, `web`, `etl-service`, `crawler-worker`, `redis`, `docs`, `db`, and `test_db` |
| `cdk/` | Partially restored AWS CDK infrastructure (reference only) |
| `docs/` | This documentation site |
| `scripts/` | Developer utility scripts (DB reset, schema sync, S3 deploy — some intentionally disabled) |
| `plans/` | Execution plan and project roadmap |

## Start Here Next

- For setup: [Boot The Stack](./quickstart.md)
- For feature overviews: [Dashboard](../features/dashboard.md), [Job Search Pipeline](../features/job-search-pipeline.md), [Document Workspace](../features/document-workspace.md), [Extraction & Automation](../features/extraction-and-automation.md), [Networking & Messaging](../features/networking.md)
- For deployment: [Planned Deployment](./deployment-guide.md)
- For architecture: [See System Boundaries](../architecture/system-overview.md)
- For backend boundaries: [Map The Data Model](../architecture/data-model.md) and [Browse API Routes](../architecture/api-surface.md)
- For document editor work: [Understand Document Collaboration](../architecture/document-collaboration.md)
- For configuration details: [Look Up Settings](../reference/environment-variables.md)
- For all documentation links: [Documentation Resources](../reference/resources.md)
- For contributor workflow: [Contribute Safely](./contributing.md)

## Project Status

Baldin is still early. Expect rough edges, evolving APIs, breaking data-model changes, and unfinished automation workflows. If you hit something confusing or broken, route it through the current Baldin team workflow.
