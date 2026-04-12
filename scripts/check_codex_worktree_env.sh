#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
require_openai="${BALDIN_REQUIRE_OPENAI_API_KEY:-1}"

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
printf 'OPENAI_API_KEY: %s\n' "$(presence OPENAI_API_KEY)"
printf 'LINKEDIN_USERNAME: %s\n' "$(presence LINKEDIN_USERNAME)"
printf 'LINKEDIN_PASSWORD: %s\n' "$(presence LINKEDIN_PASSWORD)"
printf 'GLASSDOOR_USERNAME: %s\n' "$(presence GLASSDOOR_USERNAME)"
printf 'GLASSDOOR_PASSWORD: %s\n' "$(presence GLASSDOOR_PASSWORD)"
printf 'SENTRY_DSN: %s\n' "$(presence SENTRY_DSN)"
printf 'VITE_SENTRY_DSN: %s\n' "$(presence VITE_SENTRY_DSN)"

if [[ "${require_openai}" != "0" && -z "${OPENAI_API_KEY:-}" ]]; then
  printf '\nMissing OPENAI_API_KEY in process env.\n' >&2
  printf 'Set it in Codex UI project env vars or export it before starting the agent.\n' >&2
  printf 'For non-AI tasks only, rerun with BALDIN_REQUIRE_OPENAI_API_KEY=0.\n' >&2
  exit 1
fi
