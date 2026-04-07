# Normalized Audit Report
Agent: Claude Opus 4.6 High

## Verdict
Likely vibe coded

## Confidence
High

## Executive summary
The codebase exhibits pervasive copy-paste duplication across both frontend services (~10 files re-implementing identical HTTP boilerplate alongside an unused centralized client) and backend extraction routes (5 files with identical scaffolding including a confirmed wrong-variable-name bug in one), dead ETL code calling undefined APIs, and documentation claiming infrastructure that does not exist. These are counterbalanced by thoughtful human-authored planning documents with specific metrics, schema-first contract generation, professional auth/security implementation, and genuine accessibility work in frontend components — indicating the architecture was designed intentionally but the bulk of route-level and service-level code was generated in volume and accepted without consolidation or review.

## Strongest evidence supporting the "vibe coded" hypothesis

1. **Frontend HTTP boilerplate duplicated ~10×, centralized client unused**
   - Files: contacts.tsx, applications.tsx, education.tsx, skills.tsx, experiences.tsx, certificates.tsx, crawlers.tsx, db-management.tsx, cover-letters.tsx, resumes.tsx
   - Issue: Each file re-implements identical `createRequestOptions()` and `fetchAPI()` functions (~500+ total duplicated lines). A well-designed centralized openapi-fetch client exists at api-client.ts but only leads.tsx imports it. `db-management.tsx` spells it `fetchApi` (camelCase) vs `fetchAPI` elsewhere — a copy-paste typo.
   - Why meaningful: Having both the correct abstraction and mass duplication coexist is a strong signal each service was generated independently and accepted without consolidation.
   - Severity: **high**

2. **Copy-paste variable-name bug in education.py**
   - File: education.py
   - Issue: `EducationCreate(**contact)` uses variable `contact` instead of the correct loop variable for education records, directly copied from contacts.py.
   - Why meaningful: A human reviewer would catch a wrong variable name immediately. This is direct proof of unreviewed mechanical duplication.
   - Severity: **high**

3. **Backend extraction pattern duplicated 5× with no shared abstraction**
   - Files: skills.py, contacts.py, certificate.py, education.py, experiences.py
   - Issue: Identical get-or-create-extractor → run-extractor → create-entities pattern repeated across all five files with no shared utility.
   - Why meaningful: Five files following identical structure without a common abstraction, combined with the copy-paste bug above, confirms each was generated from a common template and never refactored.
   - Severity: **high**

4. **ETL enrich module calls undefined APIs**
   - File: enrich.py
   - Issue: Calls `openai.chat_completion()` and references `conf.openai.COMPLETION_MODEL`, neither of which exist in the codebase. Imports deprecated `Job` class. Silently catches JSON parse errors.
   - Why meaningful: Code that cannot execute on its first invocation was committed and never tested — dead-on-arrival scaffolding.
   - Severity: **medium**

5. **Documentation claims Redis-backed crawler mode that does not exist**
   - File: extraction-and-automation.md lines 50-56
   - Issue: Claims "worker (Redis-backed queue)" execution mode. No Redis dependency in Pipfile, docker-compose.yml, or any application code. Crawlers run as FastAPI background tasks via crawler_scheduler.py.
   - Why meaningful: Documentation describing unimplemented architecture is characteristic of generating docs alongside aspirational design rather than documenting actual behavior.
   - Severity: **medium**

6. **deps.py god module (1,227 lines) with repeated entity-getter pattern**
   - File: deps.py
   - Issue: Mixes 6+ concerns (subscription gating, CRUD getters for 13+ entity types, crawler orchestration, document access control, event management). The get-entity → check-ownership → raise-403 pattern is repeated ~10 times without extraction.
   - Why meaningful: Single file accumulating all dependency concerns without refactoring into sub-modules suggests code was appended incrementally without periodic consolidation.
   - Severity: **medium**

7. **schemas.py monolith (2,159 lines) with duplicated stale TODOs**
   - File: schemas.py
   - Issue: 140+ Pydantic schema classes in one file. Lines 726 and 753 contain identical TODO comments about PDF parsing limitations, unchanged since initial generation.
   - Why meaningful: Identical stale TODOs at two locations indicate the code was generated, committed, and never revisited.
   - Severity: **medium**

8. **Dead/deprecated code retained without cleanup**
   - Files: base.py (~100 LOC deprecated `AsyncBaseModel`, `Job`, `Scrapper` classes), utils.py (`raise NotImplementedError("Only multi is supported for now.")`)
   - Issue: Deprecated classes and half-wired code paths remain live.
   - Why meaningful: Reviewed codebases remove deprecated code when replacements land.
   - Severity: **low**

## Strongest counter-evidence

1. **Planning documents are human-authored with specific metrics**
   - Files: REPO_EXECUTION_PLAN.md, POLISH_PHASE_PLAN.md, UX_POLISH_PLAN.md
   - What indicates intentional engineering: Concrete repo-state metrics ("197 backend endpoints," "68% coverage against 60% floor"), critical self-assessments, phase-gated delivery plans, product design reasoning.
   - Why it weakens the hypothesis: Demonstrates genuine human architectural thinking. The planning layer was not vibe coded.

2. **Schema-first contract generation with enforcement**
   - Files: update_frontend_schemas.sh, schema.d.ts, api-client.ts
   - What indicates intentional engineering: OpenAPI spec generated from backend Pydantic models, TypeScript types derived via `openapi-typescript`, project instructions prohibit hand-editing generated artifacts.
   - Why it weakens the hypothesis: Deliberate contract-first architecture requiring understanding of typed API development.

3. **Professional auth, security, and infrastructure patterns**
   - Files: security.py, crawler_scheduler.py, db.py
   - What indicates intentional engineering: Fernet-based MFA encryption with key derivation, JWT strategy via FastAPI Users, PostgreSQL advisory locks for leader election, structured logging with correlation IDs.
   - Why it weakens the hypothesis: Security and infrastructure code requiring domain expertise was implemented correctly.

4. **Accessibility and component quality in frontend**
   - Files: lead-card.tsx, tier-gate.tsx, theme-provider.tsx
   - What indicates intentional engineering: ARIA labels, keyboard handlers, `role="button"` attributes, comprehensive MUI dark-mode theme overrides.
   - Why it weakens the hypothesis: Accessibility work is rarely produced by prompting without explicit attention.

5. **Substantive integration tests on core surfaces**
   - Files: test_leads.py, test_crawlers.py, test_extractor_runtime.py
   - What indicates intentional engineering: Real database state assertions, auth enforcement, behavior validation on core workflows.
   - Why it weakens the hypothesis: Tests validate real behavior, not just code structure.

## Highest-risk areas

1. **frontend/src/service/*.tsx (all ~11 service files)**
   - Why high signal: Single largest body of verbatim duplication (~500+ lines) with unused centralized alternative alongside it. Affects every API call the frontend makes.
   - Risk type: **maintainability**

2. **education.py (and 4 sibling extraction routes)**
   - Why high signal: Confirmed runtime bug (wrong variable name) proving unreviewed copy-paste. The extraction route cluster is the clearest generated-not-refactored example.
   - Risk type: **correctness**

3. **deps.py**
   - Why high signal: 1,227-line module mixing 6+ concerns with duplicated patterns. Every route depends on it; changes to any concern risk regressions in unrelated areas.
   - Risk type: **architecture**

4. **backend/app/tests/ (missing coverage for applications and 7 other route modules)**
   - Why high signal: Most complex user-facing route (applications) has zero dedicated tests. CI uses `postgres:15` instead of `pgvector:pg15`, so vector/RAG operations are also untested in CI.
   - Risk type: **test coverage**

## Key uncertainties

1. **Broad exception handlers may be intentional for a prototype.** The 20+ `except Exception` clauses across crawler_scheduler.py, collaboration.py, `core/db.py`, `core/rag/nodes.py`, etc. could be deliberate "keep running" choices for a local-first developer preview rather than carelessness. Without runtime error logs, the actual impact is unclear.

2. **Deprecated routes (cover_letters, resumes) may be intentionally soft-deprecated.** They are marked `deprecated=True` but still accept mutations. Could be a planned migration path or an oversight — the code alone does not clarify.

3. **Planning-vs-implementation quality gap is ambiguous.** The plans show clear architectural awareness and debt tracking. This is consistent with either (a) a skilled engineer who uses AI for volume work and reviews selectively, or (b) an engineer who plans well but does not follow through on code-level consolidation.

4. **Frontend component quality vs. service-layer quality diverge sharply.** Components show craft (accessibility, keyboard nav) while services show mass duplication. This could indicate different authorship approaches per layer, or that components were hand-tuned while services were batch-generated.

5. **Actual test coverage distribution is uncertain.** Plans cite 68% overall coverage, and the 60% CI gate passes, but the gap is concentrated in user-facing routes. Without running coverage, the exact distribution per module is unknown.

## Deduplicated findings ledger

| Theme | File path(s) / subsystem | Supports vibe-coded? | Severity | Notes |
|---|---|---|---|---|
| Mass HTTP boilerplate duplication | `frontend/src/service/*.tsx` (10 files) | Yes | High | ~500+ duplicated lines; centralized `api-client.ts` exists but only `leads.tsx` uses it |
| Copy-paste variable-name bug | `backend/app/api/routes/education.py:119` | Yes | High | `EducationCreate(**contact)` — wrong variable, copied from contacts.py |
| Extraction route pattern ×5 | `backend/app/api/routes/{skills,contacts,certificate,education,experiences}.py` | Yes | High | Identical get-or-create → run → create pattern, no shared utility |
| Dead-on-arrival ETL code | enrich.py | Yes | Medium | Calls undefined `openai.chat_completion()`, imports deprecated `Job` |
| Docs claim nonexistent Redis infra | extraction-and-automation.md | Yes | Medium | Claims Redis-backed worker mode; no Redis in codebase |
| God module accumulation | deps.py (1,227 lines) | Yes | Medium | 6+ concerns, ~10× duplicated entity-getter pattern |
| Monolithic schema file | schemas.py (2,159 lines) | Yes | Medium | 140+ classes, identical stale TODOs at lines 726 and 753 |
| Missing route tests | tests | Yes | Medium | No test_applications +7 others; CI DB lacks pgvector |
| Dead/deprecated code retained | base.py, `backend/app/utils.py:295` | Yes | Low | ~100 LOC deprecated classes; `NotImplementedError` in live path |
| Broad exception swallowing | crawler_scheduler.py, `core/db.py`, `core/rag/nodes.py` (20+ sites) | Weak yes | Low | May be intentional for prototype resilience |
| Thoughtful planning docs | `plans/{REPO_EXECUTION_PLAN,POLISH_PHASE_PLAN,UX_POLISH_PLAN}.md` | No | — | Specific metrics, critical assessments, phase gates |
| Schema-first contract pipeline | update_frontend_schemas.sh, schema.d.ts | No | — | Deliberate architectural choice with enforcement rules |
| Professional auth/security | security.py, crawler_scheduler.py, `core/db.py` | No | — | Fernet MFA, advisory locks, JWT strategy |
| Frontend accessibility craft | `frontend/src/component/{lead-card,tier-gate}.tsx`, `theme/theme-provider.tsx` | No | — | ARIA labels, keyboard nav, dark-mode overrides |
| Substantive integration tests | test_leads.py, `test_crawlers.py`, `test_extractor_runtime.py` | No | — | Real DB assertions, auth enforcement, behavior validation |
