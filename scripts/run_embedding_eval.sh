#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export PIPENV_DONT_LOAD_ENV=1

cd "${ROOT_DIR}/backend"
exec pipenv run python -m app.evals.embedding_eval "$@"
