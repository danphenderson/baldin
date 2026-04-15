---
sidebar_position: 5
slug: /architecture/frontend-architecture
title: See Frontend Boundaries
description: See route groups, page modules, service boundaries, and contract consumption in the frontend.
---

<!-- last-verified: 2026-04-14 -->

# See Frontend Boundaries

The Baldin frontend is a React 19 single-page application built with Vite, TypeScript, and MUI. It organizes the product around route groups that mirror the major backend domains: leads, applications, identity, workspace, workflows, automation, network, and settings.

## Stack

| Layer | Technology | Version |
| --- | --- | --- |
| Framework | React | 19 |
| Build | Vite | 7 |
| Language | TypeScript | 5.9 |
| UI library | Material UI | 7 |
| Routing | React Router | 7 |
| Animation | Motion | 12 |
| Rich text | TipTap | 3 |
| Collaboration | Yjs + y-websocket | current |
| Charts | Recharts | 3 |
| Search | Fuse.js | 7 |

## Route Composition

```mermaid
graph TD
	accTitle: Frontend Route Composition
	accDescr: Shows how app-routes.tsx composes three layout roots — AppLayout (authenticated), AuthLayout (login and register), and HomeLayout (public terms page) — and how AppLayout nests UserRoute which in turn owns the Dashboard, Leads, Applications, Identity, Workspace, Workflows, Automation, Network, and Settings route groups.
	AppRoutes[app-routes.tsx] --> AppLayout[AppLayout]
	AppRoutes --> AuthLayout[AuthLayout]
	AppRoutes --> HomeLayout[HomeLayout]

	AppLayout --> UserRoute[UserRoute]
	UserRoute --> Dashboard[/]
	UserRoute --> LeadsGroup[/leads]
	UserRoute --> ApplicationsGroup[/applications]
	UserRoute --> IdentityGroup[/me]
	UserRoute --> WorkspaceGroup[/workspace]
	UserRoute --> WorkflowsGroup[/workflows]
	UserRoute --> AutomationGroup[/automation]
	UserRoute --> NetworkGroup[/network]
	UserRoute --> SettingsGroup[/settings]

	AuthLayout --> Login[/login]
	AuthLayout --> Register[/register]
	HomeLayout --> Terms[/user-terms]
```

The route tree is defined in `frontend/src/route/app-routes.tsx` and uses nested layout groups instead of one flat page list. That structure is important when you change navigation, breadcrumbs, or sidebar behavior.

## Page Inventory

| Group | Routes | Pages |
| --- | --- | --- |
| Dashboard | `/` | `dashboard.tsx` |
| Leads | `/leads`, `/leads/companies` | lead list and company directory |
| Applications | `/applications`, `/applications/board`, `/applications/:applicationId` | queue, board, and detail views |
| Identity | `/me`, `/me/aspirations/roles`, `/me/aspirations/companies` | profile and aspiration views |
| Workspace | `/workspace`, `/workspace/new`, `/workspace/:id`, `/workspace/:id/edit`, `/workspace/:id/compare` | workspace list, detail, editor, and compare views |
| Workflows | `/workflows`, `/workflows/extractors`, `/workflows/review`, `/workflows/crawlers` | orchestration, extractors, review queue, crawler admin |
| Automation | `/automation`, `/automation/agents`, `/automation/agents/:agentId`, `/automation/agents/:agentId/chat/:sessionId` | automation landing redirect plus agents list, detail, and chat session views |
| Network | `/network/discover`, `/network/discover/:userId`, `/network/connections`, `/network/messages`, `/network/messages/:conversationId` | discovery, profile preview, connections, conversations |
| Settings | `/settings/subscription`, `/settings/graduation` | subscription and placement lifecycle |
| Public/auth | `/login`, `/register`, `/user-terms` | auth and legal surfaces |

`/workflows/review` and `/workflows/crawlers` are wrapped in a `SuperuserRoute` guard. Legacy redirects in `app-routes.tsx` preserve older URLs such as `/companies` and `/documents`.

## Source Layout

```text
frontend/src/
├── component/   reusable UI and stateful feature components
├── config/      environment helpers
├── context/     auth and user session context
├── layout/      nested group layouts
├── page/        route-level pages and page groups
├── route/       route tree and navigation helpers
├── service/     API client modules
├── theme/       MUI theme setup
├── schema.d.ts  generated OpenAPI types
└── index.tsx    application bootstrap
```

## Component and Service Boundaries

| Area | What lives there |
| --- | --- |
| `component/auth` | Login/register-adjacent UI |
| `component/*-modal.tsx` | Feature-specific create/edit dialogs for leads, profile records, extractors, and documents |
| `component/rich-text-editor.tsx` | TipTap editor shell |
| `component/use-collaborative-editor.ts` | Yjs bootstrap, websocket connection, presence state |
| `component/collaboration-bootstrap.ts` | Local seeding and retry timing for collaboration bootstrap |
| `service/agents.tsx` | Agent CRUD, one-shot runs, and run-history API access |
| `service/agent-chat.tsx` | Agent chat session CRUD/history, save-to-document export, and SSE message streaming |
| `service/*.tsx` | Fetch wrappers grouped by backend route family |

The service layer is the only place that should know backend URL details. Page and component code should call service modules rather than issuing ad hoc fetch requests.

## Flagship Flow Boundaries

The current flagship flow spans three frontend moments that are intentionally connected but still live behind clear service and component boundaries.

### Aspirations Pages And Service Layer

- `/me/aspirations/roles` and `/me/aspirations/companies` are thin route pages that configure the shared `AspirationsCollection` shell for each aspiration kind.
- `service/aspirations.ts` owns the CRUD contract, the typed suggest seam, and explicit frontend error normalization through `AspirationServiceError`.
- `AspirationsCollection` owns tab-aware list loading, local search, create or edit dialog state, delete confirmation, and the optional suggestion-review surface.
- `SuggestionReviewPanel` is the stateful review layer for profile-based drafts. It handles fetch, draft filtering by aspiration kind, accept-one, accept-all, discard, and inline error feedback keyed to the normalized categories.

### Leads Ranking Flow

- `page/leads.tsx` is the orchestration boundary for the flagship ranking moment. It loads leads, companies, applications, and aspirations together, then coordinates ranking and application-start state from one route-level controller.
- `service/leads.tsx` owns the `/api/v1/aspirations/match` integration through `rankLeads()`.
- `LeadSearchBar` exposes the explicit ranking trigger and aspiration-gated disabled state.
- `LeadCard` is the primary presentation surface for ranked versus unranked leads, aspiration-alignment copy, and the inline application handoff state.
- Ranking remains route-owned state rather than a shared global store. Search or filter changes clear ranking results to avoid stale ordering.

### Application Handoff

- The flagship apply step stays inline on `/leads`; it does not redirect users into the applications route family just to start tracking a lead.
- `service/applications.tsx` provides the existing list and create surfaces used for duplicate-safe handoff. The leads page preloads the application list once, derives a local `lead_id -> application` map, and updates that map after successful creation.
- `page/leads.tsx` owns the ready-state messaging (`buildReadyHandoff`) and existing-application messaging (`buildExistingApplicationHandoff`) so the ranking context and duplicate-safe state stay consistent.
- The applications route family remains the deeper workflow surface after creation. Queue, board, and detail pages consume the application entity after the lead-page handoff is complete.

### Shared Components And Design-System Boundaries

- The flagship flow is built on the existing design-system inventory rather than feature-local abstractions.
- `CardShell` provides the main container surface for ranked leads and related summary cards.
- `StatusChip`, `InlineFeedback`, `EmptyState`, `LoadingState`, and `ConfirmDialog` are the shared feedback and state primitives reused across aspirations, leads, and applications.
- Feature components such as `SuggestionReviewPanel`, `LeadCard`, and `AspirationsCollection` may compose these primitives, but they do not redefine token, tone, or state semantics locally.

### Harness And Figma References

- `frontend/src/browser-harness/figma-wave1.tsx` is the offline verification surface for flagship states across aspirations, ranked leads, and apply handoff.
- Figma remains upstream for flow sequencing and layout grouping. The harness mirrors approved states for implementation verification and capture, not for inventing new product behavior.

## Contract Management

The frontend consumes generated OpenAPI types instead of maintaining its own API contract layer.

1. FastAPI generates `openapi.json`.
2. `openapi-typescript` generates `frontend/src/schema.d.ts`.
3. Service modules import those generated types.

If you change backend routes or schemas, run `./scripts/update_frontend_schemas.sh`. See [Regenerate API Contracts](../engineering/contract-management.md) for the regeneration workflow.

## Build and Validation Rules

- Production builds require a non-localhost `VITE_API_URL`.
- `frontend/scripts/build-static.mjs` produces the deployable static bundle in `frontend/dist/`.
- Validate frontend changes with `npm --prefix frontend run test`, `node frontend/node_modules/typescript/bin/tsc --project frontend/tsconfig.json --noEmit`, and the production-style build command documented in [Run The Right Checks](../engineering/testing.md).
- Do not hand-edit `schema.d.ts`.

## Architecture Notes

- The frontend is already organized around the newer document and networking domains, even where the docs had lagged behind.
- Agents are split across two service boundaries: `service/agents.tsx` handles one-shot runs and run history, while `service/agent-chat.tsx` handles persisted chat sessions. The chat send path is the main SSE consumer in the frontend; document collaboration remains the separate Yjs/WebSocket path.
- Collaboration state is deliberately split across TipTap, Yjs, and backend bootstrap endpoints. See [Document Collaboration](./document-collaboration.md) for the protocol details.
- Navigation, route grouping, and page ownership are stronger architectural boundaries here than component folders alone.
