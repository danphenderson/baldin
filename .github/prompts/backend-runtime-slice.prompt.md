---
description: "Use when implementing a backend-only Baldin fix, FastAPI route change, auth adjustment, model update, extractor or ETL task, or backend test gap with targeted validation and explicit contract escalation."
name: "Backend Runtime Slice"
argument-hint: "Describe the backend bug, route, model, ETL task, or backend test gap"
agent: "Baldin Backend Agent"
model: "GPT-5 (copilot)"
---
Implement this in backend only.

Use [Baldin Project Delivery Rules](../instructions/baldin-project.instructions.md), [Work Locally](../../docs/docs/engineering/local-development.md), [Run The Right Checks](../../docs/docs/engineering/testing.md), [Regenerate API Contracts](../../docs/docs/engineering/contract-management.md), and [Prompt The Right Agent](../../docs/docs/engineering/copilot-prompt-cookbook.md).

Task:
- Inspect the actual backend code path before editing: routes, schemas, models, services, extractor logic, ETL flow, or tests.
- Keep the change inside `backend/app/**`, `backend/etl/**`, and `backend/app/tests/**` unless a stop condition is hit.
- Implement the smallest complete fix or slice that resolves the stated backend problem.
- Add or update targeted backend tests when behavior changes materially.
- Prefer the narrowest useful pytest scope and the relevant `ruff` checks first. Treat full backend coverage as a later confidence pass unless the touched surface demands broader coverage immediately.
- Preserve current API behavior unless the request explicitly requires a contract change.
- Do not hand-edit generated artifacts such as [openapi.json](../../openapi.json) or [frontend/src/schema.d.ts](../../frontend/src/schema.d.ts).
- If routes or schemas change and contract regeneration is straightforward, run `SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh` in the same local loop and report whether the generated artifacts changed.

Return:
- Status: complete, partial, or blocked.
- Summary: what changed and why.
- Files touched or reviewed.
- Commands run and result summary.
- Whether API routes or schemas changed.
- Whether generated artifacts were regenerated, intentionally deferred, or unchanged.
- Risks, blockers, or assumptions.
- Recommended next owner, if any.

Stop and hand off if:
- The change affects the public API contract and contract regeneration or downstream frontend fallout is not straightforward. Use [API Contract Change Orchestrator](./api-contract-change-orchestrator.prompt.md) or hand off to [Baldin Lead Full-Stack Architect](../agents/baldin-lead-full-stack-architect.agent.md).
- The real fix requires frontend, docs, CI, scripts, docker-compose, or broader repo-boundary work.
- The user is actually asking for planning or owner selection rather than direct backend execution. Use [Plan Slice Kickoff](./plan-slice-kickoff.prompt.md) or [Cross-Stack Workstream Router](./cross-stack-workstream-router.prompt.md).
