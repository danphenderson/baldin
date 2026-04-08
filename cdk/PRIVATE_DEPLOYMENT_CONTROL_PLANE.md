# Deployment Control Plane Transition Note

This document is retained as a historical marker for the period when Baldin treated deployment as
an external control-plane boundary. That assumption is now superseded.

This repository now carries deployment ownership so the team can move faster
without splitting core product and release work across separate codebases.

## Current Direction

- Protected deployment workflows should live in this repository.
- Environment-scoped secrets and manual approvals should guard staging and production.
- The existing backend image plus frontend static bundle split remains the current artifact boundary.
- The restored CDK code is reference material until a narrower release topology is approved.

## What This File Still Means

This file should be read as a caution against blindly restoring the old deployment story, not as the
active operating model.

The team should not re-enable legacy deployment paths just because deployment ownership has returned to this repository.
Any renewed deployment path still needs a current environment model, approval gates, rollback,
and explicit operator guidance.

## Immediate Implications

- Do not restore long-lived machine-user or broad-IAM deployment patterns without review.
- Do not restore direct frontend publication or backend image promotion until the protected workflow
	path is defined.
- Do not treat the current CDK stacks as production-ready simply because they synthesize.
- Do not let urgency bypass staging validation, smoke checks, or rollback planning.

## Replacement Path

The active plan is to:

1. Turn `main` into a real integration branch.
2. Choose the smallest viable production topology.
3. Rebuild protected staging and production deploy workflows in this repository.
4. Remove application-level launch blockers before broader rollout.

Once that work is complete, this transition note can be retired or replaced by the actual deployment
runbook used by operators.
