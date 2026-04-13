---
sidebar_position: 6
slug: /architecture/frontend-design-system
title: Frontend Design System
description: Shipped frontend design-system architecture, theme contract, ownership boundaries, and compatibility rules.
---

<!-- last-verified: 2026-04-12 -->

# Frontend Design System

Baldin's frontend design system is a thin shared UI layer over MUI, not a separate component framework or redesign. It formalizes the Phase 1 theme and token foundation, adds the small Phase 2 primitive and pattern layer that now exists, and leaves product behavior inside feature code.

Use this page for structure and ownership. Use [Design System Catalog](../reference/design-system-catalog.md) for the current inventory, [Design System Governance](../engineering/design-system-governance.md) for the operating rules, [Design System Workflow](../engineering/design-system-workflow.md) for contribution flow, and [Design System Migration Guide](../engineering/design-system-migration-guide.md) for rollout status.

## Current Source Layout

```text
frontend/src/
├── design-system/
│   ├── tokens/
│   ├── theme/
│   ├── primitives/
│   ├── patterns/
│   └── index.ts
├── theme/
│   ├── theme-provider.tsx
│   ├── effects.ts
│   └── status-colors.ts
├── component/common/
└── component/auth/
```

The active app entrypoint is `frontend/src/theme/theme-provider.tsx`. It imports `createBaldinTheme`, `DEFAULT_THEME_MODE`, `parseThemeMode`, `THEME_STORAGE_KEY`, and `toggleThemeMode` from `frontend/src/design-system/theme/*`, then passes the resulting theme into MUI's `ThemeProvider`.

`frontend/src/theme/effects.ts` and `frontend/src/theme/status-colors.ts` remain as compatibility re-export shims over the canonical token layer.

## Theme Contract

Baldin uses two theme-access paths on purpose.

| Use | Current source | What belongs there |
| --- | --- | --- |
| `theme.palette.*` | MUI palette created from `frontend/src/design-system/tokens/color.ts` | Standard semantic colors and surfaces such as `primary`, `secondary`, `background`, `text`, `success`, `warning`, `error`, and `info` |
| `theme.baldin.*` | Theme augmentation in `frontend/src/design-system/theme/mui-augmentations.d.ts` | Baldin-specific token groups: `status`, `alpha`, `radius`, `elevation`, `motion`, `fontFamily` |

Use `theme.palette.*` when the value already fits MUI's semantic palette. Use `theme.baldin.*` when the value is Baldin-specific and does not belong in the MUI palette model.

### Spacing Compatibility Caveat

Phase 1 intentionally left MUI spacing compatibility in place. `createBaldinTheme()` does not override MUI's `spacing` option, so:

- `theme.spacing()` still uses MUI's default 8px scale.
- `spacingTokens.base` in `frontend/src/design-system/tokens/spacing.ts` is 4.

New shared UI under `frontend/src/design-system/*` should use `spacingTokens` and `toSpacingPx(...)`. Existing feature code can keep using `theme.spacing()` until that surface is intentionally migrated.

## Status Usage Hierarchy

Status color is accessible through five paths. The decision tree below specifies the preferred order so contributors do not create parallel conventions.

```text
Need a status-colored chip?
  └─ YES → use StatusChip from design-system/primitives/status/status-chip.tsx
Need status-colored metadata text (label, date, icon)?
  └─ YES → use getStatusMetaSx() from design-system/primitives/status/helpers.ts
Need a custom status-styled surface (not a chip or text)?
  └─ YES → use getStatusChipSx() or resolveStatusColor() from design-system/primitives/status/helpers.ts
Need a raw status color value in new shared UI?
  └─ YES → use theme.baldin.status.* (the theme augmentation)
None of the above?
  └─ Use theme.palette.success / warning / error / info for generic semantic feedback
```

### Path reference

| Path | Location | Use it for | Do not use it for |
| --- | --- | --- | --- |
| `StatusChip` | `design-system/primitives/status/status-chip.tsx` | Any MUI `Chip`-shaped status indicator. Semantic tone keys now include shared status tokens plus `primary` for non-domain accent chips and Figma mappings. | Custom surfaces that are not chips |
| `getStatusChipSx` / `getStatusMetaSx` | `design-system/primitives/status/helpers.ts` | Applying token-backed status color to custom elements or metadata text | Replacing `StatusChip` when a chip is the right primitive |
| `theme.baldin.status.*` | `design-system/theme/mui-augmentations.d.ts` | Reading raw status color tokens inside new shared design-system code | Feature code that can use the helpers above instead |
| `theme/status-colors.ts` | `frontend/src/theme/status-colors.ts` | **Compatibility only** — existing feature imports that have not migrated yet | New code; migrate to `design-system/tokens/status.ts` or the helpers above |
| `design-system/tokens/status.ts` | `frontend/src/design-system/tokens/status.ts` | Authoring new status helpers or extending the token map itself | Feature code that already has a higher-level helper available |

## Layer Contract

| Layer | Location | Owns | Must not own |
| --- | --- | --- | --- |
| Tokens | `frontend/src/design-system/tokens/*` | Spacing, radius, elevation, motion, typography, palette helpers, status color mappings | Route copy, feature semantics, service imports |
| Theme | `frontend/src/design-system/theme/*` | MUI palette, typography, shape, component overrides, `theme.baldin` extensions, theme-mode parsing/toggling | Feature UI, route logic, API contracts |
| Primitives | `frontend/src/design-system/primitives/*` | Domain-neutral feedback, surfaces, status presentation, shared interaction behavior | Service calls, entity-specific props, route-specific copy |
| Patterns | `frontend/src/design-system/patterns/*` | Slot-based structural composition over primitives | Business workflows, domain data shaping |
| Compatibility shims and wrappers | `frontend/src/theme/*`, `frontend/src/component/common/*`, and a few feature-local adapters | Backward-compatible imports, prop translation, and migration safety | New shared abstractions or new shared logic |
| Feature code | `frontend/src/page/**`, feature components under `frontend/src/component/**` | Product copy, service usage, route types, workflow state, entity-specific rendering | New domain-neutral shared infrastructure |

## Shared Surface That Exists Now

The current shared layer is intentionally small.

| Shared area | Shipped exports |
| --- | --- |
| Tokens | `color`, `effects`, `elevation`, `motion`, `radius`, `spacing`, `status`, `typography` |
| Theme | `createBaldinTheme`, palette helpers, typography helpers, shape helpers, MUI overrides, theme-mode helpers, JSON tree adapter |
| Primitives | `EmptyState`, `InlineFeedback`, `LoadingState`, `StatusChip`, `getStatusChipSx`, `getStatusMetaSx`, `CardShell`, `FormDialogShell`, `SectionHeader` |
| Patterns | `CollectionToolbar`, `MetricStrip`, `SectionCard` |

Everything is re-exported through `frontend/src/design-system/index.ts`.

## Primitive Vs Pattern Vs Feature-Owned

Current boundary:

- A primitive is a domain-neutral leaf or shell such as `EmptyState`, `InlineFeedback`, `CardShell`, `FormDialogShell`, or `StatusChip`.
- A pattern is slot-based structure over primitives, such as `CollectionToolbar` or `SectionCard`.
- A feature-owned component still owns workflow logic, data shaping, route copy, or entity semantics even when it renders inside a primitive or pattern.

Examples that are still feature-owned today:

- Leads still own `LeadModal`, extraction flow, and lead-specific CTA and status semantics.
- Applications queue still owns stage semantics, row-card content, next-step behavior, and its local summary strip.
- Profile still owns `ProfileHero`, `ProfileBuilderPanel`, `DocumentsSummary`, `MFASetupCard`, field schemas, and record rendering.
- Conversations still own participant display, row layout, and navigation behavior.
- Agents still own `kind` mapping and enable and disable behavior.

## What Stays Feature-Owned

The design system stops at neutral structure and presentation. These remain feature-owned today:

- Leads: extraction bar, lead modal flow, lead-specific CTA and status choices, service integration.
- Applications queue: stage semantics, filter behavior, row content, next-step behavior, local summary strip.
- Profile: hero, builder panel, document summary, MFA setup, section field config, record rendering.
- Conversations: participant display, row layout, navigation behavior.
- Agents: `kind` mapping and enable and disable behavior.
- Applications board, auth, dashboard, documents, crawlers, pipelines, and editor surfaces: `adopting` or `not-started` in the shared layer (see the [Route-Family Adoption Ledger](../reference/design-system-catalog.md#route-family-adoption-ledger)).

## Compatibility Boundary

`frontend/src/component/common/*` and `frontend/src/component/auth/*` are compatibility-only legacy locations, not destinations for new shared UI.

Current compatibility behavior:

- `component/common/empty-state.tsx` adapts legacy `action` props to design-system `primaryAction`.
- `component/common/confirm-dialog.tsx` composes `FormDialogShell` and still owns compatibility-only confirm framing through a `destructive` toggle.
- `component/common/alert.tsx` and `component/common/error-message.tsx` wrap `InlineFeedback`.
- `theme/effects.ts` and `theme/status-colors.ts` preserve older imports by re-exporting design-system token helpers.

These wrappers and shims are allowed to translate prop shapes or preserve legacy call sites. They should stay thin. If a new shared primitive is needed, add it under `frontend/src/design-system/*` and only backfill a wrapper when compatibility is required.

## Quick-Reference Governance And Migration Summary

This section provides the minimum-safe governance and migration context for standalone use. The full companion docs remain authoritative when more detail is needed.

### Promotion gate

Add shared UI under `frontend/src/design-system/*` only when the surface is domain-neutral, has at least two concrete consumers (or one consumer plus a near-term second), and uses neutral props or slots. Everything else stays feature-owned.

### Compatibility wrapper rule

Wrappers in `component/common/*`, `component/auth/*`, and `theme/*` may only translate old prop shapes or re-export canonical design-system sources. New shared logic must not start there.

### Required docs update

Any change to the shared surface must update the catalog, migration guide, and this page in the same PR. See [Design System Governance](../engineering/design-system-governance.md) for the full reviewer checklist.

### Validation minimum

| Change type | Minimum validation |
| --- | --- |
| Shared code | `cd frontend && npm run test` for the touched surface |
| Exports or types | `cd frontend && ./node_modules/.bin/tsc --noEmit` |
| Theme or token rules | `cd frontend && npm run lint:theme` |
| Docs or sidebar | `npm --prefix docs run build` |

### Migration state definitions

See the [Adopted Surfaces](#migrated-surfaces) section below and the [Design System Catalog](../reference/design-system-catalog.md) for the formal route-family ledger and state model.

## Import Rules

- New shared UI belongs in `frontend/src/design-system/*`.
- Feature code may import from `../../design-system` or narrower design-system paths.
- Design-system code may depend on MUI, generic React state, and neutral helpers only.
- Design-system code must not import service modules, generated API types, route modules, or domain copy.
- Compatibility wrappers may import from `frontend/src/design-system/*`, but design-system code must not import back from `component/common/*`.
- New shared-source growth should not start in `frontend/src/component/common/*` or `frontend/src/component/auth/*`.

## Proved Boundaries

The current shared APIs have enough real reuse to act as the baseline for adjacent route families:

- `CollectionToolbar` is used in leads, applications queue, and conversations.
- `CardShell` is used in leads, agents, and applications queue row shells.
- `FormDialogShell` is used in leads, agents, profile, and the compatibility confirm wrapper.
- `SectionCard` and `SectionHeader` are used in both profile and conversations.

That proof is still intentionally narrow. It does not imply repo-wide replacement of direct MUI `Card`, `Chip`, `Alert`, or dialog usage.

## Migrated Surfaces

Route-family adoption uses three states: `adopted` (all shared-eligible surfaces migrated), `adopting` (migration in progress), and `not-started`. See the [Design System Catalog](../reference/design-system-catalog.md#route-family-adoption-ledger) for the full ledger with per-family shared-piece lists.

### Adopted

- Applications queue: `applications-queue-page.tsx`
- Profile family: `ProfilePage.tsx`, `ProfileSection.tsx`, `EditDialog.tsx`, `DeleteDialog.tsx`, `EmptyState.tsx`
- Conversations: `conversations-page.tsx`

### Adopting

- Leads family: `leads.tsx`, `lead-card.tsx`, `lead-form-dialog.tsx`, `lead-search-bar.tsx`
- Agents: `agent-card.tsx`, `agent-form-dialog.tsx`
- Pipelines: `pipelines.tsx` (MetricStrip and typography tokens only)
- Crawlers: `crawlers.tsx` (MetricStrip and typography tokens only)
- Applications board: `applications-board-page.tsx` (MetricStrip only)

### Not started

- Auth, dashboard, documents, editor surfaces

## Deferred Architecture Decisions

These were intentionally left out of the current shared layer:

- No standalone shared `ErrorState`.
- No applications board extraction into shared patterns.
- No shared `LeadModal` abstraction.
- No repo-wide replacement of direct MUI `Alert`, `Chip`, or card usage.
- No reopening of the Phase 1 theme entrypoints in `frontend/src/theme/*`.

Those deferrals are part of the architecture. They are not gaps in the docs.
