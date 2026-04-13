---
sidebar_position: 3
slug: /architecture/api-surface
title: Browse API Routes
description: Browse FastAPI route groups, access rules, and contract boundaries.
---

<!-- last-verified: 2026-04-12 -->

# Browse API Routes

Baldin exposes a FastAPI API with OpenAPI 3.1 generated directly from the backend. Most routes are standard JSON over HTTP; the agent chat send route can also stream `text/event-stream` SSE responses. The full contract is committed at the repo root as `openapi.json` and is also used to generate `frontend/src/schema.d.ts`.

## Route Map

```mermaid
graph TD
	accTitle: Baldin API Route Map
	accDescr: Shows the FastAPI api_router broken into six functional groups — Auth and identity, Job search and profile, Documents and collaboration, Automation and review, Networking and messaging, and Operational helpers — with each group's URL prefix listed below it.
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
	Search --> S6[/certificates]
	Search --> S7[/companies]
	Search --> S8[/leads]
	Search --> S9[/applications]
	Search --> S10[/aspirations]
	Docs --> D1[/documents]
	Docs --> D2[/documents/{id}/collaborate*]
	Automation --> AU1[/extractors]
	Automation --> AU2[/orchestration-pipelines]
	Automation --> AU3[/crawlers]
	Automation --> AU4[/review]
	Network --> N1[/directory]
	Network --> N2[/connections]
	Network --> N3[/conversations]
	Network --> N4[/action-items]
	Network --> N5[/activity-feed]
	Network --> N6[/agents]
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
| `certificates` | `/certificates` | Certificate CRUD |
| `companies` | `/companies` | Company CRUD and lead associations |
| `leads` | `/leads` | Lead CRUD, registration, comments, extraction, and related views |
| `applications` | `/applications` | Application queue, board, detail, and status-history updates |
| `aspirations` | `/aspirations` | Aspiration CRUD, profile-based suggestion generation, and aspiration-aware lead matching |

#### Aspirations Public Surfaces

- `GET /aspirations` and `POST /aspirations` provide paginated listing and creation of user aspirations, scoped with a `kind` enum (`role` or `company`).
- `GET /aspirations/{id}`, `PATCH /aspirations/{id}`, and `DELETE /aspirations/{id}` manage individual aspirations.
- `POST /aspirations/suggest` uses the user's profile to generate LLM-based aspiration suggestions (rate-limited, returns 400 when no usable profile signal exists).
- `POST /aspirations/match` performs RAG-backed matching of aspirations against a set of leads, returning `aspiration_alignment` and `relevance_score` per lead entry.

### Documents and Collaboration

| Tag | Prefix | Purpose |
| --- | --- | --- |
| `documents` | `/documents` | Versioned multi-kind documents, version history, AI generation, seed/import flows, sharing, upload/download, and application attachment |
| `collaboration` | `/documents` | Bootstrap claim and WebSocket collaboration endpoints under `/documents/{document_id}/collaborate*` |

The document surface is now the canonical API for resumes, cover letters, and other user-authored materials. Legacy `/resumes` and `/cover_letters` routes have been retired from the public API.

### Automation and Review

| Tag | Prefix | Purpose |
| --- | --- | --- |
| `extractors` | `/extractors` | Extractor CRUD, examples, versioning, and extraction operations |
| `orchestration-pipelines` | `/orchestration-pipelines` | Orchestration pipeline CRUD and event history |
| `crawlers` | `/crawlers` | Superuser-managed crawler pipelines and runs |
| `review` | `/review` | Superuser review queue for pending automation output |

### Networking, Activity, Tasks, and Agents

| Tag | Prefix | Purpose |
| --- | --- | --- |
| `directory` | `/directory` | Discoverable user directory and profile previews, including superuser discovery filters |
| `connections` | `/connections` | Connection request lifecycle with superuser-aware entitlement rules |
| `messaging` | `/conversations` | Direct and group conversations, messages, unread counts |
| `action-items` | `/action-items` | Cross-entity user task management |
| `activity-feed` | `/activity-feed` | Aggregated activity stream and dashboard summary |
| `agents` | `/agents` | Agent CRUD, supported-model discovery, one-shot runs, persisted chat sessions, streamed replies, chat export, and run history |

#### Agents Public Surfaces

- `GET /agents/models` returns the supported model list the frontend uses for agent configuration and chat model display.
- `POST /agents/{id}/run` is the one-shot execution path that creates or appends to a cell-doc workspace artifact.
- `POST /agents/{id}/chat` and `GET /agents/{id}/chat` create and list persisted chat sessions for a specific agent.
- `GET /agents/chat/{session_id}` and `GET /agents/chat/{session_id}/history` load session metadata and paginated message history.
- `POST /agents/chat/{session_id}/messages` accepts JSON input and returns either JSON or streamed `text/event-stream` SSE output, depending on the `Accept` header.
- `PATCH /agents/chat/{session_id}` and `DELETE /agents/chat/{session_id}` update or remove a saved session.
- `POST /agents/chat/{session_id}/save-to-document` exports a conversation into a new cell-doc document and creates a linked `AgentRun`.

### Operational Helpers

| Tag | Prefix | Purpose |
| --- | --- | --- |
| `db-management` | `/db-management` | Superuser-only database inspection, admin cleanup previews, destructive user cleanup, and local diagnostics helpers |

#### DB Management Public Surfaces

- `GET /db-management/status` reports the current stamped Alembic revision, repo head revision, whether the database is at head, and the number of public tables.
- `GET /db-management/tables` and `GET /db-management/tables/{table_name}` provide exact row counts and column metadata for public-schema tables.
- `GET /db-management/users` is the admin discovery surface for cleanup workflows, with search and superuser/active filters plus capped pagination.
- `GET /db-management/users/{user_id}/cleanup-preview` previews what `purge` or `delete` would affect, including the selected cleanup domains plus separate delete and purge safeguard signals.
- `PATCH /db-management/users/{user_id}/purge` now accepts optional repeated `domains` query params to run a scoped purge instead of the legacy full purge; omitting `domains` preserves the existing full-purge behavior.
- `PATCH /db-management/users/{user_id}/purge` and `DELETE /db-management/users/{user_id}` emit structured admin audit log records for successful and blocked destructive operations.
- `GET /db-management/list-tables` and `GET /db-management/table-details/{table_name}` remain available for compatibility but are now deprecated in favor of the richer `/tables*` routes.

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
- Agent chat clients need to handle both JSON request/response flows and the SSE event stream returned by `POST /agents/chat/{session_id}/messages`.
- Backend API or schema changes should be followed by `./scripts/update_frontend_schemas.sh`.
- OpenAPI is the canonical machine-readable contract; Swagger and ReDoc are the canonical interactive views.

## Interactive Docs

When the local stack is running:

- **Swagger UI:** [http://localhost:8004/docs](http://localhost:8004/docs)
- **ReDoc:** [http://localhost:8004/redoc](http://localhost:8004/redoc)

See [Open The API Docs](../reference/api-reference.md) for the quick-access endpoints and related admin URLs.
