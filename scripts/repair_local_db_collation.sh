#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNNING_SERVICES=""
WEB_WAS_RUNNING=0

if command -v docker >/dev/null 2>&1; then
    RUNNING_SERVICES="$(cd "$REPO_ROOT" && docker compose ps --services --filter status=running || true)"
fi

if printf '%s\n' "$RUNNING_SERVICES" | grep -qx "web"; then
    WEB_WAS_RUNNING=1
fi

run_psql() {
    local service="$1"
    local database="$2"
    local sql="$3"

    (
        cd "$REPO_ROOT"
        docker compose exec -T "$service" \
            psql -v ON_ERROR_STOP=1 -U postgres -d "$database" -c "$sql"
    )
}

repair_cluster() {
    local service="$1"
    local app_database="$2"
    local databases=(postgres template1 "$app_database")

    for database in "${databases[@]}"; do
        echo "Reindexing and refreshing collation metadata for $service/$database"
        run_psql "$service" "$database" "REINDEX DATABASE $database;"
        run_psql "$service" "$database" "ALTER DATABASE $database REFRESH COLLATION VERSION;"
    done
}

echo "Ensuring local Postgres services are running."
(
    cd "$REPO_ROOT"
    docker compose up -d db test_db
)

if [[ "$WEB_WAS_RUNNING" -eq 1 ]]; then
    echo "Stopping the backend temporarily to release database sessions."
    (
        cd "$REPO_ROOT"
        docker compose stop web
    )
fi

repair_cluster db db
repair_cluster test_db test_db

if [[ "$WEB_WAS_RUNNING" -eq 1 ]]; then
    echo "Restarting the backend."
    (
        cd "$REPO_ROOT"
        docker compose start web
    )
fi

echo "Local Postgres collation metadata refreshed."
echo "If warnings persist after a future image/runtime change, rerun this script or reset local data with ./scripts/reset_local_db.sh."
