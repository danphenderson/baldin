#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-$(basename "$REPO_ROOT")}"
RESTART_MODE="${BALDIN_RESET_DB_MODE:-watch}"
DB_VOLUME_KEYS=(
    "db-data"
    "test-db-data"
)
LEGACY_DB_DIRS=(
    "$REPO_ROOT/backend/public/db"
    "$REPO_ROOT/backend/public/test_db"
)

clear_dir() {
    local dir="$1"
    mkdir -p "$dir"
    find "$dir" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
}

remove_db_volume() {
    local volume_key="$1"
    local volume_ids

    volume_ids="$(docker volume ls -q \
        --filter "label=com.docker.compose.project=${COMPOSE_PROJECT_NAME}" \
        --filter "label=com.docker.compose.volume=${volume_key}")"

    if [[ -z "$volume_ids" ]]; then
        return 0
    fi

    while IFS= read -r volume_id; do
        [[ -z "$volume_id" ]] && continue
        docker volume rm -f "$volume_id" >/dev/null
    done <<< "$volume_ids"
}

start_stack_detached() {
    echo "Starting the local Baldin stack with fresh databases in detached mode."
    (
        cd "$REPO_ROOT"
        docker-compose up -d --build --force-recreate --wait
    )

    echo "Local Baldin Postgres data has been reset."
    echo "Frontend: http://localhost:5173"
    echo "API: http://localhost:8004"
    echo "Compose Watch is not running in detached mode. Start docker-compose up --build --watch for the supported live-edit loop."
}

start_stack_watch() {
    echo "Local Baldin Postgres data has been reset."
    echo "Starting the local Baldin stack with fresh databases in Compose Watch mode."
    echo "Frontend: http://localhost:5173"
    echo "API: http://localhost:8004"
    (
        cd "$REPO_ROOT"
        exec docker-compose up --build --watch --force-recreate
    )
}

echo "Stopping the local Baldin stack before resetting Postgres data."
(
    cd "$REPO_ROOT"
    docker-compose down --remove-orphans
)

for volume_key in "${DB_VOLUME_KEYS[@]}"; do
    echo "Removing local Postgres volume for $volume_key"
    remove_db_volume "$volume_key"
done

for dir in "${LEGACY_DB_DIRS[@]}"; do
    echo "Clearing legacy bind-mount directory $dir"
    clear_dir "$dir"
done

case "$RESTART_MODE" in
    watch)
        start_stack_watch
        ;;
    detached)
        start_stack_detached
        ;;
    *)
        echo "Unsupported BALDIN_RESET_DB_MODE: $RESTART_MODE" >&2
        echo "Use watch (default) or detached." >&2
        exit 1
        ;;
esac
