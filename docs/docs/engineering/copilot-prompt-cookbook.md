---
sidebar_position: 4
slug: /engineering/copilot-prompt-cookbook
title: Prompt The Right Agent
description: Choose the right agent, scope prompts cleanly, and require consistent handbacks.
---

<!-- last-verified: 2026-04-08 -->

# Prompt The Right Agent

Use this page when prompting Baldin's workspace agents. The goal is to start with the smallest correct owner, keep scope explicit, and make handoffs obvious when work crosses backend, frontend, contracts, docs, CI, or deployment boundaries.

Need concrete before-and-after wording examples? See [Rewrite Weak Prompts](./copilot-prompt-examples.md).

## Recommended Operating Model

The Executive Summary review supports a local-first operating model for Baldin: keep most work inside the repo with clear specialist ownership, use asynchronous cloud-style workflows only for bounded tasks, and treat automated review as an extra check instead of a merge authority.

## Instruction Layers

Keep Baldin's Copilot guidance layered so repo policy does not get duplicated across every prompt and agent.

| Layer | File | Purpose |
|-------|------|---------|
| Always-on baseline | `.github/copilot-instructions.md` | Repo posture, boundaries, generated artifacts, and default validation expectations |
| Product and delivery edits | `.github/instructions/baldin-project.instructions.md` | Edit-time guardrails for backend, frontend, docs, scripts, workflows, contracts, and deployment files |
| Copilot asset edits | `.github/instructions/baldin-agent-customization.instructions.md` | Rules for prompts, agents, skills, instructions, and Copilot workflow docs |

Prompts and agents should link back to these layers and to the docs below instead of re-embedding the same repo policy in every file.

| Workflow | When to prefer it | Baldin guidance |
|----------|-------------------|-----------------|
| Local-first workspace agents | Day-to-day features, fixes, and investigations | Default path. Start with Baldin Project Manager if ownership is unclear, then hand work to the smallest correct specialist. |
| Async issue or PR agent work | Well-scoped backlog items or long-running tasks | Good for bounded follow-up work, but keep the prompt explicit and review the resulting branch or PR like any other change. |
| Copilot code review | Pull-request review and missed-routine-issue detection | Recommended as a second reviewer, not a replacement for human approval. |
| Explore scouting | Read-only repository discovery before implementation | Use it to reduce search overhead and confirm ownership, not to make edits. |

### Suggested team loop

1. Start with a clear issue or task statement.
2. Choose the smallest correct owner, or ask Baldin Project Manager to choose.
3. Ask for implementation plus validation, not just code.
4. Review diffs, generated artifacts, and test results.
5. Open or update the pull request.
6. Optionally request Copilot review as a secondary reviewer.
7. Keep human approval as the final merge decision.

## Start Here

| Need | Best starting agent |
|------|---------------------|
| Backend-only routes, models, auth, ETL, or tests | Baldin Backend Agent |
| Frontend-only UI, accessibility, routing, state handling, or typed service consumption | Baldin Frontend Agent |
| Backend and frontend together, API contracts, schema regeneration, scripts, CI, docs, or docker-compose | Baldin Lead Full-Stack Architect |
| Unclear ownership, multi-stream work, or sequencing and handoffs | Baldin Project Manager |
| Read-only scouting before assigning a real owner | Explore |

## Workspace Skills

Use workspace skills for repeated Baldin workflows that are narrower than a full implementation handoff.

- `/baldin-agent-prompt-tuner` for tightening `.github/prompts/*.prompt.md` files against the prompt cookbook, prompt examples, owner model, stop conditions, and prompt catalog rules.
- `/baldin-backend-test-gap-planner` for backend route, auth, ETL, and orchestration changes where you need the right pytest strategy, fixture reuse, and smallest useful coverage scope.
- `/baldin-contract-regen-resolver` for stale or missing `openapi.json` and `frontend/src/schema.d.ts`, `./scripts/update_frontend_schemas.sh` exits, `SCHEMA_UPDATE_FORCE`, and backend-to-frontend contract fallout.
- `/baldin-local-stack-doctor` for Docker Compose startup failures, local Postgres volume drift, host-versus-container test DB confusion, and choosing between reset or collation repair.
- `/baldin-docs-drift-auditor` when docs, plans, or `.github/**` guidance may no longer match the current repo.

## Reusable Prompt Files

If you already know the task shape, use these workspace prompts from chat with `/` instead of rewriting the same Baldin context each time.

| Prompt | Use when |
|--------|----------|
| `Issue Dispatch Kickoff` | You are starting from a GitHub issue, PR comment, or backlog ticket and want a dispatch-ready execution slice with the right owner and handoff packet. |
| `Backend Runtime Slice` | You want a backend-only implementation entry point for FastAPI, auth, model, extractor, ETL, or backend test work that should stay inside `backend/`. |
| `Frontend Product Slice` | You want a frontend-only implementation entry point for page, UX, IA, accessibility, route, state, or typed service-consumption work against the current contract. |
| `Local Preview Integration Fix` | You want one cross-stack owner to reproduce and fix a local-first preview bug that may touch backend, frontend, contracts, scripts, or docker-compose. |
| `Deep Think Spike` | You need a bounded technical spike to answer an unknown before choosing an implementation path. |
| `Deep Think Epic Planner` | You want a plan section, feature theme, or group of issues turned into a phased epic with explicit stories and dependencies. |
| `Hard-Gate PR Review` | You want a concrete pre-merge review of the active PR or current branch focused on merge risk. |
| `API Contract Change Orchestrator` | You changed routes, schemas, response shapes, or generated frontend types and need contract ownership, regeneration, and downstream validation. |
| `Change-Aware Validation Sequence` | You want the exact ordered Baldin checks for a specific backend, frontend, docs, CI, or contract change. |
| `Issue Cleanup Orchestrator` | You want the Baldin Project Manager to clean up open issues in order: dedupe or rescope, rewrite for dispatch, then assign labels, project fields, milestones, and relationships. |
| `Plan Slice Kickoff` | You want a plan section turned into a bounded work slice with the correct owner, scope, stop conditions, and validation. |
| `Documentation Impact Review` | You changed code, workflow docs, plans, prompts, or repo rules and want a targeted docs-impact audit before stale guidance spreads. |
| `Cross-Stack Workstream Router` | You have a backend plus frontend plus docs or CI style task and want the smallest low-conflict owner split with explicit handoff packets. |
| `Multi-Agent Handoff Synthesizer` | You already have outputs from one or more Baldin agents and need a single evidence-backed handoff packet for the next owner, reviewer, or operator. |
| `UX Redesign Spike Dispatch` | You want three materially different redesign concepts for a Baldin page or flow compared and a recommendation before implementation. |

## Prompt Decision Table

Use this table to choose the right prompt for a task. Prompts are classified as **core** (routine daily use), **advanced** (requires multi-step reasoning or large context), or **maintenance** (specialized repo upkeep).

| Prompt | Classification | Purpose | When to use instead of a simpler alternative |
|--------|---------------|---------|----------------------------------------------|
| Issue Dispatch Kickoff | core | Start from a GitHub issue or backlog ticket | Default entry for issue-driven work |
| Backend Runtime Slice | core | Backend-only implementation entry point | When the task is confirmed backend-only |
| Frontend Product Slice | core | Frontend-only implementation entry point | When the task is confirmed frontend-only |
| Local Preview Integration Fix | core | Cross-stack local preview bug | When a local bug spans backend + frontend |
| Change-Aware Validation Sequence | core | Ordered validation checks for a change | After any implementation to verify correctness |
| Documentation Impact Review | core | Targeted docs-impact audit | After code or workflow changes |
| API Contract Change Orchestrator | core | Contract ownership and regeneration | When backend API shapes change |
| Hard-Gate PR Review | core | Pre-merge review of the active PR | Before merging significant changes |
| Cross-Stack Workstream Router | core | Owner split for multi-surface tasks | When a task touches backend + frontend + docs/CI |
| Multi-Agent Handoff Synthesizer | core | Consolidate agent outputs into one handoff | After multiple agents return results |
| Plan Slice Kickoff | core | Turn a plan section into a work slice | When starting from plans/ rather than issues |
| Deep Think Spike | advanced | Bounded technical spike | When the answer requires deep research before choosing an implementation path |
| Deep Think Epic Planner | advanced | Phased epic planning from a theme or plan | When a large feature needs story breakdown and dependency mapping |
| UX Redesign Spike Dispatch | advanced | Three UX redesign concepts with recommendation | When you need structured concept comparison before committing to a UX direction; use Deep Think Spike for general technical spikes |
| Issue Cleanup Orchestrator | maintenance | Multi-pass backlog cleanup | When the issue backlog needs deduplication, rescoping, or enrichment |

## Prompt Lifecycle Rules

1. **New prompts require a decision-table entry.** Before adding a prompt to `.github/prompts/`, add a row to the decision table above and classify it as core, advanced, or maintenance.
2. **Overlap triggers merge or retirement.** If two prompts have >80% overlap in purpose, one must be merged into the other or retired. The decision table's "When to use instead of a simpler alternative" column should make the distinction clear.
3. **Maintenance prompts are reviewed quarterly.** Prompts classified as maintenance should be evaluated for conversion to a skill (under `.github/skills/`) or retirement when their workflow stabilizes.
4. **Advanced prompts carry usage guidance.** Prompts classified as advanced should include a note in their description or body explaining when the simpler alternative is sufficient.

## Exact Slash Examples

Prompt files use the prompt `name` after `/`, and workspace skills use the skill `name` after `/`. In practice, type `/`, pick the entry from the menu, and then add the rest of the request in the same chat input.

### Skills

| Skill | Example |
|-------|---------|
| `baldin-agent-prompt-tuner` | `/baldin-agent-prompt-tuner tighten a weak prompt draft for a backend-only auth fix` |
| `baldin-backend-test-gap-planner` | `/baldin-backend-test-gap-planner applications route CRUD and attachment changes` |
| `baldin-contract-regen-resolver` | `/baldin-contract-regen-resolver ApplicationRead changed and schema.d.ts looks stale after backend edits` |
| `baldin-local-stack-doctor` | `/baldin-local-stack-doctor docker-compose boots but test_db is unhealthy and backend tests cannot connect` |
| `baldin-docs-drift-auditor` | `/baldin-docs-drift-auditor prompts, plans, and docs after the service-layer migration` |

### Prompt Files

| Prompt | Example |
|--------|---------|
| `Issue Dispatch Kickoff` | `/Issue Dispatch Kickoff issue #126 stale command center counts after action-item edits` |
| `Backend Runtime Slice` | `/Backend Runtime Slice fix duplicate lead creation when the same source URL is processed twice` |
| `Frontend Product Slice` | `/Frontend Product Slice improve the applications detail loading and empty states` |
| `Local Preview Integration Fix` | `/Local Preview Integration Fix frontend board loads but the applications detail flow fails after docker-compose boot` |
| `Deep Think Spike` | `/Deep Think Spike should Baldin batch application document metadata or keep lazy per-view loading` |
| `Deep Think Epic Planner` | `/Deep Think Epic Planner turn AI_SLOP_REMEDIATION_PLAN.md into phased execution stories` |
| `Hard-Gate PR Review` | `/Hard-Gate PR Review PR 130 with focus on applications routes and generated artifacts` |
| `API Contract Change Orchestrator` | `/API Contract Change Orchestrator add company health score to backend responses and frontend consumers` |
| `Change-Aware Validation Sequence` | `/Change-Aware Validation Sequence backend applications schema changed and the detail page now calls GET /applications/{id}` |
| `Issue Cleanup Orchestrator` | `/Issue Cleanup Orchestrator issues #82 and #105 ETL direction conflict` |
| `Plan Slice Kickoff` | `/Plan Slice Kickoff AI_SLOP_REMEDIATION_PLAN.md Phase 3 service-layer migration` |
| `Documentation Impact Review` | `/Documentation Impact Review applications detail page now uses GET /applications/{id}` |
| `Cross-Stack Workstream Router` | `/Cross-Stack Workstream Router add crawler pause status to backend, frontend, docs, and validation` |
| `Multi-Agent Handoff Synthesizer` | `/Multi-Agent Handoff Synthesizer backend applications tests landed and frontend service migration is next` |
| `UX Redesign Spike Dispatch` | `/UX Redesign Spike Dispatch the applications detail page feels dense and confusing after adding attachments and status history` |

## Prompt Shape

Use this structure for most requests:

```text
Objective:
[one concrete outcome]

Context:
[user-facing bug, feature, or reason this matters now]

In scope:
[layers, files, or boundaries the agent is allowed to touch]

Out of scope:
[layers or files the agent should avoid]

Validation:
[tests, builds, or checks you want run]

Stop and hand off if:
[what should trigger a next owner instead of silent scope creep]
```

## Standard Handback

For non-trivial backend, frontend, or full-stack work, ask the implementation owner to return this exact schema:

```text
Return:
- Status: complete, partial, or blocked.
- Summary: what changed, delegated, or decided and why.
- Files touched or reviewed.
- Commands run and result summary.
- Whether API routes or schemas changed.
- Whether generated artifacts were regenerated, intentionally deferred, or unchanged.
- Risks, blockers, or assumptions.
- Recommended next owner, if any.
```

Baldin Project Manager should require this schema in handoff packets, and the backend, frontend, and architect agents should return it verbatim.

## Baldin Project Manager

Use when the task crosses boundaries or you are not sure who should own it.

```text
Plan the smallest low-conflict workstreams for this Baldin task.

Objective:
[one concrete repo outcome]

Context:
[bug report, feature request, or integration problem]

In scope:
[backend, frontend, docs, CI, scripts, contracts, deployment, or unknown]

Out of scope:
[anything you do not want touched]

Validation:
[what proof each owner should return]

Return:
- owner-selection rationale
- workstreams and sequencing
- generated-artifact requirements
- handoff packets
- validation requirements

Require every implementation handoff packet to use the Standard Handback schema above.

Do not implement unless this is a tiny coordination-only edit.
```

Best for:

- deciding whether a task is backend-only, frontend-only, or truly cross-stack
- splitting a large feature into low-conflict slices
- making sure schema regeneration, docs updates, and validation do not get dropped

## Baldin Backend Agent

Use when the change should stay in backend code plus backend tests.

```text
Implement this in backend only.

Objective:
[backend bugfix or feature]

Context:
[current behavior, expected behavior, and affected endpoints or models]

Allowed paths:
- ./backend/app/**
- ./backend/etl/**
- ./backend/app/tests/**

Out of scope:
- ./frontend/**
- docs, CI, deployment, and generated artifacts by hand

Validation:
- run the most relevant backend tests
- preserve FastAPI and OpenAPI correctness
- add or update targeted backend tests if behavior changes materially

Return:
- use the Standard Handback schema from this cookbook.

Stop and hand off if frontend changes, schema regeneration ownership, or other cross-stack work is required.
```

Best for:

- route fixes
- model and schema changes
- auth and admin logic
- ETL behavior
- backend regressions with clear backend ownership

## Baldin Frontend Agent

Use when the task is UI, UX, accessibility, responsiveness, route behavior, or typed frontend consumption of an existing API contract.

```text
Implement this in frontend only.

Objective:
[frontend bugfix, UX improvement, or component/route change]

Context:
[current user problem, expected user outcome, and relevant pages or flows]

Allowed paths:
- ./frontend/**

Out of scope:
- backend API design
- schema regeneration unless explicitly assigned
- CI, deployment, and generated files by hand

Validation:
- run npm run test
- run ./node_modules/.bin/tsc --noEmit
- run npm run build if production behavior changes
- add or update targeted frontend tests if behavior changes materially

Return:
- use the Standard Handback schema from this cookbook.

Stop and hand off if a missing or incorrect API contract is the real problem.
```

Best for:

- page and component polish
- accessibility and responsive fixes
- loading, empty, and error states
- frontend state or service integration bugs when the API contract already exists

## Baldin Lead Full-Stack Architect

Use when the task genuinely spans backend, frontend, generated contracts, scripts, CI, docs, or local integration.

```text
Own cross-stack design, delegation, and integration across the required Baldin layers.

Objective:
[cross-stack outcome]

Context:
[why this requires backend, frontend, contracts, scripts, docs, CI, or docker-compose together]

In scope:
[exact cross-stack surfaces]

Out of scope:
[anything you want intentionally deferred]

Validation:
- run the relevant backend checks
- run the relevant frontend checks
- run ./scripts/update_frontend_schemas.sh if API changes are in scope
- validate docs, CI, or docker-compose changes when touched

Return:
- use the Standard Handback schema from this cookbook.

Delegate isolated backend-only and frontend-only slices by default, but keep contract and integration ownership here.
```

Best for:

- new features with both API and UI work
- response-shape changes that affect generated frontend types
- schema freshness, CI, and docs regeneration work
- docker-compose or release-path changes

## Explore

Use Explore as a scout, not as an implementation owner.

```text
Scout this area read-only and recommend the right owner.

Question:
[what you need to understand]

Focus:
[files, domains, or subsystems to inspect]

Return:
- relevant files
- current behavior
- risks or unknowns
- recommended agent owner

Do not edit files.
```

Best for:

- locating the real code path before dispatching work
- checking blast radius for a change
- confirming whether a task is backend, frontend, or cross-stack

## Common Workflows

### Backend-only bugfix

Start with Baldin Backend Agent.

```text
Implement this in backend only.

Objective:
Fix duplicate lead creation when the same source URL is processed twice.

Context:
The backend is creating duplicate lead records instead of reusing the existing one.

Allowed paths:
- ./backend/app/**
- ./backend/app/tests/**

Validation:
- run the most relevant pytest scope
- add a regression test

Stop and hand off if this changes the public API contract.
```

### Frontend-only UX improvement

Start with Baldin Frontend Agent.

```text
Implement this in frontend only.

Objective:
Improve the command center loading, empty, and error states.

Context:
The page feels blank and ambiguous while data is loading or when no activity exists.

Allowed paths:
- ./frontend/**

Validation:
- run npm run test
- run ./node_modules/.bin/tsc --noEmit

Stop and hand off if the needed state is not available from the current API contract.
```

### New field end to end

Start with Baldin Lead Full-Stack Architect.

```text
Own cross-stack design, delegation, and integration across backend, frontend, and contract surfaces.

Objective:
Add a company health score that is stored in backend responses and displayed in the frontend.

Context:
This requires a schema change, API update, generated type refresh, and frontend presentation.

Validation:
- run relevant backend tests
- run relevant frontend tests and typecheck
- run ./scripts/update_frontend_schemas.sh

Delegate isolated backend-only and frontend-only slices by default, but keep contract ownership here.
```

### Unclear stale-data issue

Start with Baldin Project Manager.

```text
Plan the smallest low-conflict workstreams for this Baldin issue.

Objective:
Find and fix why the command center shows stale action-item counts after edits.

Context:
The bug might be in frontend state updates, backend aggregation, or both.

Validation:
Return owner selection, workstreams, and the exact checks each owner should run.

Do not implement yet unless this is obviously a tiny single-owner fix.
```

## Prompting Rules That Work Well

- Start single-owner unless you already know the task spans multiple layers.
- State the stop condition so agents do not silently widen scope.
- Use the Standard Handback field names in every non-trivial implementation prompt.
- Ask for generated-artifact status whenever backend routes or schemas might move.
- Ask for the recommended next owner in every non-trivial task.
- Ask for validation evidence, not just a summary.

## Trust, Review, And Safety

- Prefer a scoped planning step before broad autopilot or background-agent execution, especially for tasks that touch more than one layer.
- Keep prompts concrete. Vague one-shot requests are the fastest way to get low-signal changes and unnecessary scope creep.
- Never merge AI-generated code without human review.
- Treat tests, type checks, builds, and generated-artifact status as part of the deliverable, not optional cleanup.
- If you use Copilot CLI outside VS Code, prefer safe mode or a sandboxed environment rather than broad unattended tool access.
- Keep custom agent boundaries tight. Overlapping owners are an anti-pattern for Baldin's stack.
- Do not let agent speed replace normal engineering process: keep issues, PR descriptions, architecture discussion, and docs updates in the loop.

## Prompting Mistakes To Avoid

- Do not ask Baldin Project Manager to be the default implementation owner for real code changes.
- Do not ask Baldin Frontend Agent to own backend-driven contract regeneration unless you want a deliberate cross-stack assignment.
- Do not ask Baldin Backend Agent to patch frontend, docs, or CI as a hidden side quest.
- Do not use Baldin Lead Full-Stack Architect for a plainly backend-only or frontend-only task when a smaller owner would do.
- Do not give any agent a fuzzy “just handle everything automatically” prompt without a stop condition, validation expectations, and a named owner.

## Related Docs

- [Contribute Safely](../getting-started/contributing.md)
- [Run The Right Checks](./testing.md)
- [Regenerate API Contracts](./contract-management.md)
- [Rewrite Weak Prompts](./copilot-prompt-examples.md)
