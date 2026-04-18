#!/bin/sh
set -eu

. /usr/src/app/compose-backend-env.sh

apply_backend_host_overrides

exec "$@"
