---
title: Baldin App Screens Inventory
description: Figma-first working ledger for Baldin-App-Screens surfaces, capture waves, and evidence provenance.
---

<!-- last-verified: 2026-04-14 -->

# Baldin App Screens Inventory

Use this inventory for Figma sprint work that is about product-flow coverage, screen states, access-conditioned UI, or ahead-of-code evidence gathering in [Baldin-App-Screens](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy/Baldin-App-Screens).

Use [Baldin Library Buildout Ledger](./baldin-library-buildout-ledger.md) only for reusable component or shell studies that remain in [Baldin-Library](https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library). Do not duplicate library-only studies here unless they are being reviewed as part of a concrete app-screen story.

## Sprint Defaults

- Every sprint item belongs to exactly one lane before design work starts.
- The active lane for this slice is `App-screen inventory`.
- `Library buildout` stays limited to already-known library-only studies such as `SecondaryNavBar`.
- `Promotion candidate` starts empty and is reviewed only at closeout.
- Evidence order stays fixed: existing harness URL, direct shipped-route review, MCP screenshot or structure inspection, then an explicit blocked note when capture is prevented by tooling or access.
- Do not expand the harness in this sprint. When a state is not already harness-backed, capture it by direct review and log the reproducibility gap instead of opening a code workstream.

## Execution Snapshot

- `2026-04-14`: local stack and `figma-wave1` harness were live on `http://127.0.0.1:5173`.
- Wave 1 harness review was executed with live browser checks plus targeted Playwright smoke coverage.
- The targeted Wave 1 smoke suite currently validates `/applications`, `leads`, `apply`, and a subset of aspiration states. `Aspirations` remains partial coverage rather than full matrix automation.
- Wave 2 and Wave 3 were executed as repo-truth review passes with delegated lane reports and reviewer integration in this sprint artifact.
- `2026-04-14`: the `Applications board` Wave 2 matrix was ported into `Baldin-App-Screens` with current Figma coverage for loading, empty board, active lanes, terminal lanes, overdue reminders, move menu, and delete confirm.
- `2026-04-14`: the remaining Wave 2 inventory set was ported into `Baldin-App-Screens` with current Figma coverage for `Application detail`, `Conversation detail`, and `Profile MFA states`.
- `2026-04-14`: the remaining non-blocked Wave 3 inventory set was ported into `Baldin-App-Screens` with current Figma coverage for `Login states`, `Login MFA challenge states`, `Register states`, and `Extractor workflow states`.
- `2026-04-14`: the dedicated Admin SPA landed at `/admin/*`. The legacy `/workflows/db-management`, `/workflows/review`, and `/workflows/crawlers` routes now act as browser handoff entries into the admin app rather than canonical privileged screens.
- `2026-04-14`: admin login and access-denied states were added to the active app-screen inventory from repo-truth review. The login flow reuses the shipped auth shell, while the access-denied state remains feature-owned inside the dedicated admin app, so this pass still does not open a new shared-surface migration lane.
- `2026-04-14`: a live superuser browser session was attached to the dedicated Admin SPA, and the canonical privileged-route baselines were captured into `Baldin-App-Screens` at [node 184:4929](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=184-4929), [node 192:4929](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=192-4929), and [node 201:4929](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=201-4929) for `DB management workflow`, `Review queue workflow`, and `Crawlers workflow`.
- Privileged workflow routes remain in scope, and this pass now anchors them with live superuser capture rather than leaving them tooling blocked.

## Wave 1: Mandatory Harness-Backed Inventory

| Surface | Route/state | Lane | Evidence source | Figma target | Status | Handoff bucket | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Applications queue baseline` | `/applications` via `screen=applications` | `App-screen inventory` | Existing harness URL in `figma-wave1.tsx`; targeted Playwright smoke for the queue baseline; live browser review on `2026-04-14` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Queue baseline is verified. Board and detail states remain separate Wave 2 inventory. |
| `Profile baseline` | `/me` via `screen=profile` | `App-screen inventory` | Existing harness URL in `figma-wave1.tsx`; live browser review on `2026-04-14`; repo tie-back through `ProfilePage.tsx` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Baseline profile shell is live in the harness. MFA-specific states remain separate Wave 2 inventory. |
| `Messages baseline` | `/network/messages` via `screen=messages` | `App-screen inventory` | Existing harness URL in `figma-wave1.tsx`; live browser review on `2026-04-14`; repo tie-back through `conversations-page.tsx` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Conversation-list baseline is live in the harness. Conversation detail remains Wave 2 inventory. |
| `Aspirations roles matrix` | `/me/aspirations/roles`: `empty`, `seeded`, `loading`, `suggested`, `no-signal`, `rate-limited` | `App-screen inventory` | Harness state definitions in `figma-flagship-capture.tsx`; targeted Playwright smoke covers `empty`, `seeded`, and `suggested`; repo review confirms the full accepted state list | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Matrix remains partially automated. `loading`, `no-signal`, and `rate-limited` are still direct-review states, not fully smoke-backed. |
| `Aspirations companies matrix` | `/me/aspirations/companies`: `empty`, `seeded`, `loading`, `suggested`, `no-signal`, `rate-limited` | `App-screen inventory` | Harness state definitions in `figma-flagship-capture.tsx`; targeted Playwright smoke now covers `no-signal` and `rate-limited`; live browser review confirmed `no-signal` copy on `2026-04-14` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Matrix remains partially automated. `empty`, `seeded`, `loading`, and `suggested` are still direct-review states, not fully smoke-backed. |
| `Leads matrix` | `/leads`: `unranked`, `ranked`, `disabled`, `error` | `App-screen inventory` | Existing harness URL plus targeted Playwright smoke coverage for all four states on `2026-04-14` | `Baldin-App-Screens` | `verified` | `screen-inventory only` | This is the strongest current harness-backed state set and remains the Wave 1 evidence anchor. |
| `Apply matrix` | `/apply`: `ready`, `already-applied` | `App-screen inventory` | Existing harness URL plus targeted Playwright smoke coverage for both states on `2026-04-14` | `Baldin-App-Screens` | `verified` | `screen-inventory only` | Ranked-lead to application handoff baseline is verified. |

## Wave 2: Adjacent Shipped-Flow Direct Review

| Surface | Route/state | Lane | Evidence source | Figma target | Status | Handoff bucket | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Applications board` | `/applications/board` | `App-screen inventory` | Direct shipped-route review from `app-routes.tsx` and `applications-board-page.tsx` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Current Figma coverage is now present for loading, empty board, active lanes, terminal lanes, overdue reminders, move menu, and delete confirm. No harness expansion in this sprint. |
| `Application detail` | `/applications/:applicationId` | `App-screen inventory` | Direct shipped-route review from `app-routes.tsx` and `applications-detail-page.tsx` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Current Figma coverage is now present for open, closed, loading, error, action-item dialog, and delete confirm states. No harness expansion in this sprint. |
| `Conversation detail` | `/network/messages/:conversationId` | `App-screen inventory` | Direct shipped-route review from `app-routes.tsx` and `conversation-detail-page.tsx` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Current Figma coverage is now present for direct thread, group thread with participants, empty thread, loading, error, edit message, and delete confirm states. Read-state behavior remains route logic, not a separate rendered frame. |
| `Profile MFA states` | `/me`: disabled baseline, recovery notice, setup QR and verify, enabled baseline, disable-confirmation dialog | `App-screen inventory` | Direct shipped-route review from `ProfilePage.tsx` and `mfa-setup-card.tsx`; Wave 1 harness tie-back exists only for the parent `/me` shell | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Current Figma coverage is now present for disabled, recovery notice dialog, setup verify, enabled, disable confirm, and loading states. These remain valid app-screen inventory without MFA harness backing, so the reproducibility gap stays documented rather than opening harness work. |

## Wave 3: Privileged, Admin, Or Harder-Access Direct Review

| Surface | Route/state | Lane | Evidence source | Figma target | Status | Handoff bucket | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Admin login states` | `/admin/login`: baseline, resolving authenticated session, and redirect when a superuser is already signed in | `App-screen inventory` | Direct shipped-route review from `admin-routes.tsx`, `login.tsx`, and `frontend/test/admin/admin-routes.test.tsx` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Repo-truth review confirms the admin-specific auth-shell baseline, the full-screen resolving spinner while an authenticated user is still loading, and the direct superuser redirect to `/admin/db-management`. Keep it in the app-screen lane before any shared-surface promotion work. |
| `Admin access denied state` | `/admin/db-management` or `/admin/review` with an authenticated non-superuser session | `App-screen inventory` | Direct shipped-route review from `admin-routes.tsx`, `admin-layout.tsx`, and `frontend/test/admin/admin-routes.test.tsx` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | This is explicit superuser access-state inventory, not a new shared primitive candidate. The state clears the unauthorized admin session, shows the dedicated access-denied copy, and offers both `Sign in again` and `Open product app` exits. |
| `Extractor workflow` | `/workflows/extractors` | `App-screen inventory` | Direct shipped-route review from `app-routes.tsx` and `extractor.tsx`; existing `ReadonlyField` library evidence can support structure review | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Current Figma coverage is now present for loading, selected detail, create extractor dialog, run extractor dialog, run result, create example dialog, and version history expanded states. This remains an authenticated-user workflow and was ported through repo-truth review plus Figma validation rather than harness expansion. |
| `DB management workflow` | `/admin/db-management` with legacy `/workflows/db-management` browser handoff | `App-screen inventory` | Live superuser browser capture on `2026-04-14` plus direct shipped-route review from `app-routes.tsx`, `admin-routes.tsx`, `admin-layout.tsx`, `db-management.tsx`, and backend superuser routing | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | The dedicated Admin SPA is the canonical privileged route, and the legacy `/workflows/db-management` entry is only a browser handoff into it. Live capture now anchors the canonical DB-management baseline at [node 184:4929](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=184-4929); repo-truth review continues to carry the broader loading, warning, preview, and confirm-dialog matrix without reopening harness work. |
| `Review queue workflow` | `/admin/review` with legacy `/workflows/review` browser handoff | `App-screen inventory` | Live superuser browser capture on `2026-04-14` plus direct shipped-route review from `app-routes.tsx`, `admin-routes.tsx`, `admin-layout.tsx`, `review-queue.tsx`, and backend superuser routing | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | The dedicated Admin SPA is the canonical privileged route, and the legacy `/workflows/review` entry is only a browser handoff into it. Live capture now anchors the current empty-queue baseline at [node 192:4929](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=192-4929); repo-truth review still carries the loading, populated queue, expanded detail row, batch toolbar, and snackbar matrix as route evidence. |
| `Crawlers workflow` | `/admin/crawlers` with legacy `/workflows/crawlers` browser handoff | `App-screen inventory` | Live superuser browser capture on `2026-04-14` plus direct shipped-route review from `app-routes.tsx`, `admin-routes.tsx`, `admin-layout.tsx`, `crawlers.tsx`, and backend superuser routing | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | The dedicated Admin SPA is the canonical privileged route, and the legacy `/workflows/crawlers` entry is only a browser handoff into it. Live capture now anchors the populated pipeline baseline at [node 201:4929](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=201-4929); repo-truth review still carries the loading skeleton, expanded run history, dialogs, and failed or paused run controls inline in run history. |
| `Login baseline` | `/login` | `App-screen inventory` | Direct shipped-route review from `app-routes.tsx` and `login.tsx` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Current Figma coverage is now present for baseline, error, and loading states. The baseline auth shell remains separate from the MFA challenge. |
| `Register baseline` | `/register` | `App-screen inventory` | Direct shipped-route review from `app-routes.tsx` and `register.tsx` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Current Figma coverage is now present for baseline, password rules, validation error, and loading states. These remain auth-specific inventory, not promotion candidates. |
| `Login MFA challenge` | `/login` when `mfa_required` | `App-screen inventory` | Direct shipped-route review from `login.tsx`, `service/auth.tsx`, and the auth/MFA backend contract | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Current Figma coverage is now present for challenge, error, and loading states. The separate MFA verification step remains distinct from the baseline login form per the auth contract. |

## Library-Only Companion Work

`SecondaryNavBar` stays in `Baldin-Library` and remains tracked in [Baldin Library Buildout Ledger](./baldin-library-buildout-ledger.md). It is not part of this app-screen inventory unless a specific product-flow capture requires a targeted shell state study.

## Promotion Review

`Promotion candidate` starts empty for this sprint.

Only review promotion at closeout. A surface can move into `Promotion candidate` only if all of these are true:

- The surface is domain-neutral.
- The semantics are stable.
- The surface is reusable beyond one route family or shell surface.
- The API can be expressed with neutral props or slots.
- The design is justified by shipped repo consumers rather than invented future API.

If a surface clears that bar, create a separate follow-on repo-promotion item. Do not expand this sprint into code sync, new `.figma.ts` mappings, or shared-system implementation.

Current closeout result for this pass:

- `Promotion candidate` remains empty.
- `Admin login states` stay `screen-inventory only` because they reuse `AuthPanel`, `InlineFeedback`, and existing auth-shell primitives rather than proving a new shared abstraction.
- `Admin access denied`, `AdminLayout`, and the remaining privileged admin workflows stay feature-owned because their semantics are bound to superuser authorization and are only proven inside the dedicated Admin SPA.
- The privileged admin workflows stay `screen-inventory only` after live superuser capture; none of them cleared the policy bar for repo promotion in this pass.

## Handoff Buckets

Use exactly one closeout bucket per item:

- `ready for repo promotion`
- `library-only for now`
- `screen-inventory only`
- `tooling blocked but design-valid`

`tooling blocked but design-valid` is valid only when repo truth or direct review makes the design intent clear and the remaining gap is purely tooling, auth, or seat access.

## Reviewer Notes

- The current routed/harness split is coherent. `/applications`, `/me`, `/network/messages`, `/leads`, and `/apply` align between `app-routes.tsx` and `figma-wave1.tsx`.
- The harness accepts `state=loading` for aspiration screens, but [local-development.md](../engineering/local-development.md) had omitted that state before this sprint execution pass.
- The Wave 1 targeted Playwright suite exposed one stale expectation in the aspirations companies `no-signal` copy. The actual harness copy is now treated as the source of truth for this sprint review, and the verification baseline was updated in the same pass.
- The dedicated Admin SPA is now the canonical privileged screen surface. `/workflows/db-management`, `/workflows/review`, and `/workflows/crawlers` remain product-app handoff entries only.
- The app route tests already lock the three legacy admin workflow entries into browser handoffs even when the viewer is logged out, so they should not be inventoried as first-class product-app screens.
- This pass revalidated the privileged admin state matrices from repo truth and attached a live superuser browser session, so the three privileged admin routes now have anchored Figma coverage rather than remaining `tooling blocked but design-valid`.
- No current Wave 2 or Wave 3 surface, including the admin SPA states reviewed in this pass, cleared the current policy bar for `Promotion candidate`.

## Next Owners

| Owner | Immediate responsibility | Exit condition |
| --- | --- | --- |
| `baldin_frontend` | Port the reviewed product flows into `Baldin-App-Screens`, starting with all Wave 1 surfaces, then Wave 2 direct-review surfaces, then the admin login and access states, then the non-blocked Wave 3 auth and extractor surfaces. | Every `screen-inventory only` item, including the admin SPA entry states, has current Figma coverage with evidence tied back to this ledger. |
| `baldin_full_stack_architect` | Review completed Figma surfaces against [Design System Catalog](./design-system-catalog.md) and [Design System Governance](../engineering/design-system-governance.md), then decide which surfaces stay feature-owned and which become closeout promotion candidates. | The closeout list cleanly separates `ready for repo promotion`, `library-only for now`, `screen-inventory only`, and `tooling blocked but design-valid`. |
| `baldin_frontend` | Build or refine `Baldin-Library` only from promoted shared surfaces with clear cross-route evidence. | Every promoted Figma surface has a neutral component contract, stable semantics, and more than one shipped consumer. |
| `baldin_frontend` | Integrate promoted design-system surfaces into `frontend/src/design-system/*` as React TypeScript code, then migrate the relevant route families onto those shared primitives or patterns. | The promoted surfaces ship in code with docs, tests, and route adoption updates. |

## Next Steps

1. Finish the Figma port of the Baldin prototype by capturing every reviewed `screen-inventory only` item in `Baldin-App-Screens`.
   Start with the verified Wave 1 harness-backed states, then complete Wave 2 direct-review states, then port the admin login and access-denied states, then finish the non-blocked Wave 3 auth and extractor states.

2. Run a Figma-only shared-surface review after the app-screen port is current.
   Compare repeated structures across `applications`, `messages`, `profile`, `auth`, and admin or workflow screens. Move a surface toward `Baldin-Library` only if it is domain-neutral, stable, and justified by multiple shipped consumers.

3. Build out the production-grade Figma design system from proven shared surfaces, not from speculative abstractions.
   Expand `Baldin-Library` around tokens, primitives, and patterns that are already evidenced by the ported app screens. Keep `SecondaryNavBar` and similar shell studies library-only until promotion review proves otherwise.

4. Run a UX polish pass after the Figma port and the initial library buildout are coherent.
   Focus on consistency, hierarchy, empty/loading/error behavior, auth friction, message and application detail clarity, and privileged admin workflow usability. Treat polish as a Figma-first pass before code integration.

5. Integrate the promoted design system into the repo as React TypeScript code.
   Implement only the surfaces that passed promotion review in `frontend/src/design-system/*`, update the catalog and governance docs in the same PR, add the smallest useful tests, then migrate the consuming route families.

6. Keep the final code integration gated by real consumption proof.
   Do not add new `.figma.ts` mappings or shared React abstractions until the Figma surface is validated in `Baldin-App-Screens`, promoted through `Baldin-Library`, and justified by shipped repo consumers.
