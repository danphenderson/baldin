---
sidebar_position: 5
slug: /engineering/v2-1-implementation-program
title: v2.1 Implementation Program
description: Code-first execution flow for continuing Baldin through the v2.1 design-system hard fork.
---

<!-- last-verified: 2026-04-17 -->

# v2.1 Implementation Program

Use this page for active product execution after deprecating the Figma-gated redesign path.

[v2.1 Hard Fork](../reference/v2-1-hard-fork.md) is the active direction statement. This program turns that decision into slice rules, wave order, and validation defaults.

## Entry Criteria

Start a new implementation slice only when all of these are true:

- the slice is grounded in shipped code or `operator-design/`, not a pending Figma handoff
- the brief cites concrete repo sources such as `frontend/src/design-system/*`, route files, targeted frontend tests, or `operator-design` screens
- the brief states whether the work is shared-surface promotion, legacy-shell migration, or feature-owned route work
- the validation path is explicit before implementation starts

## Source Hierarchy

Use this order when sources disagree:

1. Shipped frontend code under `frontend/src/design-system/*` and the affected route or feature files
2. The active docs contract under `docs/docs/**`
3. `operator-design/` as visual reference
4. Archived Figma or redesign documents only for historical context

## Phase 0: Freeze The Old Gate

Owner: `baldin_project_manager` or `baldin_full_stack_architect`

- Move the active planning contract to `plans/v2.1/*`.
- Point docs and command-palette discovery to the `v2.1` pages.
- Mark the redesign handoff and redesign implementation program as archival rather than active.

This phase is complete only when no active workflow still requires Figma file keys, node IDs, or redesign-only approval gates.

## Phase 1: Re-Green The Shared Baseline

Owner: `baldin_frontend`

Stabilize the current shared UI before opening broader route work:

- clear `lint:theme` violations
- fix shared-surface test drift
- ensure the landing page and active shared primitives build cleanly

Default validation for this phase:

- `cd frontend && npm run test -- <targeted shared-surface test files>` when shared React behavior changed
- `cd frontend && npm run lint:theme`
- `cd frontend && ./node_modules/typescript/bin/tsc --noEmit`
- `cd frontend && VITE_API_URL=https://api.preview.invalid npm run build`

## Phase 2: Legacy Shell Migration

Owner: `baldin_frontend`

Reduce the remaining shared-UI debt without reopening product direction work:

- migrate raw MUI `Alert` usage to `InlineFeedback`
- migrate raw MUI `Dialog` usage to `SurfaceDialog` or `FormDialogShell`
- delete dead wrappers when the last meaningful consumer is gone

Open shared-surface promotion only when at least two concrete consumers prove the need.

## Phase 3: Conditional Shared Promotion

Owner: `baldin_frontend`, governed by `baldin_full_stack_architect`

Open this phase only when repeated code proves a missing shared abstraction.

Current candidates:

- shared `ErrorState`
- any additional section or collection framing only after two route families need the same neutral contract

Do not promote route-owned semantics, data shaping, or unstable screen composition into the design-system layer.

## Phase 4: Route-Family Slices

Owner: `baldin_frontend`

Default order:

1. Flagship profile and aspirations surfaces
2. Leads and applications follow-on cleanup
3. Network, workspace, and admin surfaces
4. Auth and marketing refinement

Each route-family slice must stay grounded in current code plus `operator-design` reference material. Archived Figma screens may inform the work, but they must not gate it.

## Required Brief

Every non-trivial slice starts from `plans/v2.1/implementation-brief-template.md`.

The brief is incomplete until it names all of these:

- concrete repo sources reviewed
- exact routes or components in scope
- whether shared-surface promotion is proposed
- whether archived design references were consulted
- required validation
- backend dependency status

## PR Slicing Model

Keep slices small and stable:

1. One docs or planning PR when the contract changes.
2. One shared-foundation PR when the work is design-system or lint-baseline cleanup.
3. One route-family PR for feature-owned implementation.
4. One cleanup PR only when wrapper deletion or follow-up docs should stay separate.

## Validation

Every implementation slice must include the smallest useful checks for the touched surface:

- `cd frontend && npm run lint:theme` when shared UI or import boundaries changed
- `cd frontend && npm run test -- <targeted shared-surface test files>` when public shared React behavior changed
- `cd frontend && ./node_modules/typescript/bin/tsc --noEmit` when typed frontend code changed
- `cd frontend && VITE_API_URL=https://api.preview.invalid npm run build` when shipped app behavior changed
- `npm --prefix docs run build` when docs navigation or published docs changed

## Acceptance

This program is working only when all of these stay true:

- the active contract is repo-backed and code-first
- archived Figma material is optional context, not a gate
- shared-surface promotion remains evidence-based
- the design-system drift baseline stays green
- route-family slices do not reopen a second design-source hierarchy
