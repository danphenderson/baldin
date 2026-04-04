# Baldin Execution Plan

This document tracks the execution plan for repositioning Baldin as a credible,
local-first developer-preview project while keeping production deployment and
operational control behind a private boundary.

## Status Legend

- `[x]` Complete
- `[ ]` Not started

## Current Summary

- Phase 1 is complete.
- Phase 2 is complete.
- Phases 3 through 7 are planned and not yet started.
- Phase 3 is the next blocking phase.

## Phase 1: Reposition the Public Repo as a Local-First Developer Preview

Status: `[x]` Complete

Objective:

- Reframe Baldin's public presentation around local evaluation, architecture
  exploration, and contribution rather than implying a production-ready SaaS.

Completed work:

- Rewrote the root README to describe Baldin as a developer-preview,
  local-first workspace.
- Clarified the local quickstart, service entry points, and architecture
  boundaries in the public README.
- Aligned backend package metadata with the new public positioning.
- Aligned FastAPI metadata and refreshed the checked-in OpenAPI artifact.
- Updated citation metadata to match the new project framing.
- Replaced placeholder-like Sphinx landing content with real project framing and
  local service links.
- Rebuilt the tracked published docs output so the checked-in docs site matches
  the source copy.

Checklist:

- [x] Reframe the root README around local-first developer-preview positioning.
- [x] Clarify that the public repository is for evaluation, exploration, and contribution.
- [x] Align backend package metadata with the public README.
- [x] Align FastAPI title and description with the new framing.
- [x] Refresh `openapi.json` from the running backend.
- [x] Update `CITATION.cff` to match the new framing.
- [x] Rewrite the Sphinx docs landing page and metadata.
- [x] Rebuild the tracked published docs output.

Evidence:

- `README.md`
- `backend/pyproject.toml`
- `backend/app/main.py`
- `openapi.json`
- `CITATION.cff`
- `backend/docs/index.rst`
- `backend/docs/conf.py`
- `docs/`

Exit criteria:

- Baldin reads consistently as a local-first, developer-preview project across
  the README, docs, package metadata, citation metadata, and OpenAPI output.

## Phase 2: Put Production Deployment Behind a Private Control Plane

Status: `[x]` Complete
`PRIVATE_DEPLOYMENT_CONTROL_PLANE.md` Status: `[ ]` Not started

Objective:

- Ensure the public repository can demonstrate, build, and validate Baldin
  without being able to directly ship production.

Checklist:

- [x] Remove automatic production deployment behavior from the public repository.
- [x] Ensure a push to `main` in the public repo cannot publish the backend image.
- [x] Ensure a push to `main` in the public repo cannot sync the frontend bundle.
- [x] Move live rollout steps, production environments, and operational runbooks into a private boundary.
- [x] Prefer a separate private infrastructure repository for deployment control.
- [x] If a separate repo is deferred, use a protected private GitHub environment with required approvals and environment-scoped secrets.
- [x] Keep public docs at the architecture and artifact-boundary level only.
- [x] Document the private deployment control path.

Completed work:

- Replaced the public AWS deploy workflow with a build-only candidate-artifact workflow.
- Removed AWS credential use, ECR pushes, and S3 sync behavior from the public GitHub Actions path.
- Added an explicit public-to-private deployment boundary document.
- Rewrote the public AWS/CDK notes so they stop at architecture review and artifact boundaries.
- Turned the public frontend S3 sync helper into a guardrail that points to the private control plane.
- Quarantined the unused public ECR push helper in the CDK utilities.

Deliverables:

- Revised public GitHub Actions workflow with no automatic production deploy path.
- Private deployment boundary defined.
- Sanitized public deployment notes.

Evidence:

- `.github/workflows/build.yml`
- `README.md`
- `PRIVATE_DEPLOYMENT_CONTROL_PLANE.md`
- `cdk/README.md`
- `scripts/sync_frontend_to_s3.sh`
- `cdk/cdk/utils.py`

Exit criteria:

- A push to `main` in the public repository cannot directly change production state.

## Phase 3: Turn CI Into a Real Integration Gate

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

## Phase 4: Remove Dev-Only Shortcuts From the Public Production Story

Status: `[ ]` Not started

Objective:

- Make the public repo safe and credible as a developer-preview project without
  normalizing dev-only behavior as production design.

Checklist:

- [ ] Replace fixed example values for secret-bearing settings with placeholders.
- [ ] Replace fixed bootstrap admin credentials with clearly fake placeholders and setup guidance.
- [ ] Ensure example configuration does not look like production-ready defaults.
- [ ] Treat schema creation, migrations, and first-admin creation as controlled operations, not implicit startup behavior.
- [ ] Update startup code comments to make DEV and PYTEST bootstrap behavior explicit.
- [ ] Update public docs so local bootstrap is described as development-only.
- [ ] Review runtime workaround comments and isolate or remove hack-level behavior.
- [ ] Review `conf.py` workaround-level logic and either quarantine it behind a documented switch or retire it.

Deliverables:

- Safe example environment file.
- Explicit guidance for migrations and first-admin creation.
- Updated docs and comments around startup behavior and workarounds.

Exit criteria:

- Public readers do not see real-looking secrets, reusable admin credentials, or
  development shortcuts presented as acceptable production practice.

## Phase 5: Add a Formal Production-Readiness Gate

Status: `[ ]` Not started

Objective:

- Create a concise, defensible go or no-go gate before Baldin is treated as a
  user-facing service.

Checklist:

- [ ] Write a launch-readiness checklist with owners and status per item.
- [ ] Review authentication and authorization posture.
- [ ] Review rate limiting and abuse controls.
- [ ] Review migration discipline and rollback planning.
- [ ] Review backup and restore expectations.
- [ ] Review logging, metrics, and alerting coverage.
- [ ] Review error handling and operator visibility.
- [ ] Review data retention and deletion expectations.
- [ ] Review legal, abuse, and scraping-related concerns.
- [ ] Record an explicit go or no-go decision before any public-user launch.

Deliverables:

- Launch-readiness checklist.
- Risk register.
- Recorded go or no-go decision with owner and date.

Exit criteria:

- Baldin has a documented production-readiness decision point that blocks public-user launch until passed.

## Phase 6: Run a Limited-Audience Release, Not a Public Launch

Status: `[ ]` Not started

Objective:

- Validate the system with a constrained audience and reversible rollout before
  making any broader availability claim.

Checklist:

- [ ] Define the allowed release audience up front.
- [ ] Keep deployments manual or approval-gated during this phase.
- [ ] Create and verify a rollback path before admitting external users.
- [ ] Monitor beta usage, operational load, and failures.
- [ ] Capture issues, feedback, and incidents in a release log.
- [ ] Delay any broader rollout until the limited release findings are reviewed.

Deliverables:

- Limited-audience rollout plan.
- Rollback procedure.
- Beta feedback and incident log.

Exit criteria:

- Baldin has been exercised by a limited audience under controlled rollout rules,
  with documented findings and rollback confidence.

## Phase 7: Package the Portfolio Story Deliberately

Status: `[ ]` Not started

Objective:

- Present Baldin as a credible engineering sample with honest scope and clear
  technical decisions.

Checklist:

- [ ] Publish a short case study, README section, or write-up centered on engineering decisions.
- [ ] Emphasize the local-first development experience.
- [ ] Emphasize the split between backend container delivery and static frontend delivery.
- [ ] Emphasize the separation between public source visibility and private deployment control.
- [ ] Emphasize the CI and release gates introduced in earlier phases.
- [ ] Emphasize the experimental nature and limits of the AI and extraction workflows.
- [ ] Avoid claims that imply mature product status or broad availability.
- [ ] Prepare resume and interview bullets aligned with the actual implementation.

Deliverables:

- Public case study or architecture write-up.
- Tightened README and positioning copy where needed.
- Resume and interview bullet set aligned to the real scope of the project.

Exit criteria:

- Baldin reads as an intentional and credible engineering example in the repo,
  supporting write-up, CV, and interview narrative.
