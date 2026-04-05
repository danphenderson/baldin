---
sidebar_position: 3
slug: /architecture/api-surface
title: API Surface
---

# API Surface

The Baldin API is a RESTful JSON API built with FastAPI. The full OpenAPI 3.1 specification is generated from the backend and stored as `openapi.json` at the repository root.

## Endpoint Groups

The API is organized into the following tag groups:

| Tag | Base Path | Purpose |
|-----|-----------|---------|
| **auth** | `/auth/` | JWT login, logout, registration, password reset, email verification |
| **users** | `/users/` | User profile management, placement updates, profile extraction |
| **leads** | `/leads/` | Job lead CRUD, comments, registration, extraction |
| **companies** | `/companies/` | Company CRUD and linked leads |
| **contacts** | `/contacts/` | Contact records |
| **experiences** | `/experiences/` | Professional experience entries |
| **skills** | `/skills/` | Skill records |
| **education** | `/education/` | Education records |
| **certificate** | `/certificate/` | Professional certifications |
| **resumes** | `/resumes/` | Resume document management |
| **cover_letters** | `/cover_letters/` | Cover letter document management |
| **documents** | `/documents/` | Unified document storage (resumes, cover letters) |
| **applications** | `/applications/` | Job application tracking |
| **extractor** | `/extractor/` | Configurable data extraction |
| **crawlers** | `/crawlers/` | Web crawlers (LinkedIn, Glassdoor) |
| **data_orchestration** | `/data_orchestration/` | ETL pipelines and orchestration events |
| **directory** | `/directory/` | User directory and social discovery |
| **connections** | `/connections/` | Peer connections and networking |
| **messaging** | `/conversations/` | Direct and group conversations |
| **db-management** | `/db-management/` | Database administration |

## Authentication

The API uses JWT bearer tokens via `fastapi-users`. The auth flow:

1. **Register** via `POST /auth/register`
2. **Login** via `POST /auth/jwt/login` — returns an access token
3. **Use** the token in the `Authorization: Bearer <token>` header for authenticated endpoints

## Subscription Tiers

Some endpoints are gated by subscription tier (`free`, `starter`, `pro`). Tier-gating dependencies (`require_tier()`, `require_active_placement()`) are defined in `backend/app/api/deps.py`.

## Interactive Documentation

When the local stack is running, interactive API documentation is available at:

- **Swagger UI:** [http://localhost:8004/docs](http://localhost:8004/docs)
- **ReDoc:** [http://localhost:8004/redoc](http://localhost:8004/redoc)

See [API Reference](../reference/api-reference.md) for access details.
