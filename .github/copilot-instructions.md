# Project Guidelines

## Repo Posture
- Baldin is a local-first developer-preview monorepo moving toward a deployable POC. Prefer the smallest complete change that improves correctness, reproducibility, or launch-path readiness.
- Do not introduce mature-SaaS, cloud-scale, or enterprise-compliance architecture unless the task explicitly requires it.

## Repo Boundaries
- Backend application code lives in `backend/app`.
- ETL and extraction flows live in `backend/etl`.
- Frontend product code lives in `frontend/src`.
- Repo automation lives in `scripts`.
- Local integration is centered on `docker-compose.yml`.
- Documentation source lives in `docs/docs`.
- Phase and release context lives in `plans`.
- If ownership is unclear or the work spans backend, frontend, contracts, docs, CI, scripts, or compose, start with `Baldin Project Manager` or `/cross-stack-workstream-router`.

## Generated Artifacts And Source Of Truth
- Never hand-edit `openapi.json`, `frontend/src/schema.d.ts`, or anything under `docs/build`.
- When backend API routes or Pydantic schemas change, regenerate contracts with `./scripts/update_frontend_schemas.sh` and validate the affected frontend consumers.
- Edit documentation in `docs/docs/**`; treat generated output as a build artifact, not the source of truth.

## Validation
- Validate the touched surface, not the whole repo.
- Backend changes should run the narrowest relevant `pytest` scope and the relevant `ruff` checks under `backend/`.
- Frontend changes should run `npm run test`, `npx tsc --noEmit`, and `npm run build` when shipped behavior changes. Production builds require a non-localhost `VITE_API_URL`.
- Docs changes should validate with `npm --prefix docs run build`.
- Use linked repo docs instead of guessing the right check order.

## Reference Docs
- [Prompt The Right Agent](../docs/docs/engineering/copilot-prompt-cookbook.md)
- [Run The Right Checks](../docs/docs/engineering/testing.md)
- [Regenerate API Contracts](../docs/docs/engineering/contract-management.md)
- [Work Locally](../docs/docs/engineering/local-development.md)
- [System Overview](../docs/docs/architecture/system-overview.md)
