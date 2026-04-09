# Baldin Polish Phase — Execution Plan

**Date:** 2026-04-06
**Scope:** Next polish phase for the local-first developer-preview prototype
**Basis:** End-to-end audit of current `feat-sprint` branch against running prototype

---

## Executive Summary

Baldin's prototype is functionally broad: 197 backend endpoints, 20+ frontend
pages, auth with MFA, collaborative document editing, messaging, networking,
extraction pipelines, and a dashboard. The architecture is clean and the
stack is modern (FastAPI, React 19, MUI 7, TypeScript strict, pgvector).

The main gap is not a lack of major feature surface — it is **cohesion, trust
signals, and finish**. The product has more surface area than it has polish,
and some capabilities remain partial. The biggest returns come from tightening
what already exists rather than adding more.

This plan identifies the highest-leverage polish work and sequences it into
four milestones that move the prototype from "functional but rough" to
"coherent and demo-ready."

---

## Current-State Assessment

### What works well

- **Local dev experience**: `docker-compose up --build` gives you both services,
  two Postgres instances, hot reload, and seed data helpers. Clean.
- **API breadth**: 197 endpoints covering leads, applications, documents,
  profiles, messaging, connections, extractors, crawlers, pipelines, review
  queue, and admin utilities.
- **Frontend architecture**: Clear page/component/service/context separation.
  Type-safe API layer backed by generated `schema.d.ts`. Consistent loading
  skeletons, empty states, and error alerts across most pages.
- **Auth and MFA**: JWT auth, TOTP MFA setup/verify/disable, superuser gates,
  tier-based access control context.
- **Document collaboration**: Tiptap editor with Yjs real-time sync, version
  history, sharing with roles, activity audit trail.
- **CI pipeline**: Six CI jobs are defined for lint, backend tests, frontend
   tests, typecheck, build, and schema freshness. Coverage is ~68% against a
   60% floor, but merge-blocking still depends on GitHub branch protection being
   configured manually.
- **Theming**: Dark/light toggle with persistent preference, cohesive color
  palette, responsive drawer layout.

### Where it falls short

| Area | Finding |
|------|---------|
| **Data model debt** | Legacy Resume/CoverLetter tables coexist with unified Document model. Dual systems risk inconsistent state and confuse contributors. |
| **Status field validation** | Application status, lead review status, crawler run status stored as unconstrained strings. No DB-level enum enforcement. |
| **Utility duplication** | `timeAgo()`, `monogram()`, `statusLabel()` implemented inline in 3+ separate page files instead of shared utilities. |
| **Error handling inconsistency** | Mix of Snackbar toasts, MUI Alerts, inline catches, and silent failures. No centralized error boundary. |
| **Test coverage shape** | 68% backend but route handlers largely untested. 12 frontend test files for 40+ component files. No e2e tests. |
| **Frontend performance** | No route-level lazy loading. All pages bundled upfront. No image optimization. No systematic memoization. |
| **TODOs in active code** | 4 backend (companies FIXME, extractor TODO, schema TODOs) + 3 frontend (content_type validation, application filters). |
| **Incomplete features** | Subscription tier enforcement, placement status lifecycle, crawler/extractor approval workflows defined in models but not wired. |
| **Docs staleness** | testing.md claims 40% coverage gate (actual: 60%). deployment-status.md has malformed frontmatter. |
| **Branch protection** | CI gate is code-ready but not enforced in GitHub settings. Phase 2 of REPO_EXECUTION_PLAN remains unfinished. |
| **Collaboration resilience** | Yjs WebSocket has no visible retry/offline handling in the frontend hook. |

---

## Top Issues and Missed Opportunities

### Critical (blocks demo-readiness or trust)

1. **Dual document model confusion** — Resume and CoverLetter tables still
   exist alongside the unified Document model. API consumers and the frontend
   hit both systems. This is the single largest source of data model friction.

2. **Branch protection not enforced** — CI runs but cannot block bad merges.
   One GitHub settings change completes Phase 2.

3. **Scattered error UX** — Users see different feedback patterns (toast vs
   alert vs nothing) depending on which page they are on. Undermines trust.

### High (visible in demo, straightforward to fix)

4. **Frontend utility duplication** — Centralizing `timeAgo`, status labels,
   monogram helpers into shared utils removes ~150 lines of copy-paste and
   makes the codebase easier to reason about.

5. **Route-level code splitting** — Adding `React.lazy` to page imports
   improves initial load time with minimal effort.

6. **TODOs in active code paths** — The companies FIXME (hack for extractor
   conversion) and missing application filters are visible to users.

7. **Docs accuracy** — Coverage gate and deployment-status pages are stale.
   Quick fixes that prevent contributor confusion.

### Medium (improves quality, not blocking)

8. **Backend status field enums** — Moving from string to Postgres enum for
   Application.status, Lead.review_status, CrawlerRun.status prevents bad data.

9. **ActionItem polymorphic constraint** — No DB constraint ensures exactly one
   FK is set. Add a check constraint.

10. **Frontend test coverage expansion** — Page-level tests for dashboard,
    leads, and applications pages are the highest-value missing tests.

11. **Collaboration offline resilience** — WebSocket retry and degraded-mode
    indicator in the collaborative editor.

### Low (defer to post-demo phase)

12. **Subscription tier enforcement** — Model fields exist but no logic gates
    access. Wire this only when tier pricing is real.

13. **Crawler/extractor approval workflows** — `requires_approval` field
    exists but nothing checks it. Wire when admin workflows are prioritized.

14. **URL parser brittleness** — LinkedIn/Handshake HTML parsers break on site
    changes. Consider API-based extraction or accept as known fragility.

---

## Prioritized Milestone Plan

### Milestone 1: Coherence and Trust (Now — Week 1–2)

**Theme**: Make the existing product feel solid and consistent. No new features.

| # | Story | Owner | Effort |
|---|-------|-------|--------|
| 1.1 | Enforce GitHub branch protection per `.github/branch-protection.md` | Lead Architect | Small |
| 1.2 | Centralize frontend utility functions (`timeAgo`, `monogram`, `statusLabel`, status color helpers) into `frontend/src/util/` | Frontend Agent | Small |
| 1.3 | Standardize error feedback pattern: adopt a single `useNotification` hook wrapping Snackbar + Alert; replace ad-hoc patterns across pages | Frontend Agent | Medium |
| 1.4 | Fix companies.py FIXME: clean up extractor debugging/conversion hack | Backend Agent | Small |
| 1.5 | Resolve extractor.py TODO: add boolean query param for new-extractor signal | Backend Agent | Small |
| 1.6 | Add missing application queue filters (Has Resume, Has Cover Letter) per frontend TODO | Frontend Agent | Small |
| 1.7 | Fix docs: update testing.md coverage gate to 60%; rewrite deployment-status.md with clean frontmatter | Lead Architect | Small |
| 1.8 | Add `React.lazy` + `Suspense` wrappers for all page-level route imports | Frontend Agent | Small |

**Exit criteria**: All active TODOs/FIXMEs resolved. Error feedback is
consistent. Branch protection enforced. Docs accurate. Routes lazy-loaded.

---

### Milestone 2: Data Model Clarity (Week 2–3)

**Theme**: Eliminate the dual document system and harden data integrity.

| # | Story | Owner | Effort |
|---|-------|-------|--------|
| 2.1 | Audit all frontend code paths that still use legacy Resume/CoverLetter service endpoints; map migration surface | Lead Architect | Medium |
| 2.2 | Deprecate legacy Resume and CoverLetter backend routes behind a feature flag or redirect to unified Document endpoints | Backend Agent | Medium |
| 2.3 | Migrate frontend Resume and CoverLetter service calls to use the unified Document API | Frontend Agent | Medium |
| 2.4 | Add Postgres enum types for Application.status, Lead.review_status, CrawlerRun.status with migration | Backend Agent | Small |
| 2.5 | Add CHECK constraint on ActionItem ensuring exactly one FK is non-null | Backend Agent | Small |
| 2.6 | Regenerate `openapi.json` and `schema.d.ts` after backend changes; validate frontend build | Lead Architect | Small |
| 2.7 | Update docs/docs/architecture/data-model.md to reflect unified document model | Lead Architect | Small |

**Exit criteria**: Frontend hits only the unified Document API. Legacy
resume/cover-letter routes deprecated. Status fields have DB-level enum
constraints. Schema artifacts regenerated and green.

---

### Milestone 3: Test Confidence and Resilience (Week 3–4)

**Theme**: Expand test coverage in the areas with the most product risk.

| # | Story | Owner | Effort |
|---|-------|-------|--------|
| 3.1 | Add page-level tests for CommandCenterPage (action items render, activity feed, empty state) | Frontend Agent | Medium |
| 3.2 | Add page-level tests for LeadsPage (search, filter, pagination, extraction bar) | Frontend Agent | Medium |
| 3.3 | Add page-level tests for ApplicationsQueuePage (filter, sort, stage toggle) | Frontend Agent | Medium |
| 3.4 | Add backend unit tests for untested route handlers: companies extraction, document sharing, lead comments | Backend Agent | Medium |
| 3.5 | Add WebSocket reconnect/retry logic to `useCollaborativeEditor` hook; add offline indicator in editor UI | Frontend Agent | Small |
| 3.6 | Add backend test for MFA login flow (setup → verify → login with TOTP → disable) | Backend Agent | Small |

**Exit criteria**: Frontend test count doubles from 12 to ~24 files. Backend
coverage stays above 60%. Collaboration editor handles transient disconnects
gracefully.

---

### Milestone 4: Demo Polish and Beta Readiness (Week 4–5)

**Theme**: Visual refinement, operational awareness, and first-impression quality.

| # | Story | Owner | Effort |
|---|-------|-------|--------|
| 4.1 | Add a global error boundary at the AppLayout level with a branded fallback UI | Frontend Agent | Small |
| 4.2 | Add avatar image optimization: lazy-load avatars, cap upload size, provide fallback | Frontend Agent | Small |
| 4.3 | Audit and improve empty-state copy across all pages (clear, actionable, on-brand) | Frontend Agent | Small |
| 4.4 | Consolidate Dockerfile and Dockerfile.prod into a single multi-stage Dockerfile | Lead Architect | Small |
| 4.5 | Add a lightweight seed-data script or doc for a compelling demo walkthrough | Lead Architect | Medium |
| 4.6 | Resolve `--legacy-peer-deps` in frontend Dockerfile; clean up any peer dependency conflicts | Frontend Agent | Small |
| 4.7 | Review and tighten rate limit configuration per endpoint category (auth, extraction, CRUD) | Backend Agent | Small |

**Exit criteria**: First-time demo experience is smooth. Error boundaries
catch crashes gracefully. Docker build is clean and single-path. Rate limits
are documented and intentional.

---

## Dependencies and Sequencing

```
Milestone 1 (Coherence)
   │
   ├──► 1.1 branch protection (no code dependency, do first)
   ├──► 1.2–1.3 frontend cleanup (parallel, independent)
   ├──► 1.4–1.5 backend fixes (parallel with frontend)
   ├──► 1.6 application filters (after 1.3 notification hook exists)
   ├──► 1.7 docs fixes (parallel, independent)
   └──► 1.8 lazy loading (after 1.2–1.3 settle)

Milestone 2 (Data Model) — depends on Milestone 1 completion
   │
   ├──► 2.1 audit migration surface (first, informs 2.2–2.3)
   ├──► 2.2 backend deprecation (after 2.1)
   ├──► 2.3 frontend migration (after 2.2 + schema regen)
   ├──► 2.4–2.5 enum/constraint changes (parallel with 2.2)
   ├──► 2.6 schema regen (after 2.2 + 2.4)
   └──► 2.7 docs update (after 2.3)

Milestone 3 (Testing) — can start during Milestone 2
   │
   ├──► 3.1–3.3 frontend page tests (parallel)
   ├──► 3.4 backend route tests (parallel with frontend)
   ├──► 3.5 collaboration resilience (independent)
   └──► 3.6 MFA backend test (independent)

Milestone 4 (Demo Polish) — depends on Milestones 1–3
   │
   └──► All stories are independent and parallelizable
```

**Critical path**: 1.1 → 2.1 → 2.2 → 2.6 → 2.3 → Milestone 3 → Milestone 4

---

## Recommended Ownership Split

| Agent | Scope | Stories |
|-------|-------|---------|
| **Baldin Backend Agent** | Backend fixes, enum migrations, route tests, rate limits | 1.4, 1.5, 2.2, 2.4, 2.5, 3.4, 3.6, 4.7 |
| **Baldin Frontend Agent** | UI polish, utilities, testing, error handling, lazy loading | 1.2, 1.3, 1.6, 1.8, 2.3, 3.1, 3.2, 3.3, 3.5, 4.1, 4.2, 4.3, 4.6 |
| **Baldin Lead Full-Stack Architect** | Branch protection, schema regen, migration audit, docs, Docker, demo seed | 1.1, 1.7, 2.1, 2.6, 2.7, 4.4, 4.5 |

---

## Risks, Assumptions, and De-Scoped Items

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Legacy resume/cover-letter migration touches many frontend paths | Medium | Audit first (2.1) to size the surface before committing to full migration |
| Enum migration requires coordinated backend + schema regen + frontend build | Medium | Run as a single sequenced slice with Lead Architect owning the handoff |
| Collaboration WebSocket changes could introduce regressions | Low | Limit to reconnect/retry logic; do not change the Yjs protocol or server |
| Branch protection enforcement requires GitHub org/repo admin access | Low | Only a settings change, but verify admin access before planning around it |

### Assumptions

- The prototype is being demoed to a known audience (investors, collaborators),
  not to anonymous public users. Polish targets that audience.
- No additional major feature bets are assumed for this phase. The current
   197-endpoint API surface is already broad enough for the demo phase, even
   though some capabilities remain partial.
- The dual Resume/CoverLetter → Document migration is viable without a formal
  DB migration tool (current `create_all` pattern is acceptable in dev-preview).
- OPENAI_API_KEY is or will be available in the dev environment for schema regen.

### Explicitly De-Scoped

| Item | Reason |
|------|--------|
| Subscription tier enforcement logic | No pricing or tier gates needed for dev-preview |
| Crawler/extractor approval workflows | Admin workflow wiring deferred until review queue is actively used |
| URL parser stabilization (LinkedIn/Handshake) | Accepted fragility; extraction is demo-only |
| E2E test suite (Playwright/Cypress) | Valuable but out of scope for this polish phase |
| Production deployment topology (Phase 3+) | Stays in REPO_EXECUTION_PLAN, not part of polish |
| Public-facing landing page or marketing site | Not relevant to dev-preview |
| Migration tooling (Alembic) | Phase 5 concern per REPO_EXECUTION_PLAN |
| MFA recovery codes | Nice-to-have but not demo-blocking |
