# Wave 01: Applications, Leads, And Collection Chrome

> Status: `blocked pending approved redesign nodes`
> Default implementation owner: `baldin_frontend`
> Program owner: `baldin_full_stack_architect`

## Scope

- Routes:
  - `/applications`
  - `/applications/board`
  - `/applications/:applicationId`
  - `/leads`
  - `/leads/companies`
- Shared layouts or chrome that may move with this wave:
  - `ApplicationsGroupLayout`
  - `LeadsGroupLayout`
  - collection-page hierarchy and section framing only if the approved redesign proves reuse

## Required Brief Gate

- Create the wave brief from `plans/redesign/implementation-brief-template.md`.
- Do not start implementation until the brief lists the exact approved redesign node IDs for this route family.
- Do not treat closeout evidence nodes as approval for implementation.

## Handoff Evidence To Preserve

- Applications board supporting group: `487:86`
- Board drag state: `487:89`
- Board drop-target state: `487:110`
- Application detail section-based treatment: `108:4348`
- Apply and degraded-state anchors: `492:2`, `494:2`, `496:2`, `446:2`, `447:2`, `257:6090`

## Route-Family Rules

- Apply the approved collection-page hierarchy and section-framing rules.
- Keep application detail section-based. Do not reintroduce tab assumptions.
- Preserve board drag and drop behavior while updating presentation.
- Preserve application stage semantics and reminder behavior unless the approved redesign explicitly changes them.
- Keep route-specific action semantics and transient board behavior feature-owned unless reuse is proven elsewhere.

## Shared-Surface Gate

- Shared-foundation work is allowed only if the same collection chrome or section framing is also approved for at least one other route family.
- If the need stays isolated to applications or leads, keep it feature-owned in this wave.

## Backend Default

- Backend work required: `no` by default.
- Open a backend dependency brief only if the approved redesign needs new application summary fields, lead collection aggregation, or a new mutation flow the current API cannot support.

## PR Slicing

1. Shared-foundation PR only if cross-family reuse is already proven.
2. One route-family PR for applications, leads, and their collection chrome.
3. One cleanup PR only if wrapper deletion or docs follow-up should stay separate.

## Validation

- Route-level behavior checks for applications queue, applications board, application detail, leads, and companies.
- Focused component tests if shared collection chrome or section framing changes materially.
- `cd frontend && ./node_modules/.bin/tsc --noEmit`
- `cd frontend && npm run build`
- `cd frontend && npm run lint:theme` when shared surfaces or import boundaries change
- `cd frontend && npm run storybook:build` when public design-system exports change
- Manual verification against the exact approved redesign nodes from the completed brief
