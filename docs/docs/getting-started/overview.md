---
sidebar_position: 1
slug: /getting-started/overview
title: Overview
---

# Baldin

Baldin is a developer-preview workspace for exploring job-search automation locally. It combines a FastAPI backend, a React/Vite frontend, PostgreSQL, and a set of experimental extraction and orchestration flows for leads, applications, resumes, cover letters, and candidate profile data.

:::note
Baldin is **local-first** right now. The repository is meant for local evaluation, architecture exploration, and contribution. It is not positioned as a production-hardened SaaS or a finished deployment blueprint.
:::

## What You Can Explore

- **Track** companies, leads, applications, resumes, cover letters, contacts, education, experience, and skills.
- **Exercise** extraction and orchestration workflows against a local stack.
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

## Project Status

Baldin is still early. Expect rough edges, evolving APIs, breaking data-model changes, and unfinished automation workflows. If you hit something confusing or broken, open an issue in the [issue tracker](https://github.com/danphenderson/baldin/issues).

## License

This project is licensed under the terms of the [MIT license](https://github.com/danphenderson/baldin/blob/main/LICENSE).
