# Private Deployment Control Plane

The public Baldin repository now stops at candidate artifacts and architecture boundaries.
It is not the surface that publishes production changes.

## Public Boundary

The public repository may do the following:

- Build and validate the backend container from `backend/Dockerfile`
- Build and validate the frontend static bundle in `frontend/dist`
- Document the architecture, artifact ownership, and local development flow

The public repository must not do the following:

- Push backend images to ECR on a public `main` branch event
- Sync frontend assets to a live S3 bucket on a public `main` branch event
- Hold production AWS credentials, rollout runbooks, or environment-specific operator steps

## Preferred Production Model

Use a separate private infrastructure repository as the deployment control plane.
That private boundary should own:

- AWS credentials and environment-scoped secrets
- Backend image promotion and release tagging
- Frontend bundle publication and cache invalidation
- ECS or other compute rollout orchestration
- Approval gates, rollback procedures, and production runbooks

## Fallback Model

If a separate private repository is not available yet, use a protected private GitHub environment
with required approvals and environment-scoped secrets.

The public repository can hand off candidate artifacts, but the protected private boundary must be
the only place that can apply live production changes.

## Public Documentation Rule

Public documentation may describe:

- Local evaluation steps
- Architecture and stack boundaries
- The backend container and frontend static bundle as deployable artifacts

Public documentation must not include:

- Production environment names
- Live deployment commands
- Secret wiring instructions
- Operational runbooks or rollback procedures
