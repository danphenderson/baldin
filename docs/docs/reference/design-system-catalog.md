---
sidebar_position: 2
slug: /reference/design-system-catalog
title: Design System Catalog
description: Canonical inventory of Baldin's shipped frontend design-system implementation, its compatibility shims, current adopters, and any optional mapping back to archived Figma references.
---

<!-- last-verified: 2026-04-17 -->

# Design System Catalog

This catalog describes the shared frontend UI surface that ships in the repo today. `frontend/src/design-system/*` is the canonical inventory of the implemented code layer, not the exhaustive inventory of archived Figma libraries. Legacy wrappers are documented only so contributors know what still exists and what has already been removed.

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

For the primitive and pattern inventory tables below, `Current known consumers` is an exhaustive runtime import contract for `frontend/src/**`; paths are listed relative to `frontend/src`, and tests plus `.figma.ts` mapping files are excluded.

### Fields

| Primitive | Path | Canonical role | Current known consumers |
| --- | --- | --- | --- |
| `SearchField` | `frontend/src/design-system/primitives/fields/text-field.tsx` | Shared `TextField` wrapper for search affordances | `layout/command-palette-dialog.tsx` |
| `ReadonlyField` | `frontend/src/design-system/primitives/fields/text-field.tsx` | Shared read-only `TextField` presentation wrapper | `component/extractor-modal.tsx` |

### Typography

| Primitive | Path | Canonical role | Current known consumers |
| --- | --- | --- | --- |
| `PageTitle` | `frontend/src/design-system/primitives/typography/text.tsx` | Shared page-title typography role | `page/applications/applications-detail-page.tsx`<br />`page/documents/document-detail.tsx`<br />`page/profile/components/ProfileHero.tsx`<br />`page/user-profile.tsx` |
| `SectionTitle` | `frontend/src/design-system/primitives/typography/text.tsx` | Shared section-title typography role | No current in-repo runtime consumers under `frontend/src`. |
| `CardTitle` | `frontend/src/design-system/primitives/typography/text.tsx` | Shared card-title typography role | `browser-harness/figma-flagship-capture.tsx`<br />`component/agent-card.tsx`<br />`component/aspiration-card.tsx`<br />`component/suggestion-review-panel.tsx` |
| `Label` | `frontend/src/design-system/primitives/typography/text.tsx` | Shared label typography role | No current in-repo runtime consumers under `frontend/src`. |
| `Caption` | `frontend/src/design-system/primitives/typography/text.tsx` | Shared caption typography role | `browser-harness/figma-flagship-capture.tsx`<br />`component/agent-card.tsx`<br />`component/aspiration-card.tsx`<br />`component/suggestion-review-panel.tsx`<br />`page/agent-detail.tsx` |
| `Overline` | `frontend/src/design-system/primitives/typography/text.tsx` | Shared overline typography role | No current in-repo runtime consumers under `frontend/src`. |
| `Mono` | `frontend/src/design-system/primitives/typography/text.tsx` | Shared monospace typography role | No current in-repo runtime consumers under `frontend/src`. |

### Feedback

| Primitive | Path | Canonical role | Current known consumers |
| --- | --- | --- | --- |
| `EmptyState` | `frontend/src/design-system/primitives/feedback/empty-state.tsx` | Neutral empty-state shell with `primaryAction`, legacy `action`, `layout`, and `compact` options | `component/aspirations-collection.tsx`<br />`page/agent-chat-shell.tsx`<br />`page/agent-detail.tsx`<br />`page/agents.tsx`<br />`page/applications/applications-board-page.tsx`<br />`page/applications/applications-queue-page.tsx`<br />`page/companies.tsx`<br />`page/connections.tsx`<br />`page/crawlers.tsx`<br />`page/dashboard.tsx`<br />`page/db-management.tsx`<br />`page/directory.tsx`<br />`page/documents/document-list.tsx`<br />`page/leads.tsx`<br />`page/messages/conversations-page.tsx`<br />`page/profile/components/EmptyState.tsx`<br />`page/review-queue.tsx` |
| `InlineFeedback` | `frontend/src/design-system/primitives/feedback/inline-feedback.tsx` | Persistent inline feedback block with shared tone and close behavior | `browser-harness/figma-flagship-capture.tsx`<br />`component/agent-surface/agent-task-composer.tsx`<br />`component/common/json-modal.tsx`<br />`component/suggestion-review-panel.tsx`<br />`page/applications/applications-board-page.tsx`<br />`page/applications/applications-queue-page.tsx`<br />`page/dashboard.tsx`<br />`page/documents/document-list.tsx`<br />`page/login.tsx`<br />`page/profile/ProfilePage.tsx`<br />`page/register.tsx` |
| `LoadingState` | `frontend/src/design-system/primitives/feedback/loading-state.tsx` | Shared list, grid, and section loading skeletons | `page/applications/applications-board-page.tsx`<br />`page/applications/applications-queue-page.tsx`<br />`page/dashboard.tsx`<br />`page/documents/document-list.tsx`<br />`page/leads.tsx`<br />`page/messages/conversations-page.tsx`<br />`page/profile/ProfilePage.tsx` |

### Surfaces

| Primitive | Path | Canonical role | Current known consumers |
| --- | --- | --- | --- |
| `CardShell` | `frontend/src/design-system/primitives/surfaces/card-shell.tsx` | Shared static or interactive card frame with token-backed padding, motion, and focus handling | `browser-harness/figma-flagship-capture.tsx`<br />`component/agent-card.tsx`<br />`component/aspiration-card.tsx`<br />`component/lead-card.tsx`<br />`component/suggestion-review-panel.tsx`<br />`design-system/patterns/auth/auth-panel.tsx`<br />`design-system/patterns/metrics/metric-strip.tsx`<br />`design-system/patterns/sections/section-card.tsx`<br />`page/applications/applications-board-page.tsx`<br />`page/applications/applications-queue-page.tsx`<br />`page/dashboard.tsx`<br />`page/documents/document-list.tsx` |
| `SurfaceCard` | `frontend/src/design-system/primitives/surfaces/surface-card.tsx` | Canonical wrapper for feature-owned card shells that still need MUI card semantics | `component/lead-extraction-bar.tsx`<br />`component/lead-modal.tsx`<br />`component/mfa-setup-card.tsx`<br />`component/tier-gate.tsx`<br />`page/companies.tsx`<br />`page/connections.tsx`<br />`page/crawlers.tsx`<br />`page/db-management.tsx`<br />`page/directory.tsx`<br />`page/messages/conversation-detail-page.tsx`<br />`page/messages/conversations-page.tsx`<br />`page/pipelines.tsx`<br />`page/profile/components/DocumentsSummary.tsx`<br />`page/profile/components/ProfileBuilderPanel.tsx`<br />`page/profile/components/ProfileHero.tsx`<br />`page/settings/account-page.tsx`<br />`page/settings/discoverability-page.tsx`<br />`page/settings/graduation-page.tsx`<br />`page/settings/subscription-page.tsx`<br />`page/user-profile.tsx` |
| `SurfaceCardContent` | `frontend/src/design-system/primitives/surfaces/surface-card.tsx` | Canonical content wrapper paired with `SurfaceCard` | `component/lead-extraction-bar.tsx`<br />`component/lead-modal.tsx`<br />`component/mfa-setup-card.tsx`<br />`component/tier-gate.tsx`<br />`page/companies.tsx`<br />`page/connections.tsx`<br />`page/crawlers.tsx`<br />`page/db-management.tsx`<br />`page/directory.tsx`<br />`page/messages/conversation-detail-page.tsx`<br />`page/messages/conversations-page.tsx`<br />`page/pipelines.tsx`<br />`page/profile/components/DocumentsSummary.tsx`<br />`page/profile/components/ProfileBuilderPanel.tsx`<br />`page/profile/components/ProfileHero.tsx`<br />`page/settings/account-page.tsx`<br />`page/settings/discoverability-page.tsx`<br />`page/settings/graduation-page.tsx`<br />`page/settings/subscription-page.tsx`<br />`page/user-profile.tsx` |
| `SurfaceDialog` | `frontend/src/design-system/primitives/surfaces/surface-dialog.tsx` | Canonical dialog wrapper for feature-owned shells that still need MUI dialog semantics | `component/certificate-modal.tsx`<br />`component/contacts-modal.tsx`<br />`component/cover-letters-modal.tsx`<br />`component/create-action-item-dialog.tsx`<br />`component/education-modal.tsx`<br />`component/experiences-modal.tsx`<br />`component/extractor-modal.tsx`<br />`component/lead-modal.tsx`<br />`component/mfa-setup-card.tsx`<br />`component/new-conversation-dialog.tsx`<br />`component/profile-import-modal.tsx`<br />`component/resumes-modal.tsx`<br />`component/share-document-dialog.tsx`<br />`component/skills-modal.tsx`<br />`component/upload-document-dialog.tsx`<br />`layout/command-palette-dialog.tsx`<br />`page/applications/applications-detail-page.tsx`<br />`page/companies.tsx`<br />`page/crawlers.tsx`<br />`page/documents/document-detail.tsx`<br />`page/documents/document-list.tsx`<br />`page/messages/conversation-detail-page.tsx`<br />`page/pipelines.tsx`<br />`page/settings/account-page.tsx`<br />`page/settings/graduation-page.tsx`<br />`page/settings/subscription-page.tsx` |
| `SurfaceDialogTitle` | `frontend/src/design-system/primitives/surfaces/surface-dialog.tsx` | Canonical title wrapper paired with `SurfaceDialog` | `component/certificate-modal.tsx`<br />`component/contacts-modal.tsx`<br />`component/cover-letters-modal.tsx`<br />`component/create-action-item-dialog.tsx`<br />`component/education-modal.tsx`<br />`component/experiences-modal.tsx`<br />`component/extractor-modal.tsx`<br />`component/mfa-setup-card.tsx`<br />`component/new-conversation-dialog.tsx`<br />`component/profile-import-modal.tsx`<br />`component/resumes-modal.tsx`<br />`component/share-document-dialog.tsx`<br />`component/skills-modal.tsx`<br />`component/upload-document-dialog.tsx`<br />`page/applications/applications-detail-page.tsx`<br />`page/companies.tsx`<br />`page/crawlers.tsx`<br />`page/documents/document-detail.tsx`<br />`page/documents/document-list.tsx`<br />`page/messages/conversation-detail-page.tsx`<br />`page/pipelines.tsx`<br />`page/settings/account-page.tsx`<br />`page/settings/graduation-page.tsx`<br />`page/settings/subscription-page.tsx` |
| `SurfaceDialogContent` | `frontend/src/design-system/primitives/surfaces/surface-dialog.tsx` | Canonical content wrapper paired with `SurfaceDialog` | `component/certificate-modal.tsx`<br />`component/contacts-modal.tsx`<br />`component/cover-letters-modal.tsx`<br />`component/create-action-item-dialog.tsx`<br />`component/education-modal.tsx`<br />`component/experiences-modal.tsx`<br />`component/extractor-modal.tsx`<br />`component/lead-modal.tsx`<br />`component/mfa-setup-card.tsx`<br />`component/new-conversation-dialog.tsx`<br />`component/profile-import-modal.tsx`<br />`component/resumes-modal.tsx`<br />`component/share-document-dialog.tsx`<br />`component/skills-modal.tsx`<br />`component/upload-document-dialog.tsx`<br />`layout/command-palette-dialog.tsx`<br />`page/applications/applications-detail-page.tsx`<br />`page/companies.tsx`<br />`page/crawlers.tsx`<br />`page/documents/document-detail.tsx`<br />`page/documents/document-list.tsx`<br />`page/messages/conversation-detail-page.tsx`<br />`page/pipelines.tsx`<br />`page/settings/account-page.tsx`<br />`page/settings/graduation-page.tsx`<br />`page/settings/subscription-page.tsx` |
| `SurfaceDialogActions` | `frontend/src/design-system/primitives/surfaces/surface-dialog.tsx` | Canonical actions wrapper paired with `SurfaceDialog` | `component/certificate-modal.tsx`<br />`component/contacts-modal.tsx`<br />`component/cover-letters-modal.tsx`<br />`component/create-action-item-dialog.tsx`<br />`component/education-modal.tsx`<br />`component/experiences-modal.tsx`<br />`component/extractor-modal.tsx`<br />`component/mfa-setup-card.tsx`<br />`component/new-conversation-dialog.tsx`<br />`component/profile-import-modal.tsx`<br />`component/resumes-modal.tsx`<br />`component/skills-modal.tsx`<br />`component/upload-document-dialog.tsx`<br />`page/applications/applications-detail-page.tsx`<br />`page/companies.tsx`<br />`page/crawlers.tsx`<br />`page/documents/document-detail.tsx`<br />`page/documents/document-list.tsx`<br />`page/messages/conversation-detail-page.tsx`<br />`page/pipelines.tsx`<br />`page/settings/account-page.tsx`<br />`page/settings/graduation-page.tsx`<br />`page/settings/subscription-page.tsx` |
| `ConfirmDialog` | `frontend/src/design-system/primitives/surfaces/confirm-dialog.tsx` | Canonical shared confirm surface for lightweight destructive or informational confirmations | `component/aspirations-collection.tsx`<br />`component/lead-modal.tsx`<br />`page/agent-detail.tsx`<br />`page/agents.tsx`<br />`page/applications/applications-board-page.tsx`<br />`page/applications/applications-queue-page.tsx`<br />`page/crawlers.tsx`<br />`page/db-management.tsx`<br />`page/leads.tsx` |
| `FormDialogShell` | `frontend/src/design-system/primitives/surfaces/form-dialog-shell.tsx` | Shared dialog chrome for form, create, edit, and delete flows | `component/agent-form-dialog.tsx`<br />`component/aspiration-form-dialog.tsx`<br />`component/lead-form-dialog.tsx`<br />`component/workflow-form-dialog.tsx`<br />`design-system/primitives/surfaces/confirm-dialog.tsx`<br />`page/profile/components/DeleteDialog.tsx`<br />`page/profile/components/EditDialog.tsx` |
| `SectionHeader` | `frontend/src/design-system/primitives/surfaces/section-header.tsx` | Shared section header with icon, count, supporting text, divider, and action slot | `page/dashboard.tsx`<br />`page/messages/conversations-page.tsx`<br />`page/profile/components/ProfileSection.tsx` |
| `SituationHeader` | `frontend/src/design-system/primitives/surfaces/situation-header.tsx` | Shared collection or detail situation framing with title, context, action, and footer slots | `component/aspirations-collection.tsx` |

### Status

| Primitive | Path | Canonical role | Current known consumers |
| --- | --- | --- | --- |
| `StatusChip` | `frontend/src/design-system/primitives/status/status-chip.tsx` | Token-backed chip wrapper over MUI `Chip`, including compatibility mapping for `color` and `variant` | `browser-harness/figma-flagship-capture.tsx`<br />`component/agent-card.tsx`<br />`component/agent-chat/chat-composer.tsx`<br />`component/agent-chat/chat-message-bubble.tsx`<br />`component/agent-chat/chat-session-header.tsx`<br />`component/agent-chat/system-message-panel.tsx`<br />`component/agent-surface/agent-task-composer.tsx`<br />`component/cell-doc/node-views/agent-task-node-view.tsx`<br />`component/cell-doc/node-views/embed-block-node-view.tsx`<br />`component/cell-doc/node-views/mention-block-node-view.tsx`<br />`component/connection-status-banner.tsx`<br />`component/create-action-item-dialog.tsx`<br />`component/lead-card.tsx`<br />`component/lead-form-dialog.tsx`<br />`component/lead-modal.tsx`<br />`component/profile-import-modal.tsx`<br />`component/suggestion-review-panel.tsx`<br />`design-system/primitives/surfaces/section-header.tsx`<br />`layout/app-layout.tsx`<br />`page/agent-detail.tsx`<br />`page/applications/applications-board-page.tsx`<br />`page/applications/applications-detail-page.tsx`<br />`page/applications/applications-queue-page.tsx`<br />`page/companies.tsx`<br />`page/connections.tsx`<br />`page/crawlers.tsx`<br />`page/dashboard.tsx`<br />`page/db-management.tsx`<br />`page/directory.tsx`<br />`page/documents/document-compare.tsx`<br />`page/documents/document-detail.tsx`<br />`page/documents/document-editor.tsx`<br />`page/documents/document-list.tsx`<br />`page/extractor.tsx`<br />`page/messages/conversation-detail-page.tsx`<br />`page/pipelines.tsx`<br />`page/profile/ProfilePage.tsx`<br />`page/profile/components/ProfileHero.tsx`<br />`page/review-queue.tsx`<br />`page/settings/account-page.tsx`<br />`page/settings/discoverability-page.tsx`<br />`page/settings/graduation-page.tsx`<br />`page/settings/subscription-page.tsx`<br />`page/user-profile.tsx` |
| `getStatusChipSx` | `frontend/src/design-system/primitives/status/helpers.ts` | Shared `sx` helper for `StatusChip` visual variants | `design-system/primitives/status/status-chip.tsx` |
| `getStatusMetaSx` | `frontend/src/design-system/primitives/status/helpers.ts` | Shared metadata styling helper using the status token map | `component/agent-card.tsx`<br />`component/lead-card.tsx` |

## Pattern Inventory

| Pattern | Path | Canonical role | Current known consumers |
| --- | --- | --- | --- |
| `CollectionToolbar` | `frontend/src/design-system/patterns/collections/collection-toolbar.tsx` | Slot-based collection header with `search`, `controls`, `actions`, and `secondary` regions | `component/lead-search-bar.tsx`<br />`page/applications/applications-queue-page.tsx`<br />`page/documents/document-list.tsx`<br />`page/messages/conversations-page.tsx` |
| `MetricStrip` | `frontend/src/design-system/patterns/metrics/metric-strip.tsx` | Read-only stat row with `inline` and `card` variants plus optional start alignment and divider suppression | `browser-harness/figma-flagship-capture.tsx`<br />`component/aspirations-collection.tsx`<br />`page/applications/applications-board-page.tsx`<br />`page/applications/applications-queue-page.tsx`<br />`page/crawlers.tsx`<br />`page/dashboard.tsx`<br />`page/db-management.tsx`<br />`page/leads.tsx`<br />`page/pipelines.tsx` |
| `SectionCard` | `frontend/src/design-system/patterns/sections/section-card.tsx` | Thin `CardShell` composition for section layouts with shared header framing | `page/dashboard.tsx`<br />`page/profile/components/ProfileSection.tsx` |
| `AuthPanel` | `frontend/src/design-system/patterns/auth/auth-panel.tsx` | Shared centered auth shell with icon, title, description, content, and footer slots | `page/login.tsx`<br />`page/register.tsx` |

## Patterns & Conventions

Cross-page conventions that govern how primitives and patterns are chosen. New pages must follow these; legacy pages should migrate when touched.

### Page Heading Convention

| Level | Mechanism | When to use |
| --- | --- | --- |
| App-bar title | `usePageToolbarHeader()` from `toolbar-header-context.ts` | Top-level collection pages (applications queue, board, leads, messages, settings). No in-content heading. |
| In-content heading | `PageTitle` | Detail and landing pages (application detail, dashboard). |
| Sub-section heading | `SectionHeader` | Subsections within a page (e.g., conversations list sub-heading below toolbar header). |

These three treatments are not interchangeable. Pick the correct level for new pages.

### Error & Notification Feedback

| Situation | Use | Source |
| --- | --- | --- |
| Transient action feedback (save succeeded, delete confirmed) | `useNotification()` | `@/context/notification-context` |
| Persistent inline feedback (validation errors, API failures, info banners) | `InlineFeedback` | `@/design-system` |
| Raw MUI `<Alert>` | **Legacy.** Migrate to `InlineFeedback` when the file is touched. | ~80+ usages remain across ~15 pages. |

### Dialog Convention

| Surface | Role |
| --- | --- |
| `SurfaceDialog` (+ `SurfaceDialogTitle`, `SurfaceDialogContent`, `SurfaceDialogActions`) | Canonical dialog shell for all new dialogs. |
| `FormDialogShell` | Canonical form-specific dialog wrapper. |
| `ConfirmDialog` | Canonical destructive-action confirmation dialog. |
| Raw MUI `<Dialog>` | **Legacy.** Migrate to `SurfaceDialog` when the file is touched. ~10 pages remain. |

## Figma Mapping Inventory

These files are optional repo-local metadata. They are useful when a shared surface still benefits from a linked historical design reference, but they are not part of the active delivery gate.

This table is intentionally code-backed rather than exhaustive. Archived Figma libraries can contain more material than these entries, but they do not lead new shared-surface promotion. Promotion decisions should be made from current code, targeted tests, and design-system governance.

Mapped surfaces can keep a colocated `.figma.ts` file when the historical node link still adds value. The metadata stays repo-local and is not part of the active frontend validation lane.

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
| `CardShell` | `frontend/src/design-system/primitives/surfaces/CardShell.figma.ts` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=291-35 |
| `SurfaceCard` | `frontend/src/design-system/primitives/surfaces/SurfaceCard.figma.ts` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=42-35 |
| `ConfirmDialog` | `frontend/src/design-system/primitives/surfaces/ConfirmDialog.figma.ts` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=46-135 |
| `FormDialogShell` | `frontend/src/design-system/primitives/surfaces/FormDialogShell.figma.ts` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=8-24 |
| `SituationHeader` | `frontend/src/design-system/primitives/surfaces/SituationHeader.figma.ts` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=366-87 |
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

Every route family in the table below uses one of these states:

| State | Meaning | Entry criteria | Exit criteria |
| --- | --- | --- | --- |
| `adopted` | All shared-eligible surfaces consume the design-system layer. Remaining wrappers are thin and documented. | PR merged with shared-layer imports, wrapper inventory updated, and docs updated in the same change. | N/A |
| `adopting` | Active migration in progress. Some surfaces already consume the shared layer; others still use local or legacy implementations. | At least one page or component in the family imports from `frontend/src/design-system`. | All shared-eligible surfaces migrated → `adopted`. |
| `not-started` | The family has not begun consuming the shared layer beyond the token and theme foundation. | Default state. | First shared-layer import merged → `adopting`. |

### Route-Family Adoption Table

| Route family | State | Shared pieces in use | Notes |
| --- | --- | --- | --- |
| Auth | `adopted` | `AuthPanel`, `InlineFeedback`, typography primitives | Login, registration, and MFA verification all use the canonical auth shell |
| Applications | `adopted` | `CollectionToolbar`, `StatusChip`, `MetricStrip`, `SurfaceDialog`, `ConfirmDialog`, `SurfaceCard` | Queue, board, and detail routes all consume canonical shared surfaces |
| Leads | `adopted` | `CollectionToolbar` via adapter, `CardShell`, `StatusChip`, `FormDialogShell`, `MetricStrip`, `LoadingState`, `EmptyState` | Lead-specific ranking and extraction behavior remain feature-owned |
| Profile family | `adopted` | `SituationHeader`, `MetricStrip`, `SectionCard`, `SectionHeader`, `SurfaceCard`, `FormDialogShell`, `InlineFeedback`, adapter-backed `EmptyState` | Builder logic, field schemas, and aspiration item rendering remain feature-owned |
| Conversations and agent chat | `adopted` | `CollectionToolbar`, `SectionCard`, `SectionHeader`, `StatusChip`, `SurfaceDialog`, `EmptyState`, `LoadingState` | Message workflow remains feature-owned |
| Agents | `adopted` | `CardShell`, `StatusChip`, `ConfirmDialog`, `FormDialogShell`, shared typography | `kind` mapping and orchestration remain feature-owned |
| Dashboard | `adopted` | `MetricStrip`, `StatusChip`, `SurfaceCard`, shared typography and status helpers | Dashboard business logic remains feature-owned |
| Documents / editor | `adopted` | `CollectionToolbar`, `SurfaceCard`, `SurfaceDialog`, `StatusChip`, shared typography | Editing, compare, and share workflows remain feature-owned |
| Workflows / admin | `adopted` | `MetricStrip`, `SurfaceDialog`, `ConfirmDialog`, `StatusChip`, shared typography | Pipelines remain in the product app. Privileged DB management, review queue, and crawler routes now hand off to the dedicated Admin SPA while still reusing canonical shared surfaces. |
| Network / discovery | `adopted` | `SurfaceCard`, `StatusChip`, `EmptyState`, shared typography | Companies, directory, and connections use canonical shared shell imports |
| Settings | `adopted` | `SurfaceCard`, `SurfaceDialog`, `StatusChip`, `InlineFeedback` | Billing, account, discoverability, and graduation flows keep local logic |

## Explicitly Deferred Or Missing Shared Pieces

These are not part of the shipped catalog today:

- Shared `ErrorState`
- Shared domain abstractions such as `LeadModal`, profile-builder orchestration, or applications-board semantics
- Shared service-layer helpers or generated API contracts inside the design-system layer

## Catalog Rules

- The canonical catalog lives under `frontend/src/design-system/*`, not under `component/common/*` or `component/auth/*`.
- Archived Figma libraries may preserve broader historical inventory than this catalog, but only code-backed shared surfaces belong here.
- Do not add a new catalog entry unless it is already implemented in `frontend/src/design-system/*`, domain-neutral, and already justified by multiple route families or app-shell behavior.
- When a compatibility wrapper survives, document the wrapper and the backing primitive together so contributors know which file is canonical.
