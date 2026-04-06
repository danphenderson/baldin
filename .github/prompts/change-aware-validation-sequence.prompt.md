---
description: "Use when you changed backend, frontend, docs, contracts, CI, scripts, or docker-compose and need the exact Baldin validation order, commands, generated-artifact checks, and CI mapping."
name: "Change-Aware Validation Sequence"
argument-hint: "Describe what changed or name the files and surfaces you touched"
agent: "Baldin Project Manager"
model: "GPT-5 (copilot)"
---
Build the smallest effective Baldin validation sequence for the user's change.

Use [Baldin Project Conventions](../instructions/baldin-project.instructions.md), [Run The Right Checks](../../docs/docs/engineering/testing.md), [See Merge Gates](../../docs/docs/engineering/ci-pipeline.md), [Contribute Safely](../../docs/docs/getting-started/contributing.md), and [Regenerate API Contracts](../../docs/docs/engineering/contract-management.md).

Task:
- Infer the touched surfaces from the user's request, active diff, or named files.
- Produce an ordered validation sequence, not a flat command dump.
- Highlight hidden dependencies such as schema regeneration, generated artifact freshness, frontend typecheck after API changes, docs build from source, or the non-localhost `VITE_API_URL` build guard.
- If the user explicitly asked to run checks, run only the smallest relevant set instead of defaulting to full suites.

Sequence rules:
- Backend API or schema changes require contract regeneration plus the affected backend and frontend checks.
- Frontend production behavior changes require tests, strict typecheck, and build validation with a non-localhost `VITE_API_URL`.
- Docs changes require `npm --prefix docs run build` against `docs/docs`, not manual edits to `docs/build`.
- CI or branch-protection work should be checked against [REPO_EXECUTION_PLAN](../../plans/REPO_EXECUTION_PLAN.md) and [.github/branch-protection.md](../branch-protection.md).
- Prefer targeted validation over over-testing, but do not omit dependency-driven checks.

Return:
- Primary surfaces changed.
- Ordered commands with why each step exists.
- Generated-artifact expectations.
- The CI jobs or merge gates this maps to.
- What remains unverified.
- Recommended next owner, if any.

If the request is really implementation work, end with a bounded handoff packet that uses the Standard Handback schema from [Prompt The Right Agent](../../docs/docs/engineering/copilot-prompt-cookbook.md).

Stop and hand off if:
- Ownership is unclear and the task needs a wider workstream split before validation can be defined.
- The user is asking for architectural change rather than validation sequencing.
