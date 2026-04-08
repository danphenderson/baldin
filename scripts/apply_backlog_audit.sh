#!/usr/bin/env bash
# =============================================================================
# apply_backlog_audit.sh
#
# Applies the backlog audit results from the PR #130 review.
# Run from the repository root with a valid GITHUB_TOKEN:
#
#   GITHUB_TOKEN=ghp_... ./scripts/apply_backlog_audit.sh
#
# Prerequisites: gh CLI installed and authenticated, or GITHUB_TOKEN set.
# =============================================================================
set -euo pipefail

REPO="danphenderson/baldin"

# ---------------------------------------------------------------------------
# Helper: update issue title and body
# ---------------------------------------------------------------------------
update_issue() {
  local number="$1"
  local title="$2"
  local body="$3"
  echo "==> Updating issue #${number}: ${title}"
  gh api "repos/${REPO}/issues/${number}" \
    --method PATCH \
    --field "title=${title}" \
    --field "body=${body}" \
    --silent
  echo "    ✓ Updated"
}

# ---------------------------------------------------------------------------
# Helper: add closure comment
# ---------------------------------------------------------------------------
close_comment() {
  local number="$1"
  local comment="$2"
  echo "==> Commenting on issue #${number} (closure recommendation)"
  gh api "repos/${REPO}/issues/${number}/comments" \
    --method POST \
    --field "body=${comment}" \
    --silent
  echo "    ✓ Commented"
}

echo "============================================"
echo "Backlog Audit: Applying PR #130 Review"
echo "Repository: ${REPO}"
echo "Date: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
echo "============================================"
echo ""

# ===================================================================
# CLOSURE COMMENTS (Outcome 3 or 4)
# ===================================================================

echo "--- Closure Recommendations ---"
echo ""

close_comment 102 "**Closure recommendation: Implemented by PR #130**

Admin UI authentication and authorization is now fully implemented in \`backend/app/admin.py\`:
- \`AdminAuthProvider\` with superuser-only email + password login
- Custom login template at \`admin_templates/login.html\`
- Session-based auth with 12-hour cookie expiry
- \`UserAdminView\` with read-only access (no create/edit/delete)
- Superuser status validated on every request

All requirements from this issue are addressed. The admin UI is accessible at \`/admin\` with proper auth. Recommend closing."

close_comment 87 "**Closure recommendation: Implemented by PR #130**

Backend database management API now exists at \`backend/app/api/routes/db_management.py\`:
- \`GET /db/tables\` — list all database tables
- \`GET /db/tables/{name}\` — get table details (columns, types, constraints)
- \`DELETE /db/users/{id}/purge\` — purge all data for a user
- \`DELETE /db/users/{id}\` — delete a user
- All endpoints require superuser authentication
- Tests in \`test_db_management.py\`

The original stretch goals (superuser auth, base model separation) are also addressed. Recommend closing."

close_comment 84 "**Closure recommendation: No longer aligned with current direction**

The original request targeted a repo-local AI assistant CLI at \`backend/dev.py\`.
That entry point has been intentionally removed from the current codebase and is
no longer part of Baldin's local-first developer-preview workflow.

The active repo direction keeps AI-assisted development in the Copilot and issue
dispatch workflow rather than a checked-in backend CLI surface. Recommend
closing as not planned."

close_comment 92 "**Closure recommendation: Implemented by PR #130**

PDF download endpoints for both resumes and cover letters now exist:
- \`GET /resumes/{resume_id}/download\` — generates and returns PDF via ReportLab
- \`GET /cover-letters/{cover_letter_id}/download\` — generates and returns PDF via ReportLab

Both endpoints use \`StreamingResponse\` with proper content-disposition headers. Recommend closing."

close_comment 81 "**Closure recommendation: Implemented by PR #130**

The extractor frontend page exists at \`frontend/src/page/extractor.tsx\`:
- Table of extractors with detailed view
- Extractor run history and management
- Version history browsing
- Example management for training data
- Integration with \`frontend/src/service/extractor.tsx\`

All three original requirements (patch API for orchestration events, integration with pipelines, UI design) are addressed. Recommend closing."

close_comment 80 "**Closure recommendation: Implemented by PR #130**

The data orchestration frontend was implemented as part of the frontend IA redesign:
- \`frontend/src/page/pipelines.tsx\` — Pipeline table view with orchestration events
- \`frontend/src/page/extractor.tsx\` — Extractor management UI
- \`frontend/src/page/crawlers.tsx\` — Crawler management UI
- \`frontend/src/service/data-orchestration.tsx\` — API client
- Routing at \`/workflows\`, \`/workflows/extractors\`, \`/workflows/crawlers\`

The original requirements (TableView, pipeline events, creator) are addressed in the new routing architecture. Recommend closing."

close_comment 75 "**Closure recommendation: Implemented by PR #130**

Schema generation automation is now in place:
- \`.pre-commit-config.yaml\` includes an \`openapi-schema-update\` hook that regenerates \`openapi.json\` and \`schema.d.ts\` on commit
- CI \`schema-freshness\` job (in \`.github/workflows/ci.yml\`) verifies no uncommitted drift after running \`scripts/update_frontend_schemas.sh\`
- \`scripts/update_frontend_schemas.sh\` handles both OpenAPI JSON and TypeScript type generation

This provides both local (pre-commit hook) and CI (freshness check) automation. Recommend closing."

close_comment 103 "**Closure recommendation: Implemented by PR #130**

The extractor API has been significantly cleaned up. \`backend/app/api/routes/extractor.py\` is now a well-structured 385-line module with:
- Clean separation of CRUD operations
- Proper FastAPI dependency injection
- Type-safe Pydantic schemas for all requests/responses
- Logical endpoint grouping (extractors, versions, examples, runs)
- LangChain integration with structured output

The code is no longer 'very scripted.' Recommend closing."

close_comment 91 "**Closure recommendation: Superseded by PR #130**

The \`data-orchestration.tsx\` page referenced in this issue no longer exists. The entire frontend was redesigned with a new information architecture:
- Data orchestration is now at \`/workflows\` via \`pipelines.tsx\`
- The token-passing bug in the old \`fetchAPI\` call is irrelevant — all service files use the current auth pattern
- The \`service/data-orchestration.tsx\` client was rewritten

The specific bug is no longer reproducible in the current codebase. Recommend closing."

close_comment 72 "**Closure recommendation: Superseded by PR #130**

The application UI was completely redesigned:
- Queue view at \`/applications/queue\`
- Board view at \`/applications/board\`
- Detail view at \`/applications/:id\`
- New delete flow in the redesigned components

The specific UI bug from the old application page is no longer relevant. Recommend closing."

close_comment 69 "**Closure recommendation: Superseded by PR #130**

Both bugs referenced in this issue are no longer relevant:
1. The profile page was completely redesigned with \`ProfilePage.tsx\` and modular components — the old DataGrid refresh issue does not apply
2. The selectedRow highlighting behavior was part of the old DataGrid pattern that was replaced during the frontend IA overhaul

The dependent issue #80 (common components) is also resolved. Recommend closing."

close_comment 71 "**Closure recommendation: Superseded by PR #130**

This was a question about restructuring the API routes. The API has been substantially refactored in PR #130:
- Applications routes now support status history, notes, and metadata
- Document routes support sharing, collaboration, and rich-text
- Cover letter and resume routes support generation and download
- New route modules: action_items, activity_feed, collaboration, connections, crawlers, directory, messages, review

The original question about consolidating generation endpoints is addressed by the current architecture. Recommend closing."

close_comment 120 "**Closure recommendation: Superseded by PR #130**

The entire lead extraction and orchestration pipeline was redesigned:
- Lead routes now use registration-based ownership with comments and viewer permissions
- The orchestration pipeline page at \`/data-orchestration\` no longer exists — replaced by \`/workflows\`
- Pipeline event status tracking was rewritten
- The specific URL extraction flow referenced (\`http://localhost:3000/data-orchestration\`) no longer exists

The specific bugs (pending status, source_uri/dest_uri) are not reproducible in the current codebase. Recommend closing."

close_comment 38 "**Closure recommendation: Superseded by PR #130**

The original data lake structure was replaced by a database-backed document management system:
- \`backend/app/core/document_storage.py\` centralizes file persistence under \`PUBLIC_ASSETS_DIR/uploads/\`
- \`conf.py\` defines \`DATALAKE_PATH\` and \`SEEDS_PATH\` properties
- Documents are stored in the database with rich-text (Tiptap JSON) and file content
- PDF uploads are handled via dedicated upload endpoints
- Seed data is managed through \`/seed\` endpoints

The flat-file data lake structure is no longer the storage pattern. Recommend closing."

close_comment 122 "**Closure recommendation: No longer aligned with current direction**

Baldin's current direction is local-first developer-preview with Docker Compose as the supported development path. The execution plan (Phases 3–7) focuses on deployment hardening, migration discipline, and controlled launch — not email notifications.

There is no email sending requirement in the current roadmap. FastAPI-Users handles auth flows without SMTP. If transactional email becomes needed for a future phase, it should be scoped as part of that phase's planning. Recommend closing."

close_comment 109 "**Closure recommendation: No longer aligned with current direction**

Shell aliases in personal \`~/.zshrc\` configuration are not a repository concern. Developer environment setup is documented in the README and \`docs/\` site. Recommend closing."

close_comment 90 "**Closure recommendation: No longer aligned with current direction**

The current direction is local-first developer-preview. There is no gated beta access or registration token flow in the execution plan. FastAPI-Users handles authentication, and the subscription tier system provides user segmentation when needed. Recommend closing."

close_comment 74 "**Closure recommendation: No longer aligned with current direction**

The frontend redesign uses Material UI components directly with consistent patterns across all pages. Creating wrapper Button components (ActionButton, CreateButton, etc.) would add an abstraction layer that doesn't provide value over the current MUI-direct approach. The component library is stable and well-documented. Recommend closing."

close_comment 70 "**Closure recommendation: No longer aligned with current direction**

The backend is designed as a single deployable unit via Docker. Splitting \`app\` and \`etl\` into separate packages would add packaging complexity without benefit for the current local-first development model. The single \`Pipfile\` and unified test suite work well for the current scale. If the backend grows to warrant microservice decomposition, that should be a deliberate architecture decision in a future phase. Recommend closing."

close_comment 99 "**Closure recommendation: No longer aligned with current direction**

LLM-powered data extraction and enrichment is handled by the extractor API (\`/extractor/*\`). The extractor supports:
- Schema-based structured extraction from text and URLs
- Version management and example-based tuning
- Run history and retry logic

A separate \`/enrich\` endpoint would duplicate this pattern. Lead enrichment logic exists in \`etl/leads/enrich.py\` for batch processing. If specific enrichment workflows are needed, they should be added as extractor configurations, not a parallel API surface. Recommend closing."

close_comment 66 "**Closure recommendation: No longer aligned with current direction**

The frontend redesign uses MUI DataGrid with built-in column filtering and sorting, and \`lead-search-bar.tsx\` provides lead-specific search with filters and pagination. Creating generic Search and AutoComplete wrapper components would add an abstraction layer over MUI's existing capabilities without clear benefit for the current architecture. Recommend closing."

echo ""
echo "--- Issue Updates (Implementation-Ready Rewrites) ---"
echo ""

# ===================================================================
# ISSUE UPDATES (Outcomes 1, 2, or 5)
# ===================================================================

update_issue 10 \
  "Backend: Increase test coverage to 60% and add frontend integration test scaffold" \
  "## Problem Statement

PR #130 introduced 30 backend test files and a 40% coverage gate in CI, but coverage can be raised and frontend integration testing (Playwright) has not been started.

## Why It Still Matters After PR #130

The 40% threshold was a starting point. As the codebase stabilizes through Phases 3–7 of the execution plan, higher coverage prevents regressions in critical paths (collaboration, auth, document sharing). Frontend integration tests are needed to validate end-to-end user flows.

## Affected Area

- \`backend/app/tests/\` — backend unit and integration tests
- \`frontend/\` — Playwright integration test scaffold
- \`.github/workflows/ci.yml\` — coverage threshold configuration

## In-Scope

- Raise \`--cov-fail-under\` from 40 to 60 in CI
- Add targeted tests for uncovered backend routes (crawler edge cases, document collaboration race conditions, message WebSocket handling)
- Add a Playwright-based frontend integration test scaffold that validates at least one critical user flow (login → command center → create application)
- Configure Playwright tests to run in CI

## Non-Goals

- 100% line coverage
- Visual regression testing
- Performance benchmarking

## Acceptance Criteria

- [ ] Backend coverage ≥ 60% on \`app\` and \`etl\` modules
- [ ] At least one Playwright integration test runs in CI
- [ ] No regressions in existing test suite
- [ ] Coverage report is visible in CI output

## Dependencies

None"

update_issue 18 \
  "Backend: Integrate Alembic for database migrations" \
  "## Problem Statement

The codebase uses \`create_all()\` with additive \`_sync_missing_columns()\` for local development database schema management. There are no versioned migrations, making it impossible to safely evolve the schema in staged environments.

## Why It Still Matters After PR #130

PR #130 added new models (ActionItem, CrawlerPipeline, Connection, Conversation, Message, DocumentShare, etc.) all managed by \`create_all()\`. The execution plan Phase 5 explicitly requires 'migration discipline.' A TODO comment in \`db.py\` notes Alembic is needed.

## Affected Area

- \`backend/app/core/db.py\` — current bootstrap logic
- \`backend/app/models.py\` — all SQLAlchemy models
- New \`backend/alembic/\` directory

## In-Scope

- Initialize Alembic with async SQLAlchemy (asyncpg) support
- Generate an initial migration from the current model state
- Update \`docker-compose.yml\` to run \`alembic upgrade head\` on startup
- Update \`scripts/reset_local_db.sh\` to handle migration state
- Preserve the \`create_all()\` fallback for PYTEST mode
- Document migration workflow in \`docs/docs/engineering/\`

## Non-Goals

- Removing \`_sync_missing_columns()\` immediately (keep as local dev safety net until Alembic is proven)
- Multi-database migration support
- Data migrations (schema-only for initial integration)

## Acceptance Criteria

- [ ] \`alembic upgrade head\` applies cleanly to a fresh Postgres 15 database
- [ ] \`alembic revision --autogenerate\` detects model changes
- [ ] CI backend-tests job runs migrations before pytest
- [ ] \`docker compose up\` still works without manual migration steps
- [ ] Migration workflow is documented

## Dependencies

None — this is a Phase 5 prerequisite and can start immediately"

update_issue 51 \
  "Backend: Audit and normalize datetime handling across API and models" \
  "## Problem Statement

Datetime fields across the backend use inconsistent patterns: models use \`func.now()\` server defaults, but some route handlers use \`datetime.utcnow().isoformat()\` for JSONB fields (e.g., \`status_history\` in applications), and timezone awareness is not enforced.

## Why It Still Matters After PR #130

PR #130 added many new models with datetime fields (ActionItem.due_at, Connection timestamps, Message.edited_at, etc.). The inconsistency between server-generated and Python-generated timestamps can cause ordering bugs and client display issues.

## Affected Area

- \`backend/app/models.py\` — datetime column definitions
- \`backend/app/api/routes/applications.py\` — \`datetime.utcnow().isoformat()\` usage
- \`backend/app/schemas.py\` — datetime serialization

## In-Scope

- Audit all datetime fields in models for consistent use of \`func.now()\` server defaults
- Replace \`datetime.utcnow()\` calls in route handlers with server-side defaults or \`func.now()\`
- Ensure all JSONB-embedded timestamps (e.g., \`status_history\`) use ISO 8601 with UTC indicator
- Add a \`DateTimeUTC\` type alias or convention doc to prevent future drift

## Non-Goals

- Changing column types from \`DateTime\` to \`DateTime(timezone=True)\` (requires Alembic migration, see #18)
- Client-side timezone display logic
- Retroactively fixing existing data

## Acceptance Criteria

- [ ] No Python-side \`datetime.utcnow()\` or \`datetime.now()\` calls remain in route handlers
- [ ] All JSONB timestamp values include timezone indicator (\`Z\` or \`+00:00\`)
- [ ] Existing tests pass without modification
- [ ] Convention is documented in code or engineering docs

## Dependencies

- #18 (Alembic) if column type changes are needed — otherwise independent"

update_issue 54 \
  "Backend: Add structured JSON logging with request correlation IDs" \
  "## Problem Statement

The backend has a configurable \`LOGGING_LEVEL\` and uses Python's standard logging, but there is no structured JSON output, no request correlation IDs, and no file-based log persistence for local debugging.

## Why It Still Matters After PR #130

PR #130 added many new API surfaces (collaboration WebSockets, crawler scheduler, action items, messaging). Debugging issues across these surfaces requires correlated, structured log output. The execution plan Phase 6 calls for 'logging and alerting' controls.

## Affected Area

- \`backend/app/core/conf.py\` — logging configuration
- \`backend/app/main.py\` — middleware setup
- New \`backend/app/core/logging.py\` — structured formatter

## In-Scope

- Add a structured JSON log formatter (using \`python-json-logger\` or stdlib \`logging.config\`)
- Add request correlation ID middleware that propagates through log records
- Configure file-based log output under \`PUBLIC_ASSETS_DIR/logs/\` in DEV mode
- Preserve human-readable console output as the default for local development

## Non-Goals

- External log aggregation (ELK, CloudWatch, Datadog)
- LangSmith or OpenAI-specific tracing (separate concern)
- Performance profiling or APM integration
- Frontend logging

## Acceptance Criteria

- [ ] API requests in DEV mode produce JSON log lines with timestamp, level, correlation ID, path, and status
- [ ] Log files are written to \`public/logs/\` in DEV mode and gitignored
- [ ] PYTEST mode uses console-only logging
- [ ] Correlation ID header (\`X-Request-ID\`) is returned in responses
- [ ] No new large dependencies

## Dependencies

None"

update_issue 55 \
  "Backend: Add vector store support for document-aware semantic search" \
  "## Problem Statement

The extractor API handles structured LLM extraction from text and URLs, but there is no semantic search over user documents. As the Document Studio grows, users need to query across their document corpus for resume tailoring and application preparation.

## Why It Still Matters After PR #130

PR #130 built the Document Studio with rich-text editing, PDF upload, sharing, and collaboration. The missing piece is the ability to search document content by meaning rather than exact text match.

## Affected Area

- \`backend/app/core/langchain.py\` — LLM integration
- \`backend/app/models.py\` — embedding storage
- \`backend/app/api/routes/documents.py\` — search endpoint
- \`docker-compose.yml\` — pgvector extension if chosen

## In-Scope

- Evaluate pgvector (PostgreSQL extension) vs. in-memory FAISS for local-first vector storage
- Add document embedding generation on document create/update
- Add a \`GET /documents/search?q=...\` endpoint for semantic similarity queries
- Integrate with existing LangChain OpenAI configuration in \`conf.py\`

## Non-Goals

- Full RAG agent with multi-turn conversation
- Fine-tuning or model training
- LangGraph or multi-agent orchestration
- Replacing the existing extractor API

## Acceptance Criteria

- [ ] Documents can be embedded and queried by semantic similarity
- [ ] Vector store works in local Docker Compose setup without external services
- [ ] At least one test validates embedding creation and retrieval
- [ ] No breaking changes to existing extractor or document APIs
- [ ] Decision on vector backend is documented

## Dependencies

- Requires decision on vector store backend (pgvector recommended for single-database simplicity)
- May benefit from #18 (Alembic) for schema migration of embedding columns"

update_issue 73 \
  "CI: Replace isort + black + flake8 with ruff in pre-commit" \
  "## Problem Statement

The pre-commit configuration uses three separate Python tools (isort, black, flake8) that can be consolidated into a single tool (ruff) for faster linting and simpler configuration.

## Why It Still Matters After PR #130

PR #130 established the CI lint gate with the current three-tool setup. Ruff is a drop-in replacement that runs 10-100x faster, reducing both local pre-commit and CI lint job execution time.

## Affected Area

- \`.pre-commit-config.yaml\` — hook configuration
- New \`backend/pyproject.toml\` or \`ruff.toml\` — ruff settings
- \`.github/workflows/ci.yml\` — lint job (if it references specific tools)

## In-Scope

- Replace isort, black, and flake8 hooks with \`ruff check\` and \`ruff format\`
- Configure ruff rules to match current settings (E203, E501, W503 ignores; isort profile; black-compatible formatting)
- Verify all existing backend files pass ruff with zero formatting changes
- Keep the \`openapi-schema-update\` pre-commit hook unchanged

## Non-Goals

- Enabling additional ruff rules beyond current coverage
- Adding type-checking rules (mypy/pyright)
- Changing frontend linting

## Acceptance Criteria

- [ ] \`.pre-commit-config.yaml\` uses ruff instead of isort, black, and flake8
- [ ] \`pre-commit run --all-files\` passes on the current backend codebase
- [ ] CI lint job passes without changes to backend code
- [ ] Pre-commit execution is measurably faster

## Dependencies

None"

update_issue 76 \
  "Auth: Enforce minimum password requirements on registration" \
  "## Problem Statement

FastAPI-Users allows registration with empty or trivially short passwords by default. Users can register without a password but cannot log in afterward, creating a broken account state.

## Why It Still Matters After PR #130

PR #130 uses FastAPI-Users for authentication with the default password policy. The subscription tier and connection features added in PR #130 make it more important that user accounts are in a valid state, since broken accounts cannot participate in collaboration features.

## Affected Area

- \`backend/app/core/security.py\` — UserManager configuration
- \`backend/app/schemas.py\` — UserCreate schema

## In-Scope

- Add password validation to \`UserManager\` that enforces minimum length (≥ 8 characters)
- Return a clear 422 error with a descriptive message for invalid passwords
- Add tests that verify empty-password and short-password registration is rejected
- Verify existing registration tests still pass

## Non-Goals

- Complex password strength rules (uppercase, special characters, symbols)
- Password breach database checks (Have I Been Pwned)
- Rate limiting on registration (separate concern)
- Password change/reset flow improvements

## Acceptance Criteria

- [ ] \`POST /auth/register\` with empty password returns 422
- [ ] \`POST /auth/register\` with password < 8 characters returns 422
- [ ] Error message clearly states the minimum requirement
- [ ] Existing registration tests continue to pass
- [ ] At least 2 new tests cover the validation

## Dependencies

None"

update_issue 82 \
  "ETL: Harden LinkedIn and Glassdoor crawler reliability" \
  "## Problem Statement

The \`etl/linkedin/\` and \`etl/glassdoor/\` crawlers exist with Playwright-based scrapers, but they depend on hardcoded credential patterns, lack error recovery for navigation failures, and have no output validation before database insertion.

## Why It Still Matters After PR #130

PR #130 built the crawler infrastructure (CrawlerPipeline model, scheduler, Redis-backed queue, review queue). The ETL scripts that feed this infrastructure need to be reliable enough for the scheduled execution pattern to work without constant manual intervention.

## Affected Area

- \`backend/etl/linkedin/\` — LinkedIn Playwright scrapers
- \`backend/etl/glassdoor/\` — Glassdoor Playwright scrapers
- \`backend/app/core/conf.py\` — credential configuration
- \`backend/.env.example\` — environment documentation

## In-Scope

- Add retry logic and structured error handling for Playwright navigation failures
- Add output validation to ensure scraped data matches expected Lead schema before database insert
- Document required environment variables and credential setup in \`.env.example\`
- Add at least one test that validates the scraping pipeline against a mock HTML fixture

## Non-Goals

- New scraping targets beyond LinkedIn and Glassdoor
- Anti-detection or proxy rotation
- Real-time scraping (keep scheduled/batch pattern via CrawlerScheduler)
- Headless browser pooling

## Acceptance Criteria

- [ ] Crawler runs produce structured log output on success and failure
- [ ] Invalid scraped data is rejected before database insertion
- [ ] \`.env.example\` documents all required ETL credentials
- [ ] At least one test in \`backend/app/tests/\` validates the ETL pipeline with mock data
- [ ] Transient failures (network timeout, page load error) are retried up to 3 times

## Dependencies

- Crawler infrastructure (routes, scheduler, queue) is already in place from PR #130"

update_issue 83 \
  "Profile: Add avatar upload and display to user profile" \
  "## Problem Statement

The \`User\` model has an \`avatar_uri\` field, and the profile page was redesigned in PR #130, but there is no file upload endpoint or UI component for managing profile pictures.

## Why It Still Matters After PR #130

PR #130 added the user directory, public profiles, and connection features. Avatars are important for user identity in social features (connections, messages, directory listings). The \`avatar_uri\` field exists but has no supporting upload/serve infrastructure.

## Affected Area

- \`backend/app/api/routes/users.py\` — upload endpoint
- \`backend/app/core/document_storage.py\` — file storage
- \`frontend/src/page/profile/ProfilePage.tsx\` — upload UI
- \`frontend/src/route/navigation.ts\` — avatar display in nav

## In-Scope

- Add a \`POST /users/me/avatar\` endpoint that accepts image upload (JPEG/PNG, max 2MB)
- Store avatar files under \`PUBLIC_ASSETS_DIR/uploads/avatars/\`
- Update \`avatar_uri\` on successful upload
- Add a \`GET /users/{id}/avatar\` endpoint that serves the stored image
- Display avatar in profile page, navigation drawer, and directory listings
- Add a default placeholder avatar for users without uploads

## Non-Goals

- Image cropping or resizing in the browser
- CDN integration or external storage
- Social login avatar import (Google, LinkedIn)

## Acceptance Criteria

- [ ] Avatar upload works end-to-end from profile page
- [ ] Uploaded images are served at the stored URI
- [ ] Navigation drawer and directory show user avatar or placeholder
- [ ] File size (> 2MB) and type (non-image) validation returns clear 422 errors
- [ ] At least one backend test validates the upload/serve cycle

## Dependencies

None"

update_issue 95 \
  "Docs: Fill content gaps in Docusaurus documentation site" \
  "## Problem Statement

The Docusaurus site was created in PR #130 with architecture and engineering guide pages, but several sections are stubs or missing entirely.

## Why It Still Matters After PR #130

The docs site is the primary reference for contributors and future implementation agents. Gaps in deployment guidance, API reference, and feature documentation slow down onboarding and increase the risk of inconsistent implementation decisions.

## Affected Area

- \`docs/docs/\` — Markdown documentation sources

## In-Scope

- Add deployment guide covering Docker Compose local setup and the Phase 3–7 release path
- Add API reference page (auto-generated from \`openapi.json\` via Docusaurus plugin or embedded Swagger UI)
- Flesh out contribution guide with branch strategy, pre-commit setup, and schema regeneration workflow
- Add feature overview pages for Command Center, Document Studio, and Lead Collaboration
- Verify all internal links resolve

## Non-Goals

- ReadTheDocs hosting (Docusaurus is the chosen platform)
- Marketing copy or landing pages
- Video tutorials
- Hosting/deployment of the docs site itself

## Acceptance Criteria

- [ ] \`cd docs && npm run build\` succeeds with no broken links
- [ ] Each major feature area (Command Center, Document Studio, Leads, Networking) has at least one overview page
- [ ] API reference is accessible from the docs sidebar
- [ ] Contribution guide includes complete local development setup steps

## Dependencies

None"

update_issue 115 \
  "Backend: Move remaining synchronous seed and extract operations to BackgroundTasks" \
  "## Problem Statement

Some extract operations use FastAPI \`BackgroundTasks\`, but seed endpoints (resumes, cover letters, skills, experiences, education, certificates, contacts) still run synchronously, blocking the HTTP response until LLM processing completes.

## Why It Still Matters After PR #130

PR #130 added more extraction and seeding surfaces. Synchronous LLM calls in request handlers cause timeouts for large documents and block the event loop for other users in the local dev environment.

## Affected Area

- \`backend/app/api/routes/resumes.py\` — \`/seed\` endpoint
- \`backend/app/api/routes/cover_letters.py\` — \`/seed\` endpoint
- \`backend/app/api/routes/skills.py\` — \`/extract\` endpoint (partially done)
- \`backend/app/api/routes/experiences.py\`, \`education.py\`, \`certificates.py\`, \`contacts.py\` — \`/extract\` and \`/seed\` endpoints

## In-Scope

- Refactor all \`/seed\` and remaining \`/extract\` endpoints to use \`BackgroundTasks\`
- Return 202 Accepted with a status reference (task ID or polling URL)
- Add a \`GET /tasks/{id}/status\` endpoint or use existing orchestration events for progress tracking
- Ensure PYTEST mode runs synchronously for test determinism

## Non-Goals

- Full task queue (Celery, Redis-backed) — keep FastAPI BackgroundTasks for now
- WebSocket-based progress streaming
- Retry logic for failed background tasks (separate concern)

## Acceptance Criteria

- [ ] All seed/extract endpoints return 202 immediately
- [ ] Frontend can poll for completion status
- [ ] Existing seed/extract tests pass (adjusted for async pattern if needed)
- [ ] No user-visible regression in data population flows
- [ ] PYTEST mode behavior is documented

## Dependencies

None"

update_issue 117 \
  "Frontend: Evaluate openapi-fetch as typed API client replacement" \
  "## Problem Statement

The frontend has 24 hand-written service files (\`frontend/src/service/*.tsx\`) that manually construct fetch calls. \`schema.d.ts\` is already generated from OpenAPI, but the fetch layer is not auto-generated, leading to maintenance burden and potential drift between the API contract and client calls.

## Why It Still Matters After PR #130

PR #130 added 24 service files totaling thousands of lines of hand-written fetch logic. Each backend API change requires manually updating the corresponding service file. Auto-generated fetch clients would reduce this maintenance burden.

## Affected Area

- \`frontend/src/service/*.tsx\` — 24 API client files
- \`scripts/update_frontend_schemas.sh\` — schema generation pipeline
- \`frontend/package.json\` — new dependency

## In-Scope

- Evaluate \`openapi-fetch\` (or \`openapi-typescript-fetch\`) as a typed fetch client generator
- Prototype migration for one service file (e.g., \`action-items.tsx\`) and compare:
  - Type safety
  - Bundle size impact
  - Error handling patterns
  - Migration effort per service
- Document the trade-off analysis
- If viable, propose incremental migration plan

## Non-Goals

- Rewriting all 24 services in one pass
- Changing the backend API to accommodate client generation
- Adding GraphQL, tRPC, or other API paradigms
- Removing \`schema.d.ts\` generation

## Acceptance Criteria

- [ ] One service file is successfully replaced with auto-generated client
- [ ] Type safety is preserved or improved vs. hand-written version
- [ ] No runtime regressions in the converted service
- [ ] Trade-off document captures bundle size, DX, and migration effort
- [ ] Decision is recorded for team review

## Dependencies

None"

update_issue 119 \
  "Applications: Add application materials export endpoint" \
  "## Problem Statement

Individual resume and cover letter downloads exist, but there is no way to export all materials for a specific application as a bundle.

## Why It Still Matters After PR #130

PR #130 built the application detail page with linked resumes, cover letters, and documents. Users preparing for interviews need to quickly gather all materials for a specific application without downloading each one individually.

## Affected Area

- \`backend/app/api/routes/applications.py\` — export endpoint
- \`frontend/src/page/applications-detail-page.tsx\` — export button

## In-Scope

- Add \`GET /applications/{id}/export\` that returns a ZIP archive containing:
  - Linked resume PDF (if any)
  - Linked cover letter PDF (if any)
  - Linked document files (if any)
- Add an 'Export Materials' button on the application detail page
- Handle edge cases: missing materials are omitted without error, empty export returns 404

## Non-Goals

- Exporting application metadata as structured data (JSON/CSV)
- Batch export of multiple applications
- Email sending of exported materials
- Custom filename templates

## Acceptance Criteria

- [ ] Endpoint returns a ZIP file with correct \`Content-Disposition\` header
- [ ] ZIP contains descriptively named PDFs for each linked material
- [ ] Missing materials are omitted without error (not an empty ZIP)
- [ ] Frontend button triggers browser download
- [ ] At least one backend test validates the export endpoint with and without materials

## Dependencies

None"

# ===================================================================
# HUMAN FOLLOW-UP ITEMS
# ===================================================================

echo ""
echo "--- Human Follow-Up Items ---"
echo ""

close_comment 126 "**Needs human verification before closing**

This issue reports a \`Dockerfile.prod\` build failure from May 2024 with no reproduction steps or error details. \`backend/Dockerfile.prod\` exists in the current codebase.

**Recommended action:** Run \`docker build -f backend/Dockerfile.prod backend/\` locally. If it builds successfully, close this issue. If it fails, update the issue with the actual error output."

close_comment 105 "**Needs human decision before closing**

The current crawler infrastructure uses a custom Playwright-based approach (\`etl/linkedin/\`, \`etl/glassdoor/\`) with a Redis-backed queue and scheduler. Scrapy would be a significant architectural change from the current pattern.

**Recommendation:** If the current Playwright-based crawlers are sufficient (see #82 for hardening), close this issue. If Scrapy's mature middleware ecosystem (retries, throttling, item pipelines) is needed, rewrite this issue with a narrow evaluation scope."

close_comment 59 "**Needs human decision before closing**

LangSmith tracing would improve LLM development workflow by providing observability into extraction and generation calls. However, it's not in the current hardening phases (3–7) of the execution plan.

**Recommendation:** If LLM quality iteration is a near-term priority, rewrite this issue as: 'Backend: Add LangSmith tracing opt-in for LLM calls' with scope limited to adding \`LANGSMITH_API_KEY\` to \`conf.py\` and enabling tracing in \`langchain.py\`. Otherwise, close as not aligned with current direction."

close_comment 97 "**Needs human decision before closing**

The original request was for a bootstrap shell script (Playwright install, Typer completions, Pipenv alias). Docker Compose is now the supported development path per the README, and \`docker compose up\` handles most setup.

**Recommendation:** If developers frequently work outside Docker (running the backend natively), a bootstrap script may still be useful. Otherwise, the Docker Compose workflow and README documentation make this unnecessary. Close if Docker Compose is the only supported path."

echo ""
echo "============================================"
echo "Audit complete. All 38 issues processed."
echo "============================================"
echo ""
echo "Summary:"
echo "  - 14 issues commented for closure (implemented/superseded)"
echo "  -  7 issues commented for closure (not aligned)"
echo "  - 13 issues updated with implementation-ready content"
echo "  -  4 issues flagged for human follow-up"
echo ""
echo "Note: No issues were closed. All closure recommendations"
echo "are comments only. Review and close manually."
