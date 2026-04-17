# Wave 04: Workflow And Admin Surfaces

> Status: `blocked pending approved redesign nodes`
> Default implementation owner: `baldin_frontend`
> Program owner: `baldin_full_stack_architect`

## Canonical Inputs

- Read `docs/docs/reference/baldin-redesign-handoff.md` first.
- Use `docs/docs/engineering/redesign-implementation-program.md` for phase gates, PR slicing, and validation defaults.
- Do not start implementation until the completed brief cites the exact approved Figma node IDs for this wave.

## Routes In Scope

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
- **Explicitly deferred to Wave 05:**
  - `/workspace`, `/workspace/*` — workspace documents
  - `/automation/agents`, `/automation/agents/*` — automation agents

## Implementation Constraints

- Implement extractor, review queue, DB management, and crawlers against redesign-approved states.
- Preserve destructive preview, confirm, and safety flows.
- Preserve populated, filtered, expanded-detail, and empty variants required by the approved redesign.
- Do not collapse these power-user flows back into baseline-only screens.

## API Surfaces Consumed

- `workflowService` — extractors listing, workflow state, detail.
- `adminService` — DB management, review queue, crawler management.
- Known API gaps: none expected unless the approved redesign introduces new workflow summary or aggregation views.

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
