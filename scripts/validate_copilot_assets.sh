#!/bin/bash
# Thin local wrapper for the agentic asset validator.
# Usage: ./scripts/validate_copilot_assets.sh [--warn-only]
set -euo pipefail
exec python3 "$(dirname "$0")/validate_agentic_assets.py" "$@"
