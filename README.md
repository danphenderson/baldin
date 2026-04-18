# Baldin

[![Docs](https://img.shields.io/badge/docs-live-06b6d4)](https://danphenderson.github.io/baldin/)

Local‑First Job Search OS — Stop wasting time on bad listings, ghosting employers, and dead‑end applications.

### Product North Star

Baldin is evolving from a local‑first job search workspace into an applicant‑side labor market observability platform. Our vision is to provide a private, operator‑commanded career control plane that helps job seekers find, evaluate, and pursue real opportunities. By combining user‑owned data, network context, and anonymized market intelligence, Baldin will empower people to allocate their effort more effectively and contribute to a broader understanding of labor market dynamics.

### Baldin’s Layers of Value

1. Personal Job Search Management: Baldin streamlines the operator’s employment process. It serves as an autopilot moving job leads through the application pipeline. In other words, Baldin is an operator‑commanded career control plane.
2. Private by design: Baldin is local‑first, and all user data is siloed by default. Users may choose to share specific data points or insights with their network or the broader community. Users can opt in to contribute structured, anonymized signals about listings and employers (for example, interested, applied, recruiter responded, no response after a certain number of days, or role looks stale). These signals are aggregated into coarse bands to provide listing observability: how active the role seems, how crowded it feels, whether the company responds, whether the process is slow or abusive, whether the posting is trustworthy, and whether people with similar backgrounds are progressing. This is not a social feed; it is a health indicator for listings.
3. Decision engine: When users opt in, Baldin’s agents do more than automate applications. They help determine which roles are most worth pursuing, which are likely dead or low quality, where a warm introduction matters most, where the user is competitive, and where effort is likely to be wasted. This layer delivers actionable insights that are much more valuable than applying faster.

### Trust Model

Baldin’s identity and trust posture are grounded in a few principles:

* explicitly opt in
* minimal sharing by default
* detachment from public identity
* coarse bands rather than exact counts
* aggressive time decay on shared signals
* visibility only after enough independent signals exist

We also distinguish between signal quality tiers: self‑reported, corroborated by multiple users, locally evidenced but privacy‑preserved, and stale or low confidence.

The repository is the main engineering workspace for the product. It supports local development, contributor workflows, architecture review, and release‑path planning, but it is not a production deployment blueprint.

**[Landing Page](https://danphenderson.github.io/baldin/)** · **[Documentation](https://danphenderson.github.io/baldin/docs)** · **[Release Posture](docs/docs/engineering/release-roadmap.md)**

### Product Principles

* user‑owned data first
* local‑first by default
* automate execution, but prioritize decision quality
* prefer structured signals over social noise
* private workflow first, shared market truth second
* help users avoid wasted effort, not just submit more applications

### Today vs Target

Today: Baldin is a private, local‑first workspace for tracking applications, extracting leads, collaborating on agentic workflows, and discovering your network. It supports local development, contributor workflows, architecture review, and release‑path planning; it is not yet a production deployment blueprint.

Target: Baldin is evolving into an applicant‑side labor market observability platform that helps users decide which opportunities are real, which are worth pursuing, and how best to approach them using anonymized market signals and network awareness.

### Start Here

- Local setup: [docs/docs/getting-started/quickstart.md](docs/docs/getting-started/quickstart.md)
- Contributor workflow: [docs/docs/getting-started/contributing.md](docs/docs/getting-started/contributing.md)
- Architecture: [docs/docs/architecture/system-overview.md](docs/docs/architecture/system-overview.md), [docs/docs/architecture/data-model.md](docs/docs/architecture/data-model.md), [docs/docs/architecture/api-surface.md](docs/docs/architecture/api-surface.md), [docs/docs/architecture/frontend-architecture.md](docs/docs/architecture/frontend-architecture.md)
- Document editor and collaboration: [docs/docs/architecture/document-collaboration.md](docs/docs/architecture/document-collaboration.md)
- Networking and messaging: [docs/docs/architecture/networking-and-messaging.md](docs/docs/architecture/networking-and-messaging.md)
- Testing and CI: [docs/docs/engineering/testing.md](docs/docs/engineering/testing.md), [docs/docs/engineering/ci-pipeline.md](docs/docs/engineering/ci-pipeline.md)
- Release posture: [docs/docs/engineering/release-roadmap.md](docs/docs/engineering/release-roadmap.md)

If you use the published docs site, the same material is available at **[danphenderson.github.io/baldin/docs](https://danphenderson.github.io/baldin/docs)**.

### Local Stack

0. **Requirements**
  - [Docker](https://docs.docker.com/get-docker/)
  - [Docker Compose](https://docs.docker.com/compose/install/)

1. Clone the repository.
2. Review the repo-tracked backend/.env and frontend/.env defaults.
3. Put real secrets in process env or ignored override files:

```sh
# Recommended for Codex worktrees and one-off local shells
export OPENAI_API_KEY=your-key-here
# Optional local override files for non-Codex development
cp backend/.env backend/.env.local
cp frontend/.env frontend/.env.local
```

The tracked .env files are safe local defaults for every worktree. Keep real secrets and user-specific credentials out of those tracked files. For local-only contract regeneration, a non-empty OPENAI_API_KEY in process env or backend/.env.local is enough.

4. Start the local stack from the repository root:

```sh
docker-compose up --build --watch
```

Keep the stack running while you iterate. Compose Watch is the supported live-edit loop, so the fast path is inspect -> patch -> smoke-check instead of restarting services.

For routine local work, start with the smallest check that proves the change:

* Backend slice: cd backend && pipenv run pytest -xvs path/to/test.py -k "case"
* Frontend slice: cd frontend && npm run test -- --watch
* Backend API or schema change: SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh

If you hit local schema drift after pulling breaking model changes, reset the developer databases is a crude fix:

```sh
./scripts/reset_local_db.sh
```

It can always be seeded again from test fixtures,
```sh
./scripts/seed_local_db.sh #FIXME: this doesn't exist yet
```

5. Open the local services:
    * Frontend: [http://localhost:5173](http://localhost:5173)
    * Admin SPA: [http://localhost:5173/admin/](http://localhost:5173/admin/) using the bootstrapped superuser email and password from FIRST_SUPERUSER_EMAIL and FIRST_SUPERUSER_PASSWORD
    * Operator design reference: [http://localhost:5174](http://localhost:5174) as a standalone redesign reference surface
    * Product docs: [http://localhost:3001/baldin/docs](http://localhost:3001/baldin/docs)
    * API: [http://localhost:8004](http://localhost:8004)
    * Swagger UI: [http://localhost:8004/docs](http://localhost:8004/docs)
    * ReDoc: [http://localhost:8004/redoc](http://localhost:8004/redoc)
    * Legacy Admin: [http://localhost:8004/admin](http://localhost:8004/admin) using the same bootstrapped superuser credentials as a backend fallback surface

For deeper setup, service topology, and environment details, use [docs/docs/getting-started/quickstart.md](docs/docs/getting-started/quickstart.md), [docs/docs/engineering/local-development.md](docs/docs/engineering/local-development.md), and [docs/docs/reference/environment-variables.md](docs/docs/reference/environment-variables.md).

At a high level, the local stack includes the following services:
| Service | Description |
| --- | --- |
| `db` | PostgreSQL 15 primary application database |
| `test_db` | PostgreSQL 15 database used by pytest |
| `redis` | Redis 7 queue backing background jobs |
| `etl-service` | Internal ETL crawler execution boundary |
| `web` | FastAPI backend, API, and admin surface |
| `crawler-worker` | Background worker consuming Redis jobs |
| `frontend` | React/Vite frontend plus the dedicated admin SPA at `/admin/` |
| `operator-design` | Standalone React/Vite redesign reference app on port `5174` |
| `docs` | Docusaurus product documentation |

### Contributing

Use the normal branch-and-pull-request flow against main, and install hooks before your first commit:

```bash
pre-commit install
```

If you change backend API routes or schemas, regenerate contracts with SCHEMA_UPDATE_FORCE=1 ./scripts/update_frontend_schemas.sh during active iteration and the normal ./scripts/update_frontend_schemas.sh before push or review. Do not edit openapi.json or frontend/src/schema.d.ts by hand. The canonical contributor workflow lives in [docs/docs/getting-started/contributing.md](docs/docs/getting-started/contributing.md).

### Status And Caveats

Expect rough edges, evolving APIs, breaking data-model changes, and unfinished automation workflows.

When you run the full Docker Compose stack, docker-compose.yml injects the local Redis queue settings for the API and worker containers. You only need to override them manually when running services outside Compose.

When you run the full Docker Compose stack, `docker-compose.yml` injects the local Redis queue settings for the API and worker containers. You only need to override them manually when running services outside Compose.

The supported development path today is the local Docker Compose stack. The material under [cdk/](cdk/) is reference-only while Baldin narrows and rebuilds its deployment path inside this repository.

Launch sequencing, release-boundary work, and remaining runtime hardening are tracked in [docs/docs/engineering/release-roadmap.md](docs/docs/engineering/release-roadmap.md).
