---
sidebar_position: 6
slug: /architecture/frontend-design-system
title: Frontend Design System
description: Shipped frontend design-system architecture, theme contract, ownership boundaries, and compatibility rules.
---

<!-- last-verified: 2026-04-17 -->

# Frontend Design System

Baldin's frontend design system is now code-first. In the repo, `frontend/src/design-system/*` owns the implemented tokens, theme contracts, domain-neutral primitives, and slot-based patterns, while feature folders keep workflow logic, service calls, route copy, and entity rendering. `operator-design/` and archived Figma assets are optional reference surfaces, not the implementation source of truth.

Use this page for structure and ownership. Use [Design System Catalog](../reference/design-system-catalog.md) for the current inventory, [Design System Governance](../engineering/design-system-governance.md) for operating rules, [Design System Workflow](../engineering/design-system-workflow.md) for day-to-day contribution flow, and [Design System Migration Guide](../engineering/design-system-migration-guide.md) for the current rollout ledger.

## Current Source Layout

Representative layout of the shared-UI-relevant frontend sources:

```text
frontend/
└── src/
    ├── admin/
    │   ├── admin-layout.tsx
    │   ├── admin-routes.tsx
    │   ├── main.tsx
    │   └── paths.ts
    ├── bootstrap/
    │   └── app-providers.tsx
    ├── design-system/
    │   ├── tokens/
    │   ├── theme/
    │   ├── primitives/
    │   ├── patterns/
    │   └── index.ts
    ├── theme/
    │   └── theme-provider.tsx
    ├── component/common/
    │   ├── content-modal.tsx
    │   ├── error-boundary.tsx
    │   ├── file-picker.tsx
    │   ├── footer.tsx
    │   ├── json-modal.tsx
    │   ├── secondary-nav-bar.tsx
    │   └── user-avatar.tsx
    └── page/**, layout/**, route/**, and component/**
```

The product-app browser entrypoint is `frontend/src/index.tsx`. It renders `AppProviders` from `frontend/src/bootstrap/app-providers.tsx`, which wires in `ThemeProvider` from `frontend/src/theme/theme-provider.tsx`. The dedicated Admin SPA has its own browser entrypoint at `frontend/src/admin/main.tsx`.

Legacy theme shims at `frontend/src/theme/effects.ts` and `frontend/src/theme/status-colors.ts` have been removed. Any shared token or status helper import now comes directly from `frontend/src/design-system/*`.

## Theme Contract

Baldin uses two theme-access paths on purpose.

| Use | Current source | What belongs there |
| --- | --- | --- |
| `theme.palette.*` | MUI palette created from `frontend/src/design-system/tokens/color.ts` | Standard semantic colors and surfaces such as `primary`, `secondary`, `background`, `text`, `success`, `warning`, `error`, and `info` |
| `theme.baldin.*` | Theme augmentation in `frontend/src/design-system/theme/mui-augmentations.d.ts` | Baldin-specific token groups: `status`, `alpha`, `radius`, `elevation`, `motion`, `fontFamily` |

Use `theme.palette.*` when the value already fits MUI's semantic palette. Use `theme.baldin.*` when the value is Baldin-specific and does not belong in the MUI palette model.

Component overrides also carry a small set of canonical interaction patterns. `MuiButton` exposes a `brand` variant for the shared gradient CTA treatment, so feature code does not need to restyle primary buttons locally.

### Spacing compatibility caveat

Phase 1 intentionally left MUI spacing compatibility in place. `createBaldinTheme()` does not override MUI's `spacing` option, so:

- `theme.spacing()` still uses MUI's default 8px scale.
- `spacingTokens.base` in `frontend/src/design-system/tokens/spacing.ts` is 4.

New shared UI under `frontend/src/design-system/*` should use `spacingTokens` and `toSpacingPx(...)`. Existing feature code can keep using `theme.spacing()` until that surface is intentionally migrated.

## Layer Contract

| Layer | Location | Owns | Must not own |
| --- | --- | --- | --- |
| Tokens | `frontend/src/design-system/tokens/*` | Spacing, radius, elevation, motion, typography, palette helpers, status mappings | Route copy, feature semantics, service imports |
| Theme | `frontend/src/design-system/theme/*` | MUI palette, typography, shape, component overrides, `theme.baldin` extensions, theme-mode parsing and toggling | Feature UI, route logic, API contracts |
| Primitives | `frontend/src/design-system/primitives/*` | Domain-neutral typography, feedback, surfaces, status presentation, shared interaction behavior | Service calls, entity-specific props, route-specific copy |
| Patterns | `frontend/src/design-system/patterns/*` | Slot-based structure over primitives | Business workflows, domain data shaping |
| Compatibility shims | `frontend/src/component/common/*` and a few feature-local adapters | Import preservation only when needed during migration | New shared abstractions or new shared logic |
| Feature code | `frontend/src/page/**`, feature components under `frontend/src/component/**` | Product copy, service usage, route state, workflow behavior, entity rendering | New domain-neutral shared infrastructure |

## Canonical Shared Surface

The shipped code layer is narrower than the broader historical design inventory, but it is the canonical implementation source for the shared frontend UI that already lives in the repo.

| Shared area | Shipped exports |
| --- | --- |
| Tokens | `color`, `effects`, `elevation`, `motion`, `radius`, `spacing`, `status`, `typography` |
| Theme | `createBaldinTheme`, palette helpers, typography helpers, shape helpers, MUI overrides, theme-mode helpers, JSON tree adapter |
| Primitives | `PageTitle`, `SectionTitle`, `CardTitle`, `Label`, `Caption`, `Overline`, `Mono`, `EmptyState`, `InlineFeedback`, `LoadingState`, `SearchField`, `ReadonlyField`, `StatusChip`, `getStatusChipSx`, `getStatusMetaSx`, `CardShell`, `SurfaceCard`, `SurfaceDialog`, `ConfirmDialog`, `FormDialogShell`, `SectionHeader`, `SituationHeader` |
| Patterns | `CollectionToolbar`, `MetricStrip`, `SectionCard`, `AuthPanel` |

Everything is re-exported through `frontend/src/design-system/index.ts`.

## Verification Surface

The canonical verification surface for code-backed shared UI now lives in targeted frontend checks:

- `frontend/test/design-system/**` owns focused Vitest coverage for shared React exports and theme rules.
- `cd frontend && npm run lint:theme`, `cd frontend && ./node_modules/typescript/bin/tsc --noEmit`, and `cd frontend && VITE_API_URL=https://api.preview.invalid npm run build` are the widening checks when shared exports, typing, or bundling assumptions change.
- Colocated `*.figma.ts` files remain optional metadata for historical Figma node URLs. They are not imported by the shipped app or required for the shared-surface validation lane.
- Use real route consumers or the browser harness only when a manual visual check adds value beyond targeted tests.

Treat this test-first lane as the default review surface for shared UI. Do not rebuild a separate component sandbox as a prerequisite for shipping shared React code.

This keeps Baldin code-first without turning optional design metadata into a gate. The shared React layer is the implementation origin, targeted tests are the primary inspection bridge, and archived design surfaces remain reference-only.

## Primitive Vs Pattern Vs Feature-Owned

Current boundary:

- A primitive is a domain-neutral leaf or shell such as `PageTitle`, `EmptyState`, `SurfaceDialog`, `CardShell`, or `StatusChip`.
- A pattern is slot-based structure over primitives, such as `CollectionToolbar`, `SectionCard`, `MetricStrip`, or `AuthPanel`.
- A feature-owned component still owns workflow logic, data shaping, route copy, or entity semantics even when it renders inside a primitive or pattern.

Examples that remain feature-owned:

- Leads still own extraction flow, ranking behavior, and lead-specific CTA and status semantics.
- Applications still own stage semantics, row-card content, next-step behavior, and document workflows.
- Profile still owns builder logic, field schemas, record rendering, and AI-assisted editing behavior, even though the aspirations collection chrome now reuses the canonical `SituationHeader` primitive and `MetricStrip` pattern.
- Conversations still own participant display, row layout, and message workflow.
- Agents still own `kind` mapping, orchestration behavior, and execution state.

## Compatibility Boundary

`frontend/src/component/common/*` is a legacy compatibility location, not a destination for new shared UI.

Current compatibility behavior:

- `page/profile/components/EmptyState.tsx` remains a feature-local adapter because it keeps profile-specific copy local.
- `component/lead-search-bar.tsx` remains a feature-local adapter because it keeps leads-specific search and pagination composition local.
- The remaining files under `component/common/*` are local shell or utility components, not canonical shared-surface wrappers.

Legacy `component/common/*` re-export shims, `component/auth/*` shared wrappers, and the theme re-export shims have all been removed. New shared logic must not start in any compatibility location.

## Import And Enforcement Rules

- New shared UI belongs in `frontend/src/design-system/*`.
- Feature code may import from the root `design-system` barrel or a narrower canonical design-system path.
- Feature-local adapters may lightly adapt canonical design-system sources only when they preserve feature-owned copy or composition.
- Use `styled()` for reusable structure and `sx` for local composition. Shared wrappers should type `sx` as `SxProps<Theme>` when they expose it, and canonical shared surfaces should avoid static `style={{...}}` literals outside explicit runtime-computed escapes.
- `frontend/scripts/lint-theme.mjs` blocks imports from retired wrapper paths such as `component/common/text`, `component/common/empty-state`, `component/common/confirm-dialog`, and any `component/auth/*` path.
- `lint:theme` also blocks direct MUI shell imports of `Card`, `CardContent`, `CardHeader`, `CardActions`, `Chip`, `Dialog`, `DialogTitle`, `DialogContent`, and `DialogActions` outside `frontend/src/design-system/*`, tests, and `context/notification-context.tsx`.
- `lint:theme` prefers modern `slotProps`/`slots` over `InputProps` and `PaperProps` in new shared surfaces; the current shared-surface exceptions remain documented until they are migrated.

That enforcement keeps the shared design-system layer canonical without forcing feature-specific behavior into the shared layer.

## Adopted Route Families

The current shared APIs are now used across the route families that own shared-eligible shells:

- Auth: login, registration, and MFA flows use `AuthPanel`, `InlineFeedback`, and shared typography.
- Applications: queue, board, and detail routes use design-system status, surface, and dialog primitives.
- Leads: cards, dialogs, search shell, and empty/loading states use canonical shared surfaces.
- Profile: section framing, dialogs, feedback, hero shells, summary surfaces, and aspirations collection chrome use canonical shared surfaces plus documented adapters.
- Conversations and agent chat: collection chrome, section framing, chips, and supporting dialogs use canonical shared surfaces.
- Dashboard, documents/editor, product-app workflows, the dedicated Admin SPA, settings, network/discovery, and company surfaces now import overlapping shell UI through `frontend/src/design-system/*` instead of local wrappers or theme shims.

See the [Route-Family Adoption Table](../reference/design-system-catalog.md#route-family-adoption-table) for the current status table.

## Deferred Architecture Decisions

These remain intentionally deferred:

- No standalone shared `ErrorState` yet.
- No shared domain abstractions such as `LeadModal`, applications board semantics, or profile-builder logic.
- No movement of service calls, generated types, or route copy into the design-system layer.

Those deferrals are part of the architecture. They are not gaps in the docs.
