---
slug: /engineering/design-system-catalog
title: Design System Catalog
description: Canonical inventory of Baldin's shipped frontend design-system tokens, primitives, patterns, wrappers, and current consumers.
---

<!-- last-verified: 2026-04-12 -->

# Design System Catalog

This catalog records the shared frontend UI surface that actually exists today. It is intentionally narrower than the original rollout proposal.

## Tokens And Theme

| Surface | Path | Notes |
| --- | --- | --- |
| Token exports | `frontend/src/design-system/tokens/index.ts` | Re-exports all shipped token groups |
| Color tokens | `frontend/src/design-system/tokens/color.ts` | Supplies light/dark palette roles and MUI palette options |
| Spacing tokens | `frontend/src/design-system/tokens/spacing.ts` | Defines `spacingTokens` and `toSpacingPx(step)` |
| Status tokens | `frontend/src/design-system/tokens/status.ts` | Maps application, workflow, crawler, priority, and platform statuses to colors |
| Theme creation | `frontend/src/design-system/theme/create-baldin-theme.ts` | Creates the MUI theme and extends `theme.baldin` |
| Theme mode helpers | `frontend/src/design-system/theme/theme-mode.ts` | Default mode, storage key, parser, toggle helper |

The current theme contract exposes custom `theme.baldin` values for:

- `status`
- `alpha`
- `radius`
- `elevation`
- `motion`
- `fontFamily`

## Primitives

### Feedback

| Primitive | Path | Key usage shape | Current known consumers |
| --- | --- | --- | --- |
| `EmptyState` | `frontend/src/design-system/primitives/feedback/empty-state.tsx` | `icon`, `title`, `description`, optional `primaryAction`, `layout`, `compact` | Applications queue, conversations, profile wrapper, `component/common/empty-state.tsx` |
| `InlineFeedback` | `frontend/src/design-system/primitives/feedback/inline-feedback.tsx` | `tone`, children, optional `onClose`, optional `sx` | Applications queue, profile, `component/common/alert.tsx`, `component/common/error-message.tsx` |
| `LoadingState` | `frontend/src/design-system/primitives/feedback/loading-state.tsx` | `kind`, `count`, `itemHeight` | Leads, applications queue, profile, conversations |

### Surfaces

| Primitive | Path | Key usage shape | Current known consumers |
| --- | --- | --- | --- |
| `CardShell` | `frontend/src/design-system/primitives/surfaces/card-shell.tsx` | Card container with shared padding and interactive/static handling | `lead-card.tsx`, `agent-card.tsx`, applications queue rows, `SectionCard` |
| `SectionHeader` | `frontend/src/design-system/primitives/surfaces/section-header.tsx` | `icon`, `title`, `count`, `supportingText`, `action`, `divider`, `size` | Profile section cards, conversations |
| `FormDialogShell` | `frontend/src/design-system/primitives/surfaces/form-dialog-shell.tsx` | Shared title/body/actions shell with `busy`, width, close handling | Lead form dialog, agent form dialog, profile edit/delete dialogs, `component/common/confirm-dialog.tsx` |

### Status

| Primitive | Path | Key usage shape | Current known consumers |
| --- | --- | --- | --- |
| `StatusChip` | `frontend/src/design-system/primitives/status/status-chip.tsx` | Token-backed MUI chip with neutral size/variant/color control | Lead cards, agent cards, applications queue stage pill, section headers |
| Status helpers | `frontend/src/design-system/primitives/status/helpers.ts` | `getStatusChipSx`, `getStatusMetaSx` | Lead and agent status/meta presentation |

## Patterns

| Pattern | Path | Scope | Current known consumers |
| --- | --- | --- | --- |
| `CollectionToolbar` | `frontend/src/design-system/patterns/collections/collection-toolbar.tsx` | Slot-based collection header for `search`, `controls`, `actions`, `secondary` rows | Leads via `lead-search-bar.tsx`, applications queue, conversations |
| `SectionCard` | `frontend/src/design-system/patterns/sections/section-card.tsx` | `CardShell` wrapper for section layouts with shared header composition | Profile sections, conversations |

## Compatibility Wrappers

These are still shipped and should be treated as compatibility-only.

| Wrapper | Backed by | Why it still exists |
| --- | --- | --- |
| `frontend/src/component/common/empty-state.tsx` | `EmptyState` | Preserves legacy `action` prop while mapping to `primaryAction` |
| `frontend/src/component/common/confirm-dialog.tsx` | `FormDialogShell` | Keeps confirm-dialog API stable and owns icon/title treatment |
| `frontend/src/component/common/alert.tsx` | `InlineFeedback` | Preserves alert-style call sites |
| `frontend/src/component/common/error-message.tsx` | `InlineFeedback` | Preserves error-only helper call sites |
| `frontend/src/page/profile/components/EmptyState.tsx` | `EmptyState` | Keeps profile-specific copy and CTA wording local |
| `frontend/src/component/lead-search-bar.tsx` | `CollectionToolbar` | Keeps leads-specific search, filter, and pagination composition local |

## Adopted Surfaces

### Pilot adopters

| Route family | Adoption state | Shared pieces in use |
| --- | --- | --- |
| Leads | Partial pilot complete | `LoadingState`, wrapper-backed `EmptyState`, `CollectionToolbar` via `lead-search-bar`, `CardShell`, `StatusChip`, `FormDialogShell` |
| Applications queue | Pilot complete | `CollectionToolbar`, `EmptyState`, `InlineFeedback`, `LoadingState`, `CardShell`, `StatusChip` |
| Profile | Pilot complete | `LoadingState`, `InlineFeedback`, wrapper-backed `EmptyState`, `SectionCard`, `SectionHeader`, `FormDialogShell` |

### Proving adopters

| Route family | Adoption state | Shared pieces in use |
| --- | --- | --- |
| Conversations | Proving adoption complete | `CollectionToolbar`, `SectionCard`, `SectionHeader`, `LoadingState`, `EmptyState` |
| Agents | Proving adoption partial | wrapper-backed `EmptyState`, `CardShell`, `StatusChip`, `FormDialogShell` |

## Deferred Or Missing Shared Pieces

These items are explicitly not part of the current catalog:

- Shared `MetricStrip`
- Shared `ErrorState`
- Applications board shared extraction
- Shared `LeadModal`
- Shared auth panel
- Shared pipeline/crawler admin shells
- Editor- or document-workspace-specific abstractions

## Catalog Rules

- Do not treat `component/common/*` as the catalog. The catalog lives under `frontend/src/design-system/*`.
- Do not add a new shared component to the catalog unless it is domain-neutral and already justified by multiple route families or app-shell behavior.
- When a wrapper survives, document the wrapper and the backing primitive together so contributors know which file is canonical.
