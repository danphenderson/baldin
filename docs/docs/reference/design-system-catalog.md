---
sidebar_position: 2
slug: /reference/design-system-catalog
title: Design System Catalog
description: Canonical inventory of Baldin's shipped frontend design-system implementation, its compatibility shims, current adopters, and its mapping back to Baldin-Library in Figma.
---

<!-- last-verified: 2026-04-13 -->

# Design System Catalog

This catalog describes the shared frontend UI surface that ships in the repo today. `frontend/src/design-system/*` is the canonical inventory of the implemented code layer, not the exhaustive inventory of Baldin-Library in Figma. Legacy wrappers are documented only so contributors know what still exists and what has already been removed.

## Theme Contract

| Surface | Source | Use it for | Do not use it for |
| --- | --- | --- | --- |
| `theme.palette.*` | `frontend/src/design-system/tokens/color.ts` via `getPaletteOptions()` | Standard MUI semantic roles such as `primary`, `secondary`, `background`, `text`, `success`, `warning`, `error`, and `info` | Baldin-only token groups such as radius, motion, or status maps |
| `theme.baldin.*` | `frontend/src/design-system/theme/create-baldin-theme.ts` and `mui-augmentations.d.ts` | Baldin-specific token bags: `status`, `alpha`, `radius`, `elevation`, `motion`, `fontFamily` | Replacing normal MUI palette roles or inventing feature-specific state |
| `spacingTokens` and `toSpacingPx()` | `frontend/src/design-system/tokens/spacing.ts` | New shared layout spacing in `frontend/src/design-system/*` | Assuming `theme.spacing()` matches Baldin token math |

## Token Inventory

| Token group | Path | Notes |
| --- | --- | --- |
| Color | `frontend/src/design-system/tokens/color.ts` | Defines light and dark palette inputs for MUI `palette` |
| Effects | `frontend/src/design-system/tokens/effects.ts` | Exposes alpha constants plus gradient and surface helpers |
| Elevation | `frontend/src/design-system/tokens/elevation.ts` | Exposes theme-aware shadow helpers |
| Motion | `frontend/src/design-system/tokens/motion.ts` | Defines durations, easing, and small stagger values |
| Radius | `frontend/src/design-system/tokens/radius.ts` | Defines shared radius values from `xs` through `pill` plus `toRadiusPx(...)` for `sx`-safe pixel output |
| Spacing | `frontend/src/design-system/tokens/spacing.ts` | Defines the 4px-based spacing compatibility layer for shared UI |
| Status | `frontend/src/design-system/tokens/status.ts` | Maps application, workflow, crawler, priority, and platform states to colors |
| Typography | `frontend/src/design-system/tokens/typography.ts` | Defines font families, typography roles, and exported display and mono helpers |

## Theme Inventory

| Surface | Path | Notes |
| --- | --- | --- |
| Theme creation | `frontend/src/design-system/theme/create-baldin-theme.ts` | Creates the MUI theme, then extends it with `theme.baldin` |
| Theme typing | `frontend/src/design-system/theme/mui-augmentations.d.ts` | Adds `theme.baldin.status`, `alpha`, `radius`, `elevation`, `motion`, and `fontFamily` |
| Theme mode helpers | `frontend/src/design-system/theme/theme-mode.ts` | Owns default mode, storage key, parser, and toggle helper |
| Typography mapping | `frontend/src/design-system/theme/typography.ts` | Maps Baldin font families into MUI typography |
| Shape mapping | `frontend/src/design-system/theme/shape.ts` | Sets the base MUI `shape.borderRadius` |
| Component overrides | `frontend/src/design-system/theme/components.ts` | Applies shared MUI defaults and override rules |
| `MuiButton` `brand` variant | `frontend/src/design-system/theme/components.ts` | Canonical gradient CTA button variant for auth and app-shell surfaces | Reapplying the gradient button style locally |
| JSON tree adapter | `frontend/src/design-system/theme/adapters/json-tree.ts` | Supplies a theme adapter for JSONTree consumers |

## Primitive Inventory

### Fields

| Primitive | Path | Canonical role | Current known consumers |
| --- | --- | --- | --- |
| `SearchField`, `ReadonlyField` | `frontend/src/design-system/primitives/fields/text-field.tsx` | Shared `TextField` wrappers for search affordances and read-only presentation | Command palette, extractor modal |

### Typography

| Primitive | Path | Canonical role | Current known consumers |
| --- | --- | --- | --- |
| `PageTitle`, `SectionTitle`, `CardTitle`, `Label`, `Caption`, `Overline`, `Mono` | `frontend/src/design-system/primitives/typography/text.tsx` | Shared typography roles exported from the canonical design-system layer | Auth, dashboard, documents, profile, agents, browser harness, compatibility text shim |

### Feedback

| Primitive | Path | Canonical role | Current known consumers |
| --- | --- | --- | --- |
| `EmptyState` | `frontend/src/design-system/primitives/feedback/empty-state.tsx` | Neutral empty-state shell with `primaryAction`, legacy `action`, `layout`, and `compact` options | Applications, conversations, profile adapter, compatibility empty-state shim |
| `InlineFeedback` | `frontend/src/design-system/primitives/feedback/inline-feedback.tsx` | Persistent inline feedback block with shared tone and close behavior | Auth, applications, profile, settings, workflow and admin pages |
| `LoadingState` | `frontend/src/design-system/primitives/feedback/loading-state.tsx` | Shared list, grid, and section loading skeletons | Leads, applications, profile, conversations, documents |

### Surfaces

| Primitive | Path | Canonical role | Current known consumers |
| --- | --- | --- | --- |
| `CardShell` | `frontend/src/design-system/primitives/surfaces/card-shell.tsx` | Shared static or interactive card frame with token-backed padding, motion, and focus handling | Leads, agents, applications queue rows, `SectionCard`, `AuthPanel` |
| `SurfaceCard` and `SurfaceCardContent` | `frontend/src/design-system/primitives/surfaces/surface-card.tsx` | Canonical wrapper for feature-owned card shells that still need MUI card semantics | Dashboard, documents, settings, discovery, profile, lead and agent surfaces |
| `SurfaceDialog`, `SurfaceDialogTitle`, `SurfaceDialogContent`, `SurfaceDialogActions` | `frontend/src/design-system/primitives/surfaces/surface-dialog.tsx` | Canonical wrapper for feature-owned dialog shells that still need MUI dialog semantics | Documents, settings, workflows/admin, applications, profile import, chat and composer dialogs |
| `ConfirmDialog` | `frontend/src/design-system/primitives/surfaces/confirm-dialog.tsx` | Canonical shared confirm surface for lightweight destructive or informational confirmations | Applications, crawlers, agents, lead flows, compatibility confirm-dialog shim |
| `FormDialogShell` | `frontend/src/design-system/primitives/surfaces/form-dialog-shell.tsx` | Shared dialog chrome for form, create, edit, and delete flows | Lead form dialog, agent form dialog, profile edit/delete dialogs |
| `SectionHeader` | `frontend/src/design-system/primitives/surfaces/section-header.tsx` | Shared section header with icon, count, supporting text, divider, and action slot | Profile sections, conversations, detail panels |

### Status

| Primitive | Path | Canonical role | Current known consumers |
| --- | --- | --- | --- |
| `StatusChip` | `frontend/src/design-system/primitives/status/status-chip.tsx` | Token-backed chip wrapper over MUI `Chip`, including compatibility mapping for `color` and `variant` | Applications, dashboard, profile, documents, agent chat, connection status, discovery, cell-doc node views |
| Status helpers | `frontend/src/design-system/primitives/status/helpers.ts` | Shared status and metadata styling helpers using the status token map | Lead and agent card metadata, dashboard summaries, pipeline and crawler status surfaces |

## Pattern Inventory

| Pattern | Path | Canonical role | Current known consumers |
| --- | --- | --- | --- |
| `CollectionToolbar` | `frontend/src/design-system/patterns/collections/collection-toolbar.tsx` | Slot-based collection header with `search`, `controls`, `actions`, and `secondary` regions | Leads via `lead-search-bar.tsx`, applications, conversations |
| `MetricStrip` | `frontend/src/design-system/patterns/metrics/metric-strip.tsx` | Read-only stat row with `inline` and `card` variants | Applications, dashboard, leads, pipelines, crawlers |
| `SectionCard` | `frontend/src/design-system/patterns/sections/section-card.tsx` | Thin `CardShell` composition for section layouts with shared header framing | Profile sections, conversations |
| `AuthPanel` | `frontend/src/design-system/patterns/auth/auth-panel.tsx` | Shared centered auth shell with icon, title, description, content, and footer slots | Login, registration, MFA verification flows |

## Figma Mapping Inventory

These files are optional repo-local metadata, but they are the practical verification fallback when workspace Code Connect reads are seat-blocked. The canonical library target for all sixteen mappings is [Baldin-Library](https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library).

This table is intentionally code-backed rather than exhaustive. Baldin-Library can grow beyond these entries before new surfaces are promoted into `frontend/src/design-system/*`. Figma-first work that is ahead of, or intentionally outside of, the code-backed catalog belongs in [Baldin Library Buildout Ledger](./baldin-library-buildout-ledger.md).

| Surface | Local mapping file | Library node |
| --- | --- | --- |
| `CollectionToolbar` | `frontend/src/design-system/patterns/collections/CollectionToolbar.figma.ts` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=8-23 |
| `MetricStrip` | `frontend/src/design-system/patterns/metrics/MetricStrip.figma.ts` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=7-31 |
| `SectionCard` | `frontend/src/design-system/patterns/sections/SectionCard.figma.ts` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=7-5 |
| `AuthPanel` | `frontend/src/design-system/patterns/auth/AuthPanel.figma.ts` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=49-11 |
| `EmptyState` | `frontend/src/design-system/primitives/feedback/EmptyState.figma.ts` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=47-65 |
| `InlineFeedback` | `frontend/src/design-system/primitives/feedback/InlineFeedback.figma.ts` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=30-62 |
| `LoadingState` | `frontend/src/design-system/primitives/feedback/LoadingState.figma.ts` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=202-83 |
| `SearchField` | `frontend/src/design-system/primitives/fields/SearchField.figma.ts` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=40-48 |
| `ReadonlyField` | `frontend/src/design-system/primitives/fields/ReadonlyField.figma.ts` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=218-127 |
| `StatusChip` | `frontend/src/design-system/primitives/status/StatusChip.figma.ts` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=5-34 |
| `CardShell` | `frontend/src/design-system/primitives/surfaces/CardShell.figma.ts` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=7-2 |
| `SurfaceCard` | `frontend/src/design-system/primitives/surfaces/SurfaceCard.figma.ts` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=42-35 |
| `ConfirmDialog` | `frontend/src/design-system/primitives/surfaces/ConfirmDialog.figma.ts` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=46-135 |
| `FormDialogShell` | `frontend/src/design-system/primitives/surfaces/FormDialogShell.figma.ts` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=8-24 |
| `SurfaceDialog` | `frontend/src/design-system/primitives/surfaces/SurfaceDialog.figma.ts` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=45-33 |
| `SectionHeader` | `frontend/src/design-system/primitives/surfaces/SectionHeader.figma.ts` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=6-24 |

## Reviewed Make Sandbox

The current [Figma Make sandbox](https://www.figma.com/make/pXpkeOKYnA3gvhHPIjbJDo/Untitled?t=bM22KU0ea6ttyIQ5-20&fullscreen=1) was reviewed on `2026-04-13` as a salvage candidate, but it is not a canonical design-system source.

Authoritative reviewed sources:

- `src/app/App.tsx`
- `src/styles/theme.css`
- `src/app/components/ui/button.tsx`
- `src/app/components/ui/card.tsx`
- `src/app/components/ui/badge.tsx`
- `guidelines/Guidelines.md`

Review outcome:

- `App.tsx` is an empty app shell, so there is no meaningful screen buildout to port.
- `Guidelines.md` is untouched template content, so there are no Baldin-specific Make rules to preserve.
- `theme.css` is a generic Tailwind token sheet and does not define Baldin's canonical token contract.
- `button.tsx`, `card.tsx`, and `badge.tsx` are generic shadcn-style wrappers and are not eligible for direct migration into the MUI-based Baldin design system.
- Typography overlap does not require a Make-specific migration because Baldin already ships the same `Source Sans 3` plus `Space Grotesk` direction in the canonical theme and browser harness.

## Compatibility Inventory

These files still exist, but they are not the canonical place for new shared UI.

### Feature-local adapters

| Adapter | Backing source | Lifecycle state | Why it still exists |
| --- | --- | --- | --- |
| `frontend/src/page/profile/components/EmptyState.tsx` | `EmptyState` | `translating` | Keeps profile-specific copy and CTA wording local |
| `frontend/src/component/lead-search-bar.tsx` | `CollectionToolbar` | `translating` | Keeps leads-specific search, filter, and pagination composition local |

### Removed compatibility files

| Removed file | Replacement |
| --- | --- |
| `frontend/src/component/common/text.tsx` | Typography primitives imported from `frontend/src/design-system` |
| `frontend/src/component/common/empty-state.tsx` | `EmptyState` imported from `frontend/src/design-system` |
| `frontend/src/component/common/confirm-dialog.tsx` | `ConfirmDialog` imported from `frontend/src/design-system` |
| `frontend/src/component/common/alert.tsx` | `InlineFeedback` imported from `frontend/src/design-system` |
| `frontend/src/component/common/error-message.tsx` | `InlineFeedback` imported from `frontend/src/design-system` |
| `frontend/src/theme/effects.ts` | `frontend/src/design-system/tokens/effects.ts` |
| `frontend/src/theme/status-colors.ts` | `frontend/src/design-system/tokens/status.ts` and status helpers |
| `frontend/src/component/auth/signin.tsx` and `frontend/src/component/auth/signup.tsx` | Auth surfaces now compose canonical auth and form primitives directly |

## Compatibility-Only Legacy Locations

| Location | Current status |
| --- | --- |
| `frontend/src/component/common/*` | Legacy shared folder; retired for shared UI wrappers and new shared-source growth |
| `frontend/src/component/auth/*` | Retired for shared UI; new shared-source growth and new consumers are not allowed |
| `frontend/src/theme/effects.ts` and `frontend/src/theme/status-colors.ts` | Removed; import canonical design-system sources instead |

## Migration State Definitions

Every route family in the ledger below uses one of these states:

| State | Meaning | Entry criteria | Exit criteria |
| --- | --- | --- | --- |
| `adopted` | All shared-eligible surfaces consume the design-system layer. Remaining wrappers are thin and documented. | PR merged with shared-layer imports, wrapper inventory updated, and docs updated in the same change. | N/A |
| `adopting` | Active migration in progress. Some surfaces already consume the shared layer; others still use local or legacy implementations. | At least one page or component in the family imports from `frontend/src/design-system`. | All shared-eligible surfaces migrated → `adopted`. |
| `not-started` | The family has not begun consuming the shared layer beyond the token and theme foundation. | Default state. | First shared-layer import merged → `adopting`. |

### Route-Family Adoption Ledger

| Route family | State | Shared pieces in use | Notes |
| --- | --- | --- | --- |
| Auth | `adopted` | `AuthPanel`, `InlineFeedback`, typography primitives | Login, registration, and MFA verification all use the canonical auth shell |
| Applications | `adopted` | `CollectionToolbar`, `StatusChip`, `MetricStrip`, `SurfaceDialog`, `ConfirmDialog`, `SurfaceCard` | Queue, board, and detail routes all consume canonical shared surfaces |
| Leads | `adopted` | `CollectionToolbar` via adapter, `CardShell`, `StatusChip`, `FormDialogShell`, `MetricStrip`, `LoadingState`, `EmptyState` | Lead-specific ranking and extraction behavior remain feature-owned |
| Profile family | `adopted` | `SectionCard`, `SectionHeader`, `SurfaceCard`, `FormDialogShell`, `InlineFeedback`, adapter-backed `EmptyState` | Builder logic and field schemas remain feature-owned |
| Conversations and agent chat | `adopted` | `CollectionToolbar`, `SectionCard`, `SectionHeader`, `StatusChip`, `SurfaceDialog`, `EmptyState`, `LoadingState` | Message workflow remains feature-owned |
| Agents | `adopted` | `CardShell`, `StatusChip`, `ConfirmDialog`, `FormDialogShell`, shared typography | `kind` mapping and orchestration remain feature-owned |
| Dashboard | `adopted` | `MetricStrip`, `StatusChip`, `SurfaceCard`, shared typography and status helpers | Dashboard business logic remains feature-owned |
| Documents / editor | `adopted` | `SurfaceCard`, `SurfaceDialog`, `StatusChip`, shared typography | Editing, compare, and share workflows remain feature-owned |
| Workflows / admin | `adopted` | `MetricStrip`, `SurfaceDialog`, `ConfirmDialog`, `StatusChip`, shared typography | Pipelines and crawlers retain workflow-specific behavior |
| Network / discovery | `adopted` | `SurfaceCard`, `StatusChip`, `EmptyState`, shared typography | Companies, directory, and connections use canonical shared shell imports |
| Settings | `adopted` | `SurfaceCard`, `SurfaceDialog`, `StatusChip`, `InlineFeedback` | Billing, account, discoverability, and graduation flows keep local logic |

## Explicitly Deferred Or Missing Shared Pieces

These are not part of the shipped catalog today:

- Shared `ErrorState`
- Shared domain abstractions such as `LeadModal`, profile-builder orchestration, or applications-board semantics
- Shared service-layer helpers or generated API contracts inside the design-system layer

## Catalog Rules

- The canonical catalog lives under `frontend/src/design-system/*`, not under `component/common/*` or `component/auth/*`.
- Baldin-Library in Figma can expand ahead of this catalog; only code-backed shared surfaces belong here.
- Do not add a new catalog entry unless it is already implemented in `frontend/src/design-system/*`, domain-neutral, and already justified by multiple route families or app-shell behavior.
- When a compatibility wrapper survives, document the wrapper and the backing primitive together so contributors know which file is canonical.
