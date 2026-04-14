---
slug: /engineering/design-system-migration-guide
title: Design System Migration Guide
description: Current implementation adoption status, compatibility strategy, migrated surfaces, and next-step guidance for Baldin's shipped frontend design-system layer.
---

<!-- last-verified: 2026-04-13 -->

# Design System Migration Guide

This guide describes the migration that exists in the repo today. It tracks the shipped `frontend/src/design-system/*` layer, not the full future inventory of Baldin-Library in Figma.

## Current Rollout Status

| Area | Status | Notes |
| --- | --- | --- |
| Token and theme foundation | Complete | `frontend/src/design-system/tokens/*` and `theme/*` are active, and `theme-provider.tsx` consumes them |
| Shared primitives | Complete for the current implemented code scope | Feedback, typography, surface, and status primitives are shipped |
| Shared patterns | Complete for the current implemented code scope | `CollectionToolbar`, `MetricStrip`, `SectionCard`, and `AuthPanel` are shipped |
| Compatibility wrappers | Narrow transitional layer | Only documented re-export shims and feature-local adapters remain |
| Route-family adoption | Broadly complete | See the [Route-Family Adoption Ledger](../reference/design-system-catalog.md#route-family-adoption-ledger) |

Figma can lead code. Baldin-Library may define broader library inventory ahead of what is promoted into `frontend/src/design-system/*`.

## What Changed In This Enforcement Pass

This migration pass completed the design-system ownership boundary for shared-eligible frontend shells.

### Canonical shared layer changes

- Shared typography exports moved into `frontend/src/design-system/primitives/typography/*` and are re-exported through the root design-system barrel.
- `AuthPanel` now owns the centered auth card shell used by login, MFA verification, and registration.
- `ConfirmDialog`, `SurfaceCard`, and `SurfaceDialog` provide canonical wrappers for feature-owned confirm, card, and dialog shells.
- `StatusChip` now supports compatibility-style `color` and `variant` handoff so feature code can migrate off raw MUI `Chip` imports without losing shared styling.

### Compatibility cleanup

- `frontend/src/theme/effects.ts` and `frontend/src/theme/status-colors.ts` were removed.
- `frontend/src/component/common/alert.tsx` and `frontend/src/component/common/error-message.tsx` were removed.
- `frontend/src/component/auth/signin.tsx` and `frontend/src/component/auth/signup.tsx` were removed.
- `frontend/src/component/common/text.tsx`, `empty-state.tsx`, and `confirm-dialog.tsx` were removed after their final in-repo consumers were migrated.

### Import-boundary enforcement

- Feature code now imports shared-eligible card, chip, and dialog shells through `frontend/src/design-system/*`.
- `lint:theme` blocks imports from retired or compatibility-only shared paths.
- `lint:theme` also blocks direct imports of overlapping MUI shell primitives outside `frontend/src/design-system/*`, tests, and `context/notification-context.tsx`.

## Route Families That Are Now Adopted

The current shared APIs are in active use across the route families that own shared-eligible shells:

- Auth
- Applications
- Leads
- Profile
- Conversations and agent chat
- Agents
- Dashboard
- Documents / editor
- Workflows / admin
- Network / discovery
- Settings

Adopted here means shared-eligible typography, chip, card, and dialog shells now come from the canonical design-system layer, while business logic stays feature-owned.

## Compatibility Strategy That Still Applies

The migration did not require a big-bang rewrite of every feature abstraction. Baldin still uses two small compatibility patterns:

| Path | Current rule |
| --- | --- |
| Feature-local adapters such as profile empty state and leads search bar | Allowed when they preserve feature copy, local prop shapes, or route-specific composition |

Do not reintroduce deleted common shims, theme shims, auth wrappers, or alert wrappers.

## Before And After Patterns

### Legacy wrapper to canonical primitive

Current rule:

- The canonical shared implementation lives in `frontend/src/design-system/*`.
- Old wrapper paths are retired and blocked by `lint:theme`.
- Any consumer should import the canonical design-system source directly.

### Raw MUI shell to canonical shared shell

Current rule:

- Shared-eligible `Card`, `CardContent`, `Chip`, `Dialog`, `DialogTitle`, `DialogContent`, and `DialogActions` usage in feature code should come from `SurfaceCard`, `StatusChip`, and `SurfaceDialog` aliases imported through the design-system layer.
- Direct MUI shell imports are reserved for `frontend/src/design-system/*`, tests, and `context/notification-context.tsx`.

### Feature-local composition to shared pattern

Current rule:

- A route can keep local search fields, filters, CTA wiring, and pagination controls.
- The outer toolbar shell should be `CollectionToolbar` once the structure is shared.
- Auth pages should use `AuthPanel` once they share the same centered shell.

## Deferred Work

These items remain intentionally deferred:

- Shared `ErrorState`
- Shared domain abstractions such as `LeadModal`, applications board semantics, or profile-builder orchestration
- Shared service-layer helpers or generated API contracts inside the design-system layer

## What Counts As Done

A migration slice is complete when:

- The shared UI moved to `frontend/src/design-system/*` or an existing shared primitive or pattern was reused.
- Remaining wrappers are pure re-exports or clearly documented feature-local adapters.
- Feature-owned logic stayed in the feature folder.
- The catalog and this migration guide reflect the new state.
- The smallest relevant validation for the touched shared surface was run.

For the original Phase 2 closeout record, see [Close Out Phase 2 Design System](./phase-2-design-system-closeout.md).
