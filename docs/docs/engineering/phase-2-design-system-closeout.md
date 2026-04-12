---
slug: /engineering/phase-2-design-system-closeout
title: Close Out Phase 2 Design System
description: Implementation closeout for the Phase 2 frontend design-system primitives, patterns, adopters, compatibility wrappers, and deferred work.
---

<!-- last-verified: 2026-04-12 -->

# Close Out Phase 2 Design System

This note captures the implementation that actually shipped in the Baldin frontend worktree, not the pre-implementation proposal. Phase 2 added a small shared UI layer on top of the Phase 1 theme and token foundation and migrated the approved pilot surfaces onto it.

## Final Primitive Inventory

| Primitive | Path | Role |
| --- | --- | --- |
| `InlineFeedback` | `frontend/src/design-system/primitives/feedback/inline-feedback.tsx` | Token-backed inline alerts for page, section, and dialog feedback |
| `EmptyState` | `frontend/src/design-system/primitives/feedback/empty-state.tsx` | Centered empty-state shell for page and section layouts |
| `LoadingState` | `frontend/src/design-system/primitives/feedback/loading-state.tsx` | Generic list, grid, and section skeleton envelopes |
| `CardShell` | `frontend/src/design-system/primitives/surfaces/card-shell.tsx` | Domain-neutral interactive or static card container |
| `SectionHeader` | `frontend/src/design-system/primitives/surfaces/section-header.tsx` | Shared section header chrome with icon, count, supporting text, and action slots |
| `FormDialogShell` | `frontend/src/design-system/primitives/surfaces/form-dialog-shell.tsx` | Shared dialog frame for confirm, create, edit, and delete flows |
| `StatusChip` | `frontend/src/design-system/primitives/status/status-chip.tsx` | Thin status chip presentation wrapper |
| Status helpers | `frontend/src/design-system/primitives/status/helpers.ts` | Shared color-resolution and status/meta styling helpers |

## Final Pattern Inventory

| Pattern | Path | Role |
| --- | --- | --- |
| `CollectionToolbar` | `frontend/src/design-system/patterns/collections/collection-toolbar.tsx` | Slot-based search, controls, actions, and secondary-row toolbar shell |
| `SectionCard` | `frontend/src/design-system/patterns/sections/section-card.tsx` | `CardShell` plus header composition for domain-neutral sections |

## Pilot Adopters

- Leads family:
  [frontend/src/page/leads.tsx](/Users/doe/.codex/worktrees/0023/baldin/frontend/src/page/leads.tsx),
  [frontend/src/component/lead-card.tsx](/Users/doe/.codex/worktrees/0023/baldin/frontend/src/component/lead-card.tsx),
  [frontend/src/component/lead-form-dialog.tsx](/Users/doe/.codex/worktrees/0023/baldin/frontend/src/component/lead-form-dialog.tsx),
  [frontend/src/component/lead-search-bar.tsx](/Users/doe/.codex/worktrees/0023/baldin/frontend/src/component/lead-search-bar.tsx)
- Applications queue:
  [frontend/src/page/applications/applications-queue-page.tsx](/Users/doe/.codex/worktrees/0023/baldin/frontend/src/page/applications/applications-queue-page.tsx)
- Profile family:
  [frontend/src/page/profile/ProfilePage.tsx](/Users/doe/.codex/worktrees/0023/baldin/frontend/src/page/profile/ProfilePage.tsx),
  [frontend/src/page/profile/components/ProfileSection.tsx](/Users/doe/.codex/worktrees/0023/baldin/frontend/src/page/profile/components/ProfileSection.tsx),
  [frontend/src/page/profile/components/EditDialog.tsx](/Users/doe/.codex/worktrees/0023/baldin/frontend/src/page/profile/components/EditDialog.tsx),
  [frontend/src/page/profile/components/DeleteDialog.tsx](/Users/doe/.codex/worktrees/0023/baldin/frontend/src/page/profile/components/DeleteDialog.tsx),
  [frontend/src/page/profile/components/EmptyState.tsx](/Users/doe/.codex/worktrees/0023/baldin/frontend/src/page/profile/components/EmptyState.tsx)

## Proving Adopters

- Conversations page:
  [frontend/src/page/messages/conversations-page.tsx](/Users/doe/.codex/worktrees/0023/baldin/frontend/src/page/messages/conversations-page.tsx)
- Agent surfaces:
  [frontend/src/component/agent-card.tsx](/Users/doe/.codex/worktrees/0023/baldin/frontend/src/component/agent-card.tsx),
  [frontend/src/component/agent-form-dialog.tsx](/Users/doe/.codex/worktrees/0023/baldin/frontend/src/component/agent-form-dialog.tsx)

## Compatibility Surface Now Backed By Phase 2 Primitives

- [frontend/src/component/common/empty-state.tsx](/Users/doe/.codex/worktrees/0023/baldin/frontend/src/component/common/empty-state.tsx) now delegates to design-system `EmptyState`.
- [frontend/src/component/common/confirm-dialog.tsx](/Users/doe/.codex/worktrees/0023/baldin/frontend/src/component/common/confirm-dialog.tsx) now delegates to `FormDialogShell`.
- [frontend/src/component/common/alert.tsx](/Users/doe/.codex/worktrees/0023/baldin/frontend/src/component/common/alert.tsx) now delegates to `InlineFeedback`.
- [frontend/src/component/common/error-message.tsx](/Users/doe/.codex/worktrees/0023/baldin/frontend/src/component/common/error-message.tsx) now delegates to `InlineFeedback`.

These remain compatibility wrappers, not new shared-source homes. New shared UI should not be added under `frontend/src/component/common/*`.

## What Remains Feature-Owned

- Service integration, route-specific types, product copy, and workflow logic stay in page or feature modules.
- Leads still own `LeadExtractionBar`, `LeadModal`, application-creation logic, and lead-specific CTA/status presentation.
- Applications queue still owns stage semantics, filter chip behavior, row-card layout, next-step behavior, and the local summary strip.
- Profile still owns `ProfileHero`, `ProfileBuilderPanel`, `DocumentsSummary`, `MFASetupCard`, `SECTION_FIELDS`, and section-specific record rendering.
- Conversations still own row layout, participant display, and navigation behavior.
- Agents still own `kind` mapping and enable/disable behavior.

## Notable Deviations From The Approved Plan

- Some pilot pages now consume the Phase 2 layer indirectly through thin compatibility wrappers instead of importing the primitive directly. This is intentional where it reduced migration risk.
- `CollectionToolbar` landed through [frontend/src/component/lead-search-bar.tsx](/Users/doe/.codex/worktrees/0023/baldin/frontend/src/component/lead-search-bar.tsx) for the leads family instead of being assembled inline in the page.
- The compatibility wrappers are thin adapters, not pure re-export files, because they still translate legacy prop shapes like `action` to `primaryAction`.
- The status/meta shared layer stayed intentionally thin. Phase 2 shipped `StatusChip` plus styling helpers, not a broader meta-row or status-domain abstraction.

## Deferred To Later Phases

- No standalone `ErrorState`.
- No shared `MetricStrip`.
- No applications board extraction.
- No `LeadModal` systemization.
- No auth, dashboard, documents, crawler, or editor-wide migration to the Phase 2 layer.
- No repo-wide replacement of direct MUI `Alert`, `Chip`, or card usage outside the approved pilot and proving adopters.
- No reopening of the Phase 1 foundation, theme entrypoints, or compatibility shims in `frontend/src/theme/*`.

## Guidance For Future Contributors

- Put new domain-neutral feedback, surface, and status UI under `frontend/src/design-system/primitives/*`.
- Put new slot-based structural composition under `frontend/src/design-system/patterns/*`.
- Keep feature-specific behavior, data shaping, copy, and workflow control in the feature folder even when it renders inside a shared primitive.
- If an existing legacy wrapper must survive for compatibility, keep it thin and back it with a Phase 2 primitive instead of adding new shared logic there.
- Use `theme.palette.*`, `theme.baldin.*`, `spacingTokens`, and `toSpacingPx(...)` inside new shared UI. Do not introduce raw colors, fonts, or spacing assumptions in the shared layer.
- If a proposed shared component needs entity-specific props beyond slots and shell options, stop and leave it feature-owned until a later phase proves a cleaner abstraction.
