---
sidebar_position: 1
slug: /architecture/system-overview
title: System Overview
---

# System Overview

Baldin is a full-stack workspace for job-search automation. The system is composed of four services orchestrated through Docker Compose for local development.

## Service Topology

```mermaid
graph TB
    subgraph Docker Compose
        FE["Frontend<br/>React / Vite<br/>:5173"]
        API["Backend API<br/>FastAPI / Uvicorn<br/>:8004 → :8000"]
        DB["PostgreSQL 15<br/>Main DB<br/>:5432"]
        TDB["PostgreSQL 15<br/>Test DB<br/>:5431"]
    end

    Browser["Browser"] --> FE
    FE -->|VITE_API_URL| API
    API --> DB
    API --> TDB
    API -->|OpenAI API| LLM["OpenAI"]
```

## Services

| Service | Image / Build | Port | Purpose |
|---------|---------------|------|---------|
| `db` | `postgres:15` | 5432 | Main application database |
| `test_db` | `postgres:15` | 5431 | Isolated test database |
| `web` | `backend/Dockerfile.dev` | 8004→8000 | FastAPI backend with Uvicorn (hot reload) |
| `frontend` | `frontend/Dockerfile` | 5173 | React/Vite dev server |

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
- The **ETL layer** (`backend/etl/`) contains crawler and pipeline code (LinkedIn, Glassdoor). It is not part of the user-triggered extraction runtime path.
