---
description: "Use when you changed backend, frontend, docs, contracts, CI, scripts, or docker-compose and need the exact Baldin validation order, commands, generated-artifact checks, and CI mapping."
name: "Change-Aware Validation Sequence"
argument-hint: "Describe what changed or name the files and surfaces you touched"
agent: "Baldin Project Manager"
model: "GPT-5 (copilot)"
---
Build the smallest effective Baldin validation sequence for the user's change.

Use [Baldin Project Delivery Rules](../instructions/baldin-project.instructions.md), [Run The Right Checks](../../docs/docs/engineering/testing.md), [See Merge Gates](../../docs/docs/engineering/ci-pipeline.md), [Contribute Safely](../../docs/docs/getting-started/contributing.md), and [Regenerate API Contracts](../../docs/docs/engineering/contract-management.md).

Task:
- Infer the touched surfaces from the user's request, active diff, or named files.
- Produce an ordered validation sequence, not a flat command dump.
- Split the answer into the fastest useful local smoke-check path first and broader pre-push validation second when both are relevant.
- Highlight hidden dependencies such as schema regeneration, generated artifact freshness, frontend typecheck after API changes, docs build from source, or the non-localhost `VITE_API_URL` build guard.
- When contract regeneration depends on staged files or local setup, say that explicitly instead of assuming the default script path will work unchanged.
- If the user explicitly asked to run checks, run only the smallest relevant set instead of defaulting to full suites.

Sequence rules:
- Backend API or schema changes require contract regeneration first. If triggering files are only named or unstaged, use `SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh`; otherwise use the normal script.
- During active local iteration, prefer the smallest failing-fast smoke check before broader suites.
- After contract regeneration, explicitly state whether [openapi.json](../../openapi.json) and [frontend/src/schema.d.ts](../../frontend/src/schema.d.ts) changed. If they did not, explain whether the edit was non-contractual or whether the schema layer was not updated correctly.
- Backend Python changes should include the relevant lint or pre-commit expectation plus backend tests when applicable.
- Backend API or schema changes require every direct frontend consumer check for the changed contract, not just a generic frontend pass.
- Frontend production behavior changes require tests, strict typecheck, and build validation with a non-localhost `VITE_API_URL`.
- Docs changes require `npm --prefix docs run build` against `docs/docs`, not manual edits to `docs/build`.
- CI or branch-protection work should be checked against [Track Release Readiness](../../docs/docs/engineering/release-roadmap.md) and [.github/branch-protection.md](../branch-protection.md).
- Prefer targeted validation over over-testing, but do not omit dependency-driven checks.
- If no targeted backend or frontend tests exist for the changed surface, say that explicitly and fall back to the repo's primary local checks instead of implying narrow coverage.
- Do not treat a frontend consumer as a single page by default. Identify the generated type, service module, shared hook, and sibling views that consume the same contract shape when relevant.
- Only count tests that exercise the changed endpoint, schema path, or each direct consumer. If coverage is only partial, name the uncovered consumers explicitly instead of implying full targeted coverage.

Return:
- Primary surfaces changed.
- Ordered commands with why each step exists.
- Generated-artifact expectations.
- Setup caveats or prerequisites that affect command correctness.
- The CI jobs or merge gates this maps to.
- What remains unverified.
- Recommended next owner, if any.

If the request is really implementation work, end with a bounded handoff packet that uses the Standard Handback schema from [Prompt The Right Agent](../../docs/docs/engineering/copilot-prompt-cookbook.md).

Stop and hand off if:
- Ownership is unclear and the task needs a wider workstream split before validation can be defined.
- The user is asking for architectural change rather than validation sequencing.
