---
sidebar_position: 1
slug: /reference/api-reference
title: Open The API Docs
description: Open the live API docs and jump to the contract and route-map pages from there.
---

<!-- last-verified: 2026-04-06 -->

# Open The API Docs

The Baldin API exposes interactive documentation when the local stack is running.

Use this page as the access point for live API docs. If you need ownership, route-group, or contract-regeneration guidance, jump to the linked architecture and engineering pages below.

## Interactive Docs

| Format | URL | Best for |
|--------|-----|----------|
| **Swagger UI** | [http://localhost:8004/docs](http://localhost:8004/docs) | Trying endpoints interactively |
| **ReDoc** | [http://localhost:8004/redoc](http://localhost:8004/redoc) | Reading the full API reference |
| **OpenAPI JSON** | [http://localhost:8004/openapi.json](http://localhost:8004/openapi.json) | Programmatic access to the spec |

## Static OpenAPI Spec

The committed `openapi.json` at the repository root is the canonical contract. It is regenerated from the backend via `scripts/update_frontend_schemas.sh` — see [Regenerate API Contracts](../engineering/contract-management.md).

The frontend consumes the same contract through generated types in `frontend/src/schema.d.ts`.

## Admin Interface

The Starlette Admin UI is available at [http://localhost:8004/admin](http://localhost:8004/admin). It uses its own browser session scoped to `/admin` and expects the bootstrap superuser's email and password (`FIRST_SUPERUSER_EMAIL` / `FIRST_SUPERUSER_PASSWORD` from `backend/.env`).

## Start Here Next

- For the route-group map: [Browse API Routes](../architecture/api-surface.md)
- For contract generation and schema sync: [Regenerate API Contracts](../engineering/contract-management.md)
- For local service startup and URLs: [Boot The Stack](../getting-started/quickstart.md)
- For local workflow after startup: [Work Locally](../engineering/local-development.md)
