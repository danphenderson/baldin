---
description: "Use when you want three materially different UX redesign directions for a Baldin page, flow, or component compared side-by-side with a recommendation before committing to implementation. UX-specialized variant of Deep Think Spike."
name: "UX Redesign Spike Dispatch"
argument-hint: "Describe the page, flow, component, or screen that needs three redesign concepts"
agent: "Baldin Lead Full-Stack Architect"
model: ["Claude Opus 4.6 (copilot)", "GPT-5 (copilot)"]
tools: [search/codebase, search/textSearch, search/fileSearch, search/listDirectory, search/changes, read/readFile, read/problems, web/fetch, agent/runSubagent, vscode/askQuestions, vscode/memory, todo]
---
You are running a UX redesign spike dispatch session. This is a UX-specialized variant of [Deep Think Spike](./deep-think-spike.prompt.md) — use that prompt instead for general technical spikes that are not about UX concepts. The goal here is not to implement a redesign. The goal is to quickly identify the current experience, explore three materially different redesign directions, and produce a decision-ready report.

Use [Baldin Project Delivery Rules](../instructions/baldin-project.instructions.md), [Prompt The Right Agent](../../docs/docs/engineering/copilot-prompt-cookbook.md), and the current frontend or backend surfaces relevant to the requested screen.

## Input

The user will provide one or more of:
- A page, route, component, or flow that feels weak or outdated
- A screenshot or description of the current UI
- A request to explore three redesign directions before implementation
- A product goal, usability problem, or visual constraint that should shape the concepts

If the target surface is unclear, ask one round of focused clarifying questions before investigating.

## Process

Work through the spike deliberately. Do not jump to implementation.

### 1 — Frame the Redesign Question
- Restate the target surface in one precise sentence.
- Name the UX problem the redesign should solve.
- Define the success criteria for the three concepts: what they must improve, preserve, or avoid.
- State whether the request is about navigation, information architecture, density, hierarchy, interaction flow, visual polish, or all of the above.

### 2 — Inspect the Current Experience
- Read the actual code and nearby route, layout, page, and component surfaces that render the target UI.
- Identify the current structure, interaction model, and any constraints from shared layouts, generated data, or route patterns.
- Capture what the current experience is optimized for today and where it breaks down.

### 3 — Propose Three Redesign Directions
Produce three concepts that are meaningfully different from one another. Avoid superficial restyling.

For each concept, use this structure:

```text
#### Concept <N>: <short name>
**Design intent:** The experience principle or user outcome this concept prioritizes.
**What changes:** The main layout, navigation, hierarchy, density, or interaction changes.
**What stays:** The behaviors or information that should remain familiar.
**Strengths:** Why this direction is worth considering.
**Trade-offs:** What it makes harder, slower, or riskier.
**Best fit:** The user context or product goal it serves best.
**Implementation surface:** frontend | backend | contracts | docs | CI | scripts
**Complexity:** S | M | L
```

At least one concept should be conservative, one should be balanced, and one should be more ambitious.

### 4 — Evaluate and Recommend
- Compare the three concepts on usability, clarity, implementation risk, and fit with the existing Baldin product direction.
- Recommend one concept and explain why it is the best next step.
- Call out any concept that should be split into smaller follow-on changes rather than done as one redesign.

### 5 — Define Downstream Constraints
- List the design and product constraints the implementation story must respect.
- Call out any backend, contract, generated-artifact, or cross-stack dependency the redesign would trigger.
- Note any research gaps or prototype questions that should be answered before implementation.

## Output

Return a single structured spike report:

1. **Spike question**
2. **Current state summary**
3. **Success criteria**
4. **Three redesign concepts**
5. **Recommendation**
6. **Trade-offs and risks**
7. **Constraints for implementation**
8. **Downstream owner or next step**
9. **Out of scope**
10. **Confidence level**

## Constraints
- Do not write production code or modify files.
- Keep the answer grounded in the actual Baldin UI surfaces, not generic design advice.
- Baldin is a local-first developer-preview monorepo; do not optimize for enterprise-scale design systems unless the user explicitly asks for that context.
- Prefer concrete UI changes over vague aesthetic language.

## Stop Conditions
- If the request is really an implementation task, say so and recommend the appropriate execution prompt instead.
- If the redesign depends on backend data or a missing contract, state the dependency and hand off to the smallest correct owner.
- If the target surface spans multiple unrelated screens, recommend narrowing the spike before producing concepts.
