# Baldin

Baldin is a developer-preview workspace for exploring job-search automation locally. It combines a FastAPI backend, a React/Vite frontend, PostgreSQL, and a set of experimental extraction and orchestration flows for leads, applications, resumes, cover letters, and candidate profile data.

> Baldin is local-first right now.
> The public repository is meant for local evaluation, architecture exploration, and contribution. It is not positioned as a production-hardened SaaS or a finished deployment blueprint.

## What You Can Explore

- Track companies, leads, applications, resumes, cover letters, contacts, education, experience, and skills.
- Exercise extraction and orchestration workflows against a local stack.
- Inspect the FastAPI surface through Swagger and the admin UI.
- Develop against both the main Postgres database and the separate test database defined in `docker-compose.yml`.

## Local Quickstart

### Requirements

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

Optional local toolchain if you want to work outside containers:

- [Node.js](https://nodejs.org/en/download/)
- [Python 3.11](https://www.python.org/downloads/)
- [pipenv](https://pipenv.pypa.io/en/latest/)
- [Playwright](https://playwright.dev/docs/intro)

### Setup

1. Clone the repository.
2. Copy `backend/.env.example` to `backend/.env`.
3. Review the values in `backend/.env`:
   - `OPENAI_API_KEY` enables AI-assisted extraction and automation features.
   - `LINKEDIN_*` and `GLASSDOOR_*` credentials are optional.
   - `FIRST_SUPERUSER_EMAIL` and `FIRST_SUPERUSER_PASSWORD` control the local admin bootstrap user.
4. Start the local stack from the repository root:

```bash
docker-compose up --build
```

5. Open the local services:
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - API: [http://localhost:8004](http://localhost:8004)
   - Swagger UI: [http://localhost:8004/docs](http://localhost:8004/docs)
   - ReDoc: [http://localhost:8004/redoc](http://localhost:8004/redoc)
   - Admin: [http://localhost:8004/admin](http://localhost:8004/admin) using the bootstrapped superuser email and password from `FIRST_SUPERUSER_EMAIL` and `FIRST_SUPERUSER_PASSWORD`

The backend starts in `DEV` mode, creates tables automatically, and bootstraps the default superuser from `backend/.env`.

## Architecture

Baldin is split into a few clear pieces:

- `backend/`: FastAPI application, Starlette Admin, authentication, extractors, orchestration flows, and tests.
- `frontend/`: React/Vite client that talks to the backend through `VITE_API_URL`.
- `docker-compose.yml`: the local-first entry point for the API, frontend, Postgres, and the separate test Postgres service.
- `docs/`: generated documentation output.

For deeper backend details, including the data model and future migration workflows, see [backend/README.md](backend/README.md).

## Project Status

Baldin is still early. Expect rough edges, evolving APIs, documentation gaps, breaking changes to data model and unfinished automation workflows.

If you hit something confusing or broken, open an issue in the [issue tracker](https://github.com/danphenderson/baldin/issues).

## Contributing

Contributions are welcome, especially around frontend polish, workflow reliability, and documentation.

1. Create a branch for your change.
2. Make the change and run the relevant checks.
3. Push your branch.
4. Open a pull request.

Before your first commit, install the hooks:

```bash
pre-commit install
```

TODO: relocate to CONTRIBUTING.md and reference from herein.

## License

This project is licensed under the terms of the [MIT license](LICENSE).
