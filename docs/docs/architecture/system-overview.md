---
sidebar_position: 1
slug: /architecture/system-overview
title: See System Boundaries
description: See the service topology, runtime boundaries, and main product domains.
---

<!-- last-verified: 2026-04-12 -->

# See System Boundaries

Baldin is a full-stack local-first workspace for job-search automation. The system is developed primarily through Docker Compose, with the frontend, backend, main Postgres database, and separate test database forming the core local topology.

## Service Topology

```mermaid
graph LR
    accTitle: Baldin Service Topology
    accDescr: Shows the Docker Compose stack — Frontend (React/Vite on port 5173), Backend API (FastAPI/Uvicorn on port 8000), Main PostgreSQL DB (5432), Test DB (5431), and an external OpenAI LLM — and the connection direction between them.
    Browser["Browser"]
    LLM["OpenAI"]

    subgraph dc["Docker Compose"]
        direction TB
        FE["Frontend<br/>React / Vite<br/>:5173"]
        API["Backend API<br/>FastAPI / Uvicorn<br/>:8004 → :8000"]
        DB["PostgreSQL 15<br/>Main DB<br/>:5432"]
        TDB["PostgreSQL 15<br/>Test DB<br/>:5431"]
    end

    Browser --> FE
    FE -->|VITE_API_URL| API
    API --> DB
    API --> TDB
    API -->|OpenAI API| LLM
```

## Services

| Service | Image / Build | Port | Purpose |
|---------|---------------|------|---------|
| `db` | `postgres:15` | 5432 | Main application database |
| `test_db` | `postgres:15` | 5431 | Isolated test database |
| `web` | `backend/Dockerfile.dev` | 8004→8000 | FastAPI backend with Uvicorn (hot reload) |
| `frontend` | `frontend/Dockerfile` | 5173 | React/Vite dev server |

The docs site is intentionally separate from the runtime stack. It is built from `docs/` and does not participate in normal local application startup.

## Technology Stack

### Backend
- **Framework:** FastAPI with Starlette
- **ORM:** SQLAlchemy 2.x with PostgreSQL 15
- **Auth:** fastapi-users with JWT tokens
- **Admin:** Starlette Admin mounted at `/admin`
- **Extraction:** LangChain-powered text extraction and structured data extraction
- **Python:** 3.11, managed with pipenv

### Frontend
- **Framework:** React 19 with TypeScript
- **Build:** Vite 7
- **UI:** Material UI (MUI) 7
- **Routing:** React Router 7
- **Charts:** Recharts
- **Animation:** Motion (Framer Motion successor)

### Contracts
- **API spec:** OpenAPI 3.1 — generated from FastAPI, stored as `openapi.json`
- **TypeScript types:** Generated from OpenAPI via `openapi-typescript`, stored as `frontend/src/schema.d.ts`

## Key Boundaries

- The **backend** owns all data access, authentication, extraction, and orchestration logic.
- The **frontend** is a pure client that talks to the backend through `VITE_API_URL`. It never accesses the database directly.
- The **contract** (`openapi.json` → `schema.d.ts`) is the formal interface between backend and frontend. Changes flow backend → contract → frontend, never the reverse.
- Normal **frontend/backend transport** is JSON over HTTP. Agent chat is the main exception: `POST /agents/chat/{session_id}/messages` accepts JSON input but can stream assistant replies back as `text/event-stream` SSE, with JSON fallback when the client explicitly requests `application/json`.
- **Document collaboration** remains a separate realtime transport boundary on `/documents/{id}/collaborate/ws`, where the frontend uses Yjs over WebSocket after the bootstrap claim flow completes.
- The **ETL layer** (`backend/etl/`) contains crawler and pipeline code (LinkedIn, Glassdoor). It is not part of the user-triggered extraction runtime path.

## Main Product Domains

- Profile and job-search records
- Versioned documents, collaboration, and agent-authored workspaces
- Extraction, orchestration, crawler automation, and agent execution
- Networking, messaging, conversational agent chat, activity, and action items

Those domains are documented in more detail in [Map The Data Model](./data-model.md), [Understand Document Collaboration](./document-collaboration.md), and [Follow Network Flows](./networking-and-messaging.md).
