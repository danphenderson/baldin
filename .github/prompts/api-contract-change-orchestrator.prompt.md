---
description: "Use when changing FastAPI routes, Pydantic schemas, response shapes, or generated frontend types and you need Baldin to coordinate contract regeneration, validation, and downstream handoff."
name: "API Contract Change Orchestrator"
argument-hint: "Describe the API or schema change, affected routes/models, and whether code has already changed"
agent: "Baldin Lead Full-Stack Architect"
model: "GPT-5 (copilot)"
---
Own this Baldin API contract change from backend surface to generated artifacts and downstream validation.

Use [Baldin Project Conventions](../instructions/baldin-project.instructions.md), [Regenerate API Contracts](../../docs/docs/engineering/contract-management.md), [Run The Right Checks](../../docs/docs/engineering/testing.md), and [Prompt The Right Agent](../../docs/docs/engineering/copilot-prompt-cookbook.md).

Task:
- Determine whether the user's requested or existing change affects the backend contract surface.
- If it does, keep ownership of the contract boundary here even if isolated backend-only or frontend-only slices are delegated.
- If it does not, say so clearly and recommend the smallest correct owner instead of pretending contract work is needed.

Rules:
- Never hand-edit [openapi.json](../../openapi.json) or [frontend/src/schema.d.ts](../../frontend/src/schema.d.ts).
- Use [scripts/update_frontend_schemas.sh](../../scripts/update_frontend_schemas.sh) for regeneration. Use `SCHEMA_UPDATE_FORCE=1` when validation needs unstaged or broader changes.
- Treat backend -> contract -> frontend as the required direction of travel.
- Require downstream frontend review or validation whenever generated frontend types change.
- If regeneration is intentionally deferred, state that explicitly and name the next owner.

Workflow:
1. Identify the affected backend route, schema, and generated-artifact surfaces.
2. Decide whether contract regeneration is required now, can be safely deferred, or is not needed.
3. If implementation is requested, delegate or execute the narrowest necessary backend or frontend slices without losing contract ownership.
4. Regenerate artifacts when in scope and run the smallest relevant backend and frontend checks.
5. Return a contract-focused handback.

Return:
- Contract impact: required, not required, or deferred.
- Affected surfaces.
- Generated artifacts: changed, unchanged, or deferred.
- Commands run and result summary.
- Downstream validation required.
- Risks, blockers, or assumptions.
- Recommended next owner, if any.

If code changes or concrete implementation guidance are produced, append the Standard Handback schema from [Prompt The Right Agent](../../docs/docs/engineering/copilot-prompt-cookbook.md).

Stop and hand off if:
- The request is actually planning-only and needs workstream scoping first.
- The change is really a release-phase or repo-coordination question better owned by [Baldin Project Manager](../agents/baldin-project-manager.agent.md).
