---
description: "Use when starting from a Baldin GitHub issue, PR comment, or backlog ticket and the right owner or execution slice is not already obvious."
name: "Issue Dispatch Kickoff"
argument-hint: "GitHub issue number, copied issue body, PR comment, or backlog ticket to dispatch"
agent: "Baldin Project Manager"
model: "GPT-5 (copilot)"
---
Turn this issue-shaped input into a startable Baldin execution slice.

Use [Baldin Project Delivery Rules](../instructions/baldin-project.instructions.md), [Prompt The Right Agent](../../docs/docs/engineering/copilot-prompt-cookbook.md), [Contribute Safely](../../docs/docs/getting-started/contributing.md), and [REPO_EXECUTION_PLAN](../../plans/REPO_EXECUTION_PLAN.md) when phase or release context matters.

Task:
- Accept a single GitHub issue, PR comment, backlog note, or copied ticket body as the starting point.
- Determine whether the ticket is dispatch-ready, needs rewrite first, or is really a decision or verification ticket.
- Reconcile the ticket text against the current repo evidence before proposing implementation.
- Choose the smallest correct owner: [Baldin Backend Agent](../agents/baldin-backend.agent.md), [Baldin Frontend Agent](../agents/baldin-frontend-agent.agent.md), [Baldin Lead Full-Stack Architect](../agents/baldin-lead-full-stack-architect.agent.md), or keep ownership with [Baldin Project Manager](../agents/baldin-project-manager.agent.md) if the ticket still needs coordination.
- Keep single-owner execution as the default. Split into at most three workstreams only when paths are truly non-overlapping and the split reduces conflict.
- If the owner is already obvious and the ticket is actionable, return a direct handoff packet immediately instead of adding an extra planning layer.
- Call out generated-artifact, docs-source, local-development, or external-permission obligations before implementation starts.
- Produce a handoff packet that is ready to paste to the selected owner.

Return:
- Objective summary.
- Ticket readiness: dispatch-ready, rewrite first, or decision needed.
- Current repo evidence that supports or contradicts the ticket.
- Recommended owner and why.
- In scope and out of scope.
- Preconditions, dependencies, and external steps.
- Required validation.
- A handoff packet that uses Baldin's Standard Handback schema from [Prompt The Right Agent](../../docs/docs/engineering/copilot-prompt-cookbook.md).
- Risks, blockers, or assumptions.

Stop and hand off if:
- The ticket is stale or contradicted by the current codebase and needs a docs or backlog cleanup pass first. Use [Issue Cleanup Orchestrator](./issue-cleanup-orchestrator.prompt.md) or [Documentation Impact Review](./documentation-impact-review.prompt.md).
- The user already named the correct implementation owner and wants direct work now. Hand off to [Backend Runtime Slice](./backend-runtime-slice.prompt.md), [Frontend Product Slice](./frontend-product-slice.prompt.md), or [Local Preview Integration Fix](./local-preview-integration-fix.prompt.md) instead of re-planning the ticket.
