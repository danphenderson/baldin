---
description: "Use when a Baldin task spans backend, frontend, Figma design, contracts, docs, CI, scripts, docker-compose, or deployment boundaries and you need the smallest correct owner model with explicit handoffs."
name: "Cross-Stack Workstream Router"
argument-hint: "Describe the cross-stack task, issue, or PR goal"
agent: "Baldin Project Manager"
model: "GPT-5 (copilot)"
---
Route this Baldin task into the smallest durable ownership model.

Use [Baldin Project Delivery Rules](../instructions/baldin-project.instructions.md), [Baldin Agentic Configuration Rules](../instructions/baldin-agent-customization.instructions.md), [Prompt The Right Agent](../../docs/docs/engineering/copilot-prompt-cookbook.md), and [Track Release Readiness](../../docs/docs/engineering/release-roadmap.md) when the work touches repo-wide phase or release context.

Task:
- Identify the real surfaces involved: backend, ETL, frontend, Figma design, contracts, docs, CI, scripts, docker-compose, `cdk/`, or repo-only coordination.
- Prefer a single owner. Split into multiple workstreams only when paths are genuinely non-overlapping and the split lowers merge or validation risk.
- Use only the current Baldin owners: [Baldin Backend Agent](../agents/baldin-backend.agent.md), [Baldin Frontend Agent](../agents/baldin-frontend-agent.agent.md), [Baldin Design Lead Agent](../agents/baldin-design-lead-agent.agent.md), [Baldin Lead Full-Stack Architect](../agents/baldin-lead-full-stack-architect.agent.md), and [Baldin Project Manager](../agents/baldin-project-manager.agent.md).
- Call out generated-artifact, docs-source, CI, environment, or release-path implications before implementation starts.
- If backend API routes or schemas change, make contract ownership explicit and require downstream frontend consumer validation.
- Treat work as incomplete until validation evidence, generated-artifact status, and the next-owner decision are clear.
- Do not implement unless the task is truly a coordination-only edit.

Return:
- Objective summary.
- Affected surfaces and why this is or is not cross-stack.
- Recommended owner model: single-owner or split.
- Sequencing and dependency order.
- Generated-artifact and docs-source obligations.
- Validation plan by owner.
- Handoff packet for each implementation owner using Baldin's Standard Handback schema.
- Risks, blockers, assumptions, and next actions.

Stop and hand off if:
- The request is already clearly single-owner and does not benefit from routing.
- The blocking work depends on permissions or systems outside the repo; return an operator-assisted plan instead of pretending in-repo ownership can finish it.
