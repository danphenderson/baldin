#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_DB_WAIT_SECONDS="${TEST_DB_WAIT_SECONDS:-30}"

print_recovery_guidance() {
    cat >&2 <<'EOF'
Recovery options:
  - Reset disposable local database state with ./scripts/reset_local_db.sh
  - Repair a collation mismatch in-place with ./scripts/repair_local_db_collation.sh
EOF
}

wait_for_test_db() {
    local attempt=1
    while (( attempt <= TEST_DB_WAIT_SECONDS )); do
        if docker-compose exec -T test_db pg_isready -U postgres -d test_db >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
        ((attempt++))
    done

    echo "Timed out waiting for the local test_db service to become ready." >&2
    print_recovery_guidance
    return 1
}

cd "${ROOT_DIR}"

if ! docker-compose up -d test_db >/dev/null; then
    echo "Unable to start the local test_db service." >&2
    print_recovery_guidance
    exit 1
fi

wait_for_test_db

exec docker-compose --profile test run --build --rm --no-deps backend-test python -m pytest "$@"
