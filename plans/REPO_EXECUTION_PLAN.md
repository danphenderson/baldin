# Baldin Execution Plan

This document tracks the execution plan for taking Baldin from a private
product codebase with partially restored but stale infrastructure to a
controlled market launch.

The repository is now private. It remains the main engineering workspace for
local development, but it is also regaining deployment ownership so Baldin can
ship faster without exposing IP or operational details outside the team.

## Status Legend

- `[x]` Complete
- `[~]` In progress
- `[ ]` Not started

## Current Summary

- The old public-preview and separate-private-control-plane framing is superseded.
- Phase 1 is complete.
- Phases 2 through 7 are planned and not yet started.
- Phase 2 is the next blocking phase.

## Phase 1: Reset the Baseline and Repo Posture

Status: `[x]` Complete

Objective:

- Replace the stale public-repo execution story with a private launch program
  that treats this repository as both the product source and the deployment
  control plane.

Completed work:

- Rewrote the execution plan around a staged market-launch sequence instead of a
  public-preview narrative.
- Updated the root README so it describes the private repository as the primary
  engineering workspace and explains the current release posture.
- Replaced the stale CDK boundary notes that assumed deployment happened outside
  this repo.
- Marked the restored CDK application as reference material for the next deploy
  path, not as an approved production baseline.

Checklist:

- [x] Archive the old public-preview and external-control-plane assumptions.
- [x] Treat this private repo as both the source of truth and the deployment
  control surface again.
- [x] Reframe the top-level docs around a fast, controlled launch instead of
  public positioning.
- [x] Mark the restored CDK app as input material for a narrower release path,
  not a production-ready deployment blueprint.

Evidence:

- `README.md`
- `plans/REPO_EXECUTION_PLAN.md`
- `cdk/README.md`
- `cdk/PRIVATE_DEPLOYMENT_CONTROL_PLANE.md`

Exit criteria:

- The execution plan and top-level docs no longer imply that Baldin is a public
  preview project or that deployment ownership lives outside this repository.

## Phase 2: Turn CI Into a Real Integration Gate

Status: `[ ]` Not started

Objective:

- Make `main` a reviewed integration branch with meaningful required checks.

Checklist:

- [ ] Keep linting as a fast-fail job, but stop treating it as the only gate.
- [ ] Add backend test execution to CI.
- [ ] Add backend coverage reporting or a minimum backend quality threshold.
- [ ] Add frontend install and build validation to CI.
- [ ] Add frontend test execution to CI.
- [ ] Add a frontend type check such as `tsc --noEmit`.
- [ ] Add an API contract or schema freshness guard.
- [ ] Configure branch protection so pull request review is required for `main`.
- [ ] Configure branch protection so required checks must pass before merge.

Deliverables:

- Expanded CI workflow with required backend and frontend checks.
- Documented branch protection rules.
- Updated contributor guidance for the required checks.

Exit criteria:

- `main` cannot be merged through normal flow unless backend tests, frontend
  build, frontend tests, and selected type or contract checks pass.

## Phase 3: Choose the Minimal Production Topology

Status: `[ ]` Not started

Objective:

- Pick the smallest deployment architecture that can support a fast, controlled
  launch without trying to revive every old infrastructure path.

Checklist:

- [ ] Decide the first release environment matrix, including staging and production.
- [ ] Keep the current artifact split unless there is a better reason to change it:
  backend container plus frontend static bundle.
- [ ] Decide the backend compute target, database topology, static asset hosting,
  and network boundaries for the first release.
- [ ] Define artifact naming, promotion flow, configuration ownership, and secret
  management for each environment.
- [ ] Define the rollback boundary for both backend and frontend releases.
- [ ] Treat the restored CDK stacks as reference material and retire any paths
  that do not fit the approved minimal topology.

Deliverables:

- A documented release topology.
- An environment matrix.
- A deployment contract covering artifacts, secrets, promotion, and rollback.

Evidence:

- `.github/workflows/build.yml`
- `cdk/cdk/app.py`
- `cdk/cdk/stacks/api.py`
- `cdk/cdk/stacks/db.py`
- `cdk/README.md`

Exit criteria:

- There is one approved release architecture for Baldin, and the repo no longer
  carries competing stories about how production deployment works.

## Phase 4: Rebuild Deployment Automation in This Repo

Status: `[ ]` Not started

Objective:

- Restore deployment ownership inside this repository using protected workflows,
  environment-scoped secrets, and a staging-first rollout path.

Checklist:

- [ ] Rebuild deploy workflows so they promote the same backend image and frontend
  bundle produced by the build pipeline.
- [ ] Add protected environments, manual approvals, and environment-scoped secrets.
- [ ] Replace or retire stale infrastructure paths that assume public S3 website
  hosting, destructive removal policies, broad IAM scopes, open database ingress,
  or disabled ECR promotion.
- [ ] Ensure staging deployment, smoke validation, and rollback can be exercised
  from the approved workflow path.
- [ ] Document the deploy and rollback path that operators should actually use.

Deliverables:

- Protected staging and production deploy workflows.
- Release artifact promotion path.
- Updated deployment notes and rollback procedure.

Exit criteria:

- Baldin can be deployed from this repo through a reviewed, approval-gated path
  that matches the chosen release topology.

## Phase 5: Remove Runtime Launch Blockers

Status: `[ ]` Not started

Objective:

- Remove development-only runtime shortcuts that would make production rollout
  fragile or misleading.

Checklist:

- [ ] Replace fixed example values for secret-bearing settings with placeholders.
- [ ] Replace fixed bootstrap admin credentials with clearly fake placeholders and
  setup guidance.
- [ ] Stop implicit schema creation and first-admin creation in production startup.
- [ ] Split development and test bootstrap behavior from production startup.
- [ ] Establish migration discipline instead of relying on `create_all` and
  drop-and-recreate patterns.
- [ ] Review workaround-level runtime logic and either quarantine it behind a
  documented switch or retire it.

Deliverables:

- Safe example configuration.
- Explicit bootstrap and migration guidance.
- Updated startup behavior and operational docs.

Exit criteria:

- Production startup no longer depends on implicit development bootstrap behavior,
  and operators have an explicit path for schema and admin setup.

## Phase 6: Add the Minimum Production Safety Controls

Status: `[ ]` Not started

Objective:

- Add the minimum operational controls needed to launch Baldin without relying
  on guesswork during incidents or abuse.

Checklist:

- [ ] Review authentication and session posture.
- [ ] Add rate limiting or equivalent abuse controls.
- [ ] Review backup and restore expectations.
- [ ] Review logging, metrics, and alerting coverage.
- [ ] Review error handling and operator visibility.
- [ ] Define readiness, liveness, and smoke-test expectations.
- [ ] Write a concise launch-readiness checklist with named owners.
- [ ] Record an explicit go or no-go decision before broader release.

Deliverables:

- Launch-readiness checklist.
- Risk register.
- Minimum operational runbooks for backup, restore, smoke testing, and rollback.

Exit criteria:

- Baldin has a documented operational gate that must be cleared before the
  product is treated as broadly launchable.

## Phase 7: Run a Staged Launch, Then Broaden

Status: `[ ]` Not started

Objective:

- Validate Baldin under a controlled rollout before expanding to broader market
  availability.

Checklist:

- [ ] Deploy to staging and execute smoke tests.
- [ ] Verify rollback before admitting external users.
- [ ] Release to a controlled first audience, even if the end goal is broader launch.
- [ ] Monitor operational load, failures, and product feedback.
- [ ] Capture incidents, fixes, and launch decisions in a release log.
- [ ] Decide whether Baldin is ready for broader availability based on staged
  launch evidence instead of urgency alone.

Deliverables:

- Staging validation report.
- Rollback verification.
- Release log with findings and decision points.

Exit criteria:

- Baldin has passed through staged rollout with documented evidence strong enough
  to justify broader market availability.

## Explicitly Out of Critical Path

The following work is intentionally deferred until Baldin is stable under a real
release path:

- Public storytelling, portfolio packaging, and resume framing
- Broad architecture cleanup that does not improve launch safety or speed
- Restoring legacy infrastructure paths that do not fit the approved minimal
  deployment topology
