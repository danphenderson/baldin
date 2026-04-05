---
sidebar_position: 2
slug: /getting-started/quickstart
title: Quickstart
---

# Local Quickstart

## Requirements

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

Optional local toolchain if you want to work outside containers:

- [Node.js](https://nodejs.org/en/download/) (v20+)
- [Python 3.11](https://www.python.org/downloads/)
- [pipenv](https://pipenv.pypa.io/en/latest/)
- [Playwright](https://playwright.dev/docs/intro)

## Setup

1. **Clone** the repository.

2. **Create your environment file.** Copy `backend/.env.example` to `backend/.env` and review the values:

   | Variable | Purpose |
   |----------|---------|
   | `OPENAI_API_KEY` | Enables AI-assisted extraction and automation features |
   | `LINKEDIN_*` / `GLASSDOOR_*` | Optional crawler credentials |
   | `FIRST_SUPERUSER_EMAIL` | Bootstrap admin email for local stack |
   | `FIRST_SUPERUSER_PASSWORD` | Bootstrap admin password for local stack |

3. **Start the local stack** from the repository root:

   ```bash
   docker-compose up --build
   ```

4. **Open the local services:**

   | Service | URL |
   |---------|-----|
   | Frontend | [http://localhost:5173](http://localhost:5173) |
   | API | [http://localhost:8004](http://localhost:8004) |
   | Swagger UI | [http://localhost:8004/docs](http://localhost:8004/docs) |
   | ReDoc | [http://localhost:8004/redoc](http://localhost:8004/redoc) |
   | Admin | [http://localhost:8004/admin](http://localhost:8004/admin) |

   The Admin UI expects the email and password from `FIRST_SUPERUSER_EMAIL` / `FIRST_SUPERUSER_PASSWORD`.

## Resetting the Local Database

If you hit schema drift after pulling breaking model changes, reset the developer databases:

```bash
./scripts/reset_local_db.sh
```

This stops Docker Compose, clears the `backend/public/db` and `backend/public/test_db` volumes, and restarts the stack with fresh databases.

## What Happens on Startup

The backend starts in `DEV` mode and:

1. Creates database tables automatically via `create_db_and_tables()`.
2. Bootstraps the default superuser from `backend/.env`.
3. Optionally starts the crawler scheduler if `SHOULD_RUN_CRAWLER_SCHEDULER` is enabled.

The admin UI uses its own browser session under `/admin` and expects email-based sign-in.
