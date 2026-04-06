---
description: "Use when one or more Baldin agents already did work or analysis and you need a single evidence-backed handoff packet for the next owner, reviewer, or operator without losing validation, generated-artifact status, or unresolved risks."
name: "Multi-Agent Handoff Synthesizer"
argument-hint: "Describe the completed workstreams, current owner, and intended next owner or reviewer"
agent: "Baldin Project Manager"
model: "GPT-5 (copilot)"
---
Synthesize the current Baldin work state into one clean handoff packet.

Use [Baldin Project Conventions](../instructions/baldin-project.instructions.md), [Prompt The Right Agent](../../docs/docs/engineering/copilot-prompt-cookbook.md), [Contribute Safely](../../docs/docs/getting-started/contributing.md), and [Baldin Project Manager](../agents/baldin-project-manager.agent.md).

Task:
- Gather the relevant evidence from the user's request, active diff, current branch, prior agent outputs, PR context, tests already run, and any named files.
- Consolidate overlapping or partial handbacks into one coherent state summary without hiding conflicts or unresolved assumptions.
- Preserve Baldin's current ownership model. Do not invent new owners or absorb cross-stack work silently.
- Distinguish clearly between completed work, validated work, deferred work, and still-open risks.
- If multiple workstreams touched the same feature or contract surface, merge them into one handoff that highlights integration points instead of returning disconnected mini-summaries.
- If the current state is too ambiguous to synthesize responsibly, say what evidence is missing and what must be clarified before handoff.

Required synthesis checks:
- State whether API routes or schemas changed.
- State whether generated artifacts were regenerated, intentionally deferred, unchanged, or still unknown.
- State what validation actually ran versus what is still only expected.
- Name the concrete next owner, reviewer, or operator and why.
- Surface unresolved contract, docs, CI, local-environment, or release-boundary dependencies.
- If prior outputs disagree, call that out explicitly instead of averaging them into a false consensus.

Return:
- Handoff objective.
- Current state summary.
- Files or surfaces touched or reviewed.
- What is complete.
- What is validated.
- What is deferred or still open.
- Integration points or downstream dependencies.
- Recommended next owner and exact ask.
- Risks, blockers, assumptions, and unknowns.
- A final handoff packet that uses Baldin's Standard Handback schema from [Prompt The Right Agent](../../docs/docs/engineering/copilot-prompt-cookbook.md).

Stop and hand off if:
- The user actually needs routing or ownership selection before any handoff can be synthesized. Use [Cross-Stack Workstream Router](./cross-stack-workstream-router.prompt.md) instead.
- The user really wants direct implementation or review rather than a synthesized state transfer.
