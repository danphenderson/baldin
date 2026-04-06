---
sidebar_position: 4
slug: /engineering/copilot-prompt-cookbook
title: Copilot Prompt Cookbook
---

# Copilot Prompt Cookbook

Use this page when prompting Baldin's workspace agents. The goal is to start with the smallest correct owner, keep scope explicit, and make handoffs obvious when work crosses backend, frontend, contracts, docs, CI, or deployment boundaries.

Need concrete before-and-after wording examples? See [Good Prompt vs Bad Prompt](/engineering/copilot-prompt-examples).

## Recommended Operating Model

The Executive Summary review supports a local-first operating model for Baldin: keep most work inside the repo with clear specialist ownership, use asynchronous cloud-style workflows only for bounded tasks, and treat automated review as an extra check instead of a merge authority.

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
- Status: complete, partial, or blocked.
- Summary: what changed, delegated, or decided and why.
- Files touched or reviewed.
- Commands run and result summary.
- Whether API routes or schemas changed.
- Whether generated artifacts were regenerated, intentionally deferred, or unchanged.
- Risks, blockers, or assumptions.
- Recommended next owner, if any.

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
- Status: complete, partial, or blocked.
- Summary: what changed, delegated, or decided and why.
- Files touched or reviewed.
- Commands run and result summary.
- Whether API routes or schemas changed.
- Whether generated artifacts were regenerated, intentionally deferred, or unchanged.
- Risks, blockers, or assumptions.
- Recommended next owner, if any.

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
- Status: complete, partial, or blocked.
- Summary: what changed, delegated, or decided and why.
- Files touched or reviewed.
- Commands run and result summary.
- Whether API routes or schemas changed.
- Whether generated artifacts were regenerated, intentionally deferred, or unchanged.
- Risks, blockers, or assumptions.
- Recommended next owner, if any.

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
