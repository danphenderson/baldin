---
description: "Use when modifying Baldin backend, frontend, scripts, CI, docs, contracts, or deployment files. Covers repo-wide conventions for local-first design, generated artifacts, validation, and release-path decisions."
name: "Baldin Project Conventions"
applyTo: backend/**, frontend/**, scripts/**, .github/**, docs/**, plans/**, README.md, openapi.json, docker-compose*.yml
---
# Baldin Project Conventions

- Baldin is local-first and still in developer-preview. Treat it as a still-evolving prototype that is getting close to a deployable POC, not as a mature production SaaS baseline.
- Prefer the smallest complete solution that fits the current repo and the next controlled-launch step instead of introducing speculative platform abstractions.
- Optimize for developer-preview robustness, local reproducibility, and credible launch-path progress. Do not assume multi-tenant requirements, cloud-scale or high-availability architecture, enterprise compliance programs, or inactive deployment paths unless the task explicitly calls for them.
- Keep work aligned with the existing boundaries: backend application code in `backend/app`, ETL code in `backend/etl`, frontend product code in `frontend/src`, local integration in `docker-compose.yml`, and documentation in `docs/`.
- Do not hand-edit generated contract artifacts such as `frontend/src/schema.d.ts` or `openapi.json`. When backend API routes or schemas change, regenerate them through `scripts/update_frontend_schemas.sh`. If regeneration is intentionally deferred, name the follow-on owner responsible for completing it and for downstream frontend review.
- The top-level `docs/` directory is a Docusaurus project. Edit Markdown sources under `docs/docs/` and validate with `cd docs && npm run build`. Build output in `docs/build/` is gitignored. Do not commit Docusaurus build artifacts.
- Avoid modifying vendored, environment-specific, or generated directories such as `backend/.venv/`, `backend/baldin.egg-info/`, and runtime log assets unless the task explicitly targets those artifacts.
- Backend Python changes should stay compatible with the repo's pre-commit flow: `isort`, `black`, and `flake8` are scoped to `backend/`, and API changes should preserve FastAPI/OpenAPI correctness.
- Material behavior changes should include targeted validation in the owning surface: backend tests, frontend tests or type checks, docs builds, or the closest equivalent task-specific check.
- Frontend changes should preserve the current React/Vite/MUI architecture and validate with the relevant local checks: `npm run test`, `./node_modules/.bin/tsc --noEmit`, and `npm run build` when the change affects production behavior.
- Production frontend builds require `VITE_API_URL` to be set to a non-localhost origin. Do not weaken that guardrail in `frontend/vite.config.ts` unless the deployment contract itself is changing.
- Keep deployment and release work aligned with the current repo: local development uses `docker-compose.yml`, the backend candidate image builds from `backend/Dockerfile`, and the frontend release artifact is a static Vite bundle. `scripts/sync_frontend_to_s3.sh` is intentionally disabled and should not be treated as an active deployment path.
- When a task crosses backend, frontend, schema generation, CI, or deployment boundaries, update the supporting scripts or docs that make the change complete instead of leaving the repo in a partially migrated state.
