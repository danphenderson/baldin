Here's the plan for the next aspirations slice — **Targeting, Ranking, Extraction & Recommendations**.

---

## Architecture Summary

The slice builds on the completed frontend-only shell and connects it to existing backend infrastructure: the **lead ranking LangGraph** (`rank_leads/`), the **extractor pipeline**, and the **PGVectorStore**.

---

## 6 Phases, 27 Steps

### Phase 1 — Backend Aspiration Model & CRUD Routes *(blocking foundation)*
1. **`Aspiration` SQLAlchemy model** in models.py — `user_id` FK, `kind` (role/company), `label`, `reason`, `notes`, `priority` (int for weighting), `extracted_attributes` (JSONB for matching data). Unique constraint on `(user_id, kind, label)`.
2. **Alembic migration** — autogenerate + verify up/down.
3. **Pydantic schemas** in schemas.py — `AspirationKind` enum, `AspirationCreate`, `AspirationUpdate`, `AspirationRead`, `AspirationSummaryRead`.
4. **CRUD routes** in new `backend/app/api/routes/aspirations.py` — `GET /`, `POST /`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}`, all user-scoped.
5. **Register router** in api.py at `/aspirations`.
6. **Regenerate contracts** — `SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh`.
7. **Swap frontend adapter** — add `createApiAdapter(token)` in aspirations.ts using `createApiClient` + `unwrap` pattern.
8. **Backend CRUD tests** — list, create, update, delete, user-scoping, dedup constraint, kind filter.

### Phase 2 — Aspiration-Aware Lead Ranking *(extends existing graph)*
9. **Add `aspirations` to `LeadRankingState`** in state.py — optional `list[dict]`.
10. **Augment ranking prompt** in nodes.py — inject "The user has these career aspirations: ..." into the system prompt when aspirations are present.
11. **Load aspirations in rank-leads endpoint** — query user's aspirations before graph invocation.
12. **Add `aspiration_alignment` field to `RankedLeadEntry`** — brief note on which aspirations each lead matches.

### Phase 3 — Standalone Aspiration Matcher *(new endpoint)*
13. **Matching service** — new `backend/app/core/rag/match_aspirations/` — single structured LLM call (not a full LanGraph) that takes aspirations + leads + document context → per-aspiration match results.
14. **`POST /aspirations/match` endpoint** — returns `list[AspirationMatchResult]` with per-lead scores and explanations.
15. **Matcher schemas** — `AspirationMatchRequest`, `AspirationLeadMatch` (lead_id, match_score, explanation), `AspirationMatchResult`, `AspirationMatchResponse`.

### Phase 4 — Bidirectional Extraction
16. **Lead requirements extractor** — new `extract_lead_requirements.py` using existing `extraction_runnable` with a JSON schema for `{required_skills, seniority_level, education_level, key_responsibilities}`.
17. **Aspiration auto-suggest from profile** — new `suggest_aspirations.py`: single LLM call given user skills/experiences/education → suggested role + company aspirations.
18. **Suggestion schemas + `POST /aspirations/suggest` endpoint**.
19. **Wire extracted requirements into matching** — matcher prompt includes `extracted_attributes` from both aspirations and leads.

### Phase 5 — Frontend Recommendation Surfaces
20. **Aspiration match badge on lead cards** (Leads page) — chip with alignment score, tooltip with matching aspirations.
21. **Matched leads panel on aspiration cards** (Aspirations page) — expandable section per card showing top matched leads with scores.
22. **Suggestion banner on aspirations page** — accept/dismiss cards for profile-derived suggestions.
23. **Frontend service extensions** — `matchAspirations()` and `suggestAspirations()` functions.

### Phase 6 — Final Contracts & Tests
24. **Final contract regeneration** pass.
25. **Backend matching + extraction tests** (mocked LLM).
26. **Frontend component tests** for new surfaces.
27. **Integration smoke** — create aspirations → rank → verify alignment; trigger matcher → verify per-aspiration results; accept suggestion → verify creation.

---

## Key Integration Points

| Existing System | How Aspirations Plug In |
|---|---|
| `rank_leads/` LanGraph | Aspiration context injected into `LeadRankingState` → system prompt augmented → `aspiration_alignment` added to `RankedLeadEntry` |
| `PGVectorStore` | Matcher uses same `similarity_search()` for document retrieval context |
| `extraction_runnable` | Lead requirements extraction uses existing chain with new JSON schema |
| `_serialize_user_profile()` | Matcher and suggester reuse same profile serialization |
| Frontend `AspirationAdapter` | Extended with `createApiAdapter()` that targets new `/aspirations` routes |

---

## Recommended Sub-slicing

If the full scope is too large for one pass:

| Sub-slice | Phases | Steps | Key deliverable |
|---|---|---|---|
| **A — Foundation** | 1–2 | 1–12 | Backend CRUD + ranking integration + frontend API swap |
| **B — Intelligence** | 3–4 | 13–19 | Standalone matcher + bidirectional extraction |
| **C — Surfaces** | 5 | 20–23 | Frontend recommendation UIs on both pages |
| **D — Integration** | 6 | 24–27 | Final contracts, tests, smoke |

Sub-slice A is self-contained and delivers immediate value (persisted aspirations that influence lead ranking). Each subsequent sub-slice builds incrementally.

---
