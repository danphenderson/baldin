---
sidebar_position: 7
slug: /engineering/release-roadmap
title: Track Release Readiness
description: See current release posture, remaining launch phases, and deployment constraints.
---

<!-- last-verified: 2026-04-06 -->

# Track Release Readiness

Baldin is still in developer preview. The supported workflow today is the local Docker Compose stack. Repository-side CI and candidate-build workflows exist, but merge-blocking enforcement and later deployment automation are still being rebuilt, with branch protection remaining a GitHub settings step outside the repo.

This page is the canonical documentation summary for the current release posture and remaining launch phases.

## Current Deployment Posture

### Supported now

- Local Docker Compose development
- Backend container builds from `backend/Dockerfile`
- Frontend static bundle builds from `frontend/scripts/build-static.mjs`
- GitHub Actions CI and build workflows as the current integration surface

### Not yet approved as production baseline

- The restored AWS CDK stacks under `cdk/`
- Legacy public S3 helper scripts
- Implicit schema bootstrap as a long-term release strategy

## Artifact Contract

| Artifact | Source | Output |
| --- | --- | --- |
| Backend image | `backend/Dockerfile` | Container image |
| Frontend bundle | `frontend/scripts/build-static.mjs` | `frontend/dist/` |

Those artifact boundaries should remain stable unless the release topology itself changes.

## Phase Summary

| Phase | Title | Status |
| --- | --- | --- |
| 1 | Reset the Baseline and Repo Posture | Complete |
| 2 | Turn CI Into a Real Integration Gate | Partial |
| 3 | Choose the Minimal Production Topology | Not started |
| 4 | Rebuild Deployment Automation | Not started |
| 5 | Remove Runtime Launch Blockers | Not started |
| 6 | Add Minimum Production Safety Controls | Not started |
| 7 | Run a Staged Launch, Then Broaden | Not started |

## What Each Remaining Phase Means

### Phase 2: CI as an integration gate

The repository side of this phase is in place: `.github/workflows/ci.yml` already defines seven CI jobs, including the backend coverage gate, the frontend theme drift guard, and the API contract freshness check. The remaining gap is to apply the documented branch-protection settings in GitHub so reviews and required checks actually block merges on `main`.

### Phase 3: Minimal production topology

Choose one deployment shape that fits the current product instead of reviving every historical infrastructure path.

### Phase 4: In-repo deployment automation

Rebuild protected staging and production deployment workflows in this repository.

### Phase 5: Runtime hardening

Remove development-only runtime shortcuts, especially implicit schema creation and bootstrap behaviors that should not survive into production.

### Phase 6: Safety controls

Add rate limiting, operator visibility, backup and restore expectations, and a launch-readiness checklist.

### Phase 7: Staged launch

Validate the system with staging smoke tests, rollback verification, and a controlled first release before any broader rollout.

## CDK Status

`cdk/` remains reference material, not an operator runbook.

- Safe use today: review, `cdk ls`, and `cdk synth`
- Unsafe assumption: that the restored stacks are already the approved release path

See the private-repo guidance in `cdk/README.md` for the current cautionary guidance.

## Current Release Risks Called Out In Code And Docs

- Schema management still depends on startup bootstrap rather than migrations.
- Local persisted Postgres volumes are convenient for development, but they hide migration discipline gaps.
- The disabled `scripts/sync_frontend_to_s3.sh` path is intentionally not part of the current release story.

## Related Docs

- [See Merge Gates](./ci-pipeline.md)
- [Run The Right Checks](./testing.md)
- [Look Up Settings](../reference/environment-variables.md)
- [Map The Data Model](../architecture/data-model.md)
