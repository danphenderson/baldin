---
title: Baldin App Screens Inventory
description: Figma-first working ledger for Baldin-App-Screens surfaces, capture waves, and evidence provenance.
---

<!-- last-verified: 2026-04-16 -->

# Baldin App Screens Inventory

> Closed-state notice: redesign-phase work should now start from [Baldin Redesign Handoff](./baldin-redesign-handoff.md). This page remains provenance for how the closeout evidence was assembled and classified.

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
- `2026-04-14`: the remaining Wave 3 inventory set was reviewed from repo truth; the previously cited auth, admin-auth, and extractor refs under `221:1169`, `131:*`, `229:*`, and `232:*` were later confirmed stale during the `2026-04-15` live reconciliation and now remain docs history only.
- `2026-04-14`: the dedicated Admin SPA landed at `/admin/*`. The legacy `/workflows/db-management`, `/workflows/review`, and `/workflows/crawlers` routes now act as browser handoff entries into the admin app rather than canonical privileged screens.
- `2026-04-14`: admin login and access-denied states were added to the active app-screen inventory from repo-truth review. The login flow reuses the shipped auth shell, while the access-denied state remains feature-owned inside the dedicated admin app, so this pass still does not open a new shared-surface migration lane.
- `2026-04-14`: a live superuser browser session was attached to the dedicated Admin SPA, and the canonical privileged-route baselines were captured into `Baldin-App-Screens` at [node 184:4929](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=184-4929), [node 192:4929](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=192-4929), and [node 201:4929](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=201-4929) for `DB management workflow`, `Review queue workflow`, and `Crawlers workflow`.
- Privileged workflow routes remain in scope, and this pass now anchors them with live superuser capture rather than leaving them tooling blocked.
- `2026-04-15`: live fact freeze against `Baldin-App-Screens` confirmed live pages `221:1167`, `221:1168`, `221:1170`, `297:1167`, and `32:1557`; S8 target `257:6090`; legacy admin live captures `184:4929`, `192:4929`, and `201:4929`; reference-only admin frames `234:1167`, `234:1198`, `234:1215`, and `234:1239`; and marketing frames `297:1168`, `298:1167`, and `299:1167`. The prior page/node set `221:1169`, `131:6090`, `131:6098`, `131:6106`, `131:6116`, `229:1167`, `229:1185`, `229:1202`, `232:1167`, `232:1185`, `232:1192`, and `232:1202` does not resolve in the live file and now remains stale docs history only.
- `2026-04-15`: live recapture closed the missing auth, admin-login/access-denied, and extractor evidence gap on [page 353:1167](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=353-1167), with baseline extractor [node 369:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=369-2), login [node 370:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=370-2), register [node 371:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=371-2), login MFA [node 373:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=373-2), admin login [node 374:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=374-2), admin session resolving [node 375:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=375-2), and admin access denied [node 376:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=376-2). Only shipped route-backed states were added in this slice; no reference-only replacement frame was created.
- `2026-04-15`: S8 (Redesign leads ranking presentation for aspiration fit) design target created at [node 257:6090](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=257-6090). Two design changes use existing Baldin Library components: CardShell tone shift (primary → warning) for ranked cards and a ranking context strip that groups score + alignment text (D3).
- `2026-04-15`: admin evidence was split into two documented layers: legacy live captures `184:4929`, `192:4929`, and `201:4929` remain canonical shipped-route evidence, while page `221:1170` is retained only as reference-only composed admin evidence unless later proof reclassifies it.
- `2026-04-15`: the marketing page was reconciled to one canonical full-page composition. Desktop Landing Hero at [node 297:1168](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=297-1168), Mobile Landing Hero at [node 298:1167](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=298-1167), and `Full Landing Page Composition — 1440×2500` at [node 299:1167](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=299-1167) remain canonical marketing evidence.
- `2026-04-15`: page `02 · Flagship Flow · Aspirations to Apply` gained explicit design-owner edge-state evidence at [node 487:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=487-2) for `roles no-signal`, `roles rate-limited`, `apply already-applied`, and `apply failure`, so those branches are no longer implied by matrix copy alone.
- `2026-04-15`: page `03 · Applications · Queue Board Detail` gained explicit design-owner interaction evidence at [node 487:86](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=487-86) for `board drag`, `board drop target`, `detail timeline focus`, and `detail documents focus`. The canonical action-item dialog remains [node 108:4348](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=108-4348).
- `2026-04-15`: page `06 · Workflows & Admin Live Evidence` updated [node 463:26](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=463-26) so the review-queue variant evidence now makes the populated selection toolbar, type-count dropdown, and expanded JSON state explicit alongside the broader operational-state scaffold at [node 463:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=463-2). Existing auth inline-state variants remain explicit at [node 462:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=462-2).
- `2026-04-16`: the live Figma file was restructured into numbered pages: `00 · Index & Evidence Rules`, `01 · Harness Baselines · Product App`, `02 · Flagship Flow · Aspirations to Apply`, `03 · Applications · Queue Board Detail`, `04 · Network & Profile States`, `05 · Auth & Access Live Evidence`, `06 · Workflows & Admin Live Evidence`, `07 · Reference · Admin Studies`, `08 · Marketing · Landing`, and `99 · Archive · Retired & Stale History`. Canonical frame node IDs were preserved by moving frames rather than recreating them. Figma's Plugin API rejected the attempted version-history checkpoint because `saveVersionHistoryAsync` is not supported.
- `2026-04-16`: extractor live evidence [node 369:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=369-2) moved from page `353:1167` to `06 · Workflows & Admin Live Evidence`; auth/access live evidence remains on page `353:1167`, now named `05 · Auth & Access Live Evidence`.
- `2026-04-16`: legacy admin live captures [node 184:4929](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=184-4929), [node 192:4929](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=192-4929), and [node 201:4929](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=201-4929) moved from the former flagship page to `06 · Workflows & Admin Live Evidence` and were renamed as canonical DB management, review queue, and crawlers captures.
- `2026-04-16`: repo reconciliation confirmed the S8 ranking redesign is implemented in `frontend/src/component/lead-card.tsx` and covered by component/page tests. Route-backed evidence was recaptured on `02 · Flagship Flow · Aspirations to Apply` as S8 ranked [node 446:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=446-2) and S8 unranked [node 447:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=447-2), while preserving [node 257:6090](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=257-6090) as design rationale.
- `2026-04-16`: shipped landing route `/` was recaptured on `08 · Marketing · Landing` as desktop viewport [node 448:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=448-2), mobile viewport [node 449:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=449-2), and desktop full-page [node 450:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=450-2). Canonical composed marketing specs [node 297:1168](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=297-1168), [node 298:1167](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=298-1167), and [node 299:1167](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=299-1167) remain in place.
- `2026-04-15`: host-side local recapture against `http://127.0.0.1:4173` closed the remaining URL-driven Wave 1 gaps on `02 · Flagship Flow · Aspirations to Apply`: apply duplicate guard [node 492:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=492-2), role no-signal [node 494:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=494-2), and role rate-limited [node 496:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=496-2). The unsupported harness captures [node 490:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=490-2) and [node 491:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=491-2) are non-canonical troubleshooting artifacts and must not be cited as active evidence.

## Live Evidence Rules

- Live route captures win over hand-built reference frames for shipped UI.
- Composed reference frames may stay only if labeled `Reference`; they do not replace canonical live captures.
- Supporting design-owner variant groups are valid for transient, hover, or section-focus states that the canonical live captures do not show cleanly. They complement live captures; they do not replace them.
- Auth and access evidence lives on page `05 · Auth & Access Live Evidence` ([page 353:1167](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=353-1167)); extractor and privileged admin route evidence lives on page `06 · Workflows & Admin Live Evidence`. The stale `221:1169`, `131:*`, `229:*`, and `232:*` refs remain docs history only and must not be reused.
- Marketing keeps one canonical full-page composition: [node 299:1167](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=299-1167).
- Baldin-Library component work stays separate from Baldin-App-Screens product-flow evidence.
- This cleanup does not open new promotion work, `.figma.ts` mappings, or shared React abstractions.

## Live Evidence Matrix

| Surface | Live page or node | Classification | Canonical rule | Repo action | Optional Figma action |
| --- | --- | --- | --- | --- | --- |
| `00 · Index & Evidence Rules` | Page `34:1167` | `File navigation and policy` | Index text only; not product evidence | Use as the file map and stale-ref guardrail | None |
| `01 · Harness Baselines · Product App` | Page `0:1` with harness-backed baseline frames | `Baseline captured screen` | Canonical live or harness-backed capture | Keep current harness-backed inventory references | None |
| `02 · Flagship Flow · Aspirations to Apply` | Page `221:1167` with Wave 1 frames, S8 target `257:6090`, route captures `446:2` / `447:2`, apply duplicate guard `492:2`, and aspirations-role captures `494:2` / `496:2` | `Canonical composed design + route evidence` | Canonical composed design tied to shipped or harness-backed product evidence | Keep flagship-only aspirations, ranked leads, apply-handoff material, and route evidence here | Ignore troubleshooting artifacts `490:2` and `491:2` |
| `02 · Flagship Flow · Aspirations to Apply` supporting edge-state variants | [node 487:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=487-2) | `Supporting design-owner variant evidence` | Explicitly capture transient or under-documented aspiration/apply states without replacing the flagship matrices or route captures | Keep roles no-signal/rate-limited and apply already-applied/failure evidence here | Refresh if route behavior or copy changes |
| `03 · Applications · Queue Board Detail` | Page `221:1168` with applications board/detail frames | `Canonical composed design` | Canonical composed design tied to shipped route review | Keep application queue, board, detail, and application-dialog states here | None |
| `03 · Applications · Queue Board Detail` supporting interaction variants | [node 487:86](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=487-86) | `Supporting design-owner variant evidence` | Use supporting variants for drag, drop, and section-focus states that are real in code but awkward to show in the canonical long-form frames | Keep board drag/drop and detail timeline/documents focus evidence here | Refresh if interaction semantics or labels change |
| `04 · Network & Profile States` | Page `26:108` with conversation nodes `109:4207`, `109:4401`, `109:4612`, `109:4792`, and `109:4959`, plus reference snapshots `228:1168`, `228:1203`, and `228:1217` | `Canonical composed design + reference support` | Canonical composed design tied to shipped route review; supporting snapshots may clarify hierarchy/loading/empty states but do not replace the live-composed conversation anchors | Keep conversation detail and profile/security states here | None |
| `05 · Auth & Access Live Evidence` | Page `353:1167` with `370:2`, `371:2`, `373:2`, `374:2`, `375:2`, and `376:2` | `Canonical live capture evidence` | Shipped-route live capture beats synthetic composition | Keep auth, MFA, admin login, session resolving, and denied states here | None |
| `05 · Auth & Access Live Evidence` supporting auth variants | [node 462:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=462-2) | `Supporting design-owner variant evidence` | Keep reproducible inline auth variants explicit when the canonical route captures only show the baseline shells | Keep register strength, duplicate-account validation, login inline error, and MFA invalid-code retry evidence here | Refresh if auth validation copy or hierarchy changes |
| `06 · Workflows & Admin Live Evidence` | Page `394:1167` with extractor `369:2` and admin live captures `184:4929`, `192:4929`, and `201:4929` | `Canonical live capture evidence` | Live route captures win over hand-built reference frames for shipped workflow/admin UI | Keep extractor and privileged admin-route live evidence here | None |
| `06 · Workflows & Admin Live Evidence` supporting operational variants | [node 463:5](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=463-5), [node 463:26](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=463-26), [node 463:46](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=463-46), and [node 463:67](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=463-67) | `Supporting design-owner variant evidence` | Supporting variants can capture empty, populated, dialog, snackbar, and guardrail states that the canonical live captures do not hold simultaneously | Keep extractor lifecycle, populated review queue, crawlers empty/expanded/dialog, and DB destructive safeguards explicit here | Refresh if admin flow semantics change |
| `07 · Reference · Admin Studies` | Page `221:1170` with `234:1167`, `234:1198`, `234:1215`, and `234:1239` | `Synthetic reference only` | Composed admin reference frames may stay only if labeled `Reference`; they do not replace canonical live captures | Keep as reference-only admin evidence | None |
| Stale Wave 3 auth/admin/extractor refs | Page `221:1169` and nodes `131:*`, `229:*`, and `232:*` | `Stale docs history only` | Missing evidence must never invent replacement node IDs | Keep only as stale history; never cite as live evidence again | None |
| `08 · Marketing · Landing` | Page `297:1167` with `297:1168`, `298:1167`, `299:1167`, and route captures `448:2`, `449:2`, `450:2` | `Canonical composed marketing evidence + route evidence` | Marketing keeps one canonical full-page composition and adjacent route-backed proof | Keep desktop, mobile, canonical full composition, and shipped-route captures together | None |
| `99 · Archive · Retired & Stale History` | Page `32:1557` | `Retired or archive` | Retired surfaces may stay only as archive evidence | Keep retired, duplicate, hidden, sandbox, and stale-history material here | None |

## Capture Status

`2026-04-15` Figma reconciliation closed the remaining phase blockers that still required explicit state evidence. Canonical live captures remain the source of truth for shipped route baselines; the route-backed recaptures and the new design-owner groups now cover the transient, hover, and section-focus states that those baselines do not show cleanly.

| Surface | Classification | Evidence | Status |
| --- | --- | --- | --- |
| Flagship edge states | `canonical route-backed evidence + annotation-only support` | Page `02 · Flagship Flow · Aspirations to Apply` (`221:1167`) with canonical route captures [node 492:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=492-2), [node 494:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=494-2), and [node 496:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=496-2); annotation-only support at [node 487:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=487-2); reference-only harness study cards `44:1377`, `44:1401`, `44:1237`, and `44:1259`; banned troubleshooting artifacts `490:2` and `491:2` | Closed. The canonical anchors are `492:2`, `494:2`, and `496:2`. `487:2` remains annotation-only for already-applied/transient failure detail, the `44:*` cards remain reference-only study evidence, and `490:2` / `491:2` stay non-canonical. |
| Application detail and board interaction states | `captured + annotation-only by convention` | Page `03 · Applications · Queue Board Detail` (`221:1168`) with supporting group [node 487:86](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=487-86), board drag [node 487:89](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=487-89), board drop-target [node 487:110](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=487-110), canonical action-item dialog [node 108:4348](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=108-4348), and retired tab-history refs `227:1203`, `227:1204`, `227:1235` | Closed for redesign readiness. Board drag/drop is explicit, the application-detail dialog remains canonical at `108:4348`, next-step reminder treatment is annotation-only by convention inside the shipped section-based detail flow, and the old tabbed snapshot is retired non-canonical history only. |
| Conversation detail states | `captured + reference support` | Page `04 · Network & Profile States` (`26:108`) with direct thread [node 109:4207](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=109-4207), group thread + participants [node 109:4401](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=109-4401), empty thread [node 109:4612](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=109-4612), loading [node 109:4792](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=109-4792), error [node 109:4959](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=109-4959), and reference snapshots `228:1168`, `228:1203`, `228:1217` | Closed for redesign readiness. Message hierarchy is explicit at `109:4207`, edit/delete affordances are visible in `109:4207` and `109:4401`, the participant sidebar is explicit at `109:4401`, and the `228:*` frames remain supporting reference snapshots rather than new canonical anchors. |
| Auth and admin operational variants | `supporting design-owner variant evidence` | Page `05 · Auth & Access Live Evidence` at [node 462:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=462-2), plus page `06 · Workflows & Admin Live Evidence` at [node 463:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=463-2) and [node 463:26](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=463-26) | Closed for redesign readiness. Inline auth failures, extractor lifecycle states, review-queue populated/filter/JSON states, crawler operational states, and DB destructive safeguards are now explicit even where live baselines remain single-state captures. |
| S8 ranked leads implementation | `browser-harness evidence captured` | Page `02 · Flagship Flow · Aspirations to Apply` (`221:1167`), target [node 257:6090](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=257-6090), ranked route evidence [node 446:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=446-2), unranked route evidence [node 447:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=447-2), current repo implementation in `lead-card.tsx`, and harness routes `/browser-harness/figma-wave1.html?screen=leads&state=ranked&mode=dark` plus `/browser-harness/figma-wave1.html?screen=leads&state=unranked&mode=dark` | Closed. Keep `257:6090` as the design rationale; use `446:2` and `447:2` as non-collapsed implementation-backed evidence. |
| Marketing landing route `/` | `live route evidence captured` | Page `08 · Marketing · Landing` (`297:1167`) with [node 297:1168](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=297-1168), [node 298:1167](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=298-1167), [node 299:1167](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=299-1167), desktop route evidence [node 448:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=448-2), mobile route evidence [node 449:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=449-2), and desktop full-page route evidence [node 450:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=450-2); shipped route `/` renders `frontend/src/page/landing-page.tsx` via `frontend/src/route/app-routes.tsx` | Closed. Preserve `299:1167` as the composed spec; keep route-backed responsive evidence alongside it. |

## S8: Ranking Redesign Status

Story 8 redesigned the leads ranking presentation to surface aspiration-alignment as first-class context on lead cards, per the flagship quarter roadmap. The target state lives on `02 · Flagship Flow · Aspirations to Apply` at [node 257:6090](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=257-6090), with annotated side-by-side unranked vs ranked card comparison. Repo reconciliation on `2026-04-16` confirmed the code now implements the target: ranked cards use `CardShell tone="warning"` and render score plus `aspiration_alignment` inside `data-testid="lead-card-ranking-strip"`. This page is scoped to the flagship aspirations, leads ranking, and apply handoff story; auth, extractor, admin, and adjacent product workflow inventory belongs on pages `03` through `07` rather than on the flagship page.

### Gap Analysis

| Acceptance criterion | Current state | Gap | Resolution |
| --- | --- | --- | --- |
| Ranking action is an explicit trigger | `LeadSearchBar` "Rank with aspirations" button + "Clear ranking" | None | Unchanged |
| Ranked state visually distinct from unranked | Implemented: ranked cards use `CardShell tone="warning"`; unranked cards use `tone="primary"` | None | Route evidence captured at `446:2` and `447:2` |
| `aspiration_alignment` alongside score as a secondary line (D3) | Implemented: score chip and alignment text are grouped in `lead-card-ranking-strip` | None | Ranked route evidence captured at `446:2` |
| Score and fit presented coherently | Implemented in the same ranking context strip | None | Ranked route evidence captured at `446:2` |
| Aspiration gate per D11 | Disabled state + guidance tooltip when no aspirations | None | Unchanged |
| No generic ranking for non-aspirated users | `aspirationCount === 0` check gates ranking | None | Unchanged |
| Component tests | Implemented: component tests cover ranked, unranked, score-only, and apply handoff states; page tests cover ranking gate/reorder/clear flows | None | Keep tests current when recapturing or changing copy |

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

### Repo Implementation Status

Current repo status: `implemented`. `frontend/src/component/lead-card.tsx` sets `cardTone = ranking ? 'warning' : 'primary'`, renders the ranking context strip with `data-testid="lead-card-ranking-strip"`, and no longer renders the old `Aspiration fit X/10` chip in the general chip row. `frontend/test/component/lead-card.test.tsx` covers the ranking strip and the absence of the old chip, and `frontend/test/page/leads.test.tsx` covers ranking gate/reorder/clear behavior.

### Capture-Gap Review

`2026-04-16` Figma MCP review confirms `257:6090` still resolves on page `02 · Flagship Flow · Aspirations to Apply` (`221:1167`) and carries the right S8 implementation notes: ranked cards use `CardShell tone="warning"` and move score plus `aspiration_alignment` into a single ranking context strip. The target is now design rationale rather than an implementation handoff. Its child frames `257:6111` and `257:6132` remain collapsed target-state visuals, so route-backed implementation evidence was added separately.

Classification: `browser-harness evidence captured`. Ranked evidence is [node 446:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=446-2), captured from `/browser-harness/figma-wave1.html?screen=leads&state=ranked&mode=dark` at `1440 × 900`; unranked evidence is [node 447:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=447-2), captured from `/browser-harness/figma-wave1.html?screen=leads&state=unranked&mode=dark` at `1440 × 900`.

## Wave 1: Mandatory Harness-Backed Inventory

| Surface | Route/state | Lane | Evidence source | Figma target | Status | Handoff bucket | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Applications queue baseline` | `/applications` via `screen=applications` | `App-screen inventory` | Existing harness URL in `figma-wave1.tsx`; targeted Playwright smoke for the queue baseline; live browser review on `2026-04-14` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Queue baseline is verified. Board and detail states remain separate Wave 2 inventory. |
| `Profile baseline` | `/me` via `screen=profile` | `App-screen inventory` | Existing harness URL in `figma-wave1.tsx`; live browser review on `2026-04-14`; repo tie-back through `ProfilePage.tsx` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Baseline profile shell is live in the harness. MFA-specific states remain separate Wave 2 inventory. |
| `Messages baseline` | `/network/messages` via `screen=messages` | `App-screen inventory` | Existing harness URL in `figma-wave1.tsx`; live browser review on `2026-04-14`; repo tie-back through `conversations-page.tsx` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Conversation-list baseline is live in the harness. Conversation detail remains Wave 2 inventory. |
| `Aspirations roles matrix` | `/me/aspirations/roles`: `empty`, `seeded`, `loading`, `suggested`, `no-signal`, `rate-limited` | `App-screen inventory` | Harness state definitions in `figma-flagship-capture.tsx`; targeted Playwright smoke covers `empty`, `seeded`, and `suggested`; repo review confirms the full accepted state list; host-side route recapture on `2026-04-15` added canonical role anchors [node 494:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=494-2) and [node 496:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=496-2) | `Baldin-App-Screens` | `verified` | `screen-inventory only` | Canonical degraded-state evidence is closed. Reference-only study cards `44:1237` and `44:1259` may stay as supporting context; `490:2` and `491:2` must never be cited as active evidence. |
| `Aspirations companies matrix` | `/me/aspirations/companies`: `empty`, `seeded`, `loading`, `suggested`, `no-signal`, `rate-limited` | `App-screen inventory` | Harness state definitions in `figma-flagship-capture.tsx`; targeted Playwright smoke now covers `no-signal` and `rate-limited`; live browser review confirmed `no-signal` copy on `2026-04-14` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Matrix remains partially automated. `empty`, `seeded`, `loading`, and `suggested` are still direct-review states, not fully smoke-backed. |
| `Leads matrix` | `/leads`: `unranked`, `ranked`, `disabled`, `error` | `App-screen inventory` | Existing harness URL plus targeted Playwright smoke coverage for all four states on `2026-04-14`; S8 redesign rationale at [node 257:6090](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=257-6090); current repo implementation and S8 ranked/unranked route captures [node 446:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=446-2) / [node 447:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=447-2) confirmed on `2026-04-16` | `Baldin-App-Screens` | `verified` | `screen-inventory only` | Wave 1 evidence anchor. S8 code and route-backed evidence are implemented; preserve `257:6090` as rationale. See [S8: Ranking Redesign Status](#s8-ranking-redesign-status). |
| `Apply matrix` | `/apply`: `ready`, `already-applied` | `App-screen inventory` | Existing harness URL plus targeted Playwright smoke coverage for both states on `2026-04-14`; host-side route recapture on `2026-04-15` added canonical duplicate-guard anchor [node 492:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=492-2) | `Baldin-App-Screens` | `verified` | `screen-inventory only` | Ranked-lead to application handoff baseline is verified. `492:2` is the canonical captured node, `487:2` is annotation-only support for already-applied/transient failure detail, and `44:1377` / `44:1401` remain reference-only harness study cards rather than active backlog. |

## Wave 2: Adjacent Shipped-Flow Direct Review

| Surface | Route/state | Lane | Evidence source | Figma target | Status | Handoff bucket | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Applications board` | `/applications/board` | `App-screen inventory` | Direct shipped-route review from `app-routes.tsx` and `applications-board-page.tsx` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Current Figma coverage is present for loading, empty board, active lanes, terminal lanes, overdue reminders, move menu, and delete confirm. Supporting interaction evidence at [node 487:86](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=487-86) now makes the real drag and drop-target states explicit without replacing the canonical long-form board capture. |
| `Application detail` | `/applications/:applicationId` | `App-screen inventory` | Direct shipped-route review from `app-routes.tsx` and `applications-detail-page.tsx` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Current Figma coverage is present for open, closed, loading, error, action-item dialog, and delete confirm states. The canonical dialog remains [node 108:4348](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=108-4348), the shipped route stays section-based, reminder treatment is annotation-only by convention inside the existing Next Step section, and the old tabbed snapshot is retired non-canonical history at `227:1203` with text updates `227:1204` and `227:1235`. |
| `Conversation detail` | `/network/messages/:conversationId` | `App-screen inventory` | Direct shipped-route review from `app-routes.tsx` and `conversation-detail-page.tsx` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Current Figma coverage is now present for direct thread `109:4207`, group thread with participants `109:4401`, empty thread `109:4612`, loading `109:4792`, error `109:4959`, and edit/delete affordance visibility in `109:4207` and `109:4401`. Read-state behavior remains route logic, not a separate rendered frame. |
| `Profile MFA states` | `/me`: disabled baseline, recovery notice, setup QR and verify, enabled baseline, disable-confirmation dialog | `App-screen inventory` | Direct shipped-route review from `ProfilePage.tsx` and `mfa-setup-card.tsx`; Wave 1 harness tie-back exists only for the parent `/me` shell | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Current Figma coverage is now present for disabled, recovery notice dialog, setup verify, enabled, disable confirm, and loading states. These remain valid app-screen inventory without MFA harness backing, so the reproducibility gap stays documented rather than opening harness work. |

## Wave 3: Privileged, Admin, Or Harder-Access Direct Review

| Surface | Route/state | Lane | Evidence source | Figma target | Status | Handoff bucket | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Admin login states` | `/admin/login`: baseline, resolving authenticated session, and redirect when a superuser is already signed in | `App-screen inventory` | Direct shipped-route review from `admin-routes.tsx`, `login.tsx`, and `frontend/test/admin/admin-routes.test.tsx`, plus live route-backed capture on `2026-04-15` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Live capture at [node 374:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=374-2) anchors the admin-specific login shell, and [node 375:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=375-2) anchors the full-screen session-resolving state. The already-authenticated superuser redirect remains route logic rather than a separate rendered frame. Stale `232:1167` and `232:1185` remain docs history only. |
| `Admin access denied state` | `/admin/db-management` or `/admin/review` with an authenticated non-superuser session | `App-screen inventory` | Direct shipped-route review from `admin-routes.tsx`, `admin-layout.tsx`, and `frontend/test/admin/admin-routes.test.tsx`, plus live route-backed capture on `2026-04-15` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | This is explicit superuser access-state inventory, not a new shared primitive candidate. The state clears the unauthorized admin session, shows the dedicated access-denied copy, and offers both `Sign in again` and `Open product app` exits. Live capture at [node 376:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=376-2) now anchors the shipped route state. Stale `232:1192` remains docs history only. |
| `Extractor workflow` | `/workflows/extractors` | `App-screen inventory` | Direct shipped-route review from `app-routes.tsx` and `extractor.tsx`, plus live route-backed capture on `2026-04-15`; existing `ReadonlyField` library evidence can support structure review | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Live capture at [node 369:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=369-2) now anchors the extractor workflow baseline on `06 · Workflows & Admin Live Evidence`. Supporting operational variants at [node 463:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=463-2) make the loading, empty, success, dialog, and snackbar states explicit for redesign-readiness. Stale `131:6116` and `232:1202` remain docs history only. Extractors remain a product-app workflow at `/workflows/extractors`; they are not part of the dedicated Admin SPA unless a future route decision moves them. |
| `DB management workflow` | `/admin/db-management` with legacy `/workflows/db-management` browser handoff | `App-screen inventory` | Live superuser browser capture on `2026-04-14` plus direct shipped-route review from `app-routes.tsx`, `admin-routes.tsx`, `admin-layout.tsx`, `db-management.tsx`, and backend superuser routing | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | The dedicated Admin SPA is the canonical privileged route, and the legacy `/workflows/db-management` entry is only a browser handoff into it. Live capture at [node 184:4929](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=184-4929) anchors the shipped-route baseline, while supporting operational variants at [node 463:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=463-2) now make the destructive selection, preview, confirm, and safety-guard substates explicit for redesign-readiness. Page `221:1170` and [node 234:1167](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=234-1167) remain reference-only composed admin evidence unless later proof reclassifies them. |
| `Review queue workflow` | `/admin/review` with legacy `/workflows/review` browser handoff | `App-screen inventory` | Live superuser browser capture on `2026-04-14` plus direct shipped-route review from `app-routes.tsx`, `admin-routes.tsx`, `admin-layout.tsx`, `review-queue.tsx`, and backend superuser routing | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | The dedicated Admin SPA is the canonical privileged route, and the legacy `/workflows/review` entry is only a browser handoff into it. Live capture at [node 192:4929](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=192-4929) anchors the shipped-route baseline, while supporting operational variants at [node 463:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=463-2) and [node 463:26](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=463-26) now make populated rows, the batch toolbar, filter counts, and expanded JSON detail explicit for redesign-readiness. Page `221:1170` and [node 234:1215](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=234-1215) remain reference-only composed admin evidence unless later proof reclassifies them. |
| `Crawlers workflow` | `/admin/crawlers` with legacy `/workflows/crawlers` browser handoff | `App-screen inventory` | Live superuser browser capture on `2026-04-14` plus direct shipped-route review from `app-routes.tsx`, `admin-routes.tsx`, `admin-layout.tsx`, `crawlers.tsx`, and backend superuser routing | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | The dedicated Admin SPA is the canonical privileged route, and the legacy `/workflows/crawlers` entry is only a browser handoff into it. Live capture at [node 201:4929](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=201-4929) anchors the shipped-route baseline, while supporting operational variants at [node 463:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=463-2) now make the empty-pipelines CTA, expanded runs state, and create or edit dialog explicit for redesign-readiness. Page `221:1170` and [node 234:1239](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=234-1239) remain reference-only composed admin evidence unless later proof reclassifies them. |
| `Login baseline` | `/login` | `App-screen inventory` | Direct shipped-route review from `app-routes.tsx` and `login.tsx`, plus live route-backed capture on `2026-04-15` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Live capture at [node 370:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=370-2) now anchors the baseline login shell. Supporting auth variants at [node 462:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=462-2) keep the inline error state explicit without collapsing it into the baseline frame. Stale `131:6090` and `229:1167` remain docs history only. The baseline auth shell remains separate from the MFA challenge. |
| `Register baseline` | `/register` | `App-screen inventory` | Direct shipped-route review from `app-routes.tsx` and `register.tsx`, plus live route-backed capture on `2026-04-15` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Live capture at [node 371:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=371-2) now anchors the register baseline. Supporting auth variants at [node 462:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=462-2) keep password-strength and duplicate-account validation states explicit. Stale `131:6106` and `229:1202` remain docs history only. These remain auth-specific inventory, not promotion candidates. |
| `Login MFA challenge` | `/login` when `mfa_required` | `App-screen inventory` | Direct shipped-route review from `login.tsx`, `service/auth.tsx`, and the auth/MFA backend contract, plus live route-backed capture on `2026-04-15` | `Baldin-App-Screens` | `reviewed` | `screen-inventory only` | Live capture at [node 373:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=373-2) now anchors the MFA challenge surface. Supporting auth variants at [node 462:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=462-2) keep the invalid-code retry state explicit. Stale `131:6098` and `229:1185` remain docs history only. The separate MFA verification step remains distinct from the baseline login form per the auth contract. |

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
- Live reconciliation on `2026-04-15` confirmed that page `221:1169` and the prior `131:*`, `229:*`, and `232:*` auth/admin/extractor references do not resolve in the live file. The 2026-04-16 page restructure keeps auth/access evidence on `05 · Auth & Access Live Evidence` ([page 353:1167](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=353-1167)) with [node 370:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=370-2), [node 371:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=371-2), [node 373:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=373-2), [node 374:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=374-2), [node 375:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=375-2), and [node 376:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=376-2), while extractor evidence [node 369:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=369-2) now sits on `06 · Workflows & Admin Live Evidence`. The stale refs remain docs history only.
- Supporting design-owner groups now close the last redesign-readiness gaps without replacing canonical live baselines: flagship edge states at [node 487:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=487-2), application interaction states at [node 487:86](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=487-86), auth inline variants at [node 462:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=462-2), and workflow or admin operational variants at [node 463:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=463-2) with the review-queue refinement at [node 463:26](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=463-26).
- Extractors remain a product-app workflow at `/workflows/extractors`; the dedicated Admin SPA owns DB management, review queue, and crawlers, not extractors.
- The app route tests already lock the three legacy admin workflow entries into browser handoffs even when the viewer is logged out, so they should not be inventoried as first-class product-app screens.
- This pass revalidated the privileged admin state matrices from repo truth, retained live superuser baselines, and paired them with supporting operational variants, so the three privileged admin routes now have explicit redesign-ready coverage rather than lingering as partially implied flows.
- No current Wave 2 or Wave 3 surface, including the admin SPA states reviewed in this pass, cleared the current policy bar for `Promotion candidate`.

## 08 · Marketing · Landing

The `08 · Marketing · Landing` page in [Baldin-App-Screens](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=297-1167) contains composed marketing frames that consume the brand foundation defined in `Baldin-Library`'s `Brand — Career Control Plane` page (see [Baldin Library Buildout Ledger — Brand Foundation](./baldin-library-buildout-ledger.md#brand-foundation--career-control-plane)).

### Frames

| Frame | Dimensions | App-Screens node | Description |
| --- | --- | --- | --- |
| Desktop Landing Hero | 1440 × 900 | [node 297:1168](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=297-1168) | Full-width hero with nav bar, eyebrow, headline, subline, gradient CTA pair, glow accent, and 5-item feature strip |
| Mobile Landing Hero | 390 × 844 | [node 298:1167](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=298-1167) | Mobile-responsive hero with hamburger nav, stacked CTAs, and stacked feature cards |
| Full Landing Page Composition — 1440×2500 | 1440 × 2500 | [node 299:1167](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=299-1167) | Complete one-page marketing composition: hero section, 6-card features grid, pipeline visualization (Discover → Extract → Rank → Apply → Track), local-first privacy section, CTA footer block, and footer bar |
| Route evidence - landing `/` desktop viewport | 1440 × 900 | [node 448:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=448-2) | Shipped route evidence captured from `/` at desktop viewport |
| Route evidence - landing `/` mobile viewport | 390 × 844 | [node 449:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=449-2) | Shipped route evidence captured from `/` at mobile viewport |
| Route evidence - landing `/` desktop full page | 1440 × 3968 | [node 450:2](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=450-2) | Shipped route evidence captured from `/` as desktop full-page composition |
Canonical rule: [node 299:1167](https://www.figma.com/design/QxOoKWsaPUmjYQZjjEhoiy?node-id=299-1167) is the only canonical full-page marketing composition.

### Token Alignment

All colors map 1:1 to existing `Baldin Colors` variable collection entries — no new tokens were created. Typography uses the canonical font stack: Space Grotesk (display), Source Sans 3 (body), JetBrains Mono (technical eyebrows).

### Route Evidence Status

| Owner | Responsibility | Status |
| --- | --- | --- |
| `baldin_design_lead` | Recapture the shipped landing route `/` back into `Baldin-App-Screens` at desktop and mobile widths after implementation polish | Complete: desktop `448:2`, mobile `449:2`, and desktop full-page `450:2` sit alongside the composed desktop and mobile marketing specs. |
| `baldin_design_lead` | Compare route-backed captures against `297:1168`, `298:1167`, and `299:1167` without replacing the canonical composition | Complete for this pass. Future intentional route/spec differences should be recorded as design follow-up rather than silent drift. |

### Capture-Gap Review

`2026-04-16` Figma MCP review confirms page `08 · Marketing · Landing` (`297:1167`) contains desktop hero `297:1168`, mobile hero `298:1167`, and the canonical full desktop composition `Full Landing Page Composition — 1440×2500` at `299:1167`. The current repo renders `/` through `frontend/src/page/landing-page.tsx`, so the stale implementation gap is closed. Route-backed evidence now exists alongside the composed specs: desktop viewport `448:2`, mobile viewport `449:2`, and desktop full-page `450:2`.

Classification: `live route evidence captured` for `/` at desktop `1440 × 900`, mobile `390 × 844`, and desktop full-page `1440 × 3968`; no Figma page reorganization or synthetic replacement frame is needed.

### Implementation Status

Rebrand drift verification (2026-04-14) confirmed no token, theme, or shared-component changes are needed. Current repo review confirms the implementation prerequisites are now complete and only route capture remains:

- **Palette**: All six brand palette values map 1:1 to existing dark-mode color tokens. No new tokens needed.
- **Typography tokens**: All three brand font families (`Space Grotesk`, `Source Sans 3`, `JetBrains Mono`) exist in `fontFamilies`, and the current frontend includes `@fontsource/jetbrains-mono` with the 400 weight import in `app-providers.tsx`.
- **Gradient CTA**: The route implementation uses `brandGradient(theme, 90)` for horizontal brand CTA treatment.
- **Splash color**: `frontend/index.html` already uses `#07111d` for body background and `theme-color` meta, matching the canonical dark canvas token (`surface.canvas`).
- **Route target**: the repo has a dedicated `landing-page.tsx` rendered as the `HomeLayout` index route; route capture alignment is complete for this pass.
- **No token, theme, or shared-component changes needed** from the rebrand drift verification.
- **Evidence status**: live route recapture for desktop, mobile, and desktop full-page evidence is complete on page `08`.

## Closeout Ownership Note

This closeout does not leave an active inventory owner. Future redesign work should start from [Baldin Redesign Handoff](./baldin-redesign-handoff.md), and any later App-Screens refresh should preserve the stale-ref guardrail against `221:1169`, `131:*`, `229:*`, `232:*`, `490:2`, and `491:2`.

## Closeout Notes

1. Keep `05 · Auth & Access Live Evidence` as the canonical auth/access page and `06 · Workflows & Admin Live Evidence` as the canonical extractor/admin live-capture page.
   Preserve the stale-ref guardrail and the non-canonical status of `490:2` and `491:2`.

2. Keep the new S8 and marketing route-evidence frames alongside their preserved rationale/spec frames.
   S8 route evidence lives at `446:2` and `447:2` while `257:6090` remains rationale; landing route evidence lives at `448:2`, `449:2`, and `450:2` while `299:1167` remains the canonical composed full-page spec.

3. Preserve the closed-state promotion decision.
   `Promotion candidate` stays empty, `SecondaryNavBar` remains `library-only for now`, and no new `.figma.ts` mapping or shared React abstraction is required from this closeout.

4. Treat this page as provenance, not the next-phase checklist.
   Any future redesign pass should use [Baldin Redesign Handoff](./baldin-redesign-handoff.md) as the only active entry point and treat this ledger as supporting history.
