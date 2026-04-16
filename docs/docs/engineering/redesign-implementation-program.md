---
slug: /engineering/redesign-implementation-program
title: Redesign Implementation Program
description: Post-closeout developer workflow for turning the redesign handoff into implementation-ready route-family waves.
---

<!-- last-verified: 2026-04-15 -->

# Redesign Implementation Program

Use this page after the closeout handoff is accepted as the working baseline. [Baldin Redesign Handoff](../reference/baldin-redesign-handoff.md) remains the only active redesign source of truth. The old ledgers stay historical only.

This program has two goals:

- finish engineering enablement while redesign approval is still settling
- implement approved redesigns route family by route family without reopening capture work

## Entry Criteria

Do not start the implementation program until all of these are true:

- the current closeout implementation is merged or otherwise accepted as the working baseline
- the working tree is normalized so redesign work does not inherit mixed closeout edits
- `npm --prefix docs run build` passes
- the sidebar entry for Baldin Redesign Handoff is live
- no active team workflow still treats the provenance ledgers as current checklists

If a later design review finds a factual error in the handoff, fix the handoff. Do not restart capture by default.

## Phase 0: Land, Normalize, And Freeze

Program owner: `baldin_full_stack_architect`

Phase 0 closes the capture program and freezes the next-phase rules:

- `docs/docs/reference/baldin-redesign-handoff.md` is the active redesign entry point
- the app-screen and library ledgers are provenance only
- new wave packets and PR plans must not use the old ledgers as active checklists

Run one sanity pass after the closeout baseline lands:

- `npm --prefix docs run build`
- confirm the sidebar and command palette expose the redesign handoff and this program page
- confirm the local workflow docs and agent docs point to the handoff-first path

## Phase 1: Engineering Enablement

Program owner: `baldin_full_stack_architect`

The implementation enablement artifacts live in `plans/redesign/`:

| Artifact | Purpose |
| --- | --- |
| `plans/redesign/implementation-brief-template.md` | Required entry brief for every wave |
| `plans/redesign/wave-01-applications-leads.md` | Applications, leads, and collection chrome packet |
| `plans/redesign/wave-02-messages.md` | Messages and conversation detail packet |
| `plans/redesign/wave-03-settings-profile.md` | Settings and profile framing packet |
| `plans/redesign/wave-04-workflows-admin.md` | Workflow and admin packet |

### Required Brief

Every implementation wave must start from `plans/redesign/implementation-brief-template.md`.

The brief is incomplete until it explicitly states all of these:

- exact approved Figma node IDs
- affected route or routes
- whether any shared-surface promotion is proposed
- which components remain feature-owned
- which tests must change
- which docs must change
- whether backend work is required

No route-family implementation starts until its brief names the exact approved redesign nodes.

### Frozen Implementation Rules

Freeze these rules before the first UI wave:

- no ad hoc MUI shell sprawl outside `frontend/src/design-system/*`
- no new wrapper growth under legacy component folders
- no route-specific semantics promoted into shared surfaces
- no backend changes unless an approved UI need cannot be met with the current contract

Use [Design System Governance](./design-system-governance.md) and [Design System Workflow](./design-system-workflow.md) as the steady-state rules behind these defaults.

### PR Slicing Model

Decide slicing up front and keep it stable:

1. Open one shared-foundation PR for a wave only when multiple approved route families already prove the same shared need.
2. Open one route-family PR for the actual redesign implementation.
3. Open one cleanup PR only when wrappers, docs, or follow-up deletions should stay separate from the main wave.

## Phase 2: Conditional Shared Foundation Wave

Owner: `baldin_frontend`, governed by `baldin_full_stack_architect`

Do not open this wave automatically.

Open it only when at least two approved route families need the same shared surface or shared visual behavior. If a need is isolated to one route family, keep it feature-owned until reuse is proven.

Allowed categories:

- cross-screen heading hierarchy
- section framing
- status semantics and tone consistency
- reusable dialog, card, or list chrome proven across multiple screens

Rules:

- prefer extending existing primitives and patterns over adding new ones
- keep route copy, entity logic, workflow behavior, and page-specific rendering in feature code
- keep new or widened shared props domain-neutral
- add the required story and docs updates in the same PR for any promoted shared surface

Validation for this phase:

- targeted frontend tests for changed shared behavior
- `cd frontend && ./node_modules/.bin/tsc --noEmit`
- `cd frontend && npm run build`
- `cd frontend && npm run lint:theme`
- `cd frontend && npm run storybook:build` when public shared surfaces change

## Phase 3: Product-App Redesign Waves

Owner: `baldin_frontend`

Implementation order stays route-family based unless approved priorities change:

1. Applications, leads, and collection chrome
2. Messages and conversation detail
3. Settings and profile framing cleanup
4. Workflow and admin surfaces

Wave rules:

- do not start a route family until its redesign nodes are approved
- do not mix unrelated shared-foundation work into a route-family PR
- keep feature-owned behavior local unless reuse is proven
- treat backend work as exception-only

## Phase 4: Backend And Contract Follow-Ons

Owner: `baldin_backend`, only if needed

Backend work is opt-in, not assumed.

Open a backend follow-on only when an approved redesign requires:

- fields or enums the current UI cannot render from the existing API
- different aggregation or summary data for collection or admin screens
- a new mutation flow the current API does not support cleanly

If that happens:

1. `baldin_full_stack_architect` writes the dependency brief.
2. `baldin_backend` makes the smallest backend change that satisfies the approved UI need.
3. Regenerate contracts only if the API contract changed.
4. Let frontend final integration wait for regenerated types when required.

## Wave Validation

Every implementation wave must include:

- route-level behavior checks for changed screens
- focused component tests when shared-surface behavior changes materially
- `cd frontend && ./node_modules/.bin/tsc --noEmit`
- `cd frontend && npm run build`
- `cd frontend && npm run lint:theme` when shared surfaces or import boundaries changed
- `cd frontend && npm run storybook:build` when public design-system exports changed
- visual and manual verification against the approved Figma nodes in the active brief

If backend contracts change, add targeted backend pytest scope, verify schema regeneration output, and rerun frontend typecheck after regenerated artifacts land.

## Acceptance

This program is working only when all of these stay true:

- closeout remains frozen and the redesign handoff stays the only active redesign source of truth
- each wave starts from a required implementation brief
- shared-foundation work opens only after reuse is proven across multiple approved route families
- backend work stays exception-only and justified by approved UI needs
- team workflows do not fall back to using the provenance ledgers as active planning input
