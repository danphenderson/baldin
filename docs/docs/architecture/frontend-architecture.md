---
sidebar_position: 5
slug: /architecture/frontend-architecture
title: Frontend Architecture
---

# Frontend Architecture

The Baldin frontend is a single-page React application built with Vite and Material UI.

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19 |
| Build | Vite | 7 |
| Language | TypeScript | 5.9 |
| UI Library | Material UI (MUI) | 7 |
| Routing | React Router | 7 |
| Charts | Recharts | 3 |
| Animation | Motion | 12 |
| Search | Fuse.js | 7 |

## Project Structure

```
frontend/src/
├── index.tsx          # App entry point
├── schema.d.ts        # Generated TypeScript types from OpenAPI
├── component/         # Reusable UI components
├── config/            # App configuration
├── context/           # React context providers
├── layout/            # Page layout components
├── page/              # Route-level page components
├── route/             # Route definitions
├── service/           # API service layer (fetch wrappers)
└── theme/             # MUI theme configuration
```

## API Integration

The frontend communicates with the backend exclusively through the service layer in `src/service/`. Each service module wraps `fetch` calls to the backend API, using the base URL from `VITE_API_URL`.

TypeScript types for API request/response payloads are generated from the backend's OpenAPI specification:

1. Backend generates `openapi.json` from FastAPI
2. `openapi-typescript` generates `frontend/src/schema.d.ts` from the OpenAPI spec
3. Service modules import types from `schema.d.ts`

This contract is managed by `scripts/update_frontend_schemas.sh`. See [Contract Management](../engineering/contract-management.md) for details.

## Build Configuration

The production build enforces a non-localhost `VITE_API_URL`:

- `vite.config.ts` includes a guard that rejects missing or localhost API origins during production builds.
- The build script lives at `frontend/scripts/build-static.mjs`.
- Output goes to `frontend/dist/`.

## Key Conventions

- Prefer the existing React/Vite/MUI architecture — do not introduce competing UI frameworks.
- Validate changes with `npm run test`, `npx tsc --noEmit`, and `npm run build`.
- Do not hand-edit `schema.d.ts` — it is a generated artifact.
