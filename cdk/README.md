
# Public AWS Boundary Notes

This directory is intentionally limited to AWS architecture exploration and CDK shape review.
It is not the live production control plane for Baldin.

## What Stays Public

- The repository can show the broad AWS resource layout used for experimentation.
- The public workflow can validate the backend container build and the frontend static bundle.
- Readers can inspect the split between backend container delivery and static frontend hosting.

## What Moved Behind The Private Boundary

- `cdk deploy`, `cdk destroy`, and `cdk bootstrap` operational use
- ECR image promotion and release tagging
- Frontend bucket sync, CDN invalidation, and live asset publication
- Environment-specific secrets, approval gates, rollback steps, and runbooks

The preferred production model is a separate private infrastructure repository.
If that is deferred, the fallback is a protected private GitHub environment with required approvals
and environment-scoped secrets. The public repository should never be the direct rollout surface.

## Public Artifact Boundary

The only deploy-adjacent outputs that remain public are candidate artifacts:

- Backend candidate image built from `backend/Dockerfile`
- Frontend candidate bundle built into `frontend/dist`

Promotion of those artifacts into live AWS resources happens only from the private control plane
documented in [../PRIVATE_DEPLOYMENT_CONTROL_PLANE.md](../PRIVATE_DEPLOYMENT_CONTROL_PLANE.md).

## Safe Public Exploration

If you want to inspect the CDK app without using it as a rollout mechanism, stay on synth-only
commands such as:

```bash
pipenv install
pipenv shell
cdk ls
cdk synth
```

Some stack values still read local placeholder configuration while synthesizing. Treat that flow as
exploratory only, not as a supported public deployment contract.
