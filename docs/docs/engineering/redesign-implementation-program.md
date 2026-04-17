---
slug: /engineering/redesign-implementation-program
title: Redesign Implementation Program
description: Post-closeout developer workflow for turning the command-center redesign handoff into implementation-ready product slices.
---

<!-- last-verified: 2026-04-16 -->

# Redesign Implementation Program

Use this page only for the developer execution flow after the redesign handoff is accepted as the working baseline.

[Baldin Redesign Handoff](../reference/baldin-redesign-handoff.md) remains the canonical redesign source. This program does not redefine product direction, route semantics, or shared UX rules.

## Entry Criteria

Do not start product implementation from the redesign until all of these are true:

- the current closeout implementation is merged or otherwise accepted as the working baseline
- the working tree is normalized so redesign work does not inherit mixed closeout edits
- `npm --prefix docs run build` passes
- the sidebar entry for Baldin Redesign Handoff is live
- `Baldin Product Redesign — Command Center` exists as the active redesign working file
- the new file has the exact page structure defined in the handoff
- `00 · Vision & Route Map` maps every in-scope route to one approved node in the new file
- `01 · Command Center System` is approved before any route-family implementation brief is opened
- the redesign handoff is the only active redesign source teams are using

If a later design review finds a factual error in the handoff, fix the handoff. Do not restart capture by default.

## Phase 0: Reset, Normalize, And Freeze The Contract

Program owner: `baldin_full_stack_architect`

Phase 0 closes the old wave-first framing and freezes the full-product redesign contract:

- `docs/docs/reference/baldin-redesign-handoff.md` is the active redesign entry point
- `Baldin Product Redesign — Command Center` is the only active working screens file until approval
- the current `Baldin-App-Screens` file is reference-only and must not be used as the new visual source
- derived docs must point back to the handoff instead of restating redesign truth
- new wave packets and PR plans must not become competing redesign specs

Run one sanity pass after the closeout baseline lands:

- `npm --prefix docs run build`
- confirm the sidebar and command palette expose the redesign handoff and this program page
- confirm the local workflow docs and agent docs point to the handoff-first path
- confirm the new Figma file has the required page order and no evidence or archive pages

## Phase 1: Engineering Enablement

Program owner: `baldin_full_stack_architect`

The implementation enablement artifacts live in `plans/redesign/`:

| Artifact | Purpose |
| --- | --- |
| `plans/redesign/implementation-brief-template.md` | Required entry brief for every implementation slice |
| `plans/redesign/wave-01-flagship-journey.md` | Flagship journey: aspirations, leads, applications, and collection chrome packet |
| `plans/redesign/wave-02-network.md` | Network: messages, connections, discover, and relationship management packet |
| `plans/redesign/wave-03-settings-profile.md` | Settings framing cleanup packet |
| `plans/redesign/wave-04-workflows-admin.md` | Workflow and admin packet |
| `plans/redesign/wave-05-workspace-automation.md` | Workspace documents and automation agents packet |

Dashboard, Auth, and Marketing do not currently have dedicated packet files in `plans/redesign/`. They still require their own implementation briefs once the new redesign file is approved.

### Required Brief

Every implementation slice must start from `plans/redesign/implementation-brief-template.md`.

The brief is incomplete until it explicitly states all of these:

- the exact approved Figma file key and page name
- the exact approved Figma node IDs
- the matching row or rows from `00 · Vision & Route Map`
- affected route or routes
- whether any shared-surface promotion is proposed
- which tests must change
- which docs must change
- whether backend work is required

No implementation slice starts until its brief names the exact approved redesign nodes from the new file only.

### Frozen Implementation Rules

Freeze these rules before the first UI slice:

- no ad hoc MUI shell sprawl outside `frontend/src/design-system/*`
- no new wrapper growth under legacy component folders
- no route-specific semantics promoted into shared surfaces
- no backend changes unless an approved UI need cannot be met with the current contract

Use [Design System Governance](./design-system-governance.md) and [Design System Workflow](./design-system-workflow.md) as the steady-state rules behind these defaults.

## Phase 2: Full-Product Figma Approval Gate

Owner: `baldin_design_lead`, governed by `baldin_full_stack_architect`

No frontend implementation resumes until the command-center redesign is complete at the Figma level.

The gate is satisfied only when all of these are true:

- `01 · Command Center System` is approved
- `02 · Dashboard`, `10 · Flagship · Profile & Aspirations`, `11 · Flagship · Leads`, and `12 · Flagship · Applications` have approved route nodes
- `20 · Network · Discover & Connections`, `21 · Network · Messages`, and `30 · Settings` have approved route nodes
- `40 · Workflows`, `41 · Admin`, `50 · Workspace`, `51 · Automation Agents`, `60 · Auth`, and `70 · Marketing` have approved route nodes
- every in-scope route from `frontend/src/route/app-routes.tsx` maps to one approved node on `00 · Vision & Route Map`
- implementation briefs cite the new file key and exact approved node IDs from the new file only

This gate exists to prevent route-family code work from restarting against incomplete or mixed-source redesign material.

### PR Slicing Model

Decide slicing up front and keep it stable:

1. Open one shared-foundation PR for a slice only when multiple approved route families already prove the same shared need.
2. Open one route-family PR for the actual redesign implementation.
3. Open one cleanup PR only when wrappers, docs, or follow-up deletions should stay separate from the main wave.

## Phase 3: Conditional Shared Foundation Wave

Owner: `baldin_frontend`, governed by `baldin_full_stack_architect`

Do not open this wave automatically.

Open it only when at least two approved route families need the same shared surface or shared visual behavior. If a need is isolated to one route family, keep it feature-owned until reuse is proven.

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

## Phase 4: Product-App Redesign Slices

Owner: `baldin_frontend`

Default implementation order after the full-product Figma gate is satisfied:

1. Flagship journey plus dashboard integration follow-on
2. Network plus settings
3. Workflows, admin, workspace, and automation
4. Auth and marketing

Use the existing route-family packets where they fit, but do not let a packet override the approved route-to-node table in the new Figma file. Dashboard, Auth, and Marketing require explicit briefs even though they do not yet have packet files.

Slice rules:

- do not start a route family until its redesign nodes are approved
- do not mix unrelated shared-foundation work into a route-family PR
- keep feature-owned behavior local unless reuse is proven
- treat backend work as exception-only
- every brief must cite the governing handoff sections it applies

## Phase 5: Backend And Contract Follow-Ons

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

## Slice Validation

Every implementation slice must include:

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
- the new Figma working file remains the single active composed-screen redesign source until approval
- each implementation slice starts from a required implementation brief
- shared-foundation work opens only after reuse is proven across multiple approved route families
- backend work stays exception-only and justified by approved UI needs
- team workflows do not create a second active redesign source outside the handoff
