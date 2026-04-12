---
slug: /engineering/design-system-migration-guide
title: Design System Migration Guide
description: Current adoption status, compatibility strategy, migrated surfaces, and next-step migration guidance for Baldin's frontend design-system rollout.
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
| Compatibility wrappers and shims | Active transitional layer | `component/common/*`, `component/auth/*`, and `theme/*` still preserve older call sites |
| Pilot adopters | Complete | Leads, applications queue, and profile all consume the shared layer |
| Proving adopters | Partial | Conversations and agents prove reuse outside the pilot set |
| Repo-wide adoption | Not complete | Many route families still use local or direct MUI implementations |

## Phase 1 Foundation That Is Active Now

The Phase 1 foundation is still the live base for every Phase 2 primitive and pattern:

- `frontend/src/theme/theme-provider.tsx` now sources theme creation and mode helpers from `frontend/src/design-system/theme/*`.
- `frontend/src/theme/effects.ts` and `frontend/src/theme/status-colors.ts` are compatibility shims over design-system token helpers.
- `theme.palette.*` is the canonical access path for standard MUI semantic colors.
- `theme.baldin.*` is the canonical access path for Baldin-only token groups such as `status`, `alpha`, `radius`, `elevation`, `motion`, and `fontFamily`.

### Spacing Compatibility Caveat

The foundation intentionally kept old MUI spacing behavior in place. `createBaldinTheme()` does not override `spacing`, so:

- `theme.spacing()` still uses MUI's default 8px scale.
- Shared design-system files use the 4px-based `spacingTokens` and `toSpacingPx(...)` helpers instead.

That split is still real in the repo today. Future migrations should preserve it unless Baldin explicitly chooses a repo-wide spacing reset.

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
- Lead-specific CTA and status semantics
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

The migration did not require a big-bang import rewrite. Baldin currently uses four compatibility paths:

| Path | Current rule |
| --- | --- |
| `frontend/src/component/common/*` | Allowed only as a thin compatibility facade backed by `frontend/src/design-system/*` |
| `frontend/src/component/auth/*` | Treated as legacy shared source too; do not add new shared abstractions here |
| `frontend/src/theme/effects.ts` and `frontend/src/theme/status-colors.ts` | Allowed only as re-export shims over the canonical token and theme layer |
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

## Surfaces Using The Foundation Outside The Pilot

The migration is not limited to the direct primitive and pattern adopters. These surfaces already consume the shared foundation without being Phase 2 primitive or pattern migrations:

- `layout/app-layout.tsx` uses design-system motion tokens and theme effect helpers.
- `page/companies.tsx`, `page/pipelines.tsx`, `page/crawlers.tsx`, and document workspace files use typography tokens or compatibility theme helpers.
- `component/common/text.tsx`, `content-modal.tsx`, `error-boundary.tsx`, and `rich-text-editor.tsx` already consume design-system typography or effect helpers.

That means the foundation is broader than the Phase 2 primitive and pattern catalog, even though repo-wide component migration is still incomplete.

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

1. Start with an existing primitive or pattern before proposing a new shared abstraction.
2. Use thin compatibility wrappers only when they reduce migration risk or preserve a stable import path.
3. Keep feature semantics, service logic, route copy, and entity rendering local even when the outer shell migrates.
4. Finish obvious wrapper cleanups where the backing primitive already exists.
5. Only extract a new shared surface such as `MetricStrip` after a second route family proves the same structure.
6. Widen collection, card, and dialog adoption in route families already close to the shipped APIs before touching editor or admin-heavy surfaces.
7. Update the catalog, workflow, and migration docs in the same change when the shared surface or adopter list changes.

## What Counts As Done

A migration slice is complete when:

- The shared UI moved to `frontend/src/design-system/*` or an existing shared primitive was reused.
- Remaining wrappers are thin and documented.
- Feature-owned logic stayed in the feature folder.
- The catalog and this migration guide reflect the new state.
- The smallest relevant validation for the touched shared surface was run.

For the original Phase 2 closeout record, see [Close Out Phase 2 Design System](./phase-2-design-system-closeout.md).
