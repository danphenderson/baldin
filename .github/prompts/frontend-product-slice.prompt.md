---
description: "Use when implementing a frontend-only Baldin page, IA, UX, accessibility, state, or typed service-consumption change against an existing API contract with the normal frontend validation loop."
name: "Frontend Product Slice"
argument-hint: "Describe the page, flow, component, or typed frontend issue to implement"
agent: "Baldin Frontend Agent"
model: "GPT-5 (copilot)"
---
Implement this in frontend only.

Use [Baldin Project Delivery Rules](../instructions/baldin-project.instructions.md), [Work Locally](../../docs/docs/engineering/local-development.md), [Run The Right Checks](../../docs/docs/engineering/testing.md), [Prompt The Right Agent](../../docs/docs/engineering/copilot-prompt-cookbook.md), and [Regenerate API Contracts](../../docs/docs/engineering/contract-management.md) when a contract concern is suspected.

Task:
- Confirm the user-facing problem in the current frontend code before editing: page flow, component state, service consumption, route behavior, loading or error state, accessibility, or information architecture.
- Keep changes inside `frontend/**` unless a stop condition is hit.
- Implement the smallest complete product-facing fix or improvement that solves the stated issue.
- Preserve the established design and interaction language unless the user explicitly asked for a redesign.
- Add or update targeted frontend tests when shipped behavior changes materially.
- Start with the smallest useful frontend test or watch loop while the local Compose stack stays warm.
- Run strict TypeScript validation and the production build only when the touched surface, changed contract usage, or user request makes them necessary. Use a non-localhost `VITE_API_URL` for build validation.
- Treat generated frontend types as read-only. Do not hand-edit [frontend/src/schema.d.ts](../../frontend/src/schema.d.ts).

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
- The real fix requires backend API, schema, auth, docs, scripts, CI, or docker-compose changes.
- The needed state or field does not exist in the current contract, or the generated schema appears stale. Use [API Contract Change Orchestrator](./api-contract-change-orchestrator.prompt.md) or hand off to [Baldin Lead Full-Stack Architect](../agents/baldin-lead-full-stack-architect.agent.md).
- The request is really workstream planning, issue routing, or deep investigation rather than direct frontend execution. Use [Issue Dispatch Kickoff](./issue-dispatch-kickoff.prompt.md), [Plan Slice Kickoff](./plan-slice-kickoff.prompt.md), or [Deep Think Spike](./deep-think-spike.prompt.md).
