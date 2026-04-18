# Consolidated multi-stage Dockerfile for the Baldin API.
#
# Targets:
#   dev  — single-user, hot-reload via uvicorn --reload (docker-compose default)
#   test — one-off pytest runner with dev/test dependencies
#   prod — non-root user, gunicorn with uvicorn workers
#
# Build examples:
#   docker build --target dev  -t baldin-api:dev  .
#   docker build --target test -t baldin-api:test .
#   docker build --target prod -t baldin-api:prod .

# ── Base stage ────────────────────────────────────────────────────────
FROM python:3.11-slim-bookworm AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    TERM=xterm-256color

WORKDIR /usr/src/app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libmagic1 netcat-traditional postgresql-client \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --upgrade pip

# ── Dependency stage ──────────────────────────────────────────────────
FROM base AS dependencies

COPY Pipfile Pipfile.lock ./

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/* \
    && pip install pipenv \
    && pipenv install --system --deploy --ignore-pipfile

# ── Runtime dependency stage ──────────────────────────────────────────
FROM base AS runtime-dependencies

COPY --from=dependencies /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=dependencies /usr/local/bin /usr/local/bin
COPY Pipfile Pipfile.lock ./

RUN set -eu; \
    PIPENV_DONT_LOAD_ENV=1 pipenv requirements > /tmp/runtime-requirements.txt; \
    grep -E '^torch==' /tmp/runtime-requirements.txt > /tmp/torch-requirements.txt || true; \
    if [ -s /tmp/torch-requirements.txt ]; then \
        pip install --no-cache-dir --force-reinstall --index-url https://download.pytorch.org/whl/cpu -r /tmp/torch-requirements.txt; \
    fi; \
    rm -f /tmp/runtime-requirements.txt /tmp/torch-requirements.txt

# ── Dev target ────────────────────────────────────────────────────────
FROM base AS dev

COPY --from=runtime-dependencies /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=runtime-dependencies /usr/local/bin /usr/local/bin

RUN playwright install --with-deps chromium \
    && chmod -R a+rX /ms-playwright \
    && rm -rf /var/lib/apt/lists/*

COPY . .

CMD ["uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]

# ── Test target ───────────────────────────────────────────────────────
FROM base AS test

COPY --from=runtime-dependencies /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=runtime-dependencies /usr/local/bin /usr/local/bin
COPY Pipfile Pipfile.lock ./

RUN PIPENV_DONT_LOAD_ENV=1 pipenv requirements --dev \
    | grep -E '^(coverage(\[toml\])?|pytest|pytest-asyncio|pytest-cov)==' \
    > /tmp/test-requirements.txt \
    && pip install --no-cache-dir -r /tmp/test-requirements.txt \
    && rm /tmp/test-requirements.txt

COPY . .

CMD ["python", "-m", "pytest"]

# ── Prod target ───────────────────────────────────────────────────────
FROM base AS prod

RUN addgroup --system app \
    && adduser --system --group app

COPY --from=runtime-dependencies /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=runtime-dependencies /usr/local/bin /usr/local/bin

RUN playwright install --with-deps chromium \
    && chmod -R a+rX /ms-playwright \
    && rm -rf /var/lib/apt/lists/*

COPY . .

RUN chown -R app:app /usr/src/app

USER app

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app.main:app", "-k", "uvicorn.workers.UvicornWorker", "--log-level", "info"]
