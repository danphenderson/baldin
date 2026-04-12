---
description: "Use when modifying Baldin backend, frontend, scripts, workflows, docs, plans, contracts, or deployment files. Covers edit-time guardrails for runtime surfaces, generated artifacts, and release-path validation."
name: "Baldin Project Delivery Rules"
applyTo: backend/**, frontend/**, frontend/src/schema.d.ts, scripts/**, .github/workflows/**, docs/**, plans/**, cdk/**, README.md, openapi.json, docker-compose*.yml
---
# Baldin Project Delivery Rules

- This instruction covers runtime, delivery, docs, and release-path edits. For Baldin agentic assets including `AGENTS.md`, `.codex/**`, prompts, agents, skills, or instructions under `.github/**`, use [Baldin Agentic Configuration Rules](./baldin-agent-customization.instructions.md).
- Keep changes aligned with the current repo boundaries instead of introducing new abstraction layers for problems the repo does not have yet.
- Default to the local `docker-compose.yml` stack for routine development. Prefer one boot with hot reload plus targeted smoke checks over repeated manual service startup.
- During active local iteration, prefer inspect -> patch -> smoke-check loops. Treat full-suite, full-build, and CI-style validation as optional until the change is stable unless the task explicitly asks for them or the touched surface depends on them.
- Running services outside Compose is a secondary path. If you run backend tests from the host, use the local `test_db` port at `127.0.0.1:5431`; inside Compose the hostname is `test_db`.
- Do not hand-edit generated artifacts such as `openapi.json`, `frontend/src/schema.d.ts`, or `docs/build/**`. Regenerate or rebuild them from the owning source.
- When backend API routes or schemas change, prefer `SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh` during active development and confirm whether `openapi.json` and `frontend/src/schema.d.ts` actually changed. Use the normal script or a concrete follow-on handoff once the slice is ready for broader validation.
- Edit Docusaurus source under `docs/docs/**`; do not patch generated output as the primary change.
- Avoid modifying vendored, environment-specific, or runtime-state directories such as `backend/.venv/`, `backend/baldin.egg-info/`, `public/`, or `var/` unless the task explicitly targets them.
- Backend changes should preserve FastAPI and OpenAPI correctness and use the narrowest useful tests or lint checks first.
- Frontend changes should stay inside the current React, Vite, and MUI architecture and preserve the non-localhost `VITE_API_URL` production-build guard.
- Deployment or release-path changes should stay aligned with the current repo reality: local development through `docker-compose.yml`, backend image builds from `backend/Dockerfile`, frontend output as a static Vite bundle, `cdk/` as a controlled deployment surface, and `scripts/sync_frontend_to_s3.sh` treated as inactive unless the deployment contract itself is changing.
- If local schema drift blocks routine work and local data is disposable, prefer `./scripts/reset_local_db.sh`; reserve `./scripts/repair_local_db_collation.sh` for collation mismatch recovery when data preservation matters.
- When a task crosses backend, frontend, contracts, docs, CI, scripts, compose, or `cdk/`, finish the supporting repo updates that make the slice coherent, but keep the update set proportional to the user-visible change instead of broadening into unrelated release work.
