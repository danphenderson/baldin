# AI-Slop Remediation Plan

Source of truth: `executive-summary.md` (final verdict: mixed/inconclusive).
Planning surface only — no implementation in this document.

**Status tracker:**
| Phase | Status | Validation |
|-------|--------|------------|
| Phase 1 — T1 credential leak | ✅ Complete | `tsc --noEmit` 0 errors, no auth headers in thrown errors |
| Phase 1 — T2 dead ETL | ✅ Complete | `ruff check backend/etl/` passes, `enrich.py` deleted |
| Phase 1 — T3 Redis docs drift | ✅ Complete | `npm --prefix docs run build` passes, Redis claims corrected |
| Phase 2 — T7 applications tests | ✅ Complete | 16 tests passing, `pytest -k application` green |
| Phase 3 — T4+T5 frontend migration | ✅ Complete | `tsc --noEmit` 0 errors, 71/71 tests pass, `vite build` succeeds |
| Phase 4 — T6 extractor CRUD | ✅ Complete | `ruff check` passes, shared helper in deps.py, typo fixed, no API changes |

---

## 1. Objective Summary

Close the concrete quality gaps identified in the executive summary without
regressing the codebase's real strengths (CI gates, contract freshness, security
hardening, extractor traceability). The goal is a measurably cleaner, more
defensible repo where the highest-signal evidence of unreviewed AI-generated
code has been eliminated or reduced to a manageable, documented residual.

Work is sequenced so each phase leaves the repo in a self-consistent state,
security and dead-code fixes ship first, large refactors follow, and no phase
depends on speculative future architecture.

---

## 2. Source-of-Truth Findings Distilled into Work Themes

### Immediate risk remediation (Phase 1)

| ID | Theme | Severity | Summary |
|----|-------|----------|---------|
| T1 | Credential leak in `extractor.tsx` | **High / security** | Thrown errors serialize the full `RequestInit` including auth headers. |
| T2 | Dead ETL code `etl/leads/enrich.py` | **Medium / dead code** | Imports nonexistent `app.core.openai`; cannot execute. |
| T3 | Docs claim nonexistent Redis worker mode | **Medium / drift** | `extraction-and-automation.md` describes infrastructure the repo does not implement. |

### Structural refactors (Phases 2–4)

| ID | Theme | Severity | Summary |
|----|-------|----------|---------|
| T4 | Frontend service-layer duplication | **High / maintainability** | 18 service modules duplicate local request wrappers; only `leads.tsx` uses the shared typed client. |
| T5 | Applications vertical inefficiencies | **High / performance + coupling** | Detail page loads full list and filters. Shared hook adds N+1 document queries. |
| T6 | Repetitive extractor-backed CRUD scaffolding | **High / maintainability** | Contacts, education, experiences, certificates repeat the same scaffold with copy-paste artifacts. |
| T7 | Thin applications route-level test coverage | **High / validation** | Only `test_application_export.py` directly tests the applications route surface. |

---

## 3. Owner-Selection Rationale

| Theme | Owner | Why |
|-------|-------|-----|
| T1 — Credential leak in `extractor.tsx` | **Baldin Frontend Agent** | Single-file frontend security fix. No backend or contract surface touched. |
| T2 — Dead ETL code | **Baldin Backend Agent** | File lives under `backend/etl/`. Pure backend deletion. |
| T3 — Docs drift (Redis worker claim) | **Baldin Lead Full-Stack Architect** | Docs-source editing and rebuild is a cross-stack responsibility per repo rules. |
| T4 — Frontend service migration | **Baldin Frontend Agent** | All files under `frontend/src/service/`. Single-owner to avoid merge conflicts across tightly coupled modules. |
| T5 — Applications vertical fixes | **Baldin Frontend Agent** (frontend paths) + **Baldin Backend Agent** (backend test gap) | Frontend detail-page and hook changes are frontend-owned. Backend test additions are backend-owned. These touch different directories and can be sequenced to avoid overlap. |
| T6 — Extractor CRUD consolidation | **Baldin Backend Agent** | All affected route files under `backend/app/api/routes/`. Pure backend refactor. |
| T7 — Applications test coverage | **Baldin Backend Agent** | Tests live under `backend/app/tests/`. Backend-only. |

**Single-owner constraints:**
- T4 (frontend service migration) **must** stay single-owner. The 18 service modules share patterns, auth helpers, and error-handling conventions. Splitting across agents would create merge hell.
- T6 (extractor CRUD consolidation) **must** stay single-owner because the four route files share a common extraction pattern that should be refactored in one coherent pass.

---

## 4. Phased Execution Plan

### Phase 1 — Immediate Risk Remediation

**Goal:** Eliminate the security leak, remove dead code, and correct the most
misleading documentation claim.

**Why now:** T1 is a concrete credential-exposure path; T2 is code that cannot
execute and should not ship; T3 overstates the repo's architecture. All three
are small, bounded, and have no downstream dependencies.

**Scope:**
- T1: Strip serialized request options from thrown errors in `extractor.tsx`.
- T2: Delete or quarantine `backend/etl/leads/enrich.py`.
- T3: Correct the Redis worker claim in `docs/docs/features/extraction-and-automation.md`.

**Non-goals:**
- Migrating `extractor.tsx` to the shared typed client (that is Phase 3 work).
- Auditing all ETL code (only `enrich.py` is confirmed dead).
- Rewriting the full extraction docs (only the Redis-worker claim is in scope).

**Owners:** Baldin Frontend Agent (T1), Baldin Backend Agent (T2), Baldin Lead
Full-Stack Architect (T3).

**Dependencies:** None. All three workstreams are independent and can run in
parallel.

**Validation gate:**
- T1: `npm run test`, `npx tsc --noEmit` pass. Manual confirmation that thrown
  errors no longer contain `authorization` headers.
- T2: `ruff check backend/etl/` passes. No import errors introduced. Confirm
  file is deleted or moved to a quarantine directory.
- T3: `npm --prefix docs run build` passes. Confirm the Redis worker language is
  removed or relabeled as planned/not-implemented.

**Completion criteria:** All three fixes merged, validation evidence recorded,
no new test failures introduced.

**Handoff:** Phase 1 has no follow-on owners. Phase 2 can start immediately
after Phase 1 merges.

---

### Phase 2 — Applications Backend Test Coverage

**Goal:** Add direct backend route-level tests for the applications surface
before the frontend refactors that depend on the backend contract behaving as
documented.

**Why now:** T7 is a prerequisite safety net. Before Phase 3 changes the
frontend's consumption pattern for applications endpoints, the backend contract
must have direct test coverage so regressions are caught.

**Scope:**
- Add targeted tests for applications CRUD routes (create, read, update, delete).
- Add targeted tests for status-history transitions.
- Add targeted tests for attachment upload and retrieval flows.
- Preserve existing `test_application_export.py`.

**Non-goals:**
- Rewriting the applications routes.
- Achieving 100% branch coverage — target the highest-risk flows.
- Changing API behavior or response shapes.

**Owner:** Baldin Backend Agent.

**Dependencies:** None (Phase 1 is independent of this work, but Phase 2 should
not merge before Phase 1 to keep review load manageable).

**Validation gate:**
- `pytest backend/app/tests/ -k application` passes.
- `ruff check backend/app/` passes.
- Coverage for `backend/app/api/routes/applications.py` has measurably increased.
- No API route or schema changes.

**Completion criteria:** New test file(s) exist, tests pass, coverage for the
applications route module is demonstrably higher than before.

**Handoff:** Phase 3 frontend applications work can begin with confidence that
the backend contract is validated.

---

### Phase 3 — Frontend Service-Layer Migration and Applications Vertical Fix

**Goal:** Migrate frontend service modules onto the shared typed client and fix
the applications detail-page and N+1 inefficiencies.

**Why now:** T4 is the highest-leverage maintainability fix in the repo, and T5
is the most visible user-facing inefficiency. Grouping them lets the Frontend
Agent make one coherent pass across the service layer. Phase 2's backend test
coverage de-risks the applications contract changes.

**Scope:**
- **T4:** Migrate the remaining 18 service modules from local
  `createRequestOptions()`/`fetchAPI()` wrappers to the shared
  `createApiClient()` pattern established in `leads.tsx`. Remove the local
  wrapper functions once each module is migrated.
- **T5a:** Wire `applications-detail-page.tsx` to use `GET /applications/{id}`
  via the newly migrated applications service client instead of loading the full
  list and filtering client-side.
- **T5b:** Eliminate the N+1 document-metadata fetch loop in
  `use-applications.ts`. Replace with a batch fetch or remove the per-application
  document count if it is not critical to the list view.

**Non-goals:**
- Adding new API endpoints (the backend already has `GET /applications/{id}`).
- Changing the shared `api-client.ts` factory itself.
- Migrating non-service frontend code.
- Changing backend routes or schemas.

**Owner:** Baldin Frontend Agent (single-owner for the entire phase).

**Dependencies:**
- Phase 2 (applications backend tests) should be complete so the backend
  contract has coverage before the frontend changes its consumption pattern.
- If any service module migration reveals a backend contract gap (e.g., a
  response shape the typed client cannot represent), escalate to Baldin Lead
  Full-Stack Architect for contract follow-on.

**Validation gate:**
- `npm run test` passes.
- `npx tsc --noEmit` passes.
- `npm run build` passes with non-localhost `VITE_API_URL`.
- No local `createRequestOptions()` or `fetchAPI()` wrappers remain in service
  modules (grep verification).
- Applications detail page loads via the detail endpoint (manual or test
  confirmation).
- No N+1 document queries visible in the applications hook.

**Completion criteria:** All 18 service modules use the shared client. The
applications detail page uses the dedicated endpoint. The N+1 document loop is
eliminated.

**Handoff:** If any backend contract gaps are discovered during migration,
the Baldin Lead Full-Stack Architect is next owner for contract regeneration
with downstream Baldin Frontend Agent review.

---

### Phase 4 — Extractor CRUD Route Consolidation

**Goal:** Extract a shared backend helper for the repeated extractor-backed
create-route scaffold and clean up copy-paste artifacts.

**Why now:** T6 is the second-largest body of duplicated code in the repo, but
it is lower-priority than the frontend service migration because it does not
create runtime risk or user-facing inefficiency. Sequencing it last avoids
backend merge conflicts with the Phase 2 test additions.

**Scope:**
- Extract a common helper (function or thin base) for the
  get-or-create-extractor → run-extractor → create-records pattern shared by
  `contacts.py`, `education.py`, `experiences.py`, and `certificate.py`.
- Clean up semantic copy-paste artifacts (e.g., misleading variable names in
  `education.py` that were copied from the contacts flow).
- Update the four route modules to use the shared helper.
- Add or update targeted tests to cover the refactored extraction path.

**Non-goals:**
- Rewriting the extraction service or extractor framework itself.
- Adding new extraction capabilities.
- Changing API response shapes.
- Touching routes that do not use the extraction scaffold.

**Owner:** Baldin Backend Agent.

**Dependencies:**
- Phase 2 should be complete so existing backend tests provide a regression net.
- Should not run in parallel with Phase 2 (both touch `backend/app/`).

**Validation gate:**
- `pytest backend/app/tests/` passes (full backend test suite).
- `ruff check backend/app/` passes.
- No API route or schema changes (OpenAPI spec unchanged).
- The duplicated scaffold pattern is reduced to a single implementation with
  per-route call sites.

**Completion criteria:** The four extraction route modules delegate to a shared
helper. Copy-paste variable-name artifacts are cleaned up. Tests pass.

**Handoff:** If the refactor changes any response shape or OpenAPI behavior
(it should not), escalate to Baldin Lead Full-Stack Architect for contract
regeneration.

---

## 5. Workstreams and Sequencing

```
Phase 1 (parallel, independent workstreams):
  ├── T1: extractor.tsx credential leak fix  ─── Frontend Agent
  ├── T2: dead ETL code removal              ─── Backend Agent
  └── T3: docs Redis-worker correction       ─── Lead Full-Stack Architect
       │
       ▼
Phase 2 (sequential, backend-only):
  └── T7: applications backend test coverage ─── Backend Agent
       │
       ▼
Phase 3 (sequential, frontend-only):
  └── T4 + T5: service migration + apps fix  ─── Frontend Agent
       │
       ▼
Phase 4 (sequential, backend-only):
  └── T6: extractor CRUD consolidation       ─── Backend Agent
```

### Parallelism

- **Phase 1** workstreams T1, T2, and T3 are fully independent and can run in
  parallel. They touch `frontend/src/service/extractor.tsx`,
  `backend/etl/leads/enrich.py`, and `docs/docs/features/extraction-and-automation.md`
  respectively — no file overlap.

### Sequential constraints

- **Phase 2 before Phase 3:** Backend applications test coverage must exist
  before the frontend changes its consumption pattern for applications endpoints.
- **Phase 2 before Phase 4:** Both phases touch `backend/app/`. Running them
  serially avoids merge conflicts in test infrastructure and route files.
- **Phase 3 before Phase 4 is preferred but not required:** Phase 3 (frontend)
  and Phase 4 (backend routes) touch different directories and could technically
  run in parallel, but keeping them serial simplifies review and avoids any
  surprise if the extraction route refactor changes behavior the frontend was
  just wired to consume.

### Merge-risk areas

| Risk | Mitigation |
|------|------------|
| 18 service-module edits in Phase 3 create a large diff | Single-owner execution; batch by module group if needed |
| Phase 2 and Phase 4 both touch `backend/app/` | Sequential execution; Phase 4 starts after Phase 2 merges |
| Phase 3 might discover backend contract gaps | Explicit escalation path to Lead Full-Stack Architect |
| Docs rebuild in Phase 1 T3 might conflict with other docs work | T3 is small and isolated to one feature doc |

### Critical path

Phase 1 (all three) → Phase 2 (backend tests) → Phase 3 (frontend migration +
apps fix) → Phase 4 (backend extraction consolidation).

Phase 3 is the highest-impact single workstream and the largest diff. It is
gated on Phase 2 completing first.

---

## 6. Agent Handoff Packets

### 6.1 — Phase 1, T1: Credential Leak Fix

- **Agent:** Baldin Frontend Agent
- **Objective:** Remove the credential-bearing error serialization in `frontend/src/service/extractor.tsx`.
- **Why this owner:** Single-file frontend security fix, no backend surface.
- **Context:** Line 62 of `extractor.tsx` throws an error that includes `JSON.stringify(options)`, which serializes the full `RequestInit` including the `Authorization: Bearer <token>` header. This is finding T1 / severity high from `executive-summary.md`.
- **In scope:**
  - Remove or redact the serialized request options from thrown error messages in `extractor.tsx`.
  - Ensure the error message still contains enough information for debugging (URL, status code, response body summary) without leaking credentials.
  - Apply the same fix to any other throw sites in the same file that serialize request options.
- **Out of scope:**
  - Migrating `extractor.tsx` to the shared typed client (Phase 3).
  - Fixing other service modules.
  - Backend changes.
- **Allowed paths:** `frontend/src/service/extractor.tsx`, `frontend/src/service/__tests__/` (if tests exist).
- **Files or subsystems likely affected:** `frontend/src/service/extractor.tsx`.
- **Dependencies or prerequisite findings:** None.
- **Repo constraints to honor:**
  - Do not change API behavior or response handling beyond the error serialization.
  - Do not hand-edit generated artifacts.
- **Required validation:**
  - `npm run test` passes.
  - `npx tsc --noEmit` passes.
  - Confirm via code inspection that no `Authorization` header values appear in thrown error strings.
- **Deliverables:** Patched `extractor.tsx` with safe error messages.
- **Escalate if:** The credential leak pattern exists in other service modules beyond `extractor.tsx` (note it for Phase 3, do not fix in this workstream).
- **Return format:**
  - Status: complete, partial, or blocked.
  - Summary: what changed and why.
  - Files touched or reviewed.
  - Commands run and result summary.
  - Whether API routes or schemas changed.
  - Whether generated artifacts were regenerated, intentionally deferred, or unchanged.
  - Risks, blockers, or assumptions.
  - Recommended next owner, if any.

---

### 6.2 — Phase 1, T2: Dead ETL Code Removal

- **Agent:** Baldin Backend Agent
- **Objective:** Remove the non-executable `backend/etl/leads/enrich.py` module.
- **Why this owner:** File lives under `backend/etl/`, squarely in backend ownership.
- **Context:** `enrich.py` imports `from app.core import conf, openai`, but no `openai` module exists under `app/core/`. The file cannot execute. This is finding T2 / severity medium from `executive-summary.md`.
- **In scope:**
  - Delete `backend/etl/leads/enrich.py`.
  - Check whether any other module imports from `backend/etl/leads/enrich`. If so, remove the dead import.
  - If the `backend/etl/leads/` directory becomes empty or contains only `__init__.py`, leave it (do not delete the package structure unless it is truly empty).
- **Out of scope:**
  - Auditing or rewriting other ETL modules.
  - Adding new ETL functionality.
  - Touching anything outside `backend/etl/`.
- **Allowed paths:** `backend/etl/leads/`.
- **Files or subsystems likely affected:** `backend/etl/leads/enrich.py`, possibly `backend/etl/leads/__init__.py`.
- **Dependencies or prerequisite findings:** None.
- **Repo constraints to honor:**
  - Run `ruff check` on the affected path.
  - Do not touch modules that are functional.
- **Required validation:**
  - `ruff check backend/etl/` passes.
  - No import errors introduced (grep for `enrich` imports across the repo).
  - Confirm the deleted file is gone.
- **Deliverables:** Deleted `enrich.py` file; clean lint.
- **Escalate if:** Other ETL files also have dead imports that prevent execution (note them but do not fix in this workstream).
- **Return format:**
  - Status: complete, partial, or blocked.
  - Summary: what changed and why.
  - Files touched or reviewed.
  - Commands run and result summary.
  - Whether API routes or schemas changed.
  - Whether generated artifacts were regenerated, intentionally deferred, or unchanged.
  - Risks, blockers, or assumptions.
  - Recommended next owner, if any.

---

### 6.3 — Phase 1, T3: Docs Redis-Worker Correction

- **Agent:** Baldin Lead Full-Stack Architect
- **Objective:** Correct the Redis-worker-mode documentation in `docs/docs/features/extraction-and-automation.md` so it no longer claims infrastructure the repo does not implement.
- **Why this owner:** Docs-source editing and docs-build regeneration is cross-stack / Lead Full-Stack Architect responsibility.
- **Context:** The extraction-and-automation feature doc describes "inline" and "worker (Redis-backed queue)" execution modes. The checked-in runtime is an in-process scheduler loop (`backend/app/crawler_scheduler.py`), and no Redis dependency exists in `docker-compose.yml` or backend dependencies. This is finding T3 / severity medium from `executive-summary.md`.
- **In scope:**
  - Edit `docs/docs/features/extraction-and-automation.md` to remove the Redis-worker description or clearly relabel it as "planned / not yet implemented."
  - Ensure the document accurately describes the current in-process scheduler behavior.
  - Regenerate `docs/build/` from the corrected source.
- **Out of scope:**
  - Implementing a Redis worker mode.
  - Rewriting the entire extraction docs page.
  - Changing backend scheduler code.
- **Allowed paths:** `docs/docs/features/extraction-and-automation.md`, `docs/build/`.
- **Files or subsystems likely affected:** `docs/docs/features/extraction-and-automation.md`, generated `docs/build/` output.
- **Dependencies or prerequisite findings:** None.
- **Repo constraints to honor:**
  - Edit source under `docs/docs/`; treat `docs/build/` as generated output.
  - `npm --prefix docs run build` must pass after the edit.
- **Required validation:**
  - `npm --prefix docs run build` passes.
  - Confirm the Redis-worker language is removed or relabeled.
- **Deliverables:** Corrected feature doc source; clean docs build.
- **Escalate if:** Other docs pages reference Redis worker mode (search for "Redis" in `docs/docs/`; note any additional drift but correct only the in-scope file).
- **Return format:**
  - Status: complete, partial, or blocked.
  - Summary: what changed and why.
  - Files touched or reviewed.
  - Commands run and result summary.
  - Whether API routes or schemas changed.
  - Whether generated artifacts were regenerated, intentionally deferred, or unchanged.
  - Risks, blockers, or assumptions.
  - Recommended next owner, if any.

---

### 6.4 — Phase 2, T7: Applications Backend Test Coverage

- **Agent:** Baldin Backend Agent
- **Objective:** Add direct backend route-level tests for the applications CRUD, status-history, and attachment flows.
- **Why this owner:** All work under `backend/app/tests/`. Backend-only.
- **Context:** The applications route module (`backend/app/api/routes/applications.py`) owns CRUD, status history, attachments, and generation, but the only dedicated applications test module is `test_application_export.py`. This is finding T7 / severity high from `executive-summary.md`. This test coverage is needed as a safety net before Phase 3 changes how the frontend consumes these endpoints.
- **In scope:**
  - Create a new test module (e.g., `backend/app/tests/test_applications_routes.py`) with targeted tests for:
    - Create, read (list and detail), update, delete application flows.
    - Status-history transitions.
    - Attachment upload and retrieval.
  - Use the existing test infrastructure and fixtures (see `backend/app/conftest.py`).
  - Target the highest-risk and highest-traffic paths; do not aim for exhaustive branch coverage.
- **Out of scope:**
  - Changing application routes or schemas.
  - Testing generation endpoints (lower priority).
  - Touching frontend code.
  - Achieving a specific numeric coverage target.
- **Allowed paths:** `backend/app/tests/`, `backend/app/conftest.py` (read for fixtures).
- **Files or subsystems likely affected:** New file `backend/app/tests/test_applications_routes.py` (or similar).
- **Dependencies or prerequisite findings:** Phase 1 T2 should be merged first to keep the review queue clean, but there is no technical dependency.
- **Repo constraints to honor:**
  - Preserve existing tests.
  - Do not change API routes or schemas.
  - Follow existing test patterns and fixture conventions.
- **Required validation:**
  - `pytest backend/app/tests/ -k application` passes (both old and new tests).
  - `ruff check backend/app/tests/` passes.
  - No API route or schema changes.
- **Deliverables:** New test module with targeted applications-route coverage.
- **Escalate if:** Test setup reveals that the applications routes have behavior that diverges from the documented schema (note the divergence; do not fix in this workstream).
- **Return format:**
  - Status: complete, partial, or blocked.
  - Summary: what changed and why.
  - Files touched or reviewed.
  - Commands run and result summary.
  - Whether API routes or schemas changed.
  - Whether generated artifacts were regenerated, intentionally deferred, or unchanged.
  - Risks, blockers, or assumptions.
  - Recommended next owner, if any.

---

### 6.5 — Phase 3, T4 + T5: Frontend Service Migration and Applications Vertical Fix

- **Agent:** Baldin Frontend Agent
- **Objective:** Migrate the remaining 18 frontend service modules to the shared typed client (`api-client.ts`) and fix the applications detail-page list-filtering and N+1 document-loading inefficiencies.
- **Why this owner:** All work under `frontend/src/`. Single-owner to avoid merge conflicts across tightly coupled service modules.
- **Context:**
  - T4: `leads.tsx` uses `createApiClient()` from `api-client.ts`. The other 18 service modules still define local `createRequestOptions()` and `fetchAPI()` wrappers. This is finding T4 / severity high.
  - T5: `applications-detail-page.tsx` calls `getApplications()` and filters client-side despite `GET /applications/{id}` existing. `use-applications.ts` fetches document metadata per-application. This is finding T5 / severity high.
  - Phase 2 has added backend test coverage for the applications routes, so the backend contract is validated.
- **In scope:**
  - **T4:** For each of the 18 service modules, replace the local `createRequestOptions()` / `fetchAPI()` pattern with calls through the shared `createApiClient()`. Use `leads.tsx` as the migration template. Remove dead local wrapper functions after migration.
  - **T5a:** In `applications-detail-page.tsx`, replace the `getApplications()` + `.find()` pattern with a direct call to `GET /applications/{id}` via the migrated applications service.
  - **T5b:** In `use-applications.ts`, eliminate the per-application document-metadata fetch loop. Either batch the document query or remove the per-item document count from the list view if it is not essential.
  - While migrating `extractor.tsx` to the shared client, confirm the credential-leak fix from Phase 1 T1 is preserved.
- **Out of scope:**
  - Changing `api-client.ts` itself (unless a minor extension is needed for a content-type the current factory does not support, e.g., multipart upload).
  - Adding new backend endpoints.
  - Changing backend response shapes.
  - Migrating non-service frontend code (pages, components, hooks beyond the applications vertical).
- **Allowed paths:** `frontend/src/service/`, `frontend/src/page/applications/`, `frontend/src/schema.d.ts` (read-only reference).
- **Files or subsystems likely affected:**
  - `frontend/src/service/{applications,contacts,education,skills,experiences,certificates,crawlers,db-management,cover-letters,resumes,documents,action-items,review,users,companies,data-orchestration,activity-feed,extractor}.tsx`
  - `frontend/src/page/applications/applications-detail-page.tsx`
  - `frontend/src/page/applications/use-applications.ts`
- **Dependencies or prerequisite findings:**
  - Phase 2 (applications backend tests) must be complete.
  - Phase 1 T1 (credential-leak fix) must be merged.
- **Repo constraints to honor:**
  - Do not hand-edit `frontend/src/schema.d.ts`.
  - Production builds require `VITE_API_URL` to be non-localhost.
  - If a service migration reveals a backend contract gap that the typed client cannot represent, escalate to Baldin Lead Full-Stack Architect rather than working around it.
- **Required validation:**
  - `npm run test` passes.
  - `npx tsc --noEmit` passes.
  - `npm run build` passes (with non-localhost `VITE_API_URL`).
  - `grep -r "createRequestOptions" frontend/src/service/` returns zero matches.
  - `grep -r "fetchAPI" frontend/src/service/` returns zero matches (or only in `api-client.ts` if it defines the shared version).
  - Applications detail page loads a single application via the detail endpoint.
  - No per-application document-fetch loop in `use-applications.ts`.
- **Deliverables:**
  - All 18 service modules migrated to shared client.
  - Applications detail page wired to `GET /applications/{id}`.
  - N+1 document loop eliminated.
  - Clean test, typecheck, and build results.
- **Escalate if:**
  - Any service module migration reveals a backend contract gap.
  - The `api-client.ts` factory needs non-trivial extension (e.g., new auth flow, streaming, multipart).
  - A service module's API usage does not match the OpenAPI spec in `schema.d.ts`.
- **Return format:**
  - Status: complete, partial, or blocked.
  - Summary: what changed and why.
  - Files touched or reviewed.
  - Commands run and result summary.
  - Whether API routes or schemas changed.
  - Whether generated artifacts were regenerated, intentionally deferred, or unchanged.
  - Risks, blockers, or assumptions.
  - Recommended next owner, if any.

---

### 6.6 — Phase 4, T6: Extractor CRUD Route Consolidation

- **Agent:** Baldin Backend Agent
- **Objective:** Extract a shared helper for the extractor-backed create-route scaffold and clean up copy-paste artifacts across the four extraction route modules.
- **Why this owner:** All work under `backend/app/api/routes/`. Backend-only refactor.
- **Context:** `contacts.py`, `education.py`, `experiences.py`, and `certificate.py` repeat the same get-or-create-extractor → run-extractor → create-records pattern. `education.py` still uses the `contact` variable name copied from the contacts flow (the executive summary downgraded this from a runtime bug to a copy-paste artifact, but it is still a review-quality signal). This is finding T6 / severity high.
- **In scope:**
  - Create a shared helper function or thin utility under `backend/app/api/` (e.g., `backend/app/api/extraction_helpers.py` or similar) that encapsulates the common extraction scaffold.
  - Refactor `contacts.py`, `education.py`, `experiences.py`, and `certificate.py` to use the shared helper.
  - Clean up misleading variable names (e.g., `contact` in `education.py`).
  - Add or update tests to cover the shared extraction path.
- **Out of scope:**
  - Changing the extractor service or framework (`backend/app/core/extractor/`).
  - Adding new extraction routes.
  - Changing API response shapes or status codes.
  - Touching route modules that do not use the extraction scaffold.
- **Allowed paths:** `backend/app/api/routes/{contacts,education,experiences,certificate}.py`, `backend/app/api/` (for new helper), `backend/app/tests/`.
- **Files or subsystems likely affected:**
  - `backend/app/api/routes/contacts.py`
  - `backend/app/api/routes/education.py`
  - `backend/app/api/routes/experiences.py`
  - `backend/app/api/routes/certificate.py`
  - New file: `backend/app/api/extraction_helpers.py` (or similar)
  - `backend/app/tests/` (new or updated extraction tests)
- **Dependencies or prerequisite findings:**
  - Phase 2 (backend tests) should be merged so existing tests guard against regressions.
  - Should not run in parallel with Phase 2.
- **Repo constraints to honor:**
  - No API route or schema changes. The OpenAPI spec must remain identical.
  - Preserve the existing extraction behavior.
  - `ruff check` and `pytest` must pass.
- **Required validation:**
  - `pytest backend/app/tests/` passes (full backend suite).
  - `ruff check backend/app/` passes.
  - OpenAPI spec is unchanged (diff `openapi.json` before and after).
  - The four route modules now delegate to a shared helper.
  - No `contact` variable artifacts remain in `education.py`.
- **Deliverables:**
  - Shared extraction helper.
  - Refactored route modules.
  - Clean tests and lint.
- **Escalate if:**
  - The refactor inadvertently changes API behavior or response shapes (escalate to Baldin Lead Full-Stack Architect).
  - The extraction scaffold variations across the four modules are more divergent than expected and cannot be cleanly unified.
- **Return format:**
  - Status: complete, partial, or blocked.
  - Summary: what changed and why.
  - Files touched or reviewed.
  - Commands run and result summary.
  - Whether API routes or schemas changed.
  - Whether generated artifacts were regenerated, intentionally deferred, or unchanged.
  - Risks, blockers, or assumptions.
  - Recommended next owner, if any.

---

## 7. Integration Plan

### Merge order

1. **Phase 1 workstreams** (T1, T2, T3) can merge independently. No ordering
   constraint among them. Each is a small, self-contained fix.
2. **Phase 2** (T7) merges after Phase 1. It adds new tests only, no behavior
   change.
3. **Phase 3** (T4 + T5) merges after Phase 2. This is the largest diff and
   should be reviewed carefully. It changes frontend consumption patterns but
   not backend contracts.
4. **Phase 4** (T6) merges last. It refactors backend internals without
   changing API contracts.

### Contract regeneration

- **Phase 1:** No contract regeneration needed (no API or schema changes).
- **Phase 2:** No contract regeneration needed (tests only).
- **Phase 3:** No contract regeneration expected. If the Frontend Agent
  discovers that `schema.d.ts` types do not match actual backend behavior,
  escalate to Baldin Lead Full-Stack Architect for contract investigation and
  possible `./scripts/update_frontend_schemas.sh` run.
- **Phase 4:** No contract regeneration expected. If route refactoring
  inadvertently changes OpenAPI output, the Backend Agent must escalate to
  Baldin Lead Full-Stack Architect.

### Docs regeneration

- **Phase 1 T3** includes a docs rebuild. No further docs regeneration is
  expected unless later phases surface additional drift.

### Frontend follow-on review

- After Phase 4 merges, a brief Baldin Frontend Agent review pass is
  recommended to confirm that the extraction-route consolidation did not change
  any response shapes the frontend depends on. This is a lightweight read-only
  review, not a full workstream.

---

## 8. Validation Plan

| Phase | Owner | Required checks |
|-------|-------|-----------------|
| 1 T1 | Frontend Agent | `npm run test`, `npx tsc --noEmit`, manual error-message inspection |
| 1 T2 | Backend Agent | `ruff check backend/etl/`, repo-wide grep for `enrich` imports |
| 1 T3 | Lead Full-Stack Architect | `npm --prefix docs run build`, content review of corrected doc |
| 2 | Backend Agent | `pytest backend/app/tests/ -k application`, `ruff check backend/app/tests/` |
| 3 | Frontend Agent | `npm run test`, `npx tsc --noEmit`, `npm run build` (non-localhost `VITE_API_URL`), grep for eliminated wrappers |
| 4 | Backend Agent | `pytest backend/app/tests/` (full suite), `ruff check backend/app/`, `diff openapi.json` before/after |

**Evidence is mandatory.** No phase is marked complete until the assigned owner
reports passing validation results in their return format.

---

## 9. Risks, Blockers, and Assumptions

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Phase 3 service migration is larger than expected | Medium | High | Single-owner execution prevents parallelism problems. Allow the Frontend Agent to batch modules and merge incrementally if the diff exceeds comfortable review size. |
| Service migration reveals backend contract mismatches | Low–Medium | Medium | Explicit escalation path to Lead Full-Stack Architect. Phase 2 backend tests provide a verified contract baseline. |
| Phase 4 extraction refactor changes API behavior | Low | High | Require OpenAPI-diff validation. Existing + new backend tests catch regressions. |
| Multiple phases touching `backend/app/` create merge conflicts | Medium | Medium | Sequential execution (Phase 2 → Phase 4) with Phase 3 (frontend-only) in between. |
| Dead ETL removal reveals more dead code | Low | Low | Note additional findings for a future workstream; do not expand Phase 1 T2 scope. |
| Applications backend tests are hard to set up due to complex fixtures | Medium | Medium | Use existing `conftest.py` patterns. If fixture setup is blocked, return partial coverage and document the gap. |

### Assumptions

- The executive summary findings are accurate and current (confirmed by scouting: 9 of 10 findings validated, 1 already downgraded in the summary itself).
- The `leads.tsx` migration pattern is a viable template for all 18 remaining service modules.
- `GET /applications/{id}` returns the same `ApplicationRead` shape that the frontend currently expects from the list endpoint.
- No other team members are actively working on the files in scope.

---

## 10. Recommended First Dispatch

**Dispatch Phase 1 — all three workstreams in parallel (T1 to Frontend Agent,
T2 to Backend Agent, T3 to Lead Full-Stack Architect).**

Phase 1 is the correct first dispatch because it eliminates the only active
security vulnerability (credential leak), removes confirmed dead code, and
corrects the most misleading documentation claim — all with zero inter-workstream
dependencies, minimal diff size, and no risk of behavioral regression. Completing
Phase 1 first also establishes momentum and clears the review queue for the
larger structural phases that follow. Each workstream has a self-contained
handoff packet above and can be dispatched immediately.
