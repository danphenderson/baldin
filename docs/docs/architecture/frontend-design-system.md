---
sidebar_position: 6
slug: /architecture/frontend-design-system
title: Frontend Design System
description: Shipped frontend design-system architecture, theme contract, ownership boundaries, and compatibility rules.
---

<!-- last-verified: 2026-04-12 -->

# Frontend Design System

Baldin's frontend design system is a thin shared UI layer over MUI, not a separate component framework or redesign. It formalizes the Phase 1 theme and token foundation, adds the small Phase 2 primitive and pattern layer that now exists, and leaves product behavior inside feature code.

Use this page for structure and ownership. Use [Design System Catalog](../reference/design-system-catalog.md) for the current inventory, [Design System Workflow](../engineering/design-system-workflow.md) for contribution rules, and [Design System Migration Guide](../engineering/design-system-migration-guide.md) for rollout status.

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
| Patterns | `CollectionToolbar`, `SectionCard` |

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
- Applications board, auth, dashboard, documents, crawlers, pipelines, and editor surfaces: still largely outside the Phase 2 shared layer.

## Compatibility Boundary

`frontend/src/component/common/*` and `frontend/src/component/auth/*` are compatibility-only legacy locations, not destinations for new shared UI.

Current compatibility behavior:

- `component/common/empty-state.tsx` adapts legacy `action` props to design-system `primaryAction`.
- `component/common/confirm-dialog.tsx` composes `FormDialogShell` and still owns compatibility-only confirm framing through a `destructive` toggle.
- `component/common/alert.tsx` and `component/common/error-message.tsx` wrap `InlineFeedback`.
- `theme/effects.ts` and `theme/status-colors.ts` preserve older imports by re-exporting design-system token helpers.

These wrappers and shims are allowed to translate prop shapes or preserve legacy call sites. They should stay thin. If a new shared primitive is needed, add it under `frontend/src/design-system/*` and only backfill a wrapper when compatibility is required.

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

The current Phase 2 adopters are:

- Leads family: `page/leads.tsx`, `component/lead-card.tsx`, `component/lead-form-dialog.tsx`, `component/lead-search-bar.tsx`
- Applications queue: `page/applications/applications-queue-page.tsx`
- Profile family: `page/profile/ProfilePage.tsx`, `page/profile/components/ProfileSection.tsx`, `page/profile/components/EditDialog.tsx`, `page/profile/components/DeleteDialog.tsx`, `page/profile/components/EmptyState.tsx`
- Proving adopters: `page/messages/conversations-page.tsx`, `component/agent-card.tsx`, `component/agent-form-dialog.tsx`

## Deferred Architecture Decisions

These were intentionally left out of the current shared layer:

- No shared `MetricStrip`.
- No standalone shared `ErrorState`.
- No applications board extraction into shared patterns.
- No shared `LeadModal` abstraction.
- No repo-wide replacement of direct MUI `Alert`, `Chip`, or card usage.
- No reopening of the Phase 1 theme entrypoints in `frontend/src/theme/*`.

Those deferrals are part of the architecture. They are not gaps in the docs.
