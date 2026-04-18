# Wave 03: Settings Framing Cleanup

> Status: `blocked pending approved redesign nodes`
> Default implementation owner: `baldin_frontend`
> Program owner: `baldin_full_stack_architect`

## Canonical Inputs

- Read `docs/docs/reference/baldin-redesign-handoff.md` first.
- Use `docs/docs/engineering/redesign-implementation-program.md` for phase gates, PR slicing, and validation defaults.
- Do not start implementation until the completed brief cites the exact approved Figma node IDs for this wave.

## Routes In Scope

- Routes:
  - `/settings`
  - `/settings/subscription`
  - `/settings/discoverability`
  - `/settings/graduation`
- Shared layouts or chrome that may move with this wave:
  - Section framing and heading hierarchy only if the approved redesign proves reuse elsewhere

> **Note:** `/me` and aspirations routes (`/me/aspirations/*`) were moved to Wave 01 (Flagship Journey) because they define the user's direction rather than account settings. This wave covers account settings and related configuration surfaces only.

## Explicit Out Of Scope

- `/me`
- `/me/aspirations/*`
- `/applications/*`
- `/leads/*`
- `/network/*`
- `/workflows/*`
- `/admin/*`
- `/workspace/*`
- `/automation/agents/*`

## API Surfaces Consumed

- `settingsService` — subscription, discoverability, graduation preferences.
- Known API gaps: none expected unless the approved redesign introduces new settings categories.

## Implementation Constraints

- Apply the chosen section-framing rules consistently across the approved settings screens.
- Keep settings-specific copy, gating, and workflow behavior local unless reuse is proven.

## Backend Default

- Backend work required: `no` by default.
- Open a backend dependency brief only if the approved redesign needs profile or settings data the current API cannot render cleanly.

## PR Slicing

1. Shared-foundation PR only if cross-family framing reuse is already proven.
2. One route-family PR for settings framing cleanup.
3. One cleanup PR only if wrapper deletion or docs follow-up should stay separate.

## Validation

- Route-level behavior checks for the settings screens in scope.
- Focused component tests if shared framing changes materially.
- `cd frontend && ./node_modules/.bin/tsc --noEmit`
- `cd frontend && npm run build`
- `cd frontend && npm run lint:theme` when shared surfaces or import boundaries change
- `cd frontend && npm run test -- <targeted shared-surface test files>` when public shared React behavior changes
- Manual verification against the exact approved redesign nodes from the completed brief
