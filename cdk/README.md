
# Deployment Notes

This directory contains partially restored AWS infrastructure code. It is no longer treated as a
public architecture sample, but it is also not yet the approved production deployment contract for Baldin.

The repo is private again and is regaining deployment ownership. The near-term goal is to reuse only the
useful parts of this CDK app while rebuilding a smaller, safer release path inside this repository.

## Current Role of This Directory

- Provide reference implementations for VPC, ECS or Fargate, RDS, ECR, and static asset hosting.
- Help narrow the first-release topology instead of forcing the team to start deployment design from zero.
- Support review and synthesis while the protected deploy workflow is being rebuilt.

## What Not To Assume

- Do not assume every stack in this directory should be revived as-is.
- Do not assume the current CDK defaults are production-ready.
- Do not assume legacy IAM, static hosting, or image-promotion paths are still valid.
- Do not use this directory as the operator runbook until the new deploy path is approved.

Several current behaviors are explicitly under review before any deployment path is re-enabled:

- public S3 website hosting assumptions
- destructive removal policies
- broad IAM scopes and long-lived machine-user patterns
- open or overly broad database ingress
- disabled helper paths that were written for the old public-repo boundary

## Current Artifact Contract

The deploy path is still expected to start from the same application artifacts the repo builds today:

- Backend container image built from `backend/Dockerfile`
- Frontend static bundle built into `frontend/dist`

Protected workflows in this repository should eventually promote those artifacts through staging and
production environments with approvals, environment-scoped secrets, smoke validation, and rollback support.

## Safe Use Right Now

Until the deployment contract is narrowed and approved, prefer review-oriented commands such as:

```bash
pipenv install
pipenv shell
cdk ls
cdk synth
```

Some stack values still read placeholder or legacy configuration while synthesizing. Treat this flow as
reference and review only until the protected deployment workflows are rebuilt.
