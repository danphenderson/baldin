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

From `backend/`:

```bash
pipenv sync --dev
pipenv run pytest --cov=app --cov=etl --cov-report=term-missing --cov-fail-under=40
```

From the repo root:

```bash
docker-compose up --build
./scripts/update_frontend_schemas.sh
```

## Notes

- API and schema changes should regenerate `openapi.json` and `frontend/src/schema.d.ts` through `./scripts/update_frontend_schemas.sh`.
- The repo does not currently use Alembic as its active schema-management path; see [Release Roadmap](../docs/docs/engineering/release-roadmap.md) for the current posture.
