---
description: "Use when starting work from a Baldin plan file and you need it turned into a bounded execution slice with the right owner, scope, stop conditions, validation, and handoff packet."
name: "Plan Slice Kickoff"
argument-hint: "Name the plan file, phase, section, story, or outcome you want to start"
agent: "Baldin Project Manager"
model: "GPT-5 (copilot)"
---
Turn the relevant Baldin plan section into a startable execution slice.

Use [Baldin Project Conventions](../instructions/baldin-project.instructions.md), [Prompt The Right Agent](../../docs/docs/engineering/copilot-prompt-cookbook.md), [Contribute Safely](../../docs/docs/getting-started/contributing.md), and the active plan sources under [plans/](../../plans).

Task:
- Find the plan section named by the user, or infer the best match from the current repo context.
- Distill the objective, current phase context, acceptance criteria, non-goals, dependencies, and stop conditions.
- Choose the smallest correct owner: [Baldin Backend Agent](../agents/baldin-backend.agent.md), [Baldin Frontend Agent](../agents/baldin-frontend-agent.agent.md), [Baldin Lead Full-Stack Architect](../agents/baldin-lead-full-stack-architect.agent.md), or keep ownership with [Baldin Project Manager](../agents/baldin-project-manager.agent.md) if scope is still ambiguous.
- If the slice is too broad, split it into at most three low-conflict workstreams with explicit sequencing.
- Call out generated-artifact, docs, CI, local-development, or release-phase implications before implementation begins.

Return:
- Objective summary.
- Relevant plan evidence.
- Recommended owner and why.
- In scope and out of scope.
- Preconditions and dependencies.
- Required validation.
- Escalate if.
- A handoff packet ready to paste to the selected owner.
- Risks, blockers, or assumptions.

The handoff packet must use Baldin's current coordination structure from [Baldin Project Manager](../agents/baldin-project-manager.agent.md) and the Standard Handback schema from [Prompt The Right Agent](../../docs/docs/engineering/copilot-prompt-cookbook.md).

Stop and hand off if:
- The user is actually asking for direct implementation and already named the correct specialist owner.
- The named plan section is stale or contradicted by the current codebase and needs discovery before planning can continue.
