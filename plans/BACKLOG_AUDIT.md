# Backlog Audit: PR #130 (feat-sprint) vs Open Issues

**Date:** 2026-04-06
**Reviewer:** Copilot Cloud (Claude Opus 4.6)
**PR:** #130 — Sprint: Local-First Developer Preview, Frontend IA Redesign, Backend Hardening, and Collaboration Workflows
**Branch:** feat-sprint
**Total issues reviewed:** 38

---

## Summary

| Category | Count |
|----------|-------|
| Recommended for closure (implemented/superseded) | 14 |
| Recommended for closure (no longer aligned) | 7 |
| Updated for implementation (still active) | 13 |
| Needs human follow-up | 4 |
| **Total** | **38** |

---

## Issues Recommended for Closure

### Implemented or Superseded by PR #130

| Issue | Title | Disposition | Rationale |
|-------|-------|-------------|-----------|
| #102 | Fix: Admin UI Authentication & Authorization | Implemented | AdminAuthProvider with superuser login, session management, and custom login template now exist in `backend/app/admin.py` |
| #87 | Feat: backend database management API | Implemented | `backend/app/api/routes/db_management.py` provides table listing, user data purge, and user deletion with superuser-only auth |
| #84 | Feat: backend/dev.py ai assistant | Implemented | `backend/dev.py` exists as a Typer CLI with code generation, Q&A, and search commands |
| #92 | PDF download of cover letters and resumes | Implemented | Both `/resumes/{id}/download` and `/cover-letters/{id}/download` endpoints generate PDFs via ReportLab |
| #81 | Feat: frontend for extractor/ API | Implemented | `frontend/src/page/extractor.tsx` provides full extractor UI with runs, versions, and examples management |
| #80 | Feat: frontend for data_orchestration/ API | Implemented | `frontend/src/page/pipelines.tsx` provides pipeline/orchestration UI; extractor page also exists |
| #75 | Feat: git hook automating schema.d.ts generation | Implemented | CI `schema-freshness` job + pre-commit hook in `.pre-commit-config.yaml` ensure `openapi.json` and `schema.d.ts` stay current |
| #103 | Fix: Extractor API Clean-UP | Implemented | `backend/app/api/routes/extractor.py` is a well-structured 385-line module with proper dependency injection and clean endpoint organization |
| #91 | Fix: data-orchestration action buttons bug | Superseded | The `data-orchestration.tsx` page no longer exists; the entire frontend was redesigned with `pipelines.tsx` and the new routing architecture |
| #72 | Fix: UI bug when deleting application | Superseded | The entire application workflow was redesigned with queue, board, and detail views at `/applications/*` |
| #69 | Fix: DataGrid bugs | Superseded | The profile page and all DataGrid components were completely redesigned in the frontend IA overhaul |
| #71 | Question: refactoring API routes? | Superseded | The API surface was substantially refactored across all 24 route modules with new patterns for applications, documents, and generation |
| #120 | Fix: lead url extraction orchestration pipeline event | Superseded | The entire orchestration pipeline and lead extraction workflows were redesigned; the specific page and flow referenced no longer exist |
| #38 | Feat: data lake re-structure to definition | Superseded | Document storage is now centralized via `document_storage.py`; `DATALAKE_PATH` and `SEEDS_PATH` are defined in `conf.py`; the original flat-file structure was replaced by database-backed document management |

### No Longer Aligned with Current Direction

| Issue | Title | Disposition | Rationale |
|-------|-------|-------------|-----------|
| #122 | Feat: fastapi-mail integration | Not aligned | Baldin's local-first developer-preview direction has no email sending requirement; notifications are out of scope for the current hardening phases |
| #109 | Feat: 'gh issue' alias in ~/.zshrc | Not aligned | Personal developer environment configuration is not a repository concern |
| #90 | Fix: Beta Release registration token | Not aligned | The current direction is local-first developer-preview with Docker Compose, not gated beta access; FastAPI-Users handles auth |
| #74 | Chore: create Button common component | Not aligned | The frontend redesign uses MUI components directly; wrapper components add unnecessary abstraction for the current architecture |
| #70 | Feat: package backend etl and app individually | Not aligned | The backend is a single deployable unit via Docker; splitting packages adds complexity without benefit for local-first development |
| #66 | Feat: add Search & AutoComplete common components | Not aligned | MUI DataGrid has built-in column filtering; lead-search-bar.tsx handles lead-specific search; generic wrappers add unnecessary abstraction |
| #99 | Feat: /enrich API | Not aligned | LLM-powered extraction is handled by the extractor API; a separate enrichment endpoint duplicates the existing pattern without clear value for the current release direction |

---

## Issues Updated for Implementation

### Issue #10 — Backend: Increase test coverage to 60% and add frontend integration test scaffold

**Outcome:** 2 — Partially addressed by PR #130

**Why it matters:** PR #130 introduced 30 backend test files and a 40% coverage gate, but the original issue also called for frontend integration testing (Playwright), and coverage can be raised as the codebase stabilizes.

**Affected area:** `backend/app/tests/`, `frontend/`, `.github/workflows/ci.yml`

**In-scope:**
- Raise `--cov-fail-under` from 40 to 60 in CI
- Add targeted tests for uncovered backend routes (crawlers edge cases, document collaboration race conditions, message WebSocket handling)
- Add a Playwright-based frontend integration test scaffold that validates critical user flows (login → command center → create application)

**Non-goals:**
- 100% line coverage
- Visual regression testing
- Performance benchmarking

**Acceptance criteria:**
- Backend coverage ≥ 60% on `app` and `etl` modules
- At least one Playwright integration test runs in CI
- No regressions in existing test suite

**Dependencies:** None

---

### Issue #18 — Backend: Integrate Alembic for database migrations

**Outcome:** 1 — Still active and aligned

**Why it matters:** The codebase uses `create_all()` with additive `_sync_missing_columns()` for local development, and `db.py` contains a TODO comment noting Alembic migration integration is needed. Phase 5 of the execution plan explicitly requires "migration discipline."

**Affected area:** `backend/app/core/db.py`, `backend/app/models.py`, new `backend/alembic/` directory

**In-scope:**
- Initialize Alembic with async SQLAlchemy support
- Generate an initial migration from the current models
- Update `docker-compose.yml` to run migrations on startup
- Update `scripts/reset_local_db.sh` to handle migration state
- Preserve the `create_all()` fallback for PYTEST mode
- Document migration workflow in `docs/docs/engineering/`

**Non-goals:**
- Removing `_sync_missing_columns()` (keep as local dev safety net until Alembic is proven)
- Multi-database migration support

**Acceptance criteria:**
- `alembic upgrade head` applies cleanly to a fresh Postgres database
- `alembic revision --autogenerate` detects model changes
- CI backend-tests job runs migrations before pytest
- Existing developer workflow (`docker compose up`) still works without manual migration steps

**Dependencies:** None — this is a Phase 5 prerequisite and can start immediately

---

### Issue #51 — Backend: Audit and normalize datetime handling across API and models

**Outcome:** 5 — Still relevant if rewritten

**Why it matters:** The models use `func.now()` server-side defaults, but `applications.py` uses `datetime.utcnow().isoformat()` for `status_history`, and some fields lack timezone awareness. Inconsistent timestamps complicate client-side display and event ordering.

**Affected area:** `backend/app/models.py`, `backend/app/api/routes/applications.py`, `backend/app/schemas.py`

**In-scope:**
- Audit all datetime fields in models for consistent use of `func.now()` server defaults
- Replace `datetime.utcnow()` calls in route handlers with server-side defaults or `func.now()`
- Ensure all JSONB-embedded timestamps (e.g., `status_history`) use ISO 8601 with UTC timezone
- Add a `DateTimeUTC` type annotation or convention to prevent future drift

**Non-goals:**
- Changing the database column types from `DateTime` to `DateTime(timezone=True)` (separate migration concern)
- Client-side timezone display logic

**Acceptance criteria:**
- No Python-side `datetime.utcnow()` or `datetime.now()` calls remain in route handlers
- All JSONB timestamp values include timezone indicator
- Existing tests pass without modification

**Dependencies:** #18 (Alembic) if column type changes are needed

---

### Issue #54 — Backend: Add structured JSON logging for API requests

**Outcome:** 2 — Partially addressed by PR #130

**Why it matters:** `LOGGING_LEVEL` is configurable and basic logging exists, but there is no structured JSON log output, no request/response correlation IDs, and no file-based log persistence for local debugging.

**Affected area:** `backend/app/core/conf.py`, `backend/app/main.py`, new `backend/app/core/logging.py`

**In-scope:**
- Add a structured JSON log formatter (using `python-json-logger` or stdlib)
- Add request correlation ID middleware that propagates through log records
- Configure file-based log output under `PUBLIC_ASSETS_DIR/logs/` in DEV mode
- Preserve human-readable console output as default for local development

**Non-goals:**
- External log aggregation (ELK, CloudWatch)
- LangSmith or OpenAI-specific tracing (separate concern)
- Performance profiling or APM

**Acceptance criteria:**
- API requests in DEV mode produce JSON log lines with timestamp, level, correlation ID, path, and status
- Log files are written to `public/logs/` in DEV mode
- PYTEST mode continues to use console-only logging
- No new dependencies larger than `python-json-logger`

**Dependencies:** None

---

### Issue #55 — Backend: Add vector store support for document-aware RAG queries

**Outcome:** 5 — Still relevant if rewritten (narrowed scope)

**Why it matters:** The extractor API handles structured LLM extraction, but there is no semantic search over user documents. As the Document Studio grows, users will need to query across their document corpus for resume tailoring and application prep.

**Affected area:** `backend/app/core/langchain.py`, `backend/app/models.py`, new embedding infrastructure

**In-scope:**
- Evaluate pgvector vs. in-memory FAISS for local-first vector storage
- Add document embedding generation on document create/update
- Add a `/documents/search` endpoint for semantic similarity queries
- Integrate with existing LangChain OpenAI configuration

**Non-goals:**
- Full RAG agent with multi-turn conversation
- Fine-tuning or model training
- LangGraph or multi-agent orchestration
- Replacing the existing extractor API

**Acceptance criteria:**
- Documents can be embedded and queried by semantic similarity
- Vector store works in local Docker Compose setup without external services
- At least one test validates embedding creation and retrieval
- No breaking changes to existing extractor or document APIs

**Dependencies:** Requires decision on vector store backend (pgvector recommended for single-database simplicity)

---

### Issue #73 — CI: Replace isort + black + flake8 with ruff in pre-commit

**Outcome:** 1 — Still active and aligned

**Why it matters:** Ruff replaces isort, black, and flake8 with a single tool that is significantly faster. The current pre-commit configuration uses three separate hooks that can be consolidated.

**Affected area:** `.pre-commit-config.yaml`, `backend/pyproject.toml` or `ruff.toml`

**In-scope:**
- Replace isort, black, and flake8 hooks with ruff lint + ruff format
- Configure ruff rules to match current isort/black/flake8 settings (E203, E501, W503 ignores)
- Update CI workflow if pre-commit step references specific tools
- Verify all existing backend files pass ruff with zero changes

**Non-goals:**
- Enabling additional ruff rules beyond current coverage
- Adding type-checking rules (mypy/pyright)
- Changing frontend linting

**Acceptance criteria:**
- `.pre-commit-config.yaml` uses ruff instead of isort, black, and flake8
- `pre-commit run --all-files` passes on the current backend codebase
- CI lint job passes without changes

**Dependencies:** None

---

### Issue #76 — Auth: Enforce minimum password requirements on registration

**Outcome:** 5 — Still relevant if rewritten

**Why it matters:** FastAPI-Users allows registration with empty or trivially short passwords by default. The original bug report noted users can register without a password but cannot log in afterward.

**Affected area:** `backend/app/core/security.py`, `backend/app/schemas.py`

**In-scope:**
- Add a `PasswordValidator` to `UserManager` that enforces minimum length (≥8 characters)
- Return a clear 422 error for passwords that don't meet requirements
- Add a test that verifies empty-password and short-password registration is rejected

**Non-goals:**
- Complex password strength rules (uppercase, special chars)
- Password breach database checks
- Rate limiting on registration (separate concern)

**Acceptance criteria:**
- POST `/auth/register` with empty password returns 422
- POST `/auth/register` with password < 8 characters returns 422
- Existing registration tests continue to pass
- Error message clearly states the minimum requirement

**Dependencies:** None

---

### Issue #82 — ETL: Harden LinkedIn and Glassdoor crawler reliability

**Outcome:** 5 — Still relevant if rewritten

**Why it matters:** The `etl/linkedin/` and `etl/glassdoor/` crawlers exist with Playwright-based scrapers, but they depend on hardcoded credentials in `conf.py` and lack error recovery, rate limiting, and structured output validation.

**Affected area:** `backend/etl/linkedin/`, `backend/etl/glassdoor/`, `backend/app/core/conf.py`

**In-scope:**
- Add retry logic and structured error handling for Playwright navigation failures
- Add output validation to ensure scraped data matches expected Lead schema before database insert
- Document required environment variables and credential setup in `backend/.env.example`
- Add at least one integration test that validates the scraping pipeline against a mock HTML fixture

**Non-goals:**
- New scraping targets beyond LinkedIn and Glassdoor
- Anti-detection or proxy rotation
- Real-time scraping (keep scheduled/batch pattern)

**Acceptance criteria:**
- Crawler runs produce structured log output on success and failure
- Invalid scraped data is rejected before database insertion
- `.env.example` documents all required ETL credentials
- At least one test in `backend/app/tests/` validates the ETL pipeline

**Dependencies:** Crawler infrastructure (#crawlers routes, scheduler) is already in place

---

### Issue #83 — Profile: Add avatar upload and display

**Outcome:** 5 — Still relevant if rewritten

**Why it matters:** The `User` model has an `avatar_uri` field, and the profile page exists, but there is no file upload endpoint or UI component for managing profile pictures.

**Affected area:** `backend/app/api/routes/users.py`, `backend/app/core/document_storage.py`, `frontend/src/page/profile/ProfilePage.tsx`

**In-scope:**
- Add a `POST /users/me/avatar` endpoint that accepts image upload (JPEG/PNG, max 2MB)
- Store avatar files under `PUBLIC_ASSETS_DIR/uploads/avatars/`
- Update `avatar_uri` on successful upload
- Add a `GET /users/me/avatar` endpoint that serves the stored image
- Display avatar in profile page and navigation drawer
- Add a default placeholder avatar for users without uploads

**Non-goals:**
- Image cropping or resizing in the browser
- CDN integration
- Social login avatar import

**Acceptance criteria:**
- Avatar upload works end-to-end from profile page
- Uploaded images are served at the stored URI
- Navigation drawer shows user avatar or placeholder
- File size and type validation returns clear errors

**Dependencies:** None

---

### Issue #95 — Docs: Fill content gaps in Docusaurus documentation site

**Outcome:** 2 — Partially addressed by PR #130

**Why it matters:** The Docusaurus site was created with architecture and engineering guide pages, but several sections are stubs or missing: deployment guide, API reference (auto-generated from OpenAPI), contribution guide, and user-facing feature documentation.

**Affected area:** `docs/docs/`

**In-scope:**
- Add deployment guide covering Docker Compose local setup and the Phase 3–7 release path
- Add auto-generated API reference page from `openapi.json` (Docusaurus OpenAPI plugin or static embed)
- Flesh out contribution guide with branch strategy, pre-commit setup, and schema regeneration workflow
- Add feature overview pages for Command Center, Document Studio, and Lead Collaboration

**Non-goals:**
- ReadTheDocs hosting (Docusaurus is the chosen platform)
- Marketing copy or landing pages
- Video tutorials

**Acceptance criteria:**
- `cd docs && npm run build` succeeds with no broken links
- Each major feature area has at least a one-page overview
- API reference is accessible from the docs sidebar

**Dependencies:** None

---

### Issue #115 — Backend: Move remaining synchronous seed operations to BackgroundTasks

**Outcome:** 2 — Partially addressed by PR #130

**Why it matters:** Extract operations use `BackgroundTasks`, but seed endpoints (resumes, cover letters, skills, experiences, education, certificates, contacts) still run synchronously, blocking the response until completion.

**Affected area:** `backend/app/api/routes/resumes.py`, `cover_letters.py`, `skills.py`, `experiences.py`, `education.py`, `certificates.py`, `contacts.py`

**In-scope:**
- Refactor all `/seed` and `/extract` endpoints to use `BackgroundTasks`
- Return an immediate 202 Accepted with a task/status reference
- Add a polling or callback mechanism so the frontend can track seed completion
- Ensure PYTEST mode still runs synchronously for test determinism

**Non-goals:**
- Full task queue (Celery, Redis-backed) — keep FastAPI BackgroundTasks for now
- Websocket-based progress streaming

**Acceptance criteria:**
- All seed/extract endpoints return 202 immediately
- Frontend can poll for completion status
- Existing seed tests pass (may need adjustment for async pattern)
- No user-visible regression in data population flow

**Dependencies:** None

---

### Issue #117 — Frontend: Evaluate openapi-typescript-fetch for typed API client generation

**Outcome:** 2 — Partially addressed by PR #130

**Why it matters:** The frontend has 24 hand-written service files that manually construct fetch calls. `schema.d.ts` is already generated from OpenAPI, but the fetch layer isn't auto-generated, leading to maintenance burden and potential type drift.

**Affected area:** `frontend/src/service/*.tsx`, `scripts/update_frontend_schemas.sh`

**In-scope:**
- Evaluate `openapi-typescript-fetch` or `openapi-fetch` as a replacement for hand-written service files
- Prototype auto-generated client for one service (e.g., `action-items.tsx`) and compare with the manual version
- Document trade-offs: bundle size, type safety, error handling patterns, migration effort
- If viable, create a migration plan for converting remaining services incrementally

**Non-goals:**
- Rewriting all 24 services in one pass
- Changing the backend API to accommodate client generation
- Adding GraphQL or tRPC

**Acceptance criteria:**
- One service file is successfully replaced with auto-generated client
- Type safety is preserved or improved
- No runtime regressions in the converted service
- Decision document captures trade-offs for team review

**Dependencies:** None

---

### Issue #119 — Applications: Add application materials export endpoint

**Outcome:** 5 — Still relevant if rewritten

**Why it matters:** Individual resume and cover letter downloads exist, but there is no way to export all materials for a specific application as a bundle (resume + cover letter + linked documents).

**Affected area:** `backend/app/api/routes/applications.py`, `frontend/src/page/applications-detail-page.tsx`

**In-scope:**
- Add `GET /applications/{id}/export` that returns a ZIP archive containing the linked resume PDF, cover letter PDF, and any attached documents
- Add an "Export Materials" button on the application detail page
- Handle edge cases: missing resume, missing cover letter, no linked documents

**Non-goals:**
- Exporting application metadata as structured data (JSON/CSV)
- Batch export of multiple applications
- Email sending of exported materials

**Acceptance criteria:**
- Endpoint returns a ZIP file with correct content-disposition header
- ZIP contains PDFs for each linked material, named descriptively
- Missing materials are omitted without error
- Frontend button triggers download
- At least one test validates the export endpoint

**Dependencies:** None

---

## Issues Needing Human Follow-Up

### Issue #59 — LangSmith Integration

**Status:** Inconclusive — may still be relevant for LLM development workflow, but not aligned with immediate hardening phases (3–7). The existing LangChain integration doesn't include tracing. If LLM quality iteration is a near-term priority, this could be reopened with narrow scope (add `LANGSMITH_API_KEY` to conf.py and enable tracing in langchain.py). Otherwise, recommend closure as not aligned.

### Issue #105 — ETL Scrapy Integration

**Status:** Inconclusive — the crawler infrastructure uses a custom Playwright-based approach. Scrapy would be a significant architectural change. If the current crawler reliability is insufficient (see #82), Scrapy could be reconsidered, but this should be a deliberate architecture decision rather than an open issue.

### Issue #126 — Dockerfile.prod Build Failing

**Status:** Inconclusive — `Dockerfile.prod` exists in the repository. The issue was filed in May 2024 with no reproduction steps or error details. It may have been fixed by subsequent changes, or the build may still fail. Recommend testing `docker build -f backend/Dockerfile.prod .` and closing if successful.

---

## Dependency Graph for Implementation Order

```
No dependencies (can start immediately):
  #18  Alembic migrations
  #73  Ruff pre-commit
  #76  Password validation
  #83  Avatar upload
  #54  Structured logging
  #95  Documentation gaps
  #117 OpenAPI fetch client evaluation
  #119 Application export

Depends on #18 (Alembic):
  #51  DateTime normalization (if column type changes needed)

Depends on vector store decision:
  #55  Document-aware RAG

No strict dependencies but logical ordering:
  #115 Background tasks → before #10 coverage increase
  #82  ETL hardening → after crawler reliability baseline
  #10  Coverage increase → after other backend changes stabilize
```
