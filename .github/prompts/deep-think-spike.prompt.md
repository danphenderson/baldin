---
description: "Use when you need a deep-thinking session to run a technical spike: investigate a bounded unknown, prototype an approach, evaluate feasibility, or produce a decision record that feeds into epic planning or story execution."
name: "Deep Think Spike"
argument-hint: "Technical question, feasibility concern, approach comparison, or unknown to investigate"
agent: "Baldin Lead Full-Stack Architect"
model: ["Claude Opus 4.6 (copilot)", "GPT-5 (copilot)"]
tools: [search/codebase, search/textSearch, search/fileSearch, search/listDirectory, search/changes, read/readFile, read/problems, web/fetch, agent/runSubagent, execute/runInTerminal, execute/getTerminalOutput, execute/awaitTerminal, vscode/askQuestions, vscode/memory, todo]
---
You are running a deep-thinking technical spike session. Slow down. Investigate thoroughly, read real code, and validate assumptions against the actual codebase before drawing conclusions. Prefer evidence over intuition.

Use [Baldin Project Delivery Rules](../instructions/baldin-project.instructions.md), [System Overview](../../docs/docs/architecture/system-overview.md), and the active plan sources listed in [plans/README.md](../../plans/README.md) for repo context.

## Input

The user will provide one or more of:
- A technical question or feasibility concern
- An approach to evaluate ("can we do X with Y?")
- Two or more options to compare ("should we use A or B?")
- A story or epic reference that has an unresolved technical unknown
- A dependency, library, or integration to assess

If the question is too broad, ask one round of clarifying questions to bound the investigation. Do not start investigating everything at once.

## Process

Work through each phase deliberately. Show your reasoning at each step.

### 1 — Frame the Question
- Restate the spike question in a single precise sentence.
- Identify what a successful spike outcome looks like: a decision, a proof-of-concept finding, a feasibility verdict, or a set of constraints.
- Name the time-box: spikes should answer the question, not build the feature. State what is in scope for investigation and what is not.

### 2 — Explore Current State
- Read the relevant codebase surfaces: models, routes, schemas, services, configs, dependencies, tests.
- Identify existing patterns, abstractions, or prior art that constrain the design space.
- Check `Pipfile`, `package.json`, `docker-compose.yml`, and other dependency surfaces when the spike involves new libraries or infrastructure.
- Document what you found: "the codebase currently does X via Y in these files."

### 3 — Investigate Options
For each viable approach:

```
#### Option <N>: <name>
**Approach:** What it does and how it integrates with the current codebase.
**Evidence:** Code references, dependency checks, or documentation that support feasibility.
**Surfaces touched:** backend | frontend | contracts | ETL | docs | CI | scripts | infrastructure
**Fits existing patterns:** yes | partially | no — explain.
**Complexity:** S | M | L
**Risks:** What could go wrong or what is unknown even after investigation.
**Prototype steps:** If the user wants to validate further, what is the minimal experiment.
```

When comparing options, use the same evaluation dimensions so the user can compare directly. Do not pad weak options to appear balanced.

### 4 — Run Targeted Experiments (When Warranted)
- If the spike question can be partially answered by running a command, checking an import, testing a connection, or inspecting a runtime behavior, do it.
- Keep experiments minimal and reversible. Do not install packages, write production code, or modify existing files unless the user explicitly asks for a prototype.
- Report raw output and your interpretation separately.

### 5 — Synthesize Findings
- State the spike verdict clearly: recommended option, feasibility assessment, or "needs deeper investigation because X."
- Explain the reasoning chain: what evidence supports the recommendation, what evidence was inconclusive.
- If the spike reveals that the original question was wrong or under-specified, say so and reframe.

### 6 — Produce Downstream Artifacts
Based on the spike outcome, produce the relevant artifact:

- **Decision:** A concise decision record (context, options considered, decision, consequences).
- **Constraints discovered:** A list of constraints or requirements that downstream stories must respect.
- **Story inputs:** If this spike feeds into `/deep-think-epic-planner`, produce a structured input block: problem statement, validated approach, constraints, surfaces, and estimated complexity for the implementation work.
- **Follow-up spikes:** If the investigation surfaced new unknowns, list them as bounded spike questions.

## Output

Return a single structured spike report:

1. **Spike question** (one sentence)
2. **Success criteria** (what constitutes an answer)
3. **Current state** (what exists in the codebase today)
4. **Options evaluated** (structured per step 3)
5. **Experiments run** (if any, with raw results)
6. **Recommendation** (verdict + reasoning chain)
7. **Constraints & requirements** (for downstream implementation)
8. **Downstream artifact** (decision record, story inputs, or follow-up spikes)
9. **Out of scope** (what this spike intentionally did not investigate)
10. **Confidence level** (high | medium | low — with explanation)

## Constraints
- Stay within investigation scope. Do not start building the feature.
- Do not install new dependencies or write production code unless the user explicitly requests a prototype.
- Baldin is a local-first developer-preview monorepo. Do not evaluate options against enterprise-scale, HA, or cloud-mature criteria unless the user scopes them in.
- Respect existing codebase patterns. If the spike finds a better pattern, recommend migration as a separate story, not as an implicit prerequisite.
- Time-box your own effort: if an option is clearly infeasible after initial investigation, say so and move on rather than exhaustively documenting why.

## Stop Conditions
- If the spike question is actually a known-answer implementation task, say so and recommend `/plan-slice-kickoff` or direct execution instead.
- If the spike requires access to external systems, credentials, or live environments you cannot reach, state the gap, produce what you can from static analysis, and specify what the user needs to validate manually.
- If the investigation reveals the epic framing is wrong, stop and recommend re-running `/deep-think-epic-planner` with the new understanding.
