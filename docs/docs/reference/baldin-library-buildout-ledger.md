---
title: Baldin Library Buildout Ledger
description: Figma-first working ledger for Baldin-Library surfaces that are ahead of, or intentionally outside, the repo-backed mapping catalog.
---

<!-- last-verified: 2026-04-13 -->

# Baldin Library Buildout Ledger

Use this ledger for Figma-first work that is ahead of the repo-backed `frontend/src/design-system/*` catalog, or intentionally remains outside `src/design-system/**/*.figma.ts` for the current slice.

## Immediate Slice

| Surface | Library node | Screenshot evidence | Route evidence | Repo consumers | Repo mapping |
| --- | --- | --- | --- | --- | --- |
| `AuthPanel` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=49-11 | MCP screenshot captured from page node `37:33` on `2026-04-13` | `/login`, `/register`, and the MFA state inside `/login` | `frontend/src/page/login.tsx`, `frontend/src/page/register.tsx` | `frontend/src/design-system/patterns/auth/AuthPanel.figma.ts` |
| `EmptyState` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=47-65 | MCP screenshot captured from page node `37:23` on `2026-04-13` | `/applications`, `/applications/board` | `frontend/src/page/applications/applications-queue-page.tsx`, `frontend/src/page/applications/applications-board-page.tsx` | `frontend/src/design-system/primitives/feedback/EmptyState.figma.ts` |
| `SurfaceDialog` family | Root: https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=45-33<br />Title: https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=45-4<br />Content: https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=45-20<br />Actions: https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=45-25 | MCP screenshot captured from page node `37:13` on `2026-04-13` | `/applications/:applicationId`, `/settings/account` | `frontend/src/page/applications/applications-detail-page.tsx`, `frontend/src/page/settings/account-page.tsx` | `frontend/src/design-system/primitives/surfaces/SurfaceDialog.figma.ts` |
| `LoadingState` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=202-83 | MCP screenshot captured from page node `202:60` on `2026-04-13` | `/applications`, `/applications/board` | `frontend/src/page/applications/applications-queue-page.tsx`, `frontend/src/page/applications/applications-board-page.tsx` | `frontend/src/design-system/primitives/feedback/LoadingState.figma.ts` |
| `SearchField` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=40-48 | Figma MCP context captured for node `40:48` on `2026-04-13` | App-shell command palette search flow | `frontend/src/layout/command-palette-dialog.tsx` | `frontend/src/design-system/primitives/fields/SearchField.figma.ts` |

## Figma-Only Exploration

| Surface | Status | Route evidence | Repo anchors | Notes |
| --- | --- | --- | --- | --- |
| `SecondaryNavBar` | `exploration-only` | `/applications`, `/applications/board`, `/leads`, `/leads/companies`, `/workflows`, `/workflows/extractors` | `frontend/src/component/common/secondary-nav-bar.tsx`, `frontend/src/route/navigation.ts` | Keep it out of the code-backed catalog and `src/design-system/**/*.figma.ts` in this slice. Add a Baldin-Library node first, then decide whether the shell is stable enough for promotion. |

`/workflows/db-management` remains a valid evidence route only when superuser access is available.

## Follow-On Candidates And Blockers

| Surface | Library status | Repo consumers | Notes |
| --- | --- | --- | --- |
| `ReadonlyField` | No stable Baldin-Library node yet | `frontend/src/component/extractor-modal.tsx` | Keep it out of the code-backed mapping inventory until the library surface exists. |
