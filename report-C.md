# Normalized Audit Report
Agent: GPT-5.3-Codex Xhigh

## Verdict
Mixed or inconclusive

## Confidence
Medium

## Executive summary
The repository shows clear engineering controls (CI gates, contract freshness checks, substantial backend tests), but also concentrated signs of weak integration discipline in a few high-impact areas: the applications vertical has broad behavior with relatively narrow direct route-test evidence, frontend service abstractions are inconsistent and duplicated, and some core/runtime surfaces still carry explicit hack debt and docs-runtime drift. This supports a mixed judgment rather than a clearly vibe-coded or clearly disciplined codebase.

## Strongest evidence supporting the “vibe coded” hypothesis
1. File path(s) or subsystem: applications.py, applications.py, test_application_export.py
Issue: Applications routes cover CRUD, deprecated legacy endpoints, attachment/export flows, and generation in one module, while direct route-test evidence is concentrated in export-focused tests.
Why it is a meaningful signal: A wide behavior surface with limited direct endpoint validation increases the chance of unreviewed regressions and shallow acceptance.
Severity: high

2. File path(s) or subsystem: extractor.tsx, skills.tsx, applications.tsx, documents.tsx
Issue: Service-layer patterns are duplicated and inconsistent (custom wrappers, any-typed request bodies, mixed error-handling styles, debug logging in runtime code).
Why it is a meaningful signal: Cross-cutting inconsistency in API integration is a strong indicator of rapid feature accretion without consolidation.
Severity: high

3. File path(s) or subsystem: extractor.tsx
Issue: Error construction includes serialized request options in thrown messages.
Why it is a meaningful signal: This is a concrete correctness/security-review gap, especially where auth-bearing request metadata can leak into logs/UI error channels.
Severity: high

4. File path(s) or subsystem: applications-detail-page.tsx, applications-detail-page.tsx
Issue: Detail view loads all applications and filters client-side; hook dependency warnings are explicitly suppressed.
Why it is a meaningful signal: This is brittle data-flow coupling and suggests expedient integration over durable architecture for a core user flow.
Severity: medium

5. File path(s) or subsystem: extraction-and-automation.md, crawler_scheduler.py, deps.py, docker-compose.yml
Issue: Docs describe Redis-backed worker mode for crawlers, while runtime paths and local stack show in-process scheduling/background execution and no Redis service.
Why it is a meaningful signal: Architecture-claim drift is a practical signal of shallow integration ownership across code/docs boundaries.
Severity: medium

6. File path(s) or subsystem: conf.py, conf.py, deps.py
Issue: Core layers include explicit hack markers and process-wide env side effects.
Why it is a meaningful signal: Unresolved core hacks in foundational modules raise maintainability risk and indicate deferred integration cleanup.
Severity: medium

## Strongest counter-evidence
1. File path(s) or subsystem: ci.yml, ci.yml
What indicates intentional engineering or review discipline: CI enforces separate lint, backend coverage, frontend test/type/build, and schema-freshness jobs.
Why it weakens the “vibe coded” hypothesis: Multi-surface gates reduce the chance of unreviewed, low-validation merges.

2. File path(s) or subsystem: .pre-commit-config.yaml, update_frontend_schemas.sh, update_frontend_schemas.sh
What indicates intentional engineering or review discipline: Automated contract regeneration is wired into local workflow and script-driven artifact updates.
Why it weakens the “vibe coded” hypothesis: This is explicit process control around a common AI-era failure mode (schema/type drift).

3. File path(s) or subsystem: test_crawlers.py, test_leads.py, test_documents_hardening.py, test_document_collaboration.py
What indicates intentional engineering or review discipline: Complex backend behaviors (auth, dedupe, collaboration persistence, crawler transitions) are tested in depth.
Why it weakens the “vibe coded” hypothesis: Substantial subsystem-level validation is inconsistent with wholesale unreviewed generation.

4. File path(s) or subsystem: main.py, main.py, db.py, db.py
What indicates intentional engineering or review discipline: Startup/shutdown lifecycle management, request-id aware 500 handling, and fail-fast pytest DB behavior are deliberate operational choices.
Why it weakens the “vibe coded” hypothesis: These are non-trivial runtime safeguards that usually require sustained ownership.

5. File path(s) or subsystem: api-client.ts, leads.tsx, vite.config.ts
What indicates intentional engineering or review discipline: There is a typed client abstraction in active use (leads) and production build-time API URL guardrails.
Why it weakens the “vibe coded” hypothesis: Indicates active hardening trajectory, not pure ad hoc implementation.

## Highest-risk areas
1. Name: Applications vertical (applications.py, applications.tsx, applications-detail-page.tsx)
Why it is high signal: Broad endpoint/UI behavior with concentrated coupling and uneven direct validation signals.
Risk type: test coverage

2. Name: Frontend service integration layer (extractor.tsx, skills.tsx, applications.tsx)
Why it is high signal: Repeated wrapper logic and inconsistent error/type handling create systemic drift risk.
Risk type: maintainability

3. Name: Shared backend dependency hub (deps.py, deps.py)
Why it is high signal: High fan-in module with cross-domain responsibilities and explicit hack comments.
Risk type: architecture

4. Name: Core runtime config surface (conf.py, conf.py)
Why it is high signal: Global env side effects and known hacks sit in startup-critical config.
Risk type: correctness

5. Name: Workflow UI complexity hotspots (pipelines.tsx, command-center.tsx, crawlers.tsx)
Why it is high signal: Very large, state-heavy pages with comparatively limited direct behavioral test evidence.
Risk type: UX

## Key uncertainties
1. Direct applications CRUD route tests may exist indirectly via broader integration tests, but the strongest explicit evidence found is export-focused.
2. Frontend service inconsistency may be transitional during migration toward typed client usage, since leads already uses that pattern.
3. Some docs-runtime drift could be known backlog debt rather than current uncontrolled implementation drift.
4. Explicit hack markers show debt presence, but not all such debt necessarily indicates poor review quality if actively tracked.

## Deduplicated findings ledger
| Theme | File path(s) / subsystem | Supports vibe-coded hypothesis? | Severity | Notes |
|---|---|---|---|---|
| Applications surface vs direct tests | applications.py, test_application_export.py | Yes | high | Broad applications behavior; direct test evidence is concentrated in export path. |
| Frontend service abstraction drift | extractor.tsx, skills.tsx, applications.tsx | Yes | high | Duplicated wrappers and inconsistent error/type patterns across services. |
| Error-path data exposure risk | extractor.tsx | Yes | high | Error string includes serialized request options. |
| Detail-flow data coupling | applications-detail-page.tsx | Yes | medium | Loads list then filters by ID; increases coupling and inefficiency. |
| Docs/runtime crawler mismatch | extraction-and-automation.md, crawler_scheduler.py, docker-compose.yml | Yes | medium | Worker-mode Redis claim not reflected in local runtime stack. |
| Core hack debt in foundational layers | conf.py, deps.py | Yes | medium | Explicit hack debt in core config/dependency boundaries. |
| CI validation breadth | ci.yml, ci.yml | No | high | Multi-job validation and schema freshness checks indicate review discipline. |
| Contract freshness automation | .pre-commit-config.yaml, update_frontend_schemas.sh | No | medium | Generated artifacts have explicit automated workflow controls. |
| Backend deep subsystem tests | test_crawlers.py, test_leads.py, test_document_collaboration.py | No | high | Substantial behavioral testing in complex backend paths. |
| Typed-client hardening trajectory | api-client.ts, leads.tsx | No | medium | Evidence of active consolidation toward stronger typed API integration. |
