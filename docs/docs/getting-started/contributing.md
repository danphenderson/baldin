---
sidebar_position: 3
slug: /getting-started/contributing
title: Contributing
---

# Contributing

Contributions are welcome, especially around frontend polish, workflow reliability, and documentation.

## Workflow

1. Create a branch for your change.
2. Make the change and run the relevant checks.
3. Push your branch.
4. Open a pull request against `main`.

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

See [Copilot Prompt Cookbook](../engineering/copilot-prompt-cookbook.md) for prompt templates and [Good Prompt vs Bad Prompt](../engineering/copilot-prompt-examples.md) for concrete examples.

## Pre-commit Hooks

Before your first commit, install the hooks:

```bash
pre-commit install
```

The pre-commit suite runs `isort`, `black`, and `flake8` scoped to `backend/`.

## Required CI Checks

Pull requests must pass these checks before merge:

| Check | What it validates |
|-------|-------------------|
| **Pre-commit hooks** | Python formatting and linting (isort, black, flake8) |
| **Backend tests** | `pytest` with 40% coverage gate |
| **Frontend tests** | `vitest` suite |
| **Frontend typecheck** | `tsc --noEmit` |
| **Frontend build** | Vite production build with non-localhost `VITE_API_URL` |
| **Schema freshness** | OpenAPI contract regeneration guard |

See [CI Pipeline](../engineering/ci-pipeline.md) for details on each job.

## Branch Protection

`main` requires:
- At least one approving review.
- All required status checks to pass.
- No force pushes or deletions.

Copilot review can help catch routine issues, but it does not replace human review or the required CI checks.
