# Backend

This directory contains the FastAPI application in `backend/app`, the crawler and ETL code in `backend/etl`, and the backend test suite.

The canonical backend documentation now lives in the Docusaurus docs:

- [System Overview](../docs/docs/architecture/system-overview.md)
- [Data Model](../docs/docs/architecture/data-model.md)
- [API Surface](../docs/docs/architecture/api-surface.md)
- [Document Collaboration](../docs/docs/architecture/document-collaboration.md)
- [Local Development](../docs/docs/engineering/local-development.md)
- [Testing](../docs/docs/engineering/testing.md)

## Local Backend Commands

From the repo root:

```bash
docker-compose up --build --watch
./scripts/run_backend_pytest.sh --cov=app --cov=etl --cov-report=term-missing --cov-fail-under=60
```

From `backend/`, for an optional host `.venv` loop:

```bash
pipenv sync --dev
../scripts/run_backend_pytest_host.sh app/tests/test_target.py -q
```

## Notes

- The repo-standard local iteration loop is `docker-compose up --build --watch`. Keep Compose Watch running and use targeted backend validation while the stack stays warm.
- The repo-standard backend verification path is the Compose-native `./scripts/run_backend_pytest.sh` wrapper. Use the host helper only when you intentionally need local Python tooling outside Compose networking.
- API and schema changes should regenerate `openapi.json` and `frontend/src/schema.d.ts` through `./scripts/update_frontend_schemas.sh`.
- Alembic is the default schema-management path during startup. `LEGACY_BOOTSTRAP=1` remains a temporary DEV/PYTEST-only escape hatch for local recovery.
