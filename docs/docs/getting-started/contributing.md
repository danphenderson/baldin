---
sidebar_position: 3
slug: /getting-started/contributing
title: Contribute Safely
description: Choose the right workflow, validation, and ownership rules before opening a pull request.
---

<!-- last-verified: 2026-04-06 -->

# Contribute Safely

Contributions are welcome, especially around frontend polish, workflow reliability, and documentation.

## Default Workflow

1. Create a branch for your change.
2. Make the smallest complete change that fits the current repo boundaries.
3. Run the relevant checks for the surface you changed.
4. Push your branch.
5. Open a pull request against `main`.

## Source-Of-Truth Rules

- Edit docs source under `docs/docs/`, not `docs/build/`.
- Do not hand-edit generated contract artifacts such as `openapi.json` or `frontend/src/schema.d.ts`.
- If backend routes or schemas change, regenerate contracts with `./scripts/update_frontend_schemas.sh`.
- Prefer the Docusaurus site as the canonical documentation surface. Keep the root README and backend README as pointers, not competing references.

## Copilot-Assisted Workflow

If you use Baldin's Copilot setup, prefer this sequence:

1. Start with a clear issue or task statement.
2. Use the smallest correct owner.
	- Baldin Backend Agent for backend-only work.
	- Baldin Frontend Agent for frontend-only work.
	- Baldin Lead Full-Stack Architect for cross-stack, contract, or release-boundary work; it should still delegate isolated backend-only or frontend-only slices by default.
	- Baldin Project Manager when ownership is unclear.
3. Ask for the standard handback on non-trivial work: status, summary, files touched or reviewed, commands run and result summary, API or schema status, generated-artifact status, risks or assumptions, and recommended next owner.
4. Review the diff before pushing.
5. Open the pull request and, if useful, request Copilot review as a secondary reviewer.
6. Keep human approval as the final merge gate.

See [Prompt The Right Agent](../engineering/copilot-prompt-cookbook.md) for prompt templates and [Rewrite Weak Prompts](../engineering/copilot-prompt-examples.md) for concrete examples.

## Validation Expectations

Run the narrowest relevant validation for the surface you touched:

| Surface | Expected validation |
| --- | --- |
| Backend Python | pre-commit hooks plus backend tests |
| Frontend | tests, typecheck, and production-style build when behavior changed |
| Docs | `npm --prefix docs run build` |
| Backend API/schema | contract regeneration plus any affected frontend checks |

See [Run The Right Checks](../engineering/testing.md) and [See Merge Gates](../engineering/ci-pipeline.md) for the current command set and job coverage.

## Pre-commit Hooks

Before your first commit, install the hooks:

```bash
pre-commit install
```

The pre-commit suite runs `ruff check --fix` and `ruff format` scoped to `backend/`.

## Required CI Checks

Pull requests must pass the required status checks documented in [See Merge Gates](../engineering/ci-pipeline.md). In practice that means formatting and linting, backend tests with coverage, frontend tests, frontend typecheck, production-style frontend build validation, and API contract freshness when the schema surface changes.

## Branch Protection

`main` requires:
- At least one approving review.
- All required status checks to pass.
- No force pushes or deletions.

Copilot review can help catch routine issues, but it does not replace human review or the required CI checks.

## Scope And Ownership Guidelines

- Backend-only work belongs in `backend/app` or `backend/etl`.
- Frontend product work belongs in `frontend/src`.
- Cross-stack contract, docs, CI, and release-boundary work should update all affected surfaces together.
- Avoid speculative abstractions or parallel systems. Baldin is still local-first and developer-preview.

## Start Here Next

- For exact validation commands: [Run The Right Checks](../engineering/testing.md)
- For CI and merge-gate behavior: [See Merge Gates](../engineering/ci-pipeline.md)
- For contract regeneration rules: [Regenerate API Contracts](../engineering/contract-management.md)
- For agent prompting and handback patterns: [Prompt The Right Agent](../engineering/copilot-prompt-cookbook.md)
