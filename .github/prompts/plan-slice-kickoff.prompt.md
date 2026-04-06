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
- Follow any evidence files named by the selected plan section before finalizing the slice.
- Distill the objective, current phase context, acceptance criteria, non-goals, dependencies, and stop conditions.
- Separate already-complete work from the still-open work inside a partially completed phase or plan section before proposing the slice.
- Classify the slice as repo-only, external-only, or mixed.
- Choose the smallest correct owner: [Baldin Backend Agent](../agents/baldin-backend.agent.md), [Baldin Frontend Agent](../agents/baldin-frontend-agent.agent.md), [Baldin Lead Full-Stack Architect](../agents/baldin-lead-full-stack-architect.agent.md), or keep ownership with [Baldin Project Manager](../agents/baldin-project-manager.agent.md) if scope is still ambiguous.
- If the slice is too broad, split it into at most three low-conflict workstreams with explicit sequencing.
- If the selected slice depends on GitHub, cloud, or other settings outside the repo, state that explicitly, name the required human or admin permission, and convert the slice into an operator-assisted plan instead of assuming an in-repo owner can complete it alone.
- Call out generated-artifact, docs, CI, local-development, or release-phase implications before implementation begins.
- When required checks, policy settings, or workflow names matter, extract the exact current names or values from the live repo source of truth instead of summarizing them generically.

Return:
- Objective summary.
- Relevant plan evidence.
- Slice classification: repo-only, external-only, or mixed.
- Recommended owner and why.
- In scope and out of scope.
- Preconditions and dependencies.
- External or manual steps and who must perform them.
- Completion evidence required for anything that happens outside the repo.
- Required validation.
- Escalate if.
- A handoff packet ready to paste to the selected owner.
- Risks, blockers, or assumptions.

The handoff packet must use Baldin's current coordination structure from [Baldin Project Manager](../agents/baldin-project-manager.agent.md) and the Standard Handback schema from [Prompt The Right Agent](../../docs/docs/engineering/copilot-prompt-cookbook.md).

Stop and hand off if:
- The user is actually asking for direct implementation and already named the correct specialist owner.
- The named plan section is stale or contradicted by the current codebase and needs discovery before planning can continue.
- The blocking action depends on permissions or systems outside the workspace; produce an operator-ready checklist and escalation target instead of treating it as pure in-repo implementation.
