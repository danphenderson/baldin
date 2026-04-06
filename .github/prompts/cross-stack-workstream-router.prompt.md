---
description: "Use when a Baldin task spans backend, frontend, contracts, docs, CI, scripts, or docker-compose and you need the smallest low-conflict workstreams, owners, sequencing, and handoff packets."
name: "Cross-Stack Workstream Router"
argument-hint: "Describe the task, issue, or PR goal that crosses repo boundaries"
agent: "Baldin Project Manager"
model: "GPT-5 (copilot)"
---
Route this Baldin task into the smallest correct ownership model.

Use [Baldin Project Conventions](../instructions/baldin-project.instructions.md), [Prompt The Right Agent](../../docs/docs/engineering/copilot-prompt-cookbook.md), [Contribute Safely](../../docs/docs/getting-started/contributing.md), and [REPO_EXECUTION_PLAN](../../plans/REPO_EXECUTION_PLAN.md).

Task:
- Identify which repo surfaces are involved: backend, ETL, frontend, contracts, docs, CI, scripts, docker-compose, or release-boundary work.
- Decide whether the work should stay single-owner or be split into low-conflict workstreams.
- Use only the current Baldin owners: [Baldin Backend Agent](../agents/baldin-backend.agent.md), [Baldin Frontend Agent](../agents/baldin-frontend-agent.agent.md), [Baldin Lead Full-Stack Architect](../agents/baldin-lead-full-stack-architect.agent.md), and [Baldin Project Manager](../agents/baldin-project-manager.agent.md).
- If backend API routes or schemas change, require either contract regeneration in the same slice or a concrete follow-on handoff to the full-stack architect with downstream frontend review.
- Call out docs-source, generated-artifact, CI, and release-phase implications up front instead of leaving them as review surprises.
- Keep the work aligned with Baldin's current local-first developer-preview and near-POC posture. Do not invent enterprise-only workstreams.

Return:
- Objective summary.
- Owner-selection rationale.
- Workstreams and sequencing.
- Agent handoff packets.
- Integration plan.
- Validation plan.
- Risks, blockers, assumptions, and next actions.

Every handoff packet must require Baldin's Standard Handback schema from [Prompt The Right Agent](../../docs/docs/engineering/copilot-prompt-cookbook.md).

Stop and hand off if:
- The task is already clearly single-owner and does not benefit from routing.
- The user needs implementation immediately and has already named the right specialist owner.
