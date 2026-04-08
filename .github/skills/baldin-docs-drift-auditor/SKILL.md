---
name: baldin-docs-drift-auditor
description: "Audit Baldin documentation drift. Use when README, docs, plans, setup guides, architecture notes, agent, prompt, or persona docs, or local workflow docs may no longer match the current codebase, prototype behavior, routes, UI, scripts, env requirements, or developer-preview scope."
argument-hint: "Optional: docs area, feature, or workflow to focus on"
---

# Baldin Docs Drift Auditor

Use this skill to run an evidence-backed documentation drift audit for Baldin. Treat the current repository and current prototype behavior as the source of truth.

## Scope

- This is a Baldin-only workspace skill and should stay in `.github/skills/` for this repo.
- Do not generalize the audit framing into a cross-repo or personal documentation-review skill.

## Default Assumptions

- Baldin is local-first and still in developer-preview, not a production-hardened SaaS platform.
- The current frontend and backend implementation, checked-in routes and schemas, scripts, config, env requirements, and local workflow override stale documentation.
- Overstatements about maturity, guarantees, architecture, deployment readiness, automation, or feature completeness count as drift.
- When `plans/**` is being used as current truth for active work, release posture, or implementation status, audit those plan files by default as documentation surfaces, but do not let them override implementation.

## Audit Targets

- `README.md`
- `docs/**`
- `plans/**` when plans are being treated as current truth for active work or release state
- `.github/**`, including agent, prompt, instruction, persona, review, workflow, and architecture docs
- setup and local-development guides
- architecture and workflow documentation

## Source-of-Truth Inputs

- frontend routes, pages, layouts, services, and env config
- backend routes, request flows, schemas, tests, and feature boundaries
- scripts, `docker-compose.yml`, CI workflows, and env examples
- checked-in contracts such as `openapi.json` and generated frontend schemas
- current repository structure and prototype-only workflow constraints
- active plans only as claimed-state evidence when the repo treats them as current truth; implementation still wins conflicts

## Procedure

1. Establish scope.
   - If the user named a docs area, feature, or workflow, narrow the audit to that scope.
   - Otherwise audit the repo-wide documentation surfaces in the targets above.
   - By default, include `plans/**` whenever active plans are being treated as current-truth docs for the present phase, release readiness, or implementation status.
2. Build the current-truth model from code and config.
   - Inspect current frontend information architecture, pages, route wiring, and visible feature boundaries.
   - Inspect backend routes, schemas, request flows, and implemented capabilities.
   - Inspect scripts, compose setup, env expectations, build and test commands, and generated artifacts.
   - Note where prototype-only behavior or unfinished work constrains what docs can truthfully claim.
3. Compare docs against implementation.
   - Look for mismatches in setup steps, commands, env variables, request flows, feature availability, architecture, deployment posture, collaboration workflow, operating assumptions, and plan-level claims that are being treated as present truth.
   - Flag omissions only when they materially mislead developers, reviewers, or stakeholders.
   - Ignore style-only issues unless the wording hides a factual mismatch.
4. Rank confirmed drift.
   - `Critical drift`: likely to break local setup, onboarding, or operational decisions, or materially misstates product reality.
   - `High drift`: significantly misstates feature boundaries, architecture, or workflow expectations.
   - `Medium drift`: partially stale or misleading, but unlikely to block execution.
   - `Low drift`: bounded factual inaccuracies worth fixing when clearly evidenced.
5. Recommend corrections.
   - Propose the smallest doc correction that restores truth.
   - Separate confirmed fixes from items that require engineering or product confirmation.
6. Produce the required report.

## Required Output

`Executive summary`
- Summarize overall drift severity, affected surfaces, and the main onboarding or product-truth risks.

`Ranked docs-drift findings`
- Use numbered items ordered by severity, then impact.
- For each finding, use this exact shape:

  `[Severity] Short title`
  `Docs:` exact doc paths or sections
  `Source of truth:` exact code, config, script, route, or workflow evidence
  `Why this is drift:` the concrete mismatch
  `Recommended correction:` the narrowest accurate doc update
  `Confidence:` High or Medium

`File-by-file affected areas`
- List each affected documentation file and the stale or misleading areas inside it.

`Items requiring engineering or product confirmation`
- Include only unresolved items that block a precise correction.

`Staged patch plan`
- Stage 1: onboarding, setup, and local-workflow corrections
- Stage 2: product-truth, architecture, and feature-boundary corrections
- Stage 3: lower-risk cleanup and consistency passes

## Rules

- No generic feedback.
- No speculative complaints.
- No praise or style-only nitpicks unless wording hides real drift.
- Prioritize correctness, onboarding accuracy, product truthfulness, and architectural alignment.
- Prefer direct evidence from the current repo over plans, roadmap language, or stale summaries.
- Audit `.github/**` agent, prompt, instruction, persona, review, and workflow docs by default, not only user-facing product docs.
- Report-only: do not edit docs or draft patches as part of this skill. If fixes are requested, treat that as a follow-on task after the audit.
- If a document is intentionally aspirational, say so and recommend relabeling it instead of treating it as current truth.
- Be especially alert for claims that overstate maturity, guarantees, automation, deployment readiness, or feature completeness.

## Completion Checks

- Every finding ties at least one doc claim to at least one current source-of-truth artifact.
- The report clearly separates confirmed drift from confirmation-needed gaps.
- The staged patch plan can be applied incrementally without rewriting unrelated docs.
- The audit reflects Baldin's current local-first developer-preview state.

## Example Prompts

- Audit `README.md` and local setup docs for drift against today's codebase.
- Check `docs/**`, `plans/**`, and `.github/**` for claims that overstate Baldin's maturity or workflow guarantees.
- Compare architecture docs, plan docs being treated as current truth, and frontend IA docs against current routes, pages, scripts, and backend request flows.
