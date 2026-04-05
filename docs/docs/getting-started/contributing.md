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
