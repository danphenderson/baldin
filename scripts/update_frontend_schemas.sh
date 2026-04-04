#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FORCE_UPDATE="${SCHEMA_UPDATE_FORCE:-0}"

if [[ "$FORCE_UPDATE" != "1" ]]; then
    CHANGED_FILES="$(git -C "$REPO_ROOT" diff --cached --name-only | grep -E 'backend/app/schemas.py|backend/app/api/.*\.py' || true)"
    if [[ -z "$CHANGED_FILES" ]]; then
        echo "No changes detected in API schemas."
        exit 0
    fi
fi

PYTHON_BIN="${PYTHON_BIN:-$REPO_ROOT/backend/.venv/bin/python}"
if [[ ! -x "$PYTHON_BIN" ]]; then
    PYTHON_BIN="$(command -v python3 || command -v python || true)"
fi

if [[ -z "$PYTHON_BIN" ]]; then
    echo "Failed to locate a Python interpreter for OpenAPI generation." >&2
    exit 1
fi

echo "Generating OpenAPI JSON from the FastAPI app."
"$PYTHON_BIN" - "$REPO_ROOT" <<'PY'
import json
import pathlib
import sys

repo_root = pathlib.Path(sys.argv[1]).resolve()
backend_root = repo_root / "backend"
sys.path.insert(0, str(backend_root))

from app.main import app

openapi_path = repo_root / "openapi.json"
openapi_path.write_text(
    json.dumps(app.openapi(), separators=(",", ":"), ensure_ascii=False) + "\n",
    encoding="utf-8",
)
PY

echo "Generating TypeScript definitions."
(
    cd "$REPO_ROOT/frontend"
    npm exec openapi-typescript -- ../openapi.json -o ./src/schema.d.ts
)

git -C "$REPO_ROOT" add openapi.json frontend/src/schema.d.ts
echo "Successfully updated OpenAPI and TypeScript definitions."
