---
description: "Use when you need a deep-thinking session to plan a user story epic: break a feature theme, plan section, or set of issues into a structured epic with prioritized stories, acceptance criteria, cross-stack dependencies, and a phased delivery sequence."
name: "Deep Think Epic Planner"
argument-hint: "Feature theme, plan file, GitHub issue(s), or goal to turn into an epic"
agent: "Baldin Lead Full-Stack Architect"
model: ["Claude Opus 4.6 (copilot)", "GPT-5 (copilot)"]
tools: [search/codebase, search/textSearch, search/fileSearch, search/listDirectory, search/changes, read/readFile, read/problems, web/fetch, agent/runSubagent, vscode/askQuestions, vscode/memory, todo]
---
You are running a deep-thinking epic planning session. Slow down. Reason carefully and thoroughly before producing output. Prioritize correctness and completeness of the plan over speed.

Use [Baldin Project Delivery Rules](../instructions/baldin-project.instructions.md), [Prompt The Right Agent](../../docs/docs/engineering/copilot-prompt-cookbook.md), [System Overview](../../docs/docs/architecture/system-overview.md), and the active plan sources listed in [plans/README.md](../../plans/README.md) for repo context.

## Input

The user will provide one or more of:
- A feature theme or goal description
- A tracked plan file from `plans/` or a repo-root `*-epic.md` / `*-spike.md` planning doc
- One or more GitHub issues
- A rough feature idea or whiteboard sketch

If the input is ambiguous, ask targeted clarifying questions before proceeding. Do not guess scope.

## Process

Work through each phase deliberately. Do not skip or compress steps.

### 1 — Discovery & Context Gathering
- Read the provided input thoroughly. If a plan file is referenced, read it in full.
- Explore the current codebase surfaces that the epic would touch: models, routes, schemas, frontend pages, services, tests, docs.
- Identify what already exists, what is partially built, and what is net-new.
- Check repo memories and session context for relevant prior decisions or known constraints.
- Summarize the current state of the world relevant to this epic.

### 2 — Problem Framing
- State the user-facing problem or outcome the epic delivers in one paragraph.
- Identify the primary user persona(s) and their jobs-to-be-done.
- Name the system boundaries involved: backend, frontend, contracts, ETL, docs, CI, infrastructure.
- Enumerate constraints: Baldin is a local-first developer-preview monorepo approaching a deployable POC. Do not inject enterprise-scale or cloud-mature assumptions.

### 3 — Story Decomposition
Break the epic into user stories following this structure for each:

```
### Story <N>: <title>
**As a** <persona>, **I want** <capability>, **so that** <outcome>.

**Acceptance criteria:**
- [ ] <observable, testable criterion>
- [ ] ...

**Surfaces:** backend | frontend | contracts | ETL | docs | CI | scripts
**Dependencies:** <story numbers or external>
**Estimated complexity:** S | M | L
**Owner recommendation:** Backend Agent | Frontend Agent | Lead Architect | Project Manager
```

Aim for stories that are:
- Independently deliverable or have explicit dependency ordering
- Small enough to validate in a single session (prefer S/M, split L when possible)
- Vertically sliced: each story delivers observable value, not horizontal layers

### 4 — Dependency Graph & Sequencing
- Map story dependencies explicitly. Identify the critical path.
- Group stories into delivery phases (1–3 phases). Each phase should be independently shippable or at least independently validatable.
- Call out generated-artifact obligations (openapi.json, schema.d.ts) and when contract regeneration is required in the sequence.
- Identify external or manual prerequisites (permissions, env setup, third-party APIs).

### 5 — Risk & Trade-off Analysis
- Enumerate technical risks, unknowns, and assumptions for each phase.
- For each risk, state the mitigation or the spike needed to resolve it.
- Identify scope creep traps: things that look related but should be deferred.
- State what is explicitly out of scope for this epic.

### 6 — Validation Strategy
- For each phase, specify the validation evidence required before moving to the next.
- Map validation to the Baldin standard: backend pytest scope, frontend tsc + test + build, contract regen, docs build.
- Include integration validation when stories cross boundaries.

## Output

Return a single structured epic document with these sections:

1. **Epic title**
2. **Problem statement** (1 paragraph)
3. **Current state summary** (what exists today)
4. **User stories** (numbered, with full structure from step 3)
5. **Dependency graph** (text or mermaid diagram)
6. **Phased delivery plan** (stories grouped into phases with sequencing rationale)
7. **Risk register** (risks, likelihood, impact, mitigation)
8. **Out of scope** (explicit exclusions)
9. **Validation plan by phase**
10. **Open questions** (anything that needs user input before execution can start)

## Constraints
- Do not produce implementation code. This is a planning artifact.
- Do not assume cloud-scale, HA, or enterprise patterns unless the user explicitly scopes them in.
- Do not create stories for work that is already complete in the codebase — call it out as prior art.
- If the epic is too large (>12 stories), recommend splitting into multiple epics and explain the cut line.

## Stop Conditions
- If the input is too vague to produce meaningful stories after one round of clarifying questions, say so and return what you can with explicit gaps marked.
- If the epic is actually a single story, say so and recommend using `/plan-slice-kickoff` instead.
