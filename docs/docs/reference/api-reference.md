---
sidebar_position: 1
slug: /reference/api-reference
title: API Reference
---

# API Reference

The Baldin API exposes interactive documentation when the local stack is running.

## Interactive Docs

| Format | URL | Best for |
|--------|-----|----------|
| **Swagger UI** | [http://localhost:8004/docs](http://localhost:8004/docs) | Trying endpoints interactively |
| **ReDoc** | [http://localhost:8004/redoc](http://localhost:8004/redoc) | Reading the full API reference |
| **OpenAPI JSON** | [http://localhost:8004/openapi.json](http://localhost:8004/openapi.json) | Programmatic access to the spec |

## Static OpenAPI Spec

The committed `openapi.json` at the repository root is the canonical contract. It is regenerated from the backend via `scripts/update_frontend_schemas.sh` — see [Contract Management](../engineering/contract-management.md).

## Admin Interface

The Starlette Admin UI is available at [http://localhost:8004/admin](http://localhost:8004/admin). It uses its own browser session scoped to `/admin` and expects the bootstrap superuser's email and password (`FIRST_SUPERUSER_EMAIL` / `FIRST_SUPERUSER_PASSWORD` from `backend/.env`).

## Endpoint Overview

For a high-level map of all endpoint groups, see [API Surface](../architecture/api-surface.md).
