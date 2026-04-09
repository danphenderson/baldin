---
sidebar_position: 3
slug: /architecture/api-surface
title: Browse API Routes
description: Browse FastAPI route groups, access rules, and contract boundaries.
---

<!-- last-verified: 2026-04-06 -->

# Browse API Routes

Baldin exposes a FastAPI JSON API with OpenAPI 3.1 generated directly from the backend. The full contract is committed at the repo root as `openapi.json` and is also used to generate `frontend/src/schema.d.ts`.

## Route Map

```mermaid
graph TD
	API[api_router] --> Auth[Auth and identity]
	API --> Search[Job search and profile]
	API --> Docs[Documents and collaboration]
	API --> Automation[Automation and review]
	API --> Network[Networking and messaging]
	API --> Ops[Operational helpers]

	Auth --> A1[/auth/*]
	Search --> S1[/users]
	Search --> S2[/contacts]
	Search --> S3[/skills]
	Search --> S4[/experiences]
	Search --> S5[/education]
	Search --> S6[/certificate]
	Search --> S7[/companies]
	Search --> S8[/leads]
	Search --> S9[/applications]
	Docs --> D1[/documents]
	Docs --> D2[/documents/{id}/collaborate*]
	Automation --> AU1[/extractor]
	Automation --> AU2[/data_orchestration]
	Automation --> AU3[/crawlers]
	Automation --> AU4[/review]
	Network --> N1[/directory]
	Network --> N2[/connections]
	Network --> N3[/conversations]
	Network --> N4[/action-items]
	Network --> N5[/activity-feed]
	Ops --> O1[/db-management]
```

## Route Groups

### Auth

| Tag | Prefix | Purpose |
| --- | --- | --- |
| `auth` | `/auth`, `/auth/jwt` | Registration, JWT login, password reset, and email verification via `fastapi-users` |

### Profile and Job Search

| Tag | Prefix | Purpose |
| --- | --- | --- |
| `users` | `/users` | User profile, placement, subscription, and profile extraction entry points |
| `contacts` | `/contacts` | Contact CRUD |
| `skills` | `/skills` | Skill CRUD |
| `experiences` | `/experiences` | Experience CRUD |
| `education` | `/education` | Education CRUD |
| `certificate` | `/certificate` | Certificate CRUD |
| `companies` | `/companies` | Company CRUD and lead associations |
| `leads` | `/leads` | Lead CRUD, registration, comments, extraction, and related views |
| `applications` | `/applications` | Application queue, board, detail, and status-history updates |

### Documents and Collaboration

| Tag | Prefix | Purpose |
| --- | --- | --- |
| `documents` | `/documents` | Versioned multi-kind documents, version history, AI generation, seed/import flows, sharing, upload/download, and application attachment |
| `collaboration` | `/documents` | Bootstrap claim and WebSocket collaboration endpoints under `/documents/{document_id}/collaborate*` |

The document surface is now the canonical API for resumes, cover letters, and other user-authored materials. Legacy `/resumes` and `/cover_letters` routes have been retired from the public API.

### Automation and Review

| Tag | Prefix | Purpose |
| --- | --- | --- |
| `extractor` | `/extractor` | Extractor CRUD, examples, versioning, and extraction operations |
| `data_orchestration` | `/data_orchestration` | Orchestration pipeline CRUD and event history |
| `crawlers` | `/crawlers` | Superuser-managed crawler pipelines and runs |
| `review` | `/review` | Superuser review queue for pending automation output |

### Networking, Activity, and Tasks

| Tag | Prefix | Purpose |
| --- | --- | --- |
| `directory` | `/directory` | Discoverable user directory and profile previews, including superuser discovery filters |
| `connections` | `/connections` | Connection request lifecycle with superuser-aware entitlement rules |
| `messaging` | `/conversations` | Direct and group conversations, messages, unread counts |
| `action-items` | `/action-items` | Cross-entity user task management |
| `activity-feed` | `/activity-feed` | Aggregated activity stream and command-center summary |

### Operational Helpers

| Tag | Prefix | Purpose |
| --- | --- | --- |
| `db-management` | `/db-management` | Database inspection and reset helpers used in local or admin workflows |

## Access Model

### Authentication

Most routes require a JWT bearer token obtained through `POST /auth/jwt/login`. The standard flow is:

1. Register with `POST /auth/register` if you do not already have a local user.
2. Exchange credentials at `POST /auth/jwt/login`.
3. Send `Authorization: Bearer <token>` on authenticated requests.

### Tier gates and role gates

- `users.subscription_tier` is enforced through `require_tier()` in `backend/app/api/deps.py`.
- New regular users default to `is_discoverable=false`; superusers default to `is_discoverable=true`, and both can toggle visibility through the `/users` update surface.
- Directory and profile payloads expose `is_superuser`, and `GET /directory/` accepts `superusers_only=true` for the focused discovery view.
- Connection requests to non-superusers require at least the `starter` tier. Requests to superusers are available to any authenticated user.
- Direct messaging requires an accepted connection; group conversations require `pro`.
- Review and crawler endpoints are reserved for superusers.
- Collaboration routes additionally require document ownership or an editor-level share.

## Integration Contracts

- The frontend should consume the generated `schema.d.ts` types rather than hand-writing payload contracts.
- Backend API or schema changes should be followed by `./scripts/update_frontend_schemas.sh`.
- OpenAPI is the canonical machine-readable contract; Swagger and ReDoc are the canonical interactive views.

## Interactive Docs

When the local stack is running:

- **Swagger UI:** [http://localhost:8004/docs](http://localhost:8004/docs)
- **ReDoc:** [http://localhost:8004/redoc](http://localhost:8004/redoc)

See [Open The API Docs](../reference/api-reference.md) for the quick-access endpoints and related admin URLs.
