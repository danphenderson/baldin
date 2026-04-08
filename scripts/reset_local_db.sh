#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_DIRS=(
    "$REPO_ROOT/backend/public/db"
    "$REPO_ROOT/backend/public/test_db"
)

clear_dir() {
    local dir="$1"
    mkdir -p "$dir"
    find "$dir" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
}

echo "Stopping the local Baldin stack before resetting Postgres data."
(
    cd "$REPO_ROOT"
    docker compose down --remove-orphans
)

for dir in "${DB_DIRS[@]}"; do
    echo "Clearing $dir"
    clear_dir "$dir"
done

echo "Starting the local Baldin stack with fresh databases."
(
    cd "$REPO_ROOT"
    docker compose up -d --force-recreate
)

echo "Local Baldin Postgres data has been reset."
echo "Frontend: http://localhost:5173"
echo "API: http://localhost:8004"
