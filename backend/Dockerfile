# Consolidated multi-stage Dockerfile for the Baldin API.
#
# Targets:
#   dev  — single-user, hot-reload via uvicorn --reload (docker-compose default)
#   prod — non-root user, gunicorn with uvicorn workers
#
# Build examples:
#   docker build --target dev  -t baldin-api:dev  .
#   docker build --target prod -t baldin-api:prod .

# ── Base stage ────────────────────────────────────────────────────────
FROM python:3.11-slim-bookworm AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    TERM=xterm-256color

WORKDIR /usr/src/app

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libmagic1 netcat-traditional postgresql-client \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --upgrade pip

# ── Dependency stage ──────────────────────────────────────────────────
FROM base AS dependencies

COPY Pipfile Pipfile.lock ./

RUN pip install pipenv \
    && pipenv install --system --deploy --ignore-pipfile

# ── Dev target ────────────────────────────────────────────────────────
FROM base AS dev

COPY --from=dependencies /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=dependencies /usr/local/bin /usr/local/bin

RUN playwright install --with-deps chromium \
    && chmod -R a+rX /ms-playwright \
    && rm -rf /var/lib/apt/lists/*

COPY . .

CMD ["uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]

# ── Prod target ───────────────────────────────────────────────────────
FROM base AS prod

RUN addgroup --system app \
    && adduser --system --group app

COPY --from=dependencies /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=dependencies /usr/local/bin /usr/local/bin

RUN playwright install --with-deps chromium \
    && chmod -R a+rX /ms-playwright \
    && rm -rf /var/lib/apt/lists/*

COPY . .

RUN chown -R app:app /usr/src/app

USER app

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app.main:app", "-k", "uvicorn.workers.UvicornWorker", "--log-level", "info"]
