#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
require_openai="${BALDIN_REQUIRE_OPENAI_API_KEY:-1}"
codex_config_path="${repo_root}/.codex/config.toml"
figma_harness_path="${repo_root}/frontend/browser-harness/figma-wave1.html"
figma_config_path="${repo_root}/frontend/figma.config.json"
frontend_base_url="http://127.0.0.1:5173"
figma_harness_url="${frontend_base_url}/browser-harness/figma-wave1.html"
figma_mapping_count="$(find "${repo_root}/frontend/src/design-system" -name '*.figma.ts' | wc -l | tr -d ' ')"

missing_files=0
for rel_path in backend/.env frontend/.env; do
  abs_path="${repo_root}/${rel_path}"
  if [[ ! -f "${abs_path}" ]]; then
    printf 'Missing tracked env file: %s\n' "${rel_path}" >&2
    missing_files=1
  fi
done

if (( missing_files )); then
  printf '\nRestore the tracked .env baseline in this worktree before starting the stack.\n' >&2
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  printf 'Missing required command: npx\n' >&2
  printf 'Install Node.js/npm so Baldin can start the repo-standard webdev MCP server.\n' >&2
  exit 1
fi

if [[ ! -f "${figma_harness_path}" ]]; then
  printf 'Missing supported Figma browser harness: frontend/browser-harness/figma-wave1.html\n' >&2
  exit 1
fi

if ! python3 - "${codex_config_path}" <<'PY'
from __future__ import annotations

import sys
import tomllib
from pathlib import Path

config_path = Path(sys.argv[1])

try:
    data = tomllib.loads(config_path.read_text(encoding="utf-8"))
except Exception as exc:  # pragma: no cover - shell script handles user output
    print(f"Unable to parse {config_path}: {exc}", file=sys.stderr)
    raise SystemExit(1)

mcp_servers = data.get("mcp_servers")
if not isinstance(mcp_servers, dict):
    print(".codex/config.toml is missing [mcp_servers.webdev]", file=sys.stderr)
    raise SystemExit(1)

webdev = mcp_servers.get("webdev")
if not isinstance(webdev, dict):
    print(".codex/config.toml is missing [mcp_servers.webdev]", file=sys.stderr)
    raise SystemExit(1)

if webdev.get("command") != "npx":
    print(".codex/config.toml must configure mcp_servers.webdev.command = \"npx\"", file=sys.stderr)
    raise SystemExit(1)

args = webdev.get("args")
if not isinstance(args, list) or not any("@playwright/mcp" in str(item) for item in args):
    print(".codex/config.toml must configure mcp_servers.webdev.args with @playwright/mcp", file=sys.stderr)
    raise SystemExit(1)
PY
then
  exit 1
fi

presence() {
  local var_name="$1"
  if [[ -n "${!var_name:-}" ]]; then
    printf 'present'
  else
    printf 'absent'
  fi
}

printf 'Baldin Codex worktree env preflight\n'
printf 'tracked env files: present\n'
printf 'backend/.env.local: %s\n' "$([[ -f "${repo_root}/backend/.env.local" ]] && printf 'present' || printf 'absent')"
printf 'frontend/.env.local: %s\n' "$([[ -f "${repo_root}/frontend/.env.local" ]] && printf 'present' || printf 'absent')"
printf 'npx: %s\n' "$(command -v npx)"
printf 'webdev_mcp: configured\n'
printf 'figma_harness_file: %s\n' "${figma_harness_path}"
printf 'frontend_base_url: %s\n' "${frontend_base_url}"
printf 'figma_harness_url: %s\n' "${figma_harness_url}"
printf 'figma_account_baseline: professional-plan without Dev-seat dependency\n'
printf 'figma_canonical_files: Baldin-Library + Baldin-App-Screens\n'
printf 'figma_make_surface: reviewed_archived_sandbox\n'
printf 'figma_workflow: harness + MCP/basic inspection; Code Connect publish optional\n'
printf 'figma_history_review: browser_or_web_UI_required; MCP_focuses_on_structure_and_screenshots\n'
printf 'figma_code_connect_access: developer_seat_required_for_workspace_reads_or_publish; repo_metadata_optional\n'
printf 'figma_make_review: empty_app_shell + default_guidelines + generic_tailwind_shadcn_scaffold\n'
printf 'figma_config_file: %s\n' "$([[ -f "${figma_config_path}" ]] && printf '%s' "${figma_config_path}" || printf 'absent')"
printf 'figma_mapping_files: %s\n' "${figma_mapping_count}"
printf 'OPENAI_API_KEY: %s\n' "$(presence OPENAI_API_KEY)"
printf 'LINKEDIN_USERNAME: %s\n' "$(presence LINKEDIN_USERNAME)"
printf 'LINKEDIN_PASSWORD: %s\n' "$(presence LINKEDIN_PASSWORD)"
printf 'GLASSDOOR_USERNAME: %s\n' "$(presence GLASSDOOR_USERNAME)"
printf 'GLASSDOOR_PASSWORD: %s\n' "$(presence GLASSDOOR_PASSWORD)"
printf 'SENTRY_DSN: %s\n' "$(presence SENTRY_DSN)"
printf 'VITE_SENTRY_DSN: %s\n' "$(presence VITE_SENTRY_DSN)"

if curl -fsS "${frontend_base_url}" >/dev/null 2>&1; then
  printf 'frontend_dev_server: reachable\n'
else
  printf 'frontend_dev_server: not running (informational)\n'
fi

if [[ "${require_openai}" != "0" && -z "${OPENAI_API_KEY:-}" ]]; then
  printf '\nMissing OPENAI_API_KEY in process env.\n' >&2
  printf 'Set it in Codex UI project env vars or export it before starting the agent.\n' >&2
  printf 'For non-AI tasks only, rerun with BALDIN_REQUIRE_OPENAI_API_KEY=0.\n' >&2
  exit 1
fi
