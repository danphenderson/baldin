---
sidebar_position: 2
slug: /reference/design-system-catalog
title: Design System Catalog
description: Canonical inventory of Baldin's shipped frontend design-system theme contract, tokens, primitives, patterns, compatibility shims, and current adopters.
---

<!-- last-verified: 2026-04-12 -->

# Design System Catalog

This catalog describes the shared frontend UI surface that actually ships in the repo today. It is intentionally narrower than a full app-wide component library.

## Theme Contract

| Surface | Source | Use it for | Do not use it for |
| --- | --- | --- | --- |
| `theme.palette.*` | `frontend/src/design-system/tokens/color.ts` via `getPaletteOptions()` | Standard MUI semantic roles such as `primary`, `secondary`, `background`, `text`, `success`, `warning`, `error`, and `info` | Baldin-only token groups such as radius, motion, or status maps |
| `theme.baldin.*` | `frontend/src/design-system/theme/create-baldin-theme.ts` and `mui-augmentations.d.ts` | Baldin-specific token bags: `status`, `alpha`, `radius`, `elevation`, `motion`, `fontFamily` | Replacing normal MUI palette roles or inventing feature-specific state |
| `spacingTokens` and `toSpacingPx()` | `frontend/src/design-system/tokens/spacing.ts` | New shared layout spacing in `frontend/src/design-system/*` | Assuming `theme.spacing()` matches Baldin token math |

### Spacing Compatibility Caveat

`createBaldinTheme()` does not override MUI's `spacing` option, so `theme.spacing()` still uses MUI's default 8px scale. Baldin's design-system spacing tokens use `spacingTokens.base = 4`.

Current rule:

- New shared UI under `frontend/src/design-system/*` should use `spacingTokens` and `toSpacingPx(...)`.
- Existing feature code may still use `theme.spacing()` until that surface is intentionally migrated.

## Token Inventory

| Token group | Path | Notes |
| --- | --- | --- |
| Color | `frontend/src/design-system/tokens/color.ts` | Defines light and dark palette inputs for MUI `palette` |
| Effects | `frontend/src/design-system/tokens/effects.ts` | Exposes alpha constants plus gradient and surface helpers |
| Elevation | `frontend/src/design-system/tokens/elevation.ts` | Exposes theme-aware shadow helpers |
| Motion | `frontend/src/design-system/tokens/motion.ts` | Defines durations, easing, and small stagger values |
| Radius | `frontend/src/design-system/tokens/radius.ts` | Defines shared radius values from `xs` through `pill` |
| Spacing | `frontend/src/design-system/tokens/spacing.ts` | Defines the 4px-based spacing compatibility layer for shared UI |
| Status | `frontend/src/design-system/tokens/status.ts` | Maps application, workflow, crawler, priority, and platform states to colors |
| Typography | `frontend/src/design-system/tokens/typography.ts` | Defines font families, typography roles, and exported display/mono helpers |

## Theme Inventory

| Surface | Path | Notes |
| --- | --- | --- |
| Theme creation | `frontend/src/design-system/theme/create-baldin-theme.ts` | Creates the MUI theme, then extends it with `theme.baldin` |
| Theme typing | `frontend/src/design-system/theme/mui-augmentations.d.ts` | Adds `theme.baldin.status`, `alpha`, `radius`, `elevation`, `motion`, and `fontFamily` |
| Theme mode helpers | `frontend/src/design-system/theme/theme-mode.ts` | Owns default mode, storage key, parser, and toggle helper |
| Typography mapping | `frontend/src/design-system/theme/typography.ts` | Maps Baldin font families into MUI typography |
| Shape mapping | `frontend/src/design-system/theme/shape.ts` | Sets the base MUI `shape.borderRadius` |
| Component overrides | `frontend/src/design-system/theme/components.ts` | Applies shared MUI defaults and override rules |
| JSON tree adapter | `frontend/src/design-system/theme/adapters/json-tree.ts` | Supplies a theme adapter for JSONTree consumers |

## Primitive Inventory

### Feedback

| Primitive | Path | Canonical role | Current known consumers |
| --- | --- | --- | --- |
| `EmptyState` | `frontend/src/design-system/primitives/feedback/empty-state.tsx` | Neutral empty-state shell with `primaryAction`, `layout`, and `compact` options | Applications queue, conversations, profile adapter, `component/common/empty-state.tsx` |
| `InlineFeedback` | `frontend/src/design-system/primitives/feedback/inline-feedback.tsx` | Persistent inline feedback block with shared tone and close behavior | Applications queue, profile, `component/common/alert.tsx`, `component/common/error-message.tsx` |
| `LoadingState` | `frontend/src/design-system/primitives/feedback/loading-state.tsx` | Shared list, grid, and section loading skeletons | Leads, applications queue, profile, conversations |

### Surfaces

| Primitive | Path | Canonical role | Current known consumers |
| --- | --- | --- | --- |
| `CardShell` | `frontend/src/design-system/primitives/surfaces/card-shell.tsx` | Shared static or interactive card frame with token-backed padding, motion, and focus handling | `lead-card.tsx`, `agent-card.tsx`, applications queue rows, `SectionCard` |
| `SectionHeader` | `frontend/src/design-system/primitives/surfaces/section-header.tsx` | Shared section header with icon, count, supporting text, divider, and action slot | Profile section cards, conversations |
| `FormDialogShell` | `frontend/src/design-system/primitives/surfaces/form-dialog-shell.tsx` | Shared dialog chrome for form, confirm, create, edit, and delete flows | Lead form dialog, agent form dialog, profile edit/delete dialogs, `component/common/confirm-dialog.tsx` |

### Status

| Primitive | Path | Canonical role | Current known consumers |
| --- | --- | --- | --- |
| `StatusChip` | `frontend/src/design-system/primitives/status/status-chip.tsx` | Token-backed status chip wrapper over MUI `Chip` | Leads, agents, applications queue, section headers |
| Status helpers | `frontend/src/design-system/primitives/status/helpers.ts` | Shared status/meta styling helpers using the status token map | Lead and agent card metadata |

## Pattern Inventory

| Pattern | Path | Canonical role | Current known consumers |
| --- | --- | --- | --- |
| `CollectionToolbar` | `frontend/src/design-system/patterns/collections/collection-toolbar.tsx` | Slot-based collection header with `search`, `controls`, `actions`, and `secondary` regions | Leads via `lead-search-bar.tsx`, applications queue, conversations |
| `MetricStrip` | `frontend/src/design-system/patterns/metrics/metric-strip.tsx` | Read-only stat row with `inline` (flush) and `card` (CardShell-wrapped) variants | Applications queue, applications board, leads, pipelines, crawlers |
| `SectionCard` | `frontend/src/design-system/patterns/sections/section-card.tsx` | Thin `CardShell` composition for section layouts with shared header framing | Profile sections, conversations |

## Compatibility Inventory

These files are still active, but they are not the canonical place for new shared UI.

### Theme compatibility shims

| Shim | Backing source | Why it still exists |
| --- | --- | --- |
| `frontend/src/theme/effects.ts` | `frontend/src/design-system/tokens/effects.ts` plus `theme/adapters/json-tree.ts` | Preserves long-lived imports such as `brandGradient`, `softBrandGradient`, and `jsonTreeTheme` |
| `frontend/src/theme/status-colors.ts` | `frontend/src/design-system/tokens/status.ts` | Preserves older `getStatusColors()` imports in existing features |

### Legacy shared wrappers

| Wrapper | Backing source | Why it still exists |
| --- | --- | --- |
| `frontend/src/component/common/empty-state.tsx` | `EmptyState` | Preserves the legacy `action` prop while mapping to `primaryAction` |
| `frontend/src/component/common/confirm-dialog.tsx` | `FormDialogShell` | Preserves the confirm-dialog API and compatibility-only title/icon framing |
| `frontend/src/component/common/alert.tsx` | `InlineFeedback` | Preserves alert-style call sites |
| `frontend/src/component/common/error-message.tsx` | `InlineFeedback` | Preserves error-only helper call sites |

### Feature-local adapters

| Adapter | Backing source | Why it still exists |
| --- | --- | --- |
| `frontend/src/page/profile/components/EmptyState.tsx` | `EmptyState` | Keeps profile-specific copy and CTA wording local |
| `frontend/src/component/lead-search-bar.tsx` | `CollectionToolbar` | Keeps leads-specific search, filter, and pagination composition local |

## Compatibility-Only Legacy Locations

The repo currently treats these locations as compatibility or legacy source, not as the destination for new shared-source growth:

| Location | Current status |
| --- | --- |
| `frontend/src/component/common/*` | Legacy shared folder; thin wrappers and older helpers may remain, but new shared UI should not start here |
| `frontend/src/component/auth/*` | Legacy shared folder; `lint:theme` blocks new shared-source growth here too |
| `frontend/src/theme/effects.ts` and `frontend/src/theme/status-colors.ts` | Compatibility re-export shims over the canonical design-system token layer |

## Adopted Surfaces

### Pilot surfaces

| Surface | Current adoption | Shared pieces in use |
| --- | --- | --- |
| Leads family | Partial pilot complete | `LoadingState`, wrapper-backed `EmptyState`, `CollectionToolbar` via `lead-search-bar`, `CardShell`, `StatusChip`, `FormDialogShell` |
| Applications queue | Pilot complete | `CollectionToolbar`, `EmptyState`, `InlineFeedback`, `LoadingState`, `CardShell`, `StatusChip` |
| Profile family | Pilot complete | `LoadingState`, `InlineFeedback`, adapter-backed `EmptyState`, `SectionCard`, `SectionHeader`, `FormDialogShell` |

### Proving adopters

| Surface | Current adoption | Shared pieces in use |
| --- | --- | --- |
| Conversations | Proving adoption complete | `CollectionToolbar`, `SectionCard`, `SectionHeader`, `LoadingState`, `EmptyState` |
| Agents | Proving adoption partial | wrapper-backed `EmptyState`, `CardShell`, `StatusChip`, `FormDialogShell` |

### Broader token and shim adoption

These files are outside the Phase 2 primitive/pattern pilot but already consume the shared foundation:

- `frontend/src/theme/theme-provider.tsx` uses the design-system theme entrypoint.
- `frontend/src/layout/app-layout.tsx` uses design-system motion tokens and compatibility effect helpers.
- `frontend/src/page/companies.tsx`, `frontend/src/page/pipelines.tsx`, `frontend/src/page/crawlers.tsx`, and several document/workspace files use typography tokens or theme compatibility shims.
- `frontend/src/component/common/text.tsx`, `content-modal.tsx`, `error-boundary.tsx`, and `rich-text-editor.tsx` already consume design-system typography or effect helpers.

## Explicitly Deferred Or Missing Shared Pieces

These are not part of the shipped catalog today:

- Shared `ErrorState`
- Applications board extraction
- Shared `LeadModal`
- Auth panel systemization
- Dashboard migration
- Document workspace and editor migration
- Pipelines and crawlers migration
- Repo-wide replacement of direct MUI `Alert`, `Chip`, card, or dialog usage

## Catalog Rules

- The canonical catalog lives under `frontend/src/design-system/*`, not under `component/common/*` or `component/auth/*`.
- Do not add a new catalog entry unless it is domain-neutral and already justified by multiple route families or app-shell behavior.
- When a compatibility wrapper survives, document the wrapper and the backing primitive together so contributors know which file is canonical.
