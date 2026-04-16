# Wave 03: Settings And Profile Framing Cleanup

> Status: `blocked pending approved redesign nodes`
> Default implementation owner: `baldin_frontend`
> Program owner: `baldin_full_stack_architect`

## Scope

- Routes:
  - `/me`
  - `/settings`
  - `/settings/subscription`
  - `/settings/discoverability`
  - `/settings/graduation`
- Shared layouts or chrome that may move with this wave:
  - section framing and heading hierarchy only if the approved redesign proves reuse elsewhere

## Required Brief Gate

- Create the wave brief from `plans/redesign/implementation-brief-template.md`.
- Do not start implementation until the brief lists the exact approved redesign node IDs for this route family.
- Do not treat closeout evidence nodes as approval for implementation.

## Handoff Evidence To Preserve

- The redesign handoff freezes the profile and settings family at the route level, but implementation must wait for approved redesign nodes named in the brief.
- Preserve the existing split between profile-specific behavior and settings framing unless approved redesign evidence proves a neutral shared need.

## Route-Family Rules

- Apply the chosen section-framing rules consistently across the approved profile and settings screens.
- Keep profile-specific hero, builder, and identity semantics feature-owned unless the redesign proves a reusable shell.
- Keep settings-specific copy, gating, and workflow behavior local unless reuse is proven.

## Shared-Surface Gate

- Promote only neutral section framing or heading structure that is already approved in at least one other route family.
- Do not promote profile-specific or settings-specific semantics into shared surfaces.

## Backend Default

- Backend work required: `no` by default.
- Open a backend dependency brief only if the approved redesign needs profile or settings data the current API cannot render cleanly.

## PR Slicing

1. Shared-foundation PR only if cross-family framing reuse is already proven.
2. One route-family PR for profile and settings framing cleanup.
3. One cleanup PR only if wrapper deletion or docs follow-up should stay separate.

## Validation

- Route-level behavior checks for profile and settings screens in scope.
- Focused component tests if shared framing changes materially.
- `cd frontend && ./node_modules/.bin/tsc --noEmit`
- `cd frontend && npm run build`
- `cd frontend && npm run lint:theme` when shared surfaces or import boundaries change
- `cd frontend && npm run storybook:build` when public design-system exports change
- Manual verification against the exact approved redesign nodes from the completed brief
