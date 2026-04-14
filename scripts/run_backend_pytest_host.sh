#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export PIPENV_DONT_LOAD_ENV=1
export TEST_DATABASE_HOSTNAME="${TEST_DATABASE_HOSTNAME:-127.0.0.1}"
export TEST_DATABASE_PORT="${TEST_DATABASE_PORT:-5431}"

cd "${ROOT_DIR}/backend"
exec pipenv run pytest "$@"
