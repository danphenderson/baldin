---
description: "Use when a Baldin bug spans backend, frontend, local stack, docker-compose, scripts, or generated contracts and you want one cross-stack owner to reproduce, fix, validate, and hand back the smallest complete local-first solution."
name: "Local Preview Integration Fix"
argument-hint: "Describe the end-to-end bug, failing local workflow, or cross-stack preview issue"
agent: "Baldin Lead Full-Stack Architect"
model: "GPT-5 (copilot)"
---
Own this Baldin local-preview or cross-stack integration issue end to end.

Use [Baldin Project Delivery Rules](../instructions/baldin-project.instructions.md), [Work Locally](../../docs/docs/engineering/local-development.md), [Run The Right Checks](../../docs/docs/engineering/testing.md), [Regenerate API Contracts](../../docs/docs/engineering/contract-management.md), and [Prompt The Right Agent](../../docs/docs/engineering/copilot-prompt-cookbook.md).

Task:
- Start by reproducing the issue from the user's report, active diff, failing checks, or local workflow description.
- Identify the smallest set of affected surfaces: backend, frontend, contracts, docs, scripts, docker-compose, or local environment.
- Implement the smallest complete fix that restores the local-first preview path.
- Keep ownership of contract regeneration and downstream frontend validation when backend routes or schemas change.
- Use the repo's current local-first, developer-preview, near-POC posture. Do not widen the task into speculative platform redesign.
- If docker-compose, `db`, `test_db`, or local environment behavior is the active blocker, use the current local-development guidance and produce an operator-assisted path only when the blocker is genuinely outside the repo.
- Run the narrowest relevant backend, frontend, contract, docs, or local-stack checks needed to prove the fix.

Return:
- Status: complete, partial, or blocked.
- Reproduction summary.
- Root cause summary.
- Files touched or reviewed.
- Commands run and result summary.
- Whether API routes or schemas changed.
- Whether generated artifacts were regenerated, intentionally deferred, or unchanged.
- Risks, blockers, assumptions, or operator-required follow-up.
- Recommended next owner, if any.

Stop and hand off if:
- The problem is clearly backend-only or frontend-only after initial triage. Use [Backend Runtime Slice](./backend-runtime-slice.prompt.md) or [Frontend Product Slice](./frontend-product-slice.prompt.md).
- The request is really owner selection or workstream planning rather than implementation. Use [Cross-Stack Workstream Router](./cross-stack-workstream-router.prompt.md).
- The blocking action depends on permissions or systems outside the workspace and cannot be validated here. Return an operator-ready checklist instead of pretending the repo fix is complete.
