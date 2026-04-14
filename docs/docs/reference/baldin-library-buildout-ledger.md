---
title: Baldin Library Buildout Ledger
description: Figma-first working ledger for Baldin-Library surfaces that are ahead of, or intentionally outside, the repo-backed mapping catalog.
---

<!-- last-verified: 2026-04-14 -->

# Baldin Library Buildout Ledger

Use this ledger for Figma-first work that is ahead of the repo-backed `frontend/src/design-system/*` catalog, or intentionally remains outside `src/design-system/**/*.figma.ts` for the current slice.

Use [Baldin App Screens Inventory](./baldin-app-screens-inventory.md) for product-flow, screen-state, auth-only, or superuser-only inventory work in `Baldin-App-Screens`. Keep this ledger limited to `Baldin-Library` studies and reusable-surface exploration.

## Immediate Slice

| Surface | Library node | Screenshot evidence | Route evidence | Repo consumers | Repo mapping |
| --- | --- | --- | --- | --- | --- |
| `AuthPanel` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=49-11 | MCP screenshot captured from page node `37:33` on `2026-04-13` | `/login`, `/register`, and the MFA state inside `/login` | `frontend/src/page/login.tsx`, `frontend/src/page/register.tsx` | `frontend/src/design-system/patterns/auth/AuthPanel.figma.ts` |
| `EmptyState` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=47-65 | MCP screenshot captured from page node `37:23` on `2026-04-13` | `/applications`, `/applications/board` | `frontend/src/page/applications/applications-queue-page.tsx`, `frontend/src/page/applications/applications-board-page.tsx` | `frontend/src/design-system/primitives/feedback/EmptyState.figma.ts` |
| `SurfaceDialog` family | Root: https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=45-33<br />Title: https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=45-4<br />Content: https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=45-20<br />Actions: https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=45-25 | MCP screenshot captured from page node `37:13` on `2026-04-13` | `/applications/:applicationId`, `/settings/account` | `frontend/src/page/applications/applications-detail-page.tsx`, `frontend/src/page/settings/account-page.tsx` | `frontend/src/design-system/primitives/surfaces/SurfaceDialog.figma.ts` |
| `LoadingState` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=202-83 | MCP screenshot captured from page node `202:60` on `2026-04-13` | `/applications`, `/applications/board` | `frontend/src/page/applications/applications-queue-page.tsx`, `frontend/src/page/applications/applications-board-page.tsx` | `frontend/src/design-system/primitives/feedback/LoadingState.figma.ts` |
| `SearchField` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=40-48 | Figma MCP context captured for node `40:48` on `2026-04-13` | App-shell command palette search flow | `frontend/src/layout/command-palette-dialog.tsx` | `frontend/src/design-system/primitives/fields/SearchField.figma.ts` |
| `ReadonlyField` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=218-127 | MCP screenshot captured from page node `218:121` on `2026-04-13` | `/workflows/extractors`; live route capture was attempted but Playwright MCP transport closed during browser startup, so the recipe study was finalized from the repo consumer and app-shell code instead of invented screenshots | `frontend/src/component/extractor-modal.tsx` | `frontend/src/design-system/primitives/fields/ReadonlyField.figma.ts` |
| `SurfaceCard` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=42-35 | MCP screenshot captured from page node `37:8` on `2026-04-13` after aligning the library page to the shipped `SurfaceCard` + `SurfaceCardContent` composition | `/settings/account` and `/network/messages`; live route capture stayed blocked by the Playwright/WebDev `ENOENT` startup issue, so the `spacious + centered` state was finalized from `frontend/src/component/mfa-setup-card.tsx` and shipped consumers instead of invented screenshots | `frontend/src/page/settings/account-page.tsx`, `frontend/src/page/messages/conversations-page.tsx`, `frontend/src/component/mfa-setup-card.tsx` | `frontend/src/design-system/primitives/surfaces/SurfaceCard.figma.ts` |
| `ConfirmDialog` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=46-135 | MCP screenshot captured from page node `37:18` on `2026-04-13` after aligning the family to the shipped confirm surface prop model | Destructive usage was anchored to `/automation/agents` and `/leads` patterns in repo truth because authenticated browser capture stayed blocked by the Playwright/WebDev `ENOENT` issue; non-destructive state came from `frontend/src/page/crawlers.tsx`, and stacked multi-paragraph copy came from `frontend/src/page/db-management.tsx` without blocking on superuser-only capture | `frontend/src/page/agents.tsx`, `frontend/src/page/leads.tsx`, `frontend/src/page/crawlers.tsx`, `frontend/src/page/db-management.tsx`, `frontend/src/page/applications/applications-queue-page.tsx` | `frontend/src/design-system/primitives/surfaces/ConfirmDialog.figma.ts` |

## Figma-Only Exploration

| Surface | Status | Library node | Screenshot evidence | Route evidence | Repo anchors | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `SecondaryNavBar` | `study-built` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=226-12 | MCP screenshot captured from page node `226:12` on `2026-04-13` | `/applications`, `/applications/board`, `/leads`, `/leads/companies`, `/workflows`, `/workflows/extractors`; `/workflows/db-management` was deferred because a superuser live session was not available after browser automation failed to recover from a Playwright MCP transport close | `frontend/src/component/common/secondary-nav-bar.tsx`, `frontend/src/route/navigation.ts`, `frontend/src/layout/app-layout.tsx` | Keep it out of the code-backed catalog and `src/design-system/**/*.figma.ts`. The page is a Figma-first shell study with a separate narrow-viewport workflows overflow reconstruction based on repo truth. |

`/workflows/db-management` remains a valid evidence route only when superuser access is available. When it is being reviewed as part of a sprint capture, track the screen inventory work in [Baldin App Screens Inventory](./baldin-app-screens-inventory.md) and keep this ledger limited to the reusable-shell study itself.

`ReadonlyField` is being advanced here as a narrow code-backed completion pass even though it currently has one visible repo consumer. This slice does not reprioritize it above broader unmapped shared surfaces.

## Current State

The current shipped shared-surface mapping set is complete. Future follow-on work should only add new `frontend/src/design-system/*` mapping files when additional shared primitives or patterns are promoted into the repo-backed catalog.

`SecondaryNavBar` remains `library-only for now` in this slice. Product-flow coverage for `/applications`, `/applications/board`, `/leads`, `/workflows`, and related shell stories belongs in [Baldin App Screens Inventory](./baldin-app-screens-inventory.md) until a closeout promotion review proves otherwise.
