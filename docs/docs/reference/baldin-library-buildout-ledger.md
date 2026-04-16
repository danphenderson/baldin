---
title: Baldin Library Buildout Ledger
description: Figma-first working ledger for Baldin-Library surfaces that are ahead of, or intentionally outside, the repo-backed mapping catalog.
---

<!-- last-verified: 2026-04-16 -->

# Baldin Library Buildout Ledger

> Closed-state notice: redesign-phase work should now start from [Baldin Redesign Handoff](./baldin-redesign-handoff.md). This page remains provenance for reusable-library studies and closeout-era library decisions.

Use this ledger for Figma-first work that is ahead of the repo-backed `frontend/src/design-system/*` catalog, or intentionally remains outside `src/design-system/**/*.figma.ts` for the current slice.

Use [Baldin App Screens Inventory](./baldin-app-screens-inventory.md) for product-flow, screen-state, auth-only, or superuser-only inventory work in `Baldin-App-Screens`. Keep this ledger limited to `Baldin-Library` studies and reusable-surface exploration.

Historical route-evidence notes below preserve the `2026-04-13` screenshot/capture provenance for the library buildout slice. Later live app-screen captures in `Baldin-App-Screens` supersede those notes for product-flow truth, especially admin, auth, extractor, and marketing screens.

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
| `SecondaryNavBar` | `study-built` | https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library?node-id=226-12 | MCP screenshot captured from page node `226:12` on `2026-04-13` | `/applications`, `/applications/board`, `/leads`, `/leads/companies`, `/workflows`, `/workflows/extractors`; the earlier `/workflows/db-management` capture deferral is historical because shipped privileged admin evidence now belongs in `Baldin-App-Screens` under `/admin/*` live captures | `frontend/src/component/common/secondary-nav-bar.tsx`, `frontend/src/route/navigation.ts`, `frontend/src/layout/app-layout.tsx` | Keep it out of the code-backed catalog and `src/design-system/**/*.figma.ts`. The page is a Figma-first shell study with a separate narrow-viewport workflows overflow reconstruction based on repo truth. |

Legacy `/workflows/db-management` evidence should be treated as browser-handoff history, not the canonical privileged screen. Current admin evidence for DB management, review queue, and crawlers is tracked in [Baldin App Screens Inventory](./baldin-app-screens-inventory.md) through the dedicated `/admin/*` live captures; this ledger keeps only the reusable shell/nav study.

`ReadonlyField` is being advanced here as a narrow code-backed completion pass even though it currently has one visible repo consumer. This slice does not reprioritize it above broader unmapped shared surfaces.

## Current State

The current shipped shared-surface mapping set is complete. Future follow-on work should only add new `frontend/src/design-system/*` mapping files when additional shared primitives or patterns are promoted into the repo-backed catalog.

`Baldin-Library` foundations now document the active token groups directly in the file. The live library includes `Baldin Colors`, `Baldin Numbers`, `Baldin Typography`, and `Baldin Elevation`, with the `Foundations` page summarizing the collections alongside the existing text and effect styles.

`StatusChip` now reflects the shipped shared contract in the live library: `Tone` supports `Neutral`, `Primary`, `Secondary`, `Success`, `Warning`, `Danger`, and `Info`, and `Variant` supports `Soft`, `Outline`, and `Solid` while preserving the existing canonical node URL in the repo mapping catalog.

`CardShell` was promoted from a single COMPONENT (`7:2`) to a COMPONENT_SET (`291:35`) with 12 variants on `Tone` (6) × `Density` (2). The code contract also exposes a `surface` prop (`base` | `raised` | `inset`) and an `interactive` boolean, but the Figma component set does not include a Surface variant axis. The `.figma.ts` mapping intentionally hardcodes `surface="raised"` (the code default) and maps `interactive` as a boolean rather than leaving the gap undocumented. Future Figma work may promote `Surface` to a variant axis, at which point the mapping should be updated to use `instance.getEnum`.

The repo-backed Figma metadata set currently includes 16 `.figma.ts` mappings through `frontend/figma.config.json`. Code Connect publish/read remains optional local metadata and future-proofing, not a blocking delivery dependency.

`SecondaryNavBar` remains `library-only for now` in this slice. Product-flow coverage for `/applications`, `/applications/board`, `/leads`, `/workflows`, `/admin/*`, and related shell stories belongs in [Baldin App Screens Inventory](./baldin-app-screens-inventory.md) until a closeout promotion review proves otherwise.

The closeout promotion decision is now frozen: `Promotion candidate` remains empty, no `.figma.ts` expansion is required, and Code Connect work remains optional future-proofing rather than redesign-phase scope.

## Brand Foundation — Career Control Plane

A new `Brand — Career Control Plane` page was added to `Baldin-Library` on `2026-04-14` to define the Figma-first marketing brand direction. This is a library-level brand foundation, not a code-backed design-system surface.

### Brand Direction Summary

| Attribute | Value | Token alias |
| --- | --- | --- |
| Direction name | Career Control Plane | — |
| Primary tagline | "Run your job search like a system." | — |
| Core message | Private, intelligent, under-your-control job-search workspace | — |
| Deep Slate | `#07111D` | `background/default` (dark) |
| Raised Navy | `#132235` | `surface/raised` (dark) |
| Cyan | `#06B6D4` | `brand/primary` (dark) |
| Cobalt | `#5B7CFA` | `brand/secondary` (dark) |
| Mist | `#E7EEF8` | `text/primary` (dark) |
| Slate Gray | `#93A5BD` | `text/secondary` (dark) |
| Display font | Space Grotesk Bold | `fontFamilies.display` |
| Body font | Source Sans 3 Regular | `fontFamilies.body` |
| Technical font | JetBrains Mono Regular | `fontFamilies.mono` |

All palette values map 1:1 to existing `Baldin Colors` variable collection entries. No new tokens were created.

### Library Page Contents

| Section | Library node | Description |
| --- | --- | --- |
| Brand Foundation Header | [node 321:3](https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh?node-id=321-3) | Page header with direction name and core message |
| Marketing Palette | [node 321:7](https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh?node-id=321-7) | Six-swatch palette with hex, token alias, and role annotations |
| Typography Treatment | [node 322:2](https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh?node-id=322-2) | Display (Space Grotesk), body (Source Sans 3), and technical (JetBrains Mono) type samples |
| Hero Treatment | [node 323:3](https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh?node-id=323-3) | Marketing hero with tagline, eyebrow, subline, gradient CTAs, and system glow accent |
| Product Surface Cards | [node 324:2](https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh?node-id=324-2) | Four feature cards: Applications Pipeline, Lead Extraction, Document Workspace, Agent Workflows |
| Workflow Pipeline Motif | [node 324:29](https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh?node-id=324-29) | Five-stage pipeline node strip: Discover → Extract → Rank → Apply → Track |
| Tagline Lockup | [node 325:2](https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh?node-id=325-2) | Wordmark + primary tagline + supporting line + technical slug |
| Implementation Notes | [node 325:8](https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh?node-id=325-8) | Annotations explaining library-level vs app-screen vs frontend follow-up scope |

### Visual Language Rules

- Product UI crops, structured grids, node links, workflow panels, application pipeline cards, document workspace panels, subtle system glow.
- Gradient CTA buttons: `#06B6D4` → `#5B7CFA` (matches the existing `MuiButton` `brand` variant in the theme).
- Avoid: stock-photo people, handshake imagery, recruiter clichés, generic SaaS gradients, "AI magic" vapor.
- Do not port Tailwind token names, `cva` contracts, shadcn wrapper APIs, or Make scaffolding into this brand direction.

### Handoff

This brand foundation is Figma-only and library-level. The composed marketing landing page frames that consume this foundation live in [Baldin App Screens Inventory](./baldin-app-screens-inventory.md) under the `Marketing · Landing` section. The React landing page now exists in the frontend, and the current route-backed marketing evidence lives in `Baldin-App-Screens`; future library work should stay limited to reusable brand/surface exploration.
