#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
require_openai="${BALDIN_REQUIRE_OPENAI_API_KEY:-1}"
workspace_mcp_path="${repo_root}/.vscode/mcp.json"
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

if ! python3 - "${workspace_mcp_path}" "${codex_config_path}" <<'PY'
from __future__ import annotations

import json
import sys
import tomllib
from pathlib import Path

EXPECTED_FIGMA_URL = "https://mcp.figma.com/mcp"
EXPECTED_PLAYWRIGHT_PACKAGE = "@playwright/mcp@0.0.70"
EXPECTED_WORKSPACE_CWD = "${workspaceFolder}"
EXPECTED_CODEX_CWD = "."
EXPECTED_SERVER_NAMES = {"figma", "webdev"}
EXPECTED_CODEX_MCP_SERVER_NAMES = {"webdev"}


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    raise SystemExit(1)


def require_playwright_args(args: object, context: str) -> None:
    if not isinstance(args, list):
        fail(f"{context} must configure args as a list")

    normalized_args = [str(item) for item in args]
    if "-y" not in normalized_args or EXPECTED_PLAYWRIGHT_PACKAGE not in normalized_args:
        fail(
            f"{context} must configure args with -y and {EXPECTED_PLAYWRIGHT_PACKAGE}"
        )


workspace_mcp_path = Path(sys.argv[1])
config_path = Path(sys.argv[2])

try:
    workspace_data = json.loads(workspace_mcp_path.read_text(encoding="utf-8"))
except FileNotFoundError:
    fail("Missing workspace MCP contract: .vscode/mcp.json")
except json.JSONDecodeError as exc:
    fail(f"Unable to parse {workspace_mcp_path}: {exc}")

servers = workspace_data.get("servers")
if not isinstance(servers, dict):
    fail(".vscode/mcp.json is missing a top-level servers object")

if set(servers) != EXPECTED_SERVER_NAMES:
    fail(".vscode/mcp.json must declare exactly servers.figma and servers.webdev")

figma = servers.get("figma")
if not isinstance(figma, dict):
    fail(".vscode/mcp.json is missing servers.figma")

if figma.get("type") != "http":
    fail('.vscode/mcp.json must configure servers.figma.type = "http"')

if figma.get("url") != EXPECTED_FIGMA_URL:
    fail(
        '.vscode/mcp.json must configure '
        f'servers.figma.url = "{EXPECTED_FIGMA_URL}"'
    )

workspace_webdev = servers.get("webdev")
if not isinstance(workspace_webdev, dict):
    fail(".vscode/mcp.json is missing servers.webdev")

if workspace_webdev.get("type") != "stdio":
    fail('.vscode/mcp.json must configure servers.webdev.type = "stdio"')

if workspace_webdev.get("command") != "npx":
    fail('.vscode/mcp.json must configure servers.webdev.command = "npx"')

require_playwright_args(
    workspace_webdev.get("args"),
    ".vscode/mcp.json servers.webdev.args",
)

if workspace_webdev.get("cwd") != EXPECTED_WORKSPACE_CWD:
    fail(
        '.vscode/mcp.json must configure '
        f'servers.webdev.cwd = "{EXPECTED_WORKSPACE_CWD}"'
    )

try:
    data = tomllib.loads(config_path.read_text(encoding="utf-8"))
except Exception as exc:  # pragma: no cover - shell script handles user output
    fail(f"Unable to parse {config_path}: {exc}")

mcp_servers = data.get("mcp_servers")
if not isinstance(mcp_servers, dict):
    fail(".codex/config.toml is missing [mcp_servers.webdev]")

if set(mcp_servers) != EXPECTED_CODEX_MCP_SERVER_NAMES:
    fail(".codex/config.toml must declare only [mcp_servers.webdev] in this patch")

webdev = mcp_servers.get("webdev")
if not isinstance(webdev, dict):
    fail(".codex/config.toml is missing [mcp_servers.webdev]")

if webdev.get("command") != "npx":
    fail('.codex/config.toml must configure mcp_servers.webdev.command = "npx"')

require_playwright_args(webdev.get("args"), ".codex/config.toml mcp_servers.webdev.args")

if webdev.get("cwd") != EXPECTED_CODEX_CWD:
    fail('.codex/config.toml must configure mcp_servers.webdev.cwd = "."')
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
printf 'workspace_mcp_contract: %s\n' "${workspace_mcp_path}"
printf 'backend/.env.local: %s\n' "$([[ -f "${repo_root}/backend/.env.local" ]] && printf 'present' || printf 'absent')"
printf 'frontend/.env.local: %s\n' "$([[ -f "${repo_root}/frontend/.env.local" ]] && printf 'present' || printf 'absent')"
printf 'npx: %s\n' "$(command -v npx)"
printf 'workspace_mcp_servers: figma + webdev\n'
printf 'codex_webdev_mcp: configured (repo-local mirror only)\n'
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
