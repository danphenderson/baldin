---
title: Baldin App Screens Inventory
description: Figma-first working ledger for Baldin-App-Screens surfaces, capture waves, and evidence provenance.
---

<!-- last-verified: 2026-04-15 -->

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
- `2026-04-14`: the remaining non-blocked Wave 3 inventory set was ported into `Baldin-App-Screens`, but the auth and extractor state matrices later proved incomplete: `Login · Error · dark` and `Extractor Workflow · Create Extractor Dialog · dark` are blank captures, and the other rows are bitmap-only evidence rather than editable canonical screen layers.
- `2026-04-14`: the dedicated Admin SPA landed at `/admin/*`. The legacy `/workflows/db-management`, `/workflows/review`, and `/workflows/crawlers` routes now act as browser handoff entries into the admin app rather than canonical privileged screens.
- `2026-04-14`: admin login and access-denied states were added to the active app-screen inventory from repo-truth review. The login flow reuses the shipped auth shell, while the access-denied state remains feature-owned inside the dedicated admin app, so this pass still does not open a new shared-surface migration lane.
- `2026-04-14`: a live superuser browser session was attached to the dedicated Admin SPA, and the canonical privileged-route baselines were captured into `Baldin-App-Screens` at [node 184:4929](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=184-4929), [node 192:4929](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=192-4929), and [node 201:4929](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=201-4929) for `DB management workflow`, `Review queue workflow`, and `Crawlers workflow`.
- Privileged workflow routes remain in scope, and this pass now anchors them with live superuser capture rather than leaving them tooling blocked.
- `2026-04-14`: Figma-first cleanup pass on Wave 2 and Wave 3 pages. Wave 2 was already clean (12 canonical frames, no duplicates). Wave 3 had 3 duplicate auth frames (Login · Baseline at 231:1167, Login · MFA Challenge at 231:1185, Register · Baseline at 231:1202) that were exact copies of the canonical 229:xxxx versions. The duplicates were renamed with a `[Retired]` prefix and moved to a new `Retired Screens` page. No canonical frames were deleted or modified.
- `2026-04-15`: S8 (Redesign leads ranking presentation for aspiration fit) design target created on the `Flagship Flow Screens` page at [node 257:6090](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=257-6090). Two design changes use existing Baldin Library components: CardShell tone shift (primary → warning) for ranked cards and a ranking context strip that groups score + alignment text (D3).
- `2026-04-15`: `Flagship Flow Screens` was cleaned back to the flagship aspirations → ranked leads → apply-handoff story. The incomplete auth and extractor matrices were moved to `Wave 3 · Auth & Workflow Screens` and renamed with `[Needs Recapture]` prefixes: [Login states 131:6090](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=131-6090), [Login MFA challenge states 131:6098](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=131-6098), [Register states 131:6106](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=131-6106), and [Extractor workflow states 131:6116](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=131-6116).
- `2026-04-14`: the `Marketing · Landing` page was created with three composed marketing frames: Desktop Landing Hero at [node 297:1168](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=297-1168), Mobile Landing Hero at [node 298:1167](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=298-1167), and Full Landing Page Composition at [node 299:1167](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=299-1167). These consume the brand foundation from Baldin-Library's `Brand — Career Control Plane` page.

## S8: Ranking Redesign Target

Story 8 redesigns the leads ranking presentation to surface aspiration-alignment as first-class context on lead cards, per the flagship quarter roadmap. The target state lives on the [Flagship Flow Screens](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=257-6090) page with annotated side-by-side unranked vs ranked card comparison. This page is scoped to the flagship aspirations, leads ranking, and apply handoff story; auth, extractor, admin, and adjacent product workflow inventory belongs on the Wave 2, Wave 3, or Admin inventory pages.

### Gap Analysis

| Acceptance criterion | Current state | Gap | Resolution |
| --- | --- | --- | --- |
| Ranking action is an explicit trigger | `LeadSearchBar` "Rank with aspirations" button + "Clear ranking" | None | Unchanged |
| Ranked state visually distinct from unranked | All cards use `CardShell tone="primary"` | **GAP**: No card-level visual difference | CardShell `tone="warning"` for ranked cards (amber left-border accent) |
| `aspiration_alignment` alongside score as a secondary line (D3) | Score in chip row (`Aspiration fit 9/10`), alignment as separate italic body2 below title | **GAP**: Score and alignment are in different visual zones | Ranking context strip groups both in a single visual unit |
| Score and fit presented coherently | Same as D3 gap — separated | **GAP** | Same as D3 resolution |
| Aspiration gate per D11 | Disabled state + guidance tooltip when no aspirations | None | Unchanged |
| No generic ranking for non-aspirated users | `aspirationCount === 0` check gates ranking | None | Unchanged |
| Component tests | Tests exist for card rendering | Frontend Agent scope | See handoff |

### Design Changes

**Change 1 — CardShell tone shift for ranked cards**

- **From**: `<CardShell tone="primary">` for all leads
- **To**: `<CardShell tone="warning">` for ranked leads, `tone="primary"` for unranked leads
- **Visual effect**: Amber 3px left-border accent (warning at 0.52 alpha) vs cyan left-border (primary at 0.52 alpha)
- **Library anchor**: CardShell COMPONENT_SET at [node 291:35](https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh?node-id=291-35), Warning×Comfortable variant

**Change 2 — Ranking context strip (D3 resolution)**

Replace the separated "Aspiration fit X/10" chip from the top chip row and the italic alignment text from below the title with a single ranking context strip.

**Strip layout** (between title and company/location metadata):

```
┌─ Ranking context strip ─────────────────────────────────────────────┐
│  [★ 9/10]  Strong aspiration fit for leadership-focused product...  │
└─────────────────────────────────────────────────────────────────────┘
```

- **Left**: StatusChip `tone="warning"` `emphasis="solid"` `size="small"` with Stars icon and `label="9/10"` — compact numeric score with star icon
- **Right**: Body2 text, `color="text.secondary"`, italic, line-clamped to 2 lines — the `aspiration_alignment` message
- **Container**: Stack `direction="row"` `spacing=1` `alignItems="flex-start"`, with `backgroundColor: alpha(theme.palette.warning.main, 0.06)`, `borderRadius: theme.baldin.radius.sm`, `px: 1.25, py: 1`
- **Library anchor**: StatusChip COMPONENT_SET at [node 5:34](https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh?node-id=5-34), Warning×Solid×Small variant

**What is removed**:

- The ranking StatusChip (`Aspiration fit X/10`) from the chip row in `lead-card.tsx` (lines ~112-119)
- The ranking message Typography (italic body2 paragraph below the title) in `lead-card.tsx` (lines ~127-139)

**What is unchanged**: Ranking trigger button/clear button, aspiration gate (D11), application handoff section, Following/Active/Joinable chips.

## Wave 1: Mandatory Harness-Backed Inventory

| Surface | Route/state | Lane | Evidence source | Figma target | Status | Handoff bucket | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Applications queue baseline` | `/applications` via `screen=applications` | `App-screen inventory` | Existing harness URL in `figma-wave1.tsx`; targeted Playwright smoke for the queue baseline; live browser review on `2026-04-14` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Queue baseline is verified. Board and detail states remain separate Wave 2 inventory. |
| `Profile baseline` | `/me` via `screen=profile` | `App-screen inventory` | Existing harness URL in `figma-wave1.tsx`; live browser review on `2026-04-14`; repo tie-back through `ProfilePage.tsx` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Baseline profile shell is live in the harness. MFA-specific states remain separate Wave 2 inventory. |
| `Messages baseline` | `/network/messages` via `screen=messages` | `App-screen inventory` | Existing harness URL in `figma-wave1.tsx`; live browser review on `2026-04-14`; repo tie-back through `conversations-page.tsx` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Conversation-list baseline is live in the harness. Conversation detail remains Wave 2 inventory. |
| `Aspirations roles matrix` | `/me/aspirations/roles`: `empty`, `seeded`, `loading`, `suggested`, `no-signal`, `rate-limited` | `App-screen inventory` | Harness state definitions in `figma-flagship-capture.tsx`; targeted Playwright smoke covers `empty`, `seeded`, and `suggested`; repo review confirms the full accepted state list | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Matrix remains partially automated. `loading`, `no-signal`, and `rate-limited` are still direct-review states, not fully smoke-backed. |
| `Aspirations companies matrix` | `/me/aspirations/companies`: `empty`, `seeded`, `loading`, `suggested`, `no-signal`, `rate-limited` | `App-screen inventory` | Harness state definitions in `figma-flagship-capture.tsx`; targeted Playwright smoke now covers `no-signal` and `rate-limited`; live browser review confirmed `no-signal` copy on `2026-04-14` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Matrix remains partially automated. `empty`, `seeded`, `loading`, and `suggested` are still direct-review states, not fully smoke-backed. |
| `Leads matrix` | `/leads`: `unranked`, `ranked`, `disabled`, `error` | `App-screen inventory` | Existing harness URL plus targeted Playwright smoke coverage for all four states on `2026-04-14`; S8 redesign target frames at [node 257:6090](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=257-6090) | `Baldin-App-Screens` | `verified` | `screen-inventory only` | Wave 1 evidence anchor. S8 redesign target adds CardShell tone shift and ranking context strip for ranked cards. See [S8: Ranking Redesign Target](#s8-ranking-redesign-target). |
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
| `Extractor workflow` | `/workflows/extractors` | `App-screen inventory` | Direct shipped-route review from `app-routes.tsx` and `extractor.tsx`; existing `ReadonlyField` library evidence can support structure review | `Baldin-App-Screens` | `partial` | `screen-inventory only` | Coverage is incomplete; recapture required. The large state matrix was moved out of `Flagship Flow Screens` to [node 131:6116](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=131-6116) on `Wave 3 · Auth & Workflow Screens` and renamed `[Needs Recapture] Extractor Workflow States`. `Extractor Workflow · Create Extractor Dialog · dark` is a blank rectangle, and remaining rows are bitmap-only captures. Extractors remain a product-app workflow at `/workflows/extractors`; they are not part of the dedicated Admin SPA unless a future route decision moves them. |
| `DB management workflow` | `/admin/db-management` with legacy `/workflows/db-management` browser handoff | `App-screen inventory` | Live superuser browser capture on `2026-04-14` plus direct shipped-route review from `app-routes.tsx`, `admin-routes.tsx`, `admin-layout.tsx`, `db-management.tsx`, and backend superuser routing | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | The dedicated Admin SPA is the canonical privileged route, and the legacy `/workflows/db-management` entry is only a browser handoff into it. Live capture now anchors the canonical DB-management baseline at [node 184:4929](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=184-4929); repo-truth review continues to carry the broader loading, warning, preview, and confirm-dialog matrix without reopening harness work. |
| `Review queue workflow` | `/admin/review` with legacy `/workflows/review` browser handoff | `App-screen inventory` | Live superuser browser capture on `2026-04-14` plus direct shipped-route review from `app-routes.tsx`, `admin-routes.tsx`, `admin-layout.tsx`, `review-queue.tsx`, and backend superuser routing | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | The dedicated Admin SPA is the canonical privileged route, and the legacy `/workflows/review` entry is only a browser handoff into it. Live capture now anchors the current empty-queue baseline at [node 192:4929](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=192-4929); repo-truth review still carries the loading, populated queue, expanded detail row, batch toolbar, and snackbar matrix as route evidence. |
| `Crawlers workflow` | `/admin/crawlers` with legacy `/workflows/crawlers` browser handoff | `App-screen inventory` | Live superuser browser capture on `2026-04-14` plus direct shipped-route review from `app-routes.tsx`, `admin-routes.tsx`, `admin-layout.tsx`, `crawlers.tsx`, and backend superuser routing | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | The dedicated Admin SPA is the canonical privileged route, and the legacy `/workflows/crawlers` entry is only a browser handoff into it. Live capture now anchors the populated pipeline baseline at [node 201:4929](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=201-4929); repo-truth review still carries the loading skeleton, expanded run history, dialogs, and failed or paused run controls inline in run history. |
| `Login baseline` | `/login` | `App-screen inventory` | Direct shipped-route review from `app-routes.tsx` and `login.tsx` | `Baldin-App-Screens` | `partial` | `screen-inventory only` | Coverage is incomplete; recapture required. The large state matrix was moved out of `Flagship Flow Screens` to [node 131:6090](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=131-6090) on `Wave 3 · Auth & Workflow Screens` and renamed `[Needs Recapture] Login States`. `Login · Error · dark` is a blank rectangle, while baseline and loading are bitmap-only captures. The baseline auth shell remains separate from the MFA challenge. |
| `Register baseline` | `/register` | `App-screen inventory` | Direct shipped-route review from `app-routes.tsx` and `register.tsx` | `Baldin-App-Screens` | `partial` | `screen-inventory only` | Coverage is incomplete; recapture required. The large state matrix was moved out of `Flagship Flow Screens` to [node 131:6106](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=131-6106) on `Wave 3 · Auth & Workflow Screens` and renamed `[Needs Recapture] Register States`. Existing rows are bitmap-only captures for baseline, password rules, validation error, and loading. These remain auth-specific inventory, not promotion candidates. |
| `Login MFA challenge` | `/login` when `mfa_required` | `App-screen inventory` | Direct shipped-route review from `login.tsx`, `service/auth.tsx`, and the auth/MFA backend contract | `Baldin-App-Screens` | `partial` | `screen-inventory only` | Coverage is incomplete; recapture required. The large state matrix was moved out of `Flagship Flow Screens` to [node 131:6098](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=131-6098) on `Wave 3 · Auth & Workflow Screens` and renamed `[Needs Recapture] Login MFA Challenge States`. Existing challenge, error, and loading rows are bitmap-only captures. The separate MFA verification step remains distinct from the baseline login form per the auth contract. |

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
- Extractors remain a product-app workflow at `/workflows/extractors`; the dedicated Admin SPA owns DB management, review queue, and crawlers, not extractors.
- The app route tests already lock the three legacy admin workflow entries into browser handoffs even when the viewer is logged out, so they should not be inventoried as first-class product-app screens.
- This pass revalidated the privileged admin state matrices from repo truth and attached a live superuser browser session, so the three privileged admin routes now have anchored Figma coverage rather than remaining `tooling blocked but design-valid`.
- No current Wave 2 or Wave 3 surface, including the admin SPA states reviewed in this pass, cleared the current policy bar for `Promotion candidate`.

## Marketing · Landing

The `Marketing · Landing` page in [Baldin-App-Screens](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=297-1167) contains composed marketing frames that consume the brand foundation defined in `Baldin-Library`'s `Brand — Career Control Plane` page (see [Baldin Library Buildout Ledger — Brand Foundation](./baldin-library-buildout-ledger.md#brand-foundation--career-control-plane)).

### Frames

| Frame | Dimensions | App-Screens node | Description |
| --- | --- | --- | --- |
| Desktop Landing Hero | 1440 × 900 | [node 297:1168](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=297-1168) | Full-width hero with nav bar, eyebrow, headline, subline, gradient CTA pair, glow accent, and 5-item feature strip |
| Mobile Landing Hero | 390 × 844 | [node 298:1167](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=298-1167) | Mobile-responsive hero with hamburger nav, stacked CTAs, and stacked feature cards |
| Full Landing Page Composition | 1440 × 2800 | [node 299:1167](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=299-1167) | Complete one-page marketing composition: hero section, 6-card features grid, pipeline visualization (Discover → Extract → Rank → Apply → Track), local-first privacy section, CTA footer block, and footer bar |

### Token Alignment

All colors map 1:1 to existing `Baldin Colors` variable collection entries — no new tokens were created. Typography uses the canonical font stack: Space Grotesk (display), Source Sans 3 (body), JetBrains Mono (technical eyebrows).

### Handoff

| Owner | Responsibility | Exit condition |
| --- | --- | --- |
| `baldin_frontend` | Implement the marketing landing page in `home-layout.tsx` (or a new `landing-page.tsx` route) using the Figma frames as visual spec | Shipped landing page matches the Figma compositions with responsive breakpoints, uses existing Baldin tokens, and passes `tsc --noEmit` + `npm run build` |
| `baldin_frontend` | Add Storybook stories for any reusable marketing-specific components extracted during implementation | Stories render, `storybook:build` passes |
| `baldin_design_lead` | Post-implementation capture of the shipped landing page back into `Baldin-App-Screens` for evidence alignment | Shipped-route screenshot matches or improves on the Figma spec |

### Implementation Prerequisites

Rebrand drift verification (2026-04-14) confirmed no token, theme, or shared-component changes are needed. The following items should be addressed during the landing page implementation slice:

- **Palette**: All six brand palette values map 1:1 to existing dark-mode color tokens. No new tokens needed.
- **Typography tokens**: All three brand font families (`Space Grotesk`, `Source Sans 3`, `JetBrains Mono`) exist in `fontFamilies`. Space Grotesk and Source Sans 3 are bundled via `@fontsource` in `app-providers.tsx`. **JetBrains Mono is not yet bundled** — add `@fontsource/jetbrains-mono` and import the 400 weight before using technical eyebrow text.
- **Gradient CTA**: Use `MuiButton variant="brand"` which calls `brandGradient()` (primary → secondary endpoints). The Figma hero uses a horizontal (90°) gradient; the repo default is 135°. Adjust the angle at the call site if needed, or use `brandGradient(theme, 90)` directly.
- **Splash color**: `frontend/index.html` uses `#0a0e1a` for body background and `theme-color` meta. The canonical dark canvas token is `#07111d` (`surface.canvas`). Align both values during implementation.
- **Route target**: `home-layout.tsx` is the unauthenticated shell wrapper with `<Outlet />`. Prefer a dedicated `landing-page.tsx` route component rendered inside the outlet rather than inlining the full marketing composition into the layout.
- **No token, theme, or shared-component changes needed** from the rebrand drift verification.

## Next Owners

| Owner | Immediate responsibility | Exit condition |
| --- | --- | --- |
| `baldin_frontend` | Implement S8 ranking redesign in `lead-card.tsx` and `leads.tsx` per the [S8: Ranking Redesign Target](#s8-ranking-redesign-target) spec: (1) CardShell tone shift to `warning` for ranked cards, (2) ranking context strip replacing the separated chip + italic text, and (3) component tests for ranked/unranked states and alignment rendering. | S8 acceptance criteria pass: ranked cards have amber tone, score and alignment text are grouped in a single strip, chip row no longer has "Aspiration fit X/10", and component tests cover ranked/unranked states. |
| `baldin_frontend` | After S8 implementation, update `figma-flagship-capture.tsx` harness to match the new ranking visual treatment so post-implementation captures reflect the redesign. | Harness ranked state renders the new CardShell tone and ranking context strip layout. |
| `baldin_frontend` | Recapture the incomplete Wave 3 auth and extractor matrices on `Wave 3 · Auth & Workflow Screens`, then keep any future flagship-only edits on `Flagship Flow Screens`. | `Login states`, `Login MFA challenge states`, `Register states`, and `Extractor workflow states` have nonblank, review-ready coverage tied back to this ledger. |
| `baldin_full_stack_architect` | Review completed Figma surfaces against [Design System Catalog](./design-system-catalog.md) and [Design System Governance](../engineering/design-system-governance.md), then decide which surfaces stay feature-owned and which become closeout promotion candidates. | The closeout list cleanly separates `ready for repo promotion`, `library-only for now`, `screen-inventory only`, and `tooling blocked but design-valid`. |
| `baldin_frontend` | Build or refine `Baldin-Library` only from promoted shared surfaces with clear cross-route evidence. | Every promoted Figma surface has a neutral component contract, stable semantics, and more than one shipped consumer. |
| `baldin_frontend` | Integrate promoted design-system surfaces into `frontend/src/design-system/*` as React TypeScript code, then migrate the relevant route families onto those shared primitives or patterns. | The promoted surfaces ship in code with docs, tests, and route adoption updates. |

## Next Steps

1. Recapture the incomplete Wave 3 auth and extractor matrices on `Wave 3 · Auth & Workflow Screens`.
   Replace the blank `Login · Error · dark` and `Extractor Workflow · Create Extractor Dialog · dark` rows first, then replace the remaining bitmap-only rows with review-ready captures or editable compositions.

2. Run a Figma-only shared-surface review after the app-screen port is current.
   Compare repeated structures across `applications`, `messages`, `profile`, `auth`, and admin or workflow screens. Move a surface toward `Baldin-Library` only if it is domain-neutral, stable, and justified by multiple shipped consumers.

3. Build out the production-grade Figma design system from proven shared surfaces, not from speculative abstractions.
   Expand `Baldin-Library` around tokens, primitives, and patterns that are already evidenced by the ported app screens. Keep `SecondaryNavBar` and similar shell studies library-only until promotion review proves otherwise.

4. Run a UX polish pass after the Figma port and the initial library buildout are coherent.
   Focus on consistency, hierarchy, empty/loading/error behavior, auth friction, message and application detail clarity, and privileged admin workflow usability. Treat polish as a Figma-first pass before code integration.
   The initial polish findings are now tracked in [Baldin App Screens Polish Ledger](./baldin-app-screens-polish-ledger.md).

5. Integrate the promoted design system into the repo as React TypeScript code.
   Implement only the surfaces that passed promotion review in `frontend/src/design-system/*`, update the catalog and governance docs in the same PR, add the smallest useful tests, then migrate the consuming route families.

6. Keep the final code integration gated by real consumption proof.
   Do not add new `.figma.ts` mappings or shared React abstractions until the Figma surface is validated in `Baldin-App-Screens`, promoted through `Baldin-Library`, and justified by shipped repo consumers.
