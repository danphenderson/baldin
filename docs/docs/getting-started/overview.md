---
sidebar_position: 1
slug: /getting-started/overview
title: Orient Yourself
description: Start with product scope, repo layout, and the next docs most people need first.
---

<!-- last-verified: 2026-04-06 -->

# Orient Yourself

Baldin is a private engineering monorepo for a local-first, developer-preview job-search automation workspace. It combines a FastAPI backend, a React/Vite frontend, PostgreSQL, and a set of experimental extraction, orchestration, collaboration, and networking features that are still being hardened.

:::note
Baldin is **local-first** right now. This private repository is Baldin's main engineering workspace for local development, contributor workflows, architecture review, and release-path planning. It is not positioned as a production-hardened SaaS or a finished deployment blueprint.
:::

## What You Can Explore

- **Track** companies, leads, applications, resumes, cover letters, contacts, education, experience, and skills.
- **Exercise** extraction and orchestration workflows against a local stack.
- **Edit** versioned documents with rich-text collaboration and sharing.
- **Explore** the network layer for directory profiles, connections, conversations, activity, and action items.
- **Inspect** the FastAPI surface through Swagger and the admin UI.
- **Develop** against both the main Postgres database and the separate test database defined in `docker-compose.yml`.

## Repository Layout

| Directory | Purpose |
|-----------|---------|
| `backend/` | FastAPI application, Starlette Admin, authentication, extractors, orchestration flows, and tests |
| `frontend/` | React/Vite client that talks to the backend through `VITE_API_URL` |
| `docker-compose.yml` | Local-first entry point for the API, frontend, Postgres, and the test Postgres service |
| `cdk/` | Partially restored AWS CDK infrastructure (reference only) |
| `docs/` | This documentation site |
| `scripts/` | Developer utility scripts (DB reset, schema sync, S3 deploy — some intentionally disabled) |
| `plans/` | Execution plan and project roadmap |

## Start Here Next

- For setup: [Boot The Stack](./quickstart.md)
- For feature overviews: [Command Center](../features/command-center.md), [Job Search Pipeline](../features/job-search-pipeline.md), [Document Workspace](../features/document-workspace.md), [Extraction & Automation](../features/extraction-and-automation.md), [Networking](../features/networking.md)
- For deployment: [Planned Deployment](./deployment-guide.md)
- For architecture: [See System Boundaries](../architecture/system-overview.md)
- For backend boundaries: [Map The Data Model](../architecture/data-model.md) and [Browse API Routes](../architecture/api-surface.md)
- For document editor work: [Understand Document Collaboration](../architecture/document-collaboration.md)
- For configuration details: [Look Up Settings](../reference/environment-variables.md)
- For all documentation links: [Documentation Resources](../reference/resources.md)
- For contributor workflow: [Contribute Safely](./contributing.md)

## Project Status

Baldin is still early. Expect rough edges, evolving APIs, breaking data-model changes, and unfinished automation workflows. If you hit something confusing or broken, route it through the current Baldin team workflow.
