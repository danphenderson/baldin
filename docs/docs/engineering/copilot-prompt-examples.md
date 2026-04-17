---
sidebar_position: 5
slug: /engineering/agentic-prompt-examples
title: Rewrite Weak Prompts
description: Turn vague prompts into scoped requests with validation and handback rules across Copilot and Codex.
---

<!-- last-verified: 2026-04-16 -->

# Rewrite Weak Prompts

Use this page as a companion to [Prompt The Right Agent](./copilot-prompt-cookbook.md). The fastest way to get better results from Baldin's agents is to be explicit about owner, scope, validation, the standard handback, and when to stop and hand off.

If you are using Codex instead of Copilot, translate slash-prompt examples into direct requests to the named custom agents under `.codex/agents/` or start with `/plan` when ownership is unclear.

If the owner is already obvious, skip routing prompts and start with that specialist directly.

If you want a repeatable prompt-rewrite workflow instead of tuning prompt files by hand, use `/baldin-agent-prompt-tuner` against a `.github/prompts/*.prompt.md` file or a weak draft prompt.

## What Usually Separates A Good Prompt From A Bad One

| Weak prompt pattern | Better prompt pattern |
|---------------------|-----------------------|
| asks an agent to "fix it" without saying what layer owns the problem | names the right owner or asks the Project Manager to choose one |
| mixes backend, frontend, CI, and docs in one sentence without boundaries | states what is in scope and what is out of scope |
| asks for a feature without saying how success should be validated | asks for tests, type checks, builds, generated-artifact status, and the standard handback |
| leaves cross-stack fallout implicit | tells the agent when to stop and who should take over |
| asks for polish without describing the product problem | describes the user-facing issue and expected outcome |

## Example 1: Unclear Ownership

Bad prompt:

```text
Fix the stale dashboard counts.
```

Why it is weak:

- It does not say whether this is a frontend state bug, a backend aggregation bug, or both.
- It does not say who should own the first pass.
- It does not ask for validation or handoffs.

Good prompt:

```text
Plan the smallest low-conflict workstreams for this Baldin issue.

Objective:
Find and fix why the dashboard shows stale action-item counts after edits.

Context:
The bug might be in frontend state updates, backend aggregation, or both.

Validation:
Return owner selection, workstreams, generated-artifact needs, and the exact checks each owner should run.

Require every implementation owner to return the standard handback fields from the Agentic Workflow Cookbook.

Do not implement yet unless this is obviously a tiny single-owner fix.
```

Why it works:

- It uses Baldin Project Manager for routing instead of guessing.
- It asks for sequencing and validation, not just a vague diagnosis.
- It keeps ownership explicit before implementation starts.

## Example 2: Backend Bugfix

Bad prompt:

```text
Update the leads API and frontend if needed.
```

Why it is weak:

- It invites silent scope creep across backend and frontend.
- It does not say whether contract regeneration belongs in the task.
- It does not ask for backend regression coverage.

Good prompt:

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
- run the most relevant pytest scope first
- add a regression test
- run `SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh` only if routes or schemas changed

Return:
- use the Standard Handback fields from the Agentic Workflow Cookbook.

Stop and hand off if this changes the public API contract and downstream frontend validation is not straightforward.
```

Why it works:

- It keeps the Baldin Backend Agent inside the backend slice.
- It requires tests and contract-status reporting.
- It makes cross-stack follow-on explicit instead of accidental.

## Example 3: Frontend UX Work

Bad prompt:

```text
Make the dashboard nicer.
```

Why it is weak:

- It is cosmetic and underspecified.
- It does not describe the product problem.
- It does not require handling of loading, empty, or error states.

Good prompt:

```text
Implement this in frontend only.

Objective:
Improve the dashboard loading, empty, and error states.

Context:
The page feels blank and ambiguous while data is loading or when no activity exists.

Allowed paths:
- ./frontend/**

Validation:
- run the smallest useful frontend test first
- run ./node_modules/.bin/tsc --noEmit if shared types or typed service usage changed

Return:
- use the Standard Handback fields from the Agentic Workflow Cookbook.

Stop and hand off if the needed state is not available from the current API contract.
```

Why it works:

- It frames the request as a user-facing problem, not vague polish.
- It keeps the Baldin Frontend Agent focused on UI and typed contract consumption.
- It avoids hiding backend dependency problems behind frontend workarounds.

## Example 3B: Figma-First Design Work

Bad prompt:

```text
Update the design system in Figma and wire up the code too.
```

Why it is weak:

- It mixes Figma-first design work with code implementation in one sentence.
- It does not say whether the output is a library study, a command-center redesign step, or a repo-backed mapping change.
- It does not ask for design evidence or a handoff when implementation should move to another owner.

Good prompt:

```text
Lead this as Figma-first design work.

Objective:
Finalize the next approved route-family redesign and prepare a clean design-to-code handoff.

Context:
Use `docs/docs/reference/baldin-redesign-handoff.md` as the active redesign source of truth. The output should be ready for the required implementation brief without reopening capture work.

Allowed paths:
- ./docs/docs/reference/baldin-redesign-handoff.md
- ./docs/docs/engineering/redesign-implementation-program.md
- ./frontend/src/design-system/**/*.figma.ts
- ./frontend/src/design-system/**/*stories.tsx
- ./docs/docs/reference/design-system-catalog.md

Validation:
- capture or inspect the relevant Figma node
- run `cd frontend && npm run storybook:build` if the code-backed mapping changed
- run `npm --prefix docs run build` if design docs changed

Return:
- use the Standard Handback fields from the Agentic Workflow Cookbook.

Stop and hand off if the task becomes broad frontend implementation or cross-stack delivery.
```

Why it works:

- It gives Baldin Design Lead Agent a clearly design-first slice instead of mixing ownership.
- It requires Figma or harness evidence, not invented polish.
- It makes the frontend or architect handoff explicit if the work stops being primarily design.

## Example 4: Cross-Stack Feature

Bad prompt:

```text
Add a company health score everywhere.
```

Why it is weak:

- It says "everywhere" without defining the contract surface.
- It does not say whether schema regeneration, docs, or validation are required.
- It risks backend and frontend changing independently without one integration owner.

Good prompt:

```text
Own cross-stack design, delegation, and integration across backend, frontend, and contract surfaces.

Objective:
Add a company health score that is stored in backend responses and displayed in the frontend.

Context:
This requires a schema change, API update, generated type refresh, and frontend presentation.

Validation:
- run relevant backend tests
- run relevant frontend tests and typecheck
- run `SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh`

Return:
- use the Standard Handback fields from the Agentic Workflow Cookbook.

Delegate isolated backend-only and frontend-only slices by default, but keep contract ownership here.
```

Why it works:

- It gives Baldin Lead Full-Stack Architect a real cross-stack charter without turning it into the default owner for isolated slices.
- It makes generated artifacts part of the task, not an afterthought.
- It asks for the same handback schema the implementation agents now use everywhere else.

## Example 5: Read-Only Scouting

Bad prompt:

```text
Figure this out and fix it.
```

Why it is weak:

- It sends Explore beyond its role.
- It does not say what question needs answering.
- It does not help with owner selection.

Good prompt:

```text
Scout this area read-only and recommend the right owner.

Question:
Which files are responsible for document bootstrap retries and who should own a bug where the editor opens before seed data is ready?

Focus:
- backend collaboration bootstrap logic
- frontend collaborative editor hook
- any contract types involved

Return:
- relevant files
- current behavior
- risks or unknowns
- recommended agent owner

Do not edit files.
```

Why it works:

- It uses Explore as a scout instead of an implementer.
- It narrows the search surface.
- It returns the exact information needed for the next handoff.

## Example 6: Over-Automation And Blind Trust

Bad prompt:

```text
Implement this end to end, use any tools you need, and finish everything automatically.
```

Why it is weak:

- It gives no boundaries on layers, files, or side effects.
- It encourages silent scope growth and weak review discipline.
- It does not ask for a planning step, validation, or a next-owner handoff.

Good prompt:

```text
Start with a scoped plan, then implement only the smallest complete slice.

Objective:
Add a settings field to the backend response and surface it in the frontend profile page.

Context:
This is a cross-stack contract change, so generated types and validation matter.

Validation:
- run the relevant backend tests
- run the relevant frontend tests and typecheck
- run ./scripts/update_frontend_schemas.sh

Return:
- use the Standard Handback fields from the Agentic Workflow Cookbook.

Do not widen the task beyond this slice without stating why and naming the next owner.
```

Why it works:

- It forces a planning step before broad automation.
- It treats validation and generated artifacts as first-class outputs.
- It makes any additional scope explicit instead of accidental.

## Short Before-And-After Upgrades

Bad:

```text
Fix the API.
```

Better:

```text
Implement this in backend only. Fix the applications route returning inconsistent status values, add a regression test, and stop if the frontend contract must change.
```

Bad:

```text
Improve the UI.
```

Better:

```text
Implement this in frontend only. Improve the application detail page for loading, empty, and error states, run tests and typecheck, and stop if the API contract is missing data needed for the UI.
```

Bad:

```text
Handle this feature end to end.
```

Better:

```text
Own cross-stack design, delegation, and integration across backend, frontend, and generated contracts. Add the new field, run schema regeneration, validate both surfaces, and name any follow-on owner if docs or CI updates are deferred.
```

## Rules Of Thumb

- If ownership is unclear, start with Baldin Project Manager.
- If the task is obviously backend-only or frontend-only, start with that specialist directly instead of routing through issue-dispatch prompts.
- If the task is primarily Figma-first design work, start with Baldin Design Lead Agent before asking for repo implementation.
- If the task changes backend responses consumed by the frontend, either start with Baldin Lead Full-Stack Architect or explicitly require a next-owner handoff.
- Ask for the standard handback fields whenever an agent is expected to implement or validate changes.
- Ask for generated-artifact status whenever API routes or schemas might move.
- Ask for validation evidence every time, but prefer a smoke check first and broader gates only when the touched surface needs them.

## Related Docs

- [Prompt The Right Agent](./copilot-prompt-cookbook.md)
- [Contribute Safely](../getting-started/contributing.md)
- [Run The Right Checks](./testing.md)
