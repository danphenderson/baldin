# Branch Protection Baseline

Apply these rules to the `main` branch in the GitHub repository settings. They are part of Phase 2 and are required for `main` to operate as a real integration branch.

## Rule Target

- Branch name pattern: `main`

## Pull Request Requirements

- Require a pull request before merging.
- Require at least 1 approving review.
- Dismiss stale approvals when new commits are pushed.
- Require all review conversations to be resolved before merge.

## Required Status Checks

- Require branches to be up to date before merging.
- Require these CI jobs to pass:
  - `Run pre-commit hooks`
  - `Backend tests and coverage`
  - `Frontend tests`
  - `Frontend typecheck`
  - `Frontend build`
  - `API contract freshness`

## Additional Protections

- Do not allow force pushes.
- Do not allow branch deletion.
- Restrict direct pushes to `main` unless there is a break-glass operational need.

## Notes

- These protections must be configured in GitHub. They are documented here because the repository code cannot enforce branch protection rules by itself.
- Keep the status check names in sync with `.github/workflows/ci.yml` when jobs are renamed.
