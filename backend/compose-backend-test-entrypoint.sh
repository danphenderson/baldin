#!/bin/sh
set -eu

. /usr/src/app/compose-backend-env.sh

apply_backend_host_overrides

if [ "$#" -eq 0 ]; then
  set -- python -m pytest
else
  case "$1" in
    */*)
      if [ ! -x "$1" ]; then
        set -- python -m pytest "$@"
      fi
      ;;
    -*)
      set -- python -m pytest "$@"
      ;;
    *)
      if ! command -v "$1" >/dev/null 2>&1; then
        set -- python -m pytest "$@"
      fi
      ;;
  esac
fi

exec "$@"
