# Wave 04: Workflow And Admin Surfaces

> Status: `blocked pending approved redesign nodes`
> Default implementation owner: `baldin_frontend`
> Program owner: `baldin_full_stack_architect`

## Scope

- Routes:
  - `/workflows`
  - `/workflows/extractors`
  - `/admin/`
  - `/admin/db-management`
  - `/admin/review`
  - `/admin/crawlers`
- Related redirect surfaces to keep coherent:
  - `/workflows/db-management`
  - `/workflows/review`
  - `/workflows/crawlers`
  - `/workflows/admin`

## Required Brief Gate

- Create the wave brief from `plans/redesign/implementation-brief-template.md`.
- Do not start implementation until the brief lists the exact approved redesign node IDs for this route family.
- Do not treat closeout evidence nodes as approval for implementation.

## Handoff Evidence To Preserve

- Workflow and admin live anchors: `369:2`, `184:4929`, `192:4929`, `201:4929`
- Extractor supporting group: `463:5`
- Review queue supporting group: `463:26`
- Crawlers supporting group: `463:46`
- DB management destructive-flow group: `463:67`

## Route-Family Rules

- Implement extractor, review queue, DB management, and crawlers against redesign-approved states.
- Preserve destructive preview, confirm, and safety flows.
- Preserve populated, filtered, expanded-detail, and empty variants from the handoff.
- Do not collapse these power-user flows back into baseline-only screens.

## Shared-Surface Gate

- Promote only neutral admin or workflow chrome that is proven across multiple approved route families.
- Keep workflow logic, destructive semantics, and feature-specific rendering local to this route family unless reuse is already proven.

## Backend Default

- Backend work required: `no` by default.
- Open a backend dependency brief only if the approved redesign needs new admin aggregates, workflow summary data, or new mutation flows the current API cannot support cleanly.

## PR Slicing

1. Shared-foundation PR only if cross-family reuse is already proven.
2. One route-family PR for workflow and admin surfaces.
3. One cleanup PR only if wrapper deletion or docs follow-up should stay separate.

## Validation

- Route-level behavior checks for workflows index, extractors, and the admin routes in scope.
- Focused component tests if shared framing or status chrome changes materially.
- `cd frontend && ./node_modules/.bin/tsc --noEmit`
- `cd frontend && npm run build`
- `cd frontend && npm run lint:theme` when shared surfaces or import boundaries change
- `cd frontend && npm run storybook:build` when public design-system exports change
- Manual verification against the exact approved redesign nodes from the completed brief
