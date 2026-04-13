# Quarter Roadmap: Figma-Led Aspirations-to-Apply Flagship

> Active plan for the current quarter.
> Working branch: `schema-v2` (continues as the flagship branch).
> Prior art: [plans/aspirations.md](./aspirations.md) — original 6-phase slice plan for the aspirations backend.

## Problem Statement

Baldin's job-search automation flow is fragmented: aspirations live under a profile CRUD shell, lead ranking exposes aspiration-alignment data that is not visually prominent, and the transition from a ranked lead into an application happens through a small menu button without contextual guidance. The backend already supports suggestion generation, aspiration-aware ranking, and structured matching — but the frontend does not surface these capabilities as a connected workflow. This quarter delivers the end-to-end **aspirations → ranked leads → application start** experience as the flagship product flow, anchored by Figma design work and the existing design-system foundation.

## Current State (schema-v2 baseline)

### Backend — complete

| Surface | Status |
|---------|--------|
| `Aspiration` model + migration (0008) | Complete — CRUD, unique constraint, kind enum |
| CRUD routes (GET/POST/PATCH/DELETE `/api/v1/aspirations`) | Complete — 16 tests |
| `POST /api/v1/aspirations/suggest` | Complete — LLM-based, rate-limited, dedup, empty-profile 400 |
| `POST /api/v1/aspirations/match` | Complete — RAG-backed, lead-requirement extraction, 20+ tests |
| Aspiration-aware lead ranking | Complete — `aspiration_alignment` on `RankedLeadEntry` |

### Frontend — CRUD shell only

| Surface | Status |
|---------|--------|
| Aspirations pages (Roles, Companies tabs) | Complete — cards, form dialog, search |
| Aspirations service adapter | Partial — CRUD only; no suggest or match methods |
| Generated types for suggest + match | Complete in `schema.d.ts` |
| Leads ranking | Partial — ranking works, alignment tooltip, 20-lead cap |
| Application creation | Complete — intent button, duplicate guard, queue/board/detail |

### Design System & Harness

| Surface | Status |
|---------|--------|
| Token inventory + primitives + Figma Code Connect | Complete — 7 `.figma.ts` mappings |
| `lint:theme` gate | Failing — 2 violations (see Story 2) |
| Browser harness | Wave 1 only — no aspirations, leads, or apply states |

### Docs

| Surface | Status |
|---------|--------|
| Aspirations in architecture docs | Routing table mention only |
| API surface docs listing aspirations | Missing |

## Decisions Log

| # | Decision | Date |
|---|----------|------|
| D1 | `schema-v2` continues as the flagship working branch; merge to `main` deferred until flagship is shippable | 2026-04-13 |
| D2 | Suggestion-review UI supports bulk "accept all" per-tab (all suggestions of the active kind), not just post-filter visible | 2026-04-13 |
| D3 | `aspiration_alignment` text renders alongside the relevance score as a secondary line, not as a tooltip replacement | 2026-04-13 |
| D4 | Figma library access confirmed: https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library | 2026-04-13 |
| D5 | `plans/business-model.md` is a separate artifact; not part of this roadmap's active plan inventory | 2026-04-13 |
| D6 | Code Connect publish automation is an external dependency, not a quarter gate; harness + inspection workflow is sufficient | 2026-04-13 |
| D7 | No new backend endpoints, models, or migrations this quarter; existing contract is sufficient | 2026-04-13 |
| D8 | Suggestion fetch and accept flows use explicit frontend error categories: `no_signal` (400), `duplicate` (409 on create), `rate_limited` (429), `ai_disabled` (503), `network`, and `unknown`; UI copy and retry behavior are keyed off those categories | 2026-04-13 |
| D9 | "Accept all" runs sequential creates for the active tab kind only. Successes are persisted and removed from drafts, `409` duplicates are treated as non-fatal already-satisfied items and removed from drafts, and the batch stops on the first retryable failure (`429`, `503`, `network`, or unknown 5xx) with untouched remaining drafts left visible for retry | 2026-04-13 |
| D10 | Story 10 inline already-applied state is powered by the existing `/api/v1/applications/` list surface. Leads page loads applications once, derives a `lead_id -> application` map locally, passes that state into lead cards, and updates the map after successful application creation; no backend contract changes | 2026-04-13 |
| D11 | Ranking remains aspiration-gated this quarter. Users without aspirations do not get generic relevance-only ranking; they continue to see the disabled state with clearer guidance to add aspirations first | 2026-04-13 |
| D12 | Figma is upstream for flow/layout decisions after the lint baseline is fixed. Harness expansion is downstream reference/capture work that reflects the approved Figma direction and implemented UI states | 2026-04-13 |
| D13 | Validation commands in this epic use repo-aligned working-directory forms. Host-side backend pytest must set `TEST_DATABASE_HOSTNAME=127.0.0.1` and `TEST_DATABASE_PORT=5431` explicitly to avoid the tracked `backend/.env` Compose hostname mismatch | 2026-04-13 |

## User Stories

### Story 1: Stabilize schema-v2 as the flagship branch
**As a** developer, **I want** the schema-v2 branch validated and declared as the active flagship working branch, **so that** all downstream work builds on a stable, reviewed foundation.

**Acceptance criteria:**
- [ ] Backend pytest aspirations + matcher slices green
- [ ] `openapi.json` and `schema.d.ts` fresh via `SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh`
- [ ] `tsc --noEmit` and `npm run build` pass against regenerated types
- [ ] Branch declared as the flagship working branch (merge to `main` deferred)

**Surfaces:** backend, contracts, frontend (type check only)
**Dependencies:** none
**Complexity:** S
**Owner:** Lead Architect

---

### Story 2: Fix design-system lint gate
**As a** frontend developer, **I want** `npm run lint:theme` green, **so that** new design work starts from a clean baseline.

**Acceptance criteria:**
- [ ] `chat-markdown.tsx` uses `fontFamilies.mono` instead of raw `'monospace'`
- [ ] `StatusChip.figma.ts` replaces `'#0891b2'` with a theme-palette reference
- [ ] `npm run lint:theme` exits 0

**Surfaces:** frontend
**Dependencies:** none
**Complexity:** S
**Owner:** Frontend Agent

---

### Story 3: Create the quarter plan document
**As a** project coordinator, **I want** a durable plan doc for the flagship quarter roadmap, **so that** agents, prompts, and humans share one source of truth.

**Acceptance criteria:**
- [ ] `plans/flagship-aspirations-to-apply.md` committed (this file)
- [ ] `plans/README.md` updated to list it as active
- [ ] `plans/aspirations.md` cross-referenced as prior art

**Surfaces:** plans
**Dependencies:** Story 1 (confirms baseline)
**Complexity:** S
**Owner:** Lead Architect

---

### Story 4: Update docs to reflect aspirations as a real surface
**As a** developer or agent, **I want** architecture and API docs that describe aspirations CRUD, suggest, match, and ranking integration.

**Acceptance criteria:**
- [ ] New or expanded architecture doc under `docs/docs/` describes aspirations model, endpoints, and ranking integration
- [ ] `docs/sidebars.ts` surfaces the new page
- [ ] Frontend architecture doc expands beyond routing-table mention
- [ ] `docs build` passes

**Surfaces:** docs
**Dependencies:** Story 1
**Complexity:** M
**Owner:** Lead Architect

---

### Story 5: Wire suggest service method into the frontend
**As a** job seeker, **I want** the frontend to be able to call the suggest endpoint, **so that** the suggestion-review UI has a typed service layer.

**Acceptance criteria:**
- [ ] `suggestAspirations(token)` added to `aspirations.ts` returning `AspirationSuggestResponse`
- [ ] Service layer normalizes suggest failures into explicit frontend categories per D8: `no_signal`, `rate_limited`, `ai_disabled`, `network`, `unknown`
- [ ] `400` from `/aspirations/suggest` maps to `no_signal` only when the backend detail is the existing no-usable-profile message; other `400` responses fall back to `unknown`
- [ ] Service tests cover success with drafts, `400` no-signal, `429`, `503`, and network failure
- [ ] No UI wiring — service layer only

**Surfaces:** frontend
**Dependencies:** Story 1
**Complexity:** S
**Owner:** Frontend Agent

---

### Story 6: Build suggestion-review UI on aspirations pages
**As a** job seeker on the aspirations tab, **I want** to trigger profile-based suggestions, review them, and accept or discard each one.

**Acceptance criteria:**
- [ ] "Suggest from profile" button; fetch is user-triggered, not automatic
- [ ] Drafts render as reviewable cards filtered to active tab kind
- [ ] "Accept all" accepts all suggestions of the active kind (per-tab bulk accept — D2)
- [ ] Accept-one persists through the existing create-aspiration route
- [ ] Discarded suggestions removed from local draft list only
- [ ] No-signal response shows actionable guidance to improve profile data
- [ ] Loading state visible during suggestion fetch
- [ ] Fetch error handling is explicit and stable:
  - `400 no_signal` clears any stale draft list for the active kind and renders inline profile-improvement guidance
  - `429 rate_limited` keeps existing drafts intact, renders retryable inline feedback, and does not start any create calls
  - `503 ai_disabled` keeps existing drafts intact and renders "AI suggestions unavailable" guidance without implying profile edits will help
  - `network` and `unknown` errors keep existing drafts intact and render a generic retryable failure state
- [ ] Accept-one semantics are explicit:
  - `201` removes the accepted draft and refreshes persisted aspirations
  - `409 duplicate` removes the draft as already satisfied, refreshes persisted aspirations, and shows non-destructive feedback
  - `429`, `503`, `network`, and unknown errors keep the draft in place and show retryable feedback
- [ ] Accept-all semantics follow D9 exactly:
  - process active-kind drafts sequentially in rendered order
  - remove successes and `409` duplicates from the draft list as they complete
  - stop on the first retryable failure and leave the failed draft plus all remaining active-kind drafts visible and unchanged
  - show a completion summary with counts for created, already-existing, and remaining drafts
- [ ] Component tests: accept-one success, accept-one duplicate, accept-all all-success, accept-all partial failure stop, discard, no-signal, rate-limited, AI-disabled, loading

**Surfaces:** frontend
**Dependencies:** Story 5
**Complexity:** M
**Owner:** Frontend Agent

---

### Story 7: Expand browser harness for aspirations captures
**As a** designer, **I want** harness-rendered aspirations screens for Figma review without a live backend.

**Acceptance criteria:**
- [ ] New harness HTML/TSX entry for aspirations with mock data
- [ ] States: no aspirations, loading suggestions, suggestions returned (role + company), no-usable-signal guidance
- [ ] Both theme modes render correctly
- [ ] No network dependency

**Surfaces:** frontend (browser-harness)
**Dependencies:** Stories 6, 12
**Complexity:** M
**Owner:** Frontend Agent

---

### Story 8: Redesign leads ranking presentation for aspiration fit
**As a** job seeker on the leads page, **I want** ranking results to surface aspiration-alignment as first-class context.

**Acceptance criteria:**
- [ ] Ranking action is an explicit trigger (clear button/control)
- [ ] Ranked state visually distinct from unranked on lead cards
- [ ] `aspiration_alignment` displayed alongside relevance score as a secondary line (D3)
- [ ] Relevance score and aspiration fit presented together coherently
- [ ] Current aspiration gate remains in place per D11: users without aspirations still see the disabled ranking state and a clearer prompt to add aspirations first
- [ ] Ranking redesign does not introduce generic relevance-only ranking for non-aspirated users this quarter
- [ ] Component tests: ranked/unranked states, alignment rendering

**Surfaces:** frontend
**Dependencies:** Stories 1, 12
**Complexity:** M
**Owner:** Frontend Agent

---

### Story 9: Expand browser harness for leads ranking captures
**As a** designer, **I want** harness screens for the leads ranking redesign.

**Acceptance criteria:**
- [ ] Harness entry with mock ranked + unranked lead data
- [ ] States: unranked, ranked with aspiration alignment, ranking unavailable/error
- [ ] Both theme modes

**Surfaces:** frontend (browser-harness)
**Dependencies:** Stories 8, 12
**Complexity:** S
**Owner:** Frontend Agent

---

### Story 10: Strengthen application-start handoff from leads
**As a** job seeker looking at a ranked lead, **I want** the apply action to feel like a natural continuation of ranking context.

**Acceptance criteria:**
- [ ] Leads page loads the existing application list once through the current frontend applications service, derives a local `lead_id -> application` map, and passes that derived state into lead cards (D10)
- [ ] Intent button preserved (register/apply distinction)
- [ ] Inline already-applied state is computed from the derived applications map, not from a new backend field
- [ ] Existing duplicate guard remains as a runtime backstop on click; the preloaded map is the primary render path and is refreshed or updated after successful application creation
- [ ] Inline state shows the existing application stage/outcome label for matching leads and disables the creation CTA when an application already exists
- [ ] Handoff copy references ranking context (e.g., "High aspiration fit — ready to apply?")
- [ ] No application route contract changes (backend untouched)
- [ ] Component tests: inline existing-application state from preloaded map, duplicate guard UX, handoff copy, post-create map update

**Surfaces:** frontend
**Dependencies:** Stories 8, 12
**Complexity:** S
**Owner:** Frontend Agent

---

### Story 11: Expand browser harness for application-start captures
**As a** designer, **I want** harness screens for the application-start handoff.

**Acceptance criteria:**
- [ ] Harness entry with mock lead + ranking + application state
- [ ] States: ready to apply (with ranking context), already-applied / duplicate-guard
- [ ] Both theme modes

**Surfaces:** frontend (browser-harness)
**Dependencies:** Stories 10, 12
**Complexity:** S
**Owner:** Frontend Agent

---

### Story 12: Design three linked Figma flow moments
**As a** designer, **I want** a connected Figma flow showing aspirations → ranked leads → apply.

**Acceptance criteria:**
- [ ] Three frames in Figma: (1) aspirations with suggest, (2) leads with ranking, (3) apply handoff
- [ ] Figma work happens before implementation-heavy Stories 6, 8, and 10, using the current product pages plus the existing Baldin library as source material (D12)
- [ ] Figma is the source of truth for flow ordering, layout, and state inventory; the harness is a downstream capture/reference artifact, not a prerequisite for design
- [ ] Initial Figma frames include these states before implementation begins:
  - aspirations: empty, loading, suggestions returned, no-signal, rate-limited / AI-unavailable
  - leads: default unranked, ranked with aspiration alignment, ranking disabled because no aspirations, ranking unavailable/error
  - apply handoff: ready to apply, already-applied inline state
- [ ] Harness stories 7, 9, and 11 later mirror the approved Figma states and implemented UI, not the other way around
- [ ] Uses existing Baldin library (https://www.figma.com/design/MbJ133Gwnp1OlkFLrjBLEh/Baldin-Library); no new shared abstractions unless reused ≥2 flow moments
- [ ] Figma inspection available; Code Connect publish not required (D6)

**Surfaces:** Figma (external), frontend (harness reference)
**Dependencies:** Story 2
**Complexity:** M
**Owner:** Frontend Agent + designer

---

### Story 13: Backfill docs, harness, and Figma references
**As a** maintainer, **I want** docs and harness backfilled for the shipped flow.

**Acceptance criteria:**
- [ ] Architecture docs updated for the full flagship flow
- [ ] Design-system docs updated only where flagship changed the shared inventory
- [ ] Harness states self-documenting
- [ ] `docs build` passes
- [ ] Figma file references linked from this plan doc

**Surfaces:** docs, frontend (browser-harness), plans
**Dependencies:** Stories 6, 8, 10, 12
**Complexity:** M
**Owner:** Lead Architect

---

### Story 14: Polish pass on flagship connected surfaces
**As a** user, **I want** the three flow moments to feel polished and cohesive.

**Acceptance criteria:**
- [ ] Visual consistency (spacing, typography, chips, empty states)
- [ ] Responsive behavior at common breakpoints
- [ ] All gates green: `lint:theme`, `test`, `tsc --noEmit`, `build`
- [ ] No regressions in non-flagship pages

**Surfaces:** frontend
**Dependencies:** Stories 6, 8, 10
**Complexity:** M
**Owner:** Frontend Agent

## Dependency Graph

```mermaid
graph TD
    S1["S1: Stabilize schema-v2"]
    S2["S2: Fix lint gate"]
    S3["S3: Create plan doc"]
    S4["S4: Update docs"]
    S12["S12: Figma flow design"]
    S5["S5: Wire suggest service"]
    S6["S6: Suggestion-review UI"]
    S7["S7: Harness — aspirations"]
    S8["S8: Ranking redesign"]
    S9["S9: Harness — leads"]
    S10["S10: Apply handoff UX"]
    S11["S11: Harness — apply"]
    S13["S13: Backfill docs/harness"]
    S14["S14: Polish pass"]

    S1 --> S3
    S1 --> S4
    S1 --> S5
    S2 --> S12
    S12 --> S6
    S12 --> S8
    S12 --> S10
    S5 --> S6
    S6 --> S7
    S8 --> S9
    S8 --> S10
    S10 --> S11
    S6 --> S13
    S8 --> S13
    S10 --> S13
    S12 --> S13
    S6 --> S14
    S8 --> S14
    S10 --> S14
```

**Critical path:** S2 → S12 → S5 → S6 → S7 → S13

**Parallel lanes after S12:**
- Suggestions: S5 → S6 → S7
- Ranking + apply: S8 → S9, S8 → S10 → S11
- Docs/foundation: S3, S4

S1 remains the branch-validation foundation; S2 is the design-entry gate.

## Phased Delivery Plan

### Phase 1 — Foundations (Week 1–2)

| Story | Title | Complexity |
|-------|-------|------------|
| 1 | Stabilize schema-v2 | S |
| 2 | Fix lint gate | S |
| 3 | Create plan doc | S |
| 4 | Update docs | M |

**Exit criteria:** schema-v2 validated, `lint:theme` green, plan tracked, aspirations documented.

### Phase 2 — Flagship UX (Week 2–8)

| Story | Title | Complexity |
|-------|-------|------------|
| 5 | Wire suggest service | S |
| 6 | Suggestion-review UI | M |
| 7 | Harness — aspirations | M |
| 8 | Ranking redesign | M |
| 9 | Harness — leads | S |
| 10 | Apply handoff UX | S |
| 11 | Harness — apply | S |
| 12 | Figma flow design | M |

**Exit criteria:** all three flow moments functional, harness states render in both themes, Figma artboards capture the connected flow.

### Phase 3 — Harden & Close (Week 8–12)

| Story | Title | Complexity |
|-------|-------|------------|
| 13 | Backfill docs/harness | M |
| 14 | Polish pass | M |

**Exit criteria:** all repo gates green, no regressions, plan updated with final status.

## Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | schema-v2 diverges from main over the quarter | Medium | High | Periodic rebase; merge to main when flagship is shippable |
| R2 | Suggest endpoint responses too generic for UX | Medium | Medium | Accept LLM quality for POC; add "AI suggestions" framing; defer prompt tuning |
| R3 | Figma Code Connect publish blocked by seat | Known | Low | Harness + inspection workflow is sufficient (D6) |
| R4 | Ranking redesign scope creeps into lead-card refactor | Medium | Medium | Scope to ranking-visible surfaces only |
| R5 | Harness mock data diverges from real API shape | Low | Medium | Generate mocks from schema.d.ts types |

## Out of Scope

- Dashboard migration
- Workspace/editor migration
- Repo-wide design-system extraction (only extract if reused ≥2 flow moments)
- Production topology and deployment automation
- Full aspiration match UI (match badges, matched-leads panel on aspiration cards)
- New backend endpoints, models, or migrations
- Code Connect publish automation
- Broad CI gate expansion

## Validation Plan

### Phase 1
- `cd backend && TEST_DATABASE_HOSTNAME=127.0.0.1 TEST_DATABASE_PORT=5431 pipenv run pytest app/tests/test_aspirations.py app/tests/test_aspiration_matcher.py`
- `SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh`
- `cd frontend && ./node_modules/.bin/tsc --noEmit`
- `cd frontend && npm run build`
- `cd frontend && npm run lint:theme`
- `npm --prefix docs run build`

### Phase 2
- `cd frontend && npm run test -- --run test/service/aspirations.test.ts test/component/aspirations-collection.test.tsx test/page/leads.test.tsx`
- `cd frontend && ./node_modules/.bin/tsc --noEmit`
- `cd frontend && npm run build`
- `cd frontend && npm run lint:theme`
- Harness manual verification in both theme modes for aspirations, ranked leads, and apply-handoff screens
- Integration smoke, run against the warm local stack:
  `cd backend && TEST_DATABASE_HOSTNAME=127.0.0.1 TEST_DATABASE_PORT=5431 pipenv run pytest app/tests/test_aspirations.py -k "suggest_aspirations"`
  then manually verify `aspirations -> suggest -> accept -> rank leads -> start application` in the frontend
- After any backend schema or contract change during this phase, rerun `SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh` before frontend validation

### Phase 3
- `cd frontend && npm run lint:theme`
- `cd frontend && npm run test`
- `cd frontend && ./node_modules/.bin/tsc --noEmit`
- `cd frontend && npm run build`
- `npm --prefix docs run build`
- Non-flagship page regression spot-check on companies, applications queue, and profile

## Execution Defaults

| Role | Default owner |
|------|---------------|
| Sequencing and coordination | Baldin Project Manager |
| Contracts, docs, gates, cross-stack | Baldin Lead Full-Stack Architect |
| Flagship UX and Figma handoff | Baldin Frontend Agent |
| Backend (only if contract proves insufficient) | Baldin Backend Agent |
