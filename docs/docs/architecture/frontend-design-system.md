---
sidebar_position: 6
slug: /architecture/frontend-design-system
title: Frontend Design System
description: Shipped frontend design-system layers, entrypoints, ownership boundaries, and compatibility rules.
---

<!-- last-verified: 2026-04-12 -->

# Frontend Design System

Baldin's frontend design system is a thin shared UI layer over MUI, not a separate component framework or redesign. It formalizes the theme and token foundation that already existed, adds a small set of reusable primitives and patterns, and leaves domain behavior inside feature code.

Use this page for structure and ownership. Use [Design System Catalog](../engineering/design-system-catalog.md) for the current inventory, [Design System Workflow](../engineering/design-system-workflow.md) for contribution rules, and [Design System Migration Guide](../engineering/design-system-migration-guide.md) for adoption status.

## Current Source Layout

```text
frontend/src/
├── design-system/
│   ├── tokens/
│   ├── theme/
│   ├── primitives/
│   ├── patterns/
│   └── index.ts
├── theme/theme-provider.tsx
└── component/common/
```

The active app entrypoint is still `frontend/src/theme/theme-provider.tsx`. It imports `createBaldinTheme`, `DEFAULT_THEME_MODE`, `parseThemeMode`, `THEME_STORAGE_KEY`, and `toggleThemeMode` from `frontend/src/design-system/theme/*`, then passes the resulting theme into MUI's `ThemeProvider`.

## Layer Contract

| Layer | Location | Owns | Must not own |
| --- | --- | --- | --- |
| Tokens | `frontend/src/design-system/tokens/*` | Spacing, radius, elevation, motion, typography, palette helpers, status color mappings | Route copy, feature semantics, service imports |
| Theme | `frontend/src/design-system/theme/*` | MUI palette, typography, shape, component overrides, `theme.baldin` extensions, theme-mode parsing/toggling | Feature UI, route logic, API contracts |
| Primitives | `frontend/src/design-system/primitives/*` | Domain-neutral feedback, surfaces, status presentation, shared interaction behavior | Service calls, entity-specific props, route-specific copy |
| Patterns | `frontend/src/design-system/patterns/*` | Slot-based structural composition over primitives | Business workflows, domain data shaping |
| Compatibility wrappers | `frontend/src/component/common/*` and a few feature-local adapters | Backward-compatible prop translation and migration safety | New shared abstractions or new shared logic |
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

## What Stays Feature-Owned

The design system stops at neutral structure and presentation. These remain feature-owned today:

- Leads: extraction bar, lead modal flow, lead-specific CTA/status choices, service integration.
- Applications queue: stage semantics, filter behavior, row content, next-step behavior, local summary strip.
- Profile: hero, builder panel, document summary, MFA setup, section field config, record rendering.
- Conversations: participant display, row layout, navigation behavior.
- Agents: `kind` mapping and enable/disable behavior.
- Applications board, auth, dashboard, documents, crawlers, pipelines, and editor surfaces: still largely outside the Phase 2 shared layer.

## Compatibility Boundary

`frontend/src/component/common/*` is now a compatibility layer, not a destination for new shared UI.

Current wrapper behavior:

- `component/common/empty-state.tsx` adapts legacy `action` props to design-system `primaryAction`.
- `component/common/confirm-dialog.tsx` composes `FormDialogShell` and still owns compatibility-only confirm framing through a `destructive` toggle.
- `component/common/alert.tsx` and `component/common/error-message.tsx` wrap `InlineFeedback`.

These wrappers are allowed to translate prop shapes or preserve legacy call sites. They should stay thin. If a new shared primitive is needed, add it under `frontend/src/design-system/*` and only backfill a wrapper when compatibility is required.

## Import Rules

- New shared UI belongs in `frontend/src/design-system/*`.
- Feature code may import from `../../design-system` or narrower design-system paths.
- Design-system code may depend on MUI, generic React state, and neutral helpers only.
- Design-system code must not import service modules, generated API types, route modules, or domain copy.
- Compatibility wrappers may import from `frontend/src/design-system/*`, but design-system code must not import back from `component/common/*`.

## Proved Boundaries

The current shared APIs have enough real reuse to act as the baseline for adjacent route families:

- `CollectionToolbar` is used in leads, applications queue, and conversations.
- `CardShell` is used in leads, agents, and applications queue row shells.
- `FormDialogShell` is used in leads, agents, profile, and the compatibility confirm wrapper.
- `SectionCard` and `SectionHeader` are used in both profile and conversations.

That proof is still intentionally narrow. It does not imply repo-wide replacement of direct MUI `Card`, `Chip`, `Alert`, or dialog usage.

## Deferred Architecture Decisions

These were intentionally left out of the current shared layer:

- No shared `MetricStrip`.
- No standalone shared `ErrorState`.
- No applications board extraction into shared patterns.
- No shared `LeadModal` abstraction.
- No repo-wide replacement of direct MUI `Alert`, `Chip`, or card usage.
- No reopening of the Phase 1 theme entrypoints in `frontend/src/theme/*`.

Those deferrals are part of the architecture. They are not gaps in the docs.
