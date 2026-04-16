---
title: Baldin Redesign Handoff
description: Redesign-ready closeout handoff for Baldin App Screens and Baldin Library provenance.
---

<!-- last-verified: 2026-04-15 -->

# Baldin Redesign Handoff

This page is the only active entry point for the next redesign phase. It consolidates the closeout decisions that were previously spread across the app-screens inventory, polish ledger, and library buildout ledger.

Use the provenance ledgers only for audit trail and historical rationale:

- [Baldin App Screens Inventory](./baldin-app-screens-inventory.md)
- [Baldin App Screens Polish Ledger](./baldin-app-screens-polish-ledger.md)
- [Baldin Library Buildout Ledger](./baldin-library-buildout-ledger.md)

## Implementation Program

Use [Redesign Implementation Program](../engineering/redesign-implementation-program.md) for the developer-only execution path after closeout freeze.

- Every implementation wave must start from the required brief template at `plans/redesign/implementation-brief-template.md`.
- Route-family packets live under `plans/redesign/wave-0*.md`.
- Do not reopen capture work unless a design review proves this handoff is factually wrong.

## Phase Boundary

This closeout ends at `redesign-ready`.

Explicit non-goals for the next phase:

- No promotion into shared repo surfaces.
- No `.figma.ts` expansion.
- No Code Connect follow-up.
- No React or frontend implementation.

Frozen closeout decisions:

- Canonical page roles remain frozen on `02`, `05`, `06`, and `08`.
- Stale refs remain banned.
- `490:2` and `491:2` remain non-canonical troubleshooting artifacts.
- Application-detail tabs remain out of scope because the shipped route is section-based.
- `SecondaryNavBar` remains `library-only for now`.
- `Promotion candidate` remains empty.

## Canonical Rules

| Surface | Canonical anchors | Rule |
| --- | --- | --- |
| `02 · Flagship Flow · Aspirations to Apply` | `492:2`, `494:2`, `496:2`, `446:2`, `447:2`, `257:6090` | Use `492:2`, `494:2`, and `496:2` as the canonical closeout anchors for apply duplicate guard and role degraded states. Keep `446:2` / `447:2` as route-backed S8 evidence and `257:6090` as design rationale. |
| `05 · Auth & Access Live Evidence` | `370:2`, `371:2`, `373:2`, `374:2`, `375:2`, `376:2`, `462:2` | Live auth/access captures remain canonical. `462:2` is supporting annotation-only auth detail, not a replacement for the route-backed anchors. |
| `06 · Workflows & Admin Live Evidence` | `369:2`, `184:4929`, `192:4929`, `201:4929`, `463:5`, `463:26`, `463:46`, `463:67` | Live workflow/admin captures remain canonical. The `463:*` groups carry the redesign-ready interactive detail that the single-state live captures cannot show simultaneously. |
| `08 · Marketing · Landing` | `297:1168`, `298:1167`, `299:1167`, `448:2`, `449:2`, `450:2` | Keep `299:1167` as the only canonical full-page marketing composition and keep the route-backed captures adjacent to it. |

Supporting but non-canonical redesign evidence that remains valid:

- `03 · Applications · Queue Board Detail`: supporting group `487:86`, board drag `487:89`, board drop-target `487:110`, canonical action-item dialog `108:4348`.
- `04 · Network & Profile States`: direct thread `109:4207`, group thread + participants `109:4401`, empty thread `109:4612`, loading `109:4792`, error `109:4959`, with reference snapshots `228:1168`, `228:1203`, and `228:1217`.
- `07 · Reference · Admin Studies`: `234:1167`, `234:1198`, `234:1215`, `234:1239` remain reference-only and must not replace page `06`.

Banned or retired evidence:

- Stale auth/admin/extractor refs `221:1169`, `131:*`, `229:*`, and `232:*`.
- Troubleshooting artifacts `490:2` and `491:2`.
- Retired application-detail tab history `227:1203`, with explanatory text updates `227:1204` and `227:1235`.

## Closed Capture Summary

### Page 02

- Canonical captured nodes are `492:2`, `494:2`, and `496:2`.
- `487:2` is `annotation-only by convention` for already-applied/transient failure detail and must not be treated as the canonical anchor.
- `44:1377`, `44:1401`, `44:1237`, and `44:1259` remain valid reference-only harness study cards.
- `490:2` and `491:2` remain explicitly non-canonical troubleshooting artifacts.

### Pages 03 and 04

- Board drag is `487:89` and board drop-target is `487:110`, both inside supporting group `487:86`.
- Application-detail dialog remains `108:4348`.
- Application-detail reminder treatment is `annotation-only by convention` through the existing section-based Next Step treatment inside `108:4348`; no separate reminder-state frame is required.
- Conversation-detail message hierarchy is explicit in `109:4207`.
- Edit/delete affordance is visible in `109:4207` and `109:4401`.
- Participant sidebar and group thread treatment are explicit in `109:4401`.
- Empty, loading, and error conversation states are `109:4612`, `109:4792`, and `109:4959`.
- The old tabbed snapshot is retired non-canonical history at `227:1203` with supporting text updates `227:1204` and `227:1235`.

### Page 06

- Page `06 · Workflows & Admin Live Evidence` (`394:1167`) is redesign-ready.
- Live anchors remain `369:2`, `184:4929`, `192:4929`, and `201:4929`.
- Supporting evidence groups are:
  - `463:5` for extractor loading/empty/success/error-snackbar
  - `463:26` for review queue populated/batch/filter-count/expanded JSON
  - `463:46` for crawlers empty CTA/expanded/dialog
  - `463:67` for DB destructive preview/confirm/safety

## Cross-Screen UX Conventions

These decisions are now resolved enough to support redesign without reopening the capture phase:

- Live route-backed evidence wins over hand-built or study frames for shipped UI.
- Supporting groups are valid when they clarify interaction detail or transient states, but they stay subordinate to the canonical anchors.
- Application detail stays section-based. Do not recreate or imply tabbed detail states.
- Conversation detail should preserve explicit message hierarchy, visible edit/delete affordances, and a distinct participant-sidebar group-thread variant.
- Auth and access remain separate explicit steps: login, register, MFA challenge, admin login, session resolving, and access denied.
- Workflow/admin redesign should preserve explicit destructive preview/confirm/safety handling and explicit populated/filter/detail states rather than collapsing them back into single baseline screens.
- Marketing keeps one canonical full-page composition at `299:1167`.

## Deferred Backlog

No unresolved interactive capture backlog remains from this closeout.

Every formerly open item now has exactly one final state:

- `captured with canonical node`
- `annotation-only by convention`
- `deferred to redesign backlog`

This closeout leaves no item in an unowned `verify later` state.

## Provenance Notes

- Use page `02` reference-only cards `44:1377`, `44:1401`, `44:1237`, and `44:1259` only as supporting study context.
- Keep page `07` admin studies and page `04` reference snapshots as reference/support material only.
- Do not promote any stale, retired, or troubleshooting node into active redesign evidence.
