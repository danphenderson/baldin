---
slug: /engineering/design-system-migration-guide
title: Design System Migration Guide
description: Current adoption status, compatibility strategy, deferred work, and migration order for Baldin's frontend design-system rollout.
---

<!-- last-verified: 2026-04-12 -->

# Design System Migration Guide

This guide describes the migration that actually exists now. It is not a future-state plan.

## Current Rollout Status

| Area | Status | Notes |
| --- | --- | --- |
| Token and theme foundation | Complete | `frontend/src/design-system/tokens/*` and `theme/*` are active, and `theme-provider.tsx` consumes them |
| Shared primitives | Complete for current Phase 2 scope | Feedback, surfaces, and status primitives are shipped |
| Shared patterns | Complete for current Phase 2 scope | `CollectionToolbar` and `SectionCard` are shipped |
| Compatibility wrappers | Active transitional layer | `component/common/*` now delegates to design-system primitives where migrated |
| Pilot adopters | Complete | Leads, applications queue, and profile all consume the shared layer |
| Proving adopters | Partial | Conversations and agents prove reuse outside the pilot set |
| Repo-wide adoption | Not complete | Many route families still use local or direct MUI implementations |

## What Was Migrated

### Leads family

Migrated pieces:

- `lead-search-bar.tsx` now composes `CollectionToolbar`.
- `lead-card.tsx` uses `CardShell`, `StatusChip`, and status helpers.
- `lead-form-dialog.tsx` uses `FormDialogShell`.
- `leads.tsx` uses `LoadingState` and wrapper-backed `EmptyState`.

What stayed feature-owned:

- Lead extraction flow
- Lead modal flow
- Lead-specific CTA/status semantics
- Application-creation behavior

### Applications queue

Migrated pieces:

- Shared `CollectionToolbar`
- Shared `InlineFeedback`
- Shared `LoadingState`
- Shared `EmptyState`
- Shared `CardShell` for queue row framing
- Shared `StatusChip` for the stage pill

What stayed feature-owned:

- Stage semantics
- Card row content
- Next-step actions
- Local summary strip

The local summary strip is why `MetricStrip` is still deferred rather than silently treated as done.

### Profile

Migrated pieces:

- `ProfileSection` now composes `SectionCard` and `SectionHeader`.
- `EditDialog` and `DeleteDialog` use `FormDialogShell`.
- `ProfilePage` uses `LoadingState` and `InlineFeedback`.
- `page/profile/components/EmptyState.tsx` delegates to design-system `EmptyState`.

What stayed feature-owned:

- Profile hero
- Profile builder panel
- Documents summary
- MFA setup
- Field schemas and record rendering

### Proving adopters

- Conversations use `CollectionToolbar`, `SectionCard`, `SectionHeader`, `LoadingState`, and `EmptyState`.
- Agents use `CardShell`, `StatusChip`, `FormDialogShell`, and wrapper-backed `EmptyState`.

These proving adopters matter because they confirm the shared APIs work outside the original pilot routes.

## Compatibility Strategy

The migration did not require a big-bang import rewrite. Baldin currently uses two compatibility paths:

| Path | Current rule |
| --- | --- |
| `frontend/src/component/common/*` | Allowed only as a thin compatibility facade backed by `frontend/src/design-system/*` |
| Feature-local adapters like profile empty state or leads search bar | Allowed when they preserve feature copy, local prop shapes, or route-specific composition |

Use a compatibility wrapper only when it lowers migration risk or preserves an existing public API. Do not use it as the long-term home for new shared logic.

## Before And After Patterns

### Legacy shared wrapper to canonical primitive

Current rule:

- Old call sites may still import `component/common/empty-state.tsx`.
- The canonical shared implementation is `design-system/primitives/feedback/empty-state.tsx`.
- Legacy `action` is translated to canonical `primaryAction`.

### Feature-local composition to shared pattern

Current rule:

- A route can keep its local search fields, filters, and pagination controls.
- The outer toolbar shell should be `CollectionToolbar` once the structure is proven reusable.

### Feature-local dialog to shared shell

Current rule:

- Shared dialog framing lives in `FormDialogShell`.
- Feature modules still own form fields, submit behavior, destructive messaging, and route copy.

## Deferred Work

These items remain intentionally deferred and should stay documented as deferred until code lands:

- Shared `MetricStrip`
- Shared `ErrorState`
- Applications board extraction
- Shared `LeadModal`
- Auth-panel systemization
- Dashboard migration
- Document workspace and editor migration
- Pipelines and crawlers migration
- Repo-wide replacement of direct MUI `Alert`, `Chip`, and card usage

## Recommended Migration Order From Here

If migration work resumes, keep the order proportional:

1. Finish obvious wrapper cleanups where the shared primitive already exists.
2. Only extract `MetricStrip` after a second route family proves the same structure.
3. Widen collection/card/dialog adoption in route families already close to the shipped APIs.
4. Leave complex editor and admin surfaces for later unless they only need tokens or a simple primitive.

## What Counts As Done

A migration slice is complete when:

- The shared UI moved to `frontend/src/design-system/*` or an existing shared primitive was reused.
- Remaining wrappers are thin and documented.
- Feature-owned logic stayed in the feature folder.
- The catalog and this migration guide reflect the new state.

For the original Phase 2 closeout record, see [Close Out Phase 2 Design System](./phase-2-design-system-closeout.md).
