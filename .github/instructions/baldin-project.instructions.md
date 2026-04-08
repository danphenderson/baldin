---
description: "Use when modifying Baldin backend, frontend, scripts, workflows, docs, plans, contracts, or deployment files. Covers edit-time guardrails for runtime surfaces, generated artifacts, and release-path validation."
name: "Baldin Project Delivery Rules"
applyTo: backend/**, frontend/**, frontend/src/schema.d.ts, scripts/**, .github/workflows/**, docs/**, docs/build/**, plans/**, cdk/**, README.md, openapi.json, docker-compose*.yml
---
# Baldin Project Delivery Rules

- This instruction covers runtime, delivery, docs, and release-path edits. For Copilot prompts, agents, skills, or instructions under `.github/**`, use [Baldin Agentic Configuration Rules](./baldin-agent-customization.instructions.md).
- Keep changes aligned with the current repo boundaries instead of introducing new abstraction layers for problems the repo does not have yet.
- Do not hand-edit generated artifacts such as `openapi.json`, `frontend/src/schema.d.ts`, or `docs/build/**`. Regenerate or rebuild them from the owning source.
- When backend API routes or schemas change, run `./scripts/update_frontend_schemas.sh` or return a concrete follow-on that names the contract owner and downstream frontend review.
- Edit Docusaurus source under `docs/docs/**`; do not patch generated output as the primary change.
- Avoid modifying vendored, environment-specific, or runtime-state directories such as `backend/.venv/`, `backend/baldin.egg-info/`, `public/`, or `var/` unless the task explicitly targets them.
- Backend changes should preserve FastAPI and OpenAPI correctness and stay compatible with the repo's backend lint and test flow.
- Frontend changes should stay inside the current React, Vite, and MUI architecture and preserve the non-localhost `VITE_API_URL` production-build guard.
- Deployment or release-path changes should stay aligned with the current repo reality: local development through `docker-compose.yml`, backend image builds from `backend/Dockerfile`, frontend output as a static Vite bundle, `cdk/` as a controlled deployment surface, and `scripts/sync_frontend_to_s3.sh` treated as inactive unless the deployment contract itself is changing.
- When a task crosses backend, frontend, contracts, docs, CI, scripts, compose, or `cdk/`, finish the supporting repo updates that make the slice coherent instead of leaving a partial migration.
