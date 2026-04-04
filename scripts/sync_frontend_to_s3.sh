#!/usr/bin/env bash

set -euo pipefail

cat >&2 <<'EOF'
Public frontend publication is intentionally disabled.

Phase 2 moves live rollout behind a private control plane, so this repository no longer contains
an S3 sync path for production assets.

Build the candidate bundle locally with:
  cd frontend && npm install && npm run build

Then hand that artifact off through the private deployment path documented in:
  PRIVATE_DEPLOYMENT_CONTROL_PLANE.md
EOF

exit 1
