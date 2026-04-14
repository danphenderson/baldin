#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="Baldin Backlog"
DEFAULT_INPUT="issues.json"
DEFAULT_OUT_DIR="issue-cleanup-bundle"
DEFAULT_REPO="danphenderson/baldin"

INPUT_PATH="$DEFAULT_INPUT"
OUT_DIR="$DEFAULT_OUT_DIR"
REPO="$DEFAULT_REPO"
PROJECT_OWNER=""
FORCE=0
STRICT=0
APPLY_MODE="${APPLY:-0}"
SKIP_PROJECT=0

PROJECT_WRITES_ENABLED=0
PROJECT_SCOPE_ERROR=""
PROJECT_NUMBER=""
PROJECT_ID=""
PROJECT_FIELDS_JSON=""
APPLY_LOG_FILE=""

SELECTED_ISSUES_CSV=","
HEURISTIC_COUNT=0
TMP_DIR=""

usage() {
  cat <<'EOF'
Usage:
  bash scripts/generate_issue_cleanup_bundle.sh [options]

Options:
  --input PATH       Path to the issues JSON export. Default: issues.json
  --out-dir PATH     Output directory for generated artifacts. Default: issue-cleanup-bundle
  --repo OWNER/REPO  Repository to mutate in apply mode. Default: danphenderson/baldin
  --project-owner X  Project v2 owner. Defaults to the repo owner.
  --numbers CSV      Optional comma-separated subset of issue numbers to process.
  --apply            Generate the bundle and then execute live gh issue cleanup writes.
  --skip-project     Skip Project v2 writes even in apply mode.
  --force            Replace the output directory if it already exists.
  --strict           Fail if any issue falls back to heuristic classification.
  --help             Show this help text.

Default behavior is bundle-only. With --apply (or APPLY=1), the script also uses gh to:
  - create missing labels and milestones
  - rewrite issue titles and bodies
  - close close-candidate issues with closure comments
  - add kept issues to the target Project v2 board and populate fields when project scope is available

It always generates:
  - issue-cleanup-summary.md
  - issue-cleanup-manifest.json
  - issue-bodies/<number>.md
  - operator-checklist.md
  - apply-results.md (in apply mode)
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

escape_md() {
  printf '%s' "$1" | sed 's/|/\\|/g'
}

json_array_from_lines() {
  jq -Rsc 'split("\n") | map(select(length > 0))'
}

parse_numbers() {
  local raw="$1"
  local item=""
  local normalized="${raw// /}"
  IFS=',' read -r -a items <<<"$normalized"
  for item in "${items[@]}"; do
    if [[ -n "$item" ]]; then
      SELECTED_ISSUES_CSV+="${item},"
    fi
  done
}

is_selected_issue() {
  local number="$1"
  if [[ "$SELECTED_ISSUES_CSV" == "," ]]; then
    return 0
  fi
  [[ "$SELECTED_ISSUES_CSV" == *",${number},"* ]]
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --input)
        INPUT_PATH="$2"
        shift 2
        ;;
      --out-dir)
        OUT_DIR="$2"
        shift 2
        ;;
      --repo)
        REPO="$2"
        shift 2
        ;;
      --project-owner)
        PROJECT_OWNER="$2"
        shift 2
        ;;
      --numbers)
        parse_numbers "$2"
        shift 2
        ;;
      --apply)
        APPLY_MODE=1
        shift
        ;;
      --skip-project)
        SKIP_PROJECT=1
        shift
        ;;
      --force)
        FORCE=1
        shift
        ;;
      --strict)
        STRICT=1
        shift
        ;;
      --help)
        usage
        exit 0
        ;;
      *)
        echo "Unknown argument: $1" >&2
        usage >&2
        exit 1
        ;;
    esac
  done
}

log_info() {
  echo "==> $*"
  if [[ -n "$APPLY_LOG_FILE" ]]; then
    printf -- "- %s\n" "$*" >>"$APPLY_LOG_FILE"
  fi
}

log_warn() {
  echo "WARN: $*" >&2
  if [[ -n "$APPLY_LOG_FILE" ]]; then
    printf -- "- WARN: %s\n" "$*" >>"$APPLY_LOG_FILE"
  fi
}

managed_routing_label() {
  case "$1" in
    backend|frontend|docs|etl|devops|cross-stack|decision-needed|needs-verification)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

list_contains() {
  local haystack="$1"
  local needle="$2"
  if [[ -z "$needle" ]]; then
    return 1
  fi
  printf '%s\n' "$haystack" | grep -Fxq "$needle"
}

append_csv_value() {
  local current="$1"
  local next="$2"
  if [[ -z "$next" ]]; then
    printf '%s' "$current"
  elif [[ -z "$current" ]]; then
    printf '%s' "$next"
  else
    printf '%s,%s' "$current" "$next"
  fi
}

label_color() {
  case "$1" in
    backend) echo "B10A37" ;;
    frontend) echo "CBBA5C" ;;
    docs) echo "0075CA" ;;
    etl) echo "1D76DB" ;;
    devops) echo "5319E7" ;;
    cross-stack) echo "6F42C1" ;;
    decision-needed) echo "D876E3" ;;
    needs-verification) echo "FBCA04" ;;
    *) echo "9E9E9E" ;;
  esac
}

label_description() {
  case "$1" in
    backend) echo "Backend-only work in ./backend" ;;
    frontend) echo "Frontend-only work in ./frontend" ;;
    docs) echo "Documentation or onboarding work" ;;
    etl) echo "ETL, crawlers, or ingestion work" ;;
    devops) echo "CI, automation, or local-dev workflow work" ;;
    cross-stack) echo "Work that spans backend, frontend, contracts, or docs" ;;
    decision-needed) echo "Needs an architecture or product decision before implementation" ;;
    needs-verification) echo "Needs reproduction or verification before implementation" ;;
    *) echo "Created by issue cleanup automation" ;;
  esac
}

close_reason_for_disposition() {
  case "$1" in
    close-implemented) echo "completed" ;;
    *) echo "not planned" ;;
  esac
}

project_field_options() {
  case "$1" in
    Status) echo "Ready,Needs Decision,Needs Verification,Close Candidate" ;;
    Surface) echo "backend,frontend,design,docs,etl,devops,cross-stack" ;;
    Owner) echo "Baldin Backend Agent,Baldin Frontend Agent,Baldin Design Lead Agent,Baldin Lead Full-Stack Architect,Baldin Project Manager" ;;
    Workstream) echo "Quality Gate,Runtime Foundations,Runtime Hardening,Security Hardening,Availability Hardening,Frontend UX,Docs and Onboarding,Observability,Architecture Decisions,Developer Experience,Verification,Backlog Cleanup,Runtime Consistency,ETL Reliability" ;;
    Dispatch\ Ready) echo "Yes,No" ;;
    Phase) echo "Phase 2 - Integration Gate,Phase 5 - Runtime Blockers,Phase 6 - Minimum Safety Controls,Stretch - Feature Completeness,Decision Gate" ;;
    Needs\ Decision) echo "Yes,No" ;;
    *) echo "" ;;
  esac
}

project_field_value() {
  local manifest_json="$1"
  local field_name="$2"
  case "$field_name" in
    Status) jq -r '.recommended_project.status // empty' <<<"$manifest_json" ;;
    Surface) jq -r '.recommended_project.surface // empty' <<<"$manifest_json" ;;
    Owner) jq -r '.recommended_project.owner // empty' <<<"$manifest_json" ;;
    Workstream) jq -r '.recommended_project.workstream // empty' <<<"$manifest_json" ;;
    Dispatch\ Ready) jq -r '.recommended_project.dispatch_ready // empty' <<<"$manifest_json" ;;
    Phase) jq -r '.recommended_project.phase // empty' <<<"$manifest_json" ;;
    Needs\ Decision) jq -r '.recommended_project.needs_decision // empty' <<<"$manifest_json" ;;
    *) echo "" ;;
  esac
}

render_return_format() {
  cat <<'EOF'
- Status: complete, partial, or blocked.
- Summary: what changed, delegated, or decided and why.
- Files touched or reviewed.
- Commands run and result summary.
- Whether API routes or schemas changed.
- Whether generated artifacts were regenerated, intentionally deferred, or unchanged.
- Risks, blockers, or assumptions.
- Recommended next owner, if any.
EOF
}

classify_issue() {
  local number="$1"
  local current_title="$2"
  local current_body="$3"
  local lower_text="$(printf '%s %s' "$current_title" "$current_body" | tr '[:upper:]' '[:lower:]')"

  heuristic_used=0
  recommended_title="$current_title"
  disposition=""
  surface=""
  owner="Baldin Project Manager"
  workstream="Backlog Cleanup"
  milestone=""
  rationale=""
  drift_note=""
  project_status=""
  dispatch_ready="No"
  needs_decision="No"

  case "$number" in
    10)
      recommended_title="Quality: Add frontend Playwright smoke coverage after the 60% backend gate"
      disposition="keep"
      surface="cross-stack"
      owner="Baldin Lead Full-Stack Architect"
      workstream="Quality Gate"
      milestone="Phase 2 - Integration Gate"
      rationale="The repo already enforces a 60% backend coverage gate, so the remaining work is to narrow this umbrella to the missing frontend integration scaffold and any targeted backend gaps that still block the quality gate."
      project_status="Ready"
      dispatch_ready="Yes"
      ;;
    18)
      recommended_title="Backend: Integrate Alembic for versioned database migrations"
      disposition="keep"
      surface="backend"
      owner="Baldin Lead Full-Stack Architect"
      workstream="Runtime Foundations"
      milestone="Phase 5 - Runtime Blockers"
      rationale="Versioned migrations are still a runtime prerequisite because the repo continues to rely on bootstrap-time schema creation and additive column syncing."
      project_status="Ready"
      dispatch_ready="Yes"
      ;;
    38)
      disposition="close-superseded"
      surface="backend"
      rationale="The original flat-file data lake proposal was superseded by the current database-backed document storage approach and centralized storage helpers."
      project_status="Close Candidate"
      ;;
    51)
      recommended_title="Backend: Normalize UTC datetime handling across API and models"
      disposition="keep"
      surface="backend"
      owner="Baldin Backend Agent"
      workstream="Runtime Consistency"
      milestone="Phase 5 - Runtime Blockers"
      rationale="Timestamp handling remains inconsistent across models and route-level JSON payloads, which risks ordering drift and inconsistent client rendering."
      project_status="Ready"
      dispatch_ready="Yes"
      ;;
    54)
      recommended_title="Backend: Add structured logging with request correlation IDs"
      disposition="keep"
      surface="backend"
      owner="Baldin Backend Agent"
      workstream="Observability"
      milestone="Phase 6 - Minimum Safety Controls"
      rationale="Request-scoped observability is still missing from the local-first runtime and remains a Phase 6 safety control."
      project_status="Ready"
      dispatch_ready="Yes"
      ;;
    55)
      recommended_title="Decision: Choose the local vector-store path for document semantic search"
      disposition="decision"
      surface="backend"
      owner="Baldin Lead Full-Stack Architect"
      workstream="Architecture Decisions"
      milestone="Decision Gate"
      rationale="This ticket still mixes a backend decision with a larger feature slice. It should be routed as a bounded architecture decision before implementation expands."
      project_status="Needs Decision"
      needs_decision="Yes"
      ;;
    59)
      recommended_title="Decision: Evaluate opt-in LangSmith tracing for local LLM workflows"
      disposition="decision"
      surface="backend"
      owner="Baldin Project Manager"
      workstream="Architecture Decisions"
      milestone="Decision Gate"
      rationale="LangSmith tracing is still potentially useful, but it is not clearly part of the current launch-path hardening and should be treated as a bounded decision ticket first."
      project_status="Needs Decision"
      needs_decision="Yes"
      ;;
    66)
      disposition="close-not-aligned"
      surface="frontend"
      rationale="Generic search and autocomplete wrappers are not aligned with the current MUI-first frontend architecture and would add abstraction without a demonstrated gap."
      project_status="Close Candidate"
      ;;
    69)
      disposition="close-superseded"
      surface="frontend"
      rationale="The DataGrid bugs reference an older frontend structure that was replaced during the IA overhaul."
      project_status="Close Candidate"
      ;;
    70)
      disposition="close-not-aligned"
      surface="devops"
      rationale="Splitting the backend and ETL into separate packages would add packaging complexity that does not match the current local-first runtime posture."
      project_status="Close Candidate"
      ;;
    71)
      disposition="close-superseded"
      surface="backend"
      rationale="The API surface has already been refactored beyond the original route-structure question, so this no longer needs an open issue."
      project_status="Close Candidate"
      ;;
    72)
      disposition="close-superseded"
      surface="frontend"
      rationale="The application deletion bug references an older page structure that has since been replaced."
      project_status="Close Candidate"
      ;;
    73)
      recommended_title="CI: Consolidate Python formatting and linting under Ruff"
      disposition="keep"
      surface="devops"
      owner="Baldin Lead Full-Stack Architect"
      workstream="Developer Experience"
      milestone="Phase 2 - Integration Gate"
      rationale="The repo still carries separate Python lint and formatting tools where Ruff could simplify the quality gate and shorten local feedback cycles."
      project_status="Ready"
      dispatch_ready="Yes"
      ;;
    74)
      disposition="close-not-aligned"
      surface="frontend"
      rationale="Wrapper button components are not justified by the current MUI-direct architecture and would add indirection without solving a current inconsistency."
      project_status="Close Candidate"
      ;;
    75)
      disposition="close-implemented"
      surface="devops"
      rationale="Schema regeneration automation already exists via the current script and CI freshness checks."
      project_status="Close Candidate"
      ;;
    76)
      recommended_title="Auth: Enforce a minimum password length on registration"
      disposition="keep"
      surface="backend"
      owner="Baldin Backend Agent"
      workstream="Security Hardening"
      milestone="Phase 6 - Minimum Safety Controls"
      rationale="The registration flow still needs an explicit minimum password policy to prevent broken or trivially weak accounts."
      project_status="Ready"
      dispatch_ready="Yes"
      ;;
    80)
      disposition="close-implemented"
      surface="frontend"
      rationale="The data orchestration frontend was already delivered as part of the workflows IA."
      project_status="Close Candidate"
      ;;
    81)
      disposition="close-implemented"
      surface="frontend"
      rationale="The extractor frontend page and service layer already exist in the current repo."
      project_status="Close Candidate"
      ;;
    82)
      recommended_title="ETL: Harden LinkedIn and Glassdoor crawler reliability"
      disposition="keep"
      surface="etl"
      owner="Baldin Backend Agent"
      workstream="ETL Reliability"
      milestone="Phase 5 - Runtime Blockers"
      rationale="Crawler hardening remains aligned with the current ETL implementation and should stay implementation-ready."
      project_status="Ready"
      dispatch_ready="Yes"
      ;;
    83)
      disposition="close-implemented"
      surface="cross-stack"
      rationale="Avatar upload, serving, and frontend display already exist in the current branch, and the open follow-on is now a security hardening issue instead."
      drift_note="The earlier backlog audit treated this as still active, but current repo evidence includes /users/me/avatar, /users/{user_id}/avatar, frontend avatar upload helpers, and backend avatar tests."
      project_status="Close Candidate"
      ;;
    84)
      disposition="close-not-aligned"
      surface="backend"
      rationale="The repo-local AI assistant CLI at backend/dev.py was intentionally removed and is not part of the current local-first developer-preview workflow."
      project_status="Close Candidate"
      ;;
    87)
      disposition="close-implemented"
      surface="backend"
      rationale="The database management API already exists and is covered by tests."
      project_status="Close Candidate"
      ;;
    90)
      disposition="close-not-aligned"
      surface="backend"
      rationale="The local-first developer-preview posture does not currently include a gated beta registration-token flow."
      project_status="Close Candidate"
      ;;
    91)
      disposition="close-superseded"
      surface="frontend"
      rationale="The reported token bug targets an older data-orchestration UI that no longer exists in its original form."
      project_status="Close Candidate"
      ;;
    92)
      disposition="close-implemented"
      surface="backend"
      rationale="Resume and cover-letter PDF download endpoints already exist in the backend."
      project_status="Close Candidate"
      ;;
    95)
      recommended_title="Docs: Finish deployment, API, and contributor guidance in the Docusaurus site"
      disposition="keep"
      surface="docs"
      owner="Baldin Project Manager"
      workstream="Docs and Onboarding"
      milestone="Stretch - Feature Completeness"
      rationale="The docs site exists, but the remaining deployment, API reference, and contributor guidance gaps still need a focused follow-through."
      project_status="Ready"
      dispatch_ready="Yes"
      ;;
    97)
      recommended_title="Decision: Verify whether a backend bootstrap script is still needed outside Docker Compose"
      disposition="decision"
      surface="devops"
      owner="Baldin Project Manager"
      workstream="Architecture Decisions"
      milestone="Decision Gate"
      rationale="Docker Compose now handles most setup, so this should be validated as a real gap before a new helper script is built."
      project_status="Needs Decision"
      needs_decision="Yes"
      ;;
    99)
      disposition="close-not-aligned"
      surface="backend"
      rationale="A separate enrich API would duplicate the existing extractor direction without fitting the current scoped launch path."
      project_status="Close Candidate"
      ;;
    102)
      disposition="close-implemented"
      surface="backend"
      rationale="Admin authentication and authorization are already implemented in the current admin surface."
      project_status="Close Candidate"
      ;;
    103)
      disposition="close-implemented"
      surface="backend"
      rationale="The extractor API has already been cleaned up and reorganized in the current branch."
      project_status="Close Candidate"
      ;;
    105)
      recommended_title="Decision: Keep hardening the Playwright crawlers or evaluate a Scrapy migration"
      disposition="decision"
      surface="etl"
      owner="Baldin Project Manager"
      workstream="Architecture Decisions"
      milestone="Decision Gate"
      rationale="The repo already has a Playwright-based crawler stack, so Scrapy should not remain open as an implementation issue until a narrower decision is made."
      project_status="Needs Decision"
      needs_decision="Yes"
      ;;
    109)
      disposition="close-not-aligned"
      surface="devops"
      rationale="A personal shell alias in ~/.zshrc is outside the repository boundary."
      project_status="Close Candidate"
      ;;
    115)
      recommended_title="Backend: Move remaining synchronous seed and extract flows to BackgroundTasks"
      disposition="keep"
      surface="cross-stack"
      owner="Baldin Lead Full-Stack Architect"
      workstream="Runtime Hardening"
      milestone="Phase 5 - Runtime Blockers"
      rationale="Synchronous seeding still risks timeouts and long request latency, and the fix spans backend behavior plus any frontend status-tracking follow-up."
      project_status="Ready"
      dispatch_ready="Yes"
      ;;
    117)
      recommended_title="Decision: Evaluate generated typed fetch clients for frontend services"
      disposition="decision"
      surface="frontend"
      owner="Baldin Frontend Agent"
      workstream="Architecture Decisions"
      milestone="Decision Gate"
      rationale="This is best treated as a bounded evaluation and prototype ticket before any broad client migration is approved."
      project_status="Needs Decision"
      needs_decision="Yes"
      ;;
    119)
      disposition="close-implemented"
      surface="cross-stack"
      rationale="The application materials export endpoint and backend tests already exist in the current branch."
      drift_note="The earlier backlog audit kept this open, but current repo evidence includes GET /applications/{id}/export and a dedicated backend export test file."
      project_status="Close Candidate"
      ;;
    120)
      disposition="close-superseded"
      surface="cross-stack"
      rationale="The issue references an older orchestration page and lead-extraction flow that has since been redesigned."
      project_status="Close Candidate"
      ;;
    122)
      disposition="close-not-aligned"
      surface="backend"
      rationale="Mail integration is not part of the current repo direction or the active hardening path."
      project_status="Close Candidate"
      ;;
    126)
      recommended_title="Verification: Reproduce or close the stale backend Dockerfile.prod build failure"
      disposition="verification"
      surface="devops"
      owner="Baldin Project Manager"
      workstream="Verification"
      milestone="Decision Gate"
      rationale="The issue is stale, lacks a reproducible failure report, and should be verified against the current Dockerfile before any implementation work is queued."
      project_status="Needs Verification"
      ;;
    148)
      recommended_title="Security: Add ownership checks to company routes"
      disposition="keep"
      surface="backend"
      owner="Baldin Backend Agent"
      workstream="Security Hardening"
      milestone="Phase 6 - Minimum Safety Controls"
      rationale="The company dependency still appears to miss an ownership guard, creating an IDOR-class authorization gap."
      project_status="Ready"
      dispatch_ready="Yes"
      ;;
    149)
      recommended_title="Backend: Cap global page_size in the shared pagination dependency"
      disposition="keep"
      surface="backend"
      owner="Baldin Backend Agent"
      workstream="Availability Hardening"
      milestone="Phase 6 - Minimum Safety Controls"
      rationale="The shared pagination dependency still needs an upper bound to avoid oversized list queries."
      project_status="Ready"
      dispatch_ready="Yes"
      ;;
    150)
      recommended_title="Frontend: Surface Command Center API failures to users"
      disposition="keep"
      surface="frontend"
      owner="Baldin Frontend Agent"
      workstream="Frontend UX"
      milestone="Stretch - Feature Completeness"
      rationale="The Command Center still needs user-visible failure handling so primary actions do not fail silently."
      project_status="Ready"
      dispatch_ready="Yes"
      ;;
    151)
      recommended_title="Security: Validate avatar uploads by file signature and serve them with nosniff"
      disposition="keep"
      surface="backend"
      owner="Baldin Backend Agent"
      workstream="Security Hardening"
      milestone="Phase 6 - Minimum Safety Controls"
      rationale="The avatar endpoint exists, so the next issue is now content validation and safer serving semantics."
      project_status="Ready"
      dispatch_ready="Yes"
      ;;
    153)
      recommended_title="Backend: Paginate crawler run results"
      disposition="keep"
      surface="backend"
      owner="Baldin Backend Agent"
      workstream="Availability Hardening"
      milestone="Phase 6 - Minimum Safety Controls"
      rationale="The crawler runs list is still an unbounded admin query unless it adopts the same pagination pattern as the rest of the API."
      project_status="Ready"
      dispatch_ready="Yes"
      ;;
    *)
      heuristic_used=1
      if [[ -z "$current_body" || ${#current_body} -lt 80 ]]; then
        recommended_title="Verification: Clarify scope for issue #$number"
        disposition="verification"
        surface="devops"
        owner="Baldin Project Manager"
        workstream="Verification"
        milestone="Decision Gate"
        rationale="The issue body is too thin to route directly, so it should be verified before further work is assigned."
        project_status="Needs Verification"
      elif [[ "$lower_text" == *"question"* || "$lower_text" == *"evaluate"* ]]; then
        disposition="decision"
        surface="cross-stack"
        owner="Baldin Project Manager"
        workstream="Architecture Decisions"
        milestone="Decision Gate"
        rationale="The issue reads like a decision or evaluation rather than an execution-ready task."
        project_status="Needs Decision"
        needs_decision="Yes"
      else
        disposition="keep"
        surface="backend"
        owner="Baldin Backend Agent"
        workstream="Backlog Cleanup"
        milestone="Stretch - Feature Completeness"
        rationale="No repo-specific override exists, so this entry falls back to a generic implementation-ready classification."
        project_status="Ready"
        dispatch_ready="Yes"
      fi
      ;;
  esac

  if [[ "$heuristic_used" == "1" ]]; then
    HEURISTIC_COUNT=$((HEURISTIC_COUNT + 1))
  fi
}

labels_json_for_issue() {
  local labels=()

  if [[ "$disposition" != close-* ]]; then
    if [[ -n "$surface" ]]; then
      labels+=("$surface")
    fi
    case "$disposition" in
      decision)
        labels+=("decision-needed")
        ;;
      verification)
        labels+=("needs-verification")
        ;;
    esac
  fi

  printf '%s\n' "${labels[@]:-}" | json_array_from_lines
}

dependencies_json_for_issue() {
  case "$1" in
    10)
      printf '[115]'
      ;;
    51)
      printf '[18]'
      ;;
    55)
      printf '[18]'
      ;;
    153)
      printf '[149]'
      ;;
    *)
      printf '[]'
      ;;
  esac
}

relationships_json_for_issue() {
  case "$1" in
    10)
      printf '[{"type":"blocked-by","target":115,"reason":"If async seed and extract flows are still being redesigned, land that refactor before locking the Playwright quality path around those flows."}]'
      ;;
    153)
      printf '[{"type":"blocked-by","target":149,"reason":"Bound the shared page_size parameter before wiring the crawler-runs list onto the common pagination path."}]'
      ;;
    *)
      printf '[]'
      ;;
  esac
}

closure_note_for_issue() {
  case "$1" in
    38)
      cat <<'EOF'
The flat-file data-lake proposal no longer matches the current storage architecture. Centralized document storage and database-backed records have replaced the original filesystem layout.
EOF
      ;;
    66)
      cat <<'EOF'
The current frontend relies on MUI DataGrid and page-specific search affordances rather than generic wrapper components, so this request is not aligned with the established architecture.
EOF
      ;;
    69)
      cat <<'EOF'
The referenced DataGrid behavior belongs to an older UI structure that was replaced in the frontend IA redesign.
EOF
      ;;
    70)
      cat <<'EOF'
The current runtime model treats the backend as one deployable unit. Splitting the package layout would add complexity without helping the approved launch path.
EOF
      ;;
    71)
      cat <<'EOF'
The API route structure has already moved beyond the original question, so this issue no longer serves as a useful planning ticket.
EOF
      ;;
    72)
      cat <<'EOF'
The deletion flow described here belongs to an older applications UI that has since been replaced.
EOF
      ;;
    74)
      cat <<'EOF'
Common wrapper button components are not justified by the current MUI-first frontend surface and would add indirection without solving a current inconsistency.
EOF
      ;;
    75)
      cat <<'EOF'
Schema freshness automation already exists via the current regeneration script and CI checks, so this can be closed as implemented.
EOF
      ;;
    80)
      cat <<'EOF'
The workflows UI already covers the orchestration surfaces that this issue requested.
EOF
      ;;
    81)
      cat <<'EOF'
The extractor frontend page and associated service layer already exist in the current repo.
EOF
      ;;
    83)
      cat <<'EOF'
Avatar upload and serving are already implemented. The remaining open work is the security hardening captured by issue #151.
EOF
      ;;
    84)
      cat <<'EOF'
    The repo-local AI assistant CLI at backend/dev.py was intentionally removed and is not part of the current local-first developer-preview workflow, so this issue is no longer aligned with the active roadmap.
EOF
      ;;
    87)
      cat <<'EOF'
The database management endpoints are already present and tested, so this issue is implemented.
EOF
      ;;
    90)
      cat <<'EOF'
The current local-first developer-preview posture does not include a beta registration-token flow, so this issue is not aligned with the active roadmap.
EOF
      ;;
    91)
      cat <<'EOF'
This bug references an older data-orchestration surface that no longer exists in its original form.
EOF
      ;;
    92)
      cat <<'EOF'
Resume and cover-letter PDF download endpoints already exist, so this issue is implemented.
EOF
      ;;
    99)
      cat <<'EOF'
A separate enrich API would duplicate the existing extractor direction and is not aligned with the current scoped delivery posture.
EOF
      ;;
    102)
      cat <<'EOF'
Admin authentication and authorization are already implemented in the current admin surface.
EOF
      ;;
    103)
      cat <<'EOF'
The extractor API has already been cleaned up and reorganized, so this issue is implemented.
EOF
      ;;
    109)
      cat <<'EOF'
Personal shell aliases in ~/.zshrc are outside the repository boundary and should not remain as an open repo issue.
EOF
      ;;
    119)
      cat <<'EOF'
Application materials export already exists in the backend, with tests. This issue should be closed as implemented.
EOF
      ;;
    120)
      cat <<'EOF'
The orchestration and lead-extraction flow referenced here was replaced by the current workflows UI and supporting backend changes.
EOF
      ;;
    122)
      cat <<'EOF'
Mail integration is not part of the current local-first hardening path, so this issue is not aligned with the approved scope.
EOF
      ;;
    *)
      cat <<EOF
$rationale
EOF
      ;;
  esac
}

write_body_file() {
  local number="$1"
  local output_path="$2"

  case "$number" in
    10)
      {
        cat <<'EOF'
## Problem Statement

The repo already enforces a 60% backend coverage gate in CI, but this issue still mixes that completed step with the remaining gap: a real frontend integration scaffold and any targeted backend test additions needed to keep the gate credible.

## Why It Matters Now

Phase 2 treats CI as an integration gate, not a lint-only guard. Until one browser-level smoke flow exists, regressions across auth, navigation, and application creation can still slip through backend-only coverage.

## Affected Area

- `frontend/` Playwright scaffold and first smoke flow
- `.github/workflows/ci.yml` integration-test wiring
- `backend/app/tests/` only if the selected smoke flow exposes targeted backend coverage gaps

## Suggested owner

- Baldin Lead Full-Stack Architect

## In-Scope

- Narrow the issue to the remaining quality-gap work instead of restating the already-landed 60% backend gate.
- Add a first Playwright smoke test for a critical path such as login to command center to create application.
- Wire the smoke flow into CI with the smallest stable setup.
- Add only the backend tests needed to keep the chosen critical path stable.

## Non-Goals

- Full frontend end-to-end coverage.
- Visual regression testing.
- Raising backend coverage above 60 as part of this ticket.

## Required validation

- Backend coverage gate remains at or above 60%.
- The new Playwright smoke flow runs in CI.
- The selected user journey is documented well enough for future extension.

## Generated-artifact note

No generated artifacts are expected unless the chosen smoke flow forces backend API or schema changes. If route or schema shapes change, run `./scripts/update_frontend_schemas.sh` as follow-through.

## Dependencies

- Prefer to land issue #115 first if the chosen smoke path depends on seed or extract flows that are still synchronous today.

## Escalate if

- The Playwright setup requires new Docker Compose topology or non-trivial test-fixture infrastructure.
- The chosen user flow depends on backend API changes that broaden the ticket into contract work.

## Return format

EOF
        render_return_format
      } >"$output_path"
      ;;
    18)
      {
        cat <<'EOF'
## Problem Statement

The backend still relies on bootstrap-time schema creation and additive syncing rather than versioned migrations. That keeps local development moving, but it is not sufficient for a controlled release path.

## Why It Matters Now

Phase 5 explicitly calls for migration discipline. Alembic is the smallest durable way to move the repo away from implicit schema drift without trying to redesign the entire database workflow at once.

## Affected Area

- `backend/app/core/db.py`
- `backend/app/models.py`
- new `backend/alembic/` migration surface
- `docker-compose.yml` and reset scripts if startup or reset flow needs adjustment

## Suggested owner

- Baldin Lead Full-Stack Architect

## In-Scope

- Initialize Alembic with the current async SQLAlchemy setup.
- Generate an initial migration from the current model state.
- Add the smallest startup and reset-path wiring needed for local development.
- Document the migration workflow for contributors.

## Non-Goals

- Removing every local bootstrap fallback in one pass.
- Multi-database migration support.
- Data migrations beyond the minimum initial integration.

## Required validation

- `alembic upgrade head` works on a fresh local database.
- `alembic revision --autogenerate` detects model drift.
- Existing local bootstrap and test paths still work where intentionally preserved.

## Generated-artifact note

No generated frontend artifacts are expected. Update docs instead of hand-editing generated build output.

## Dependencies

- None.

## Escalate if

- The initial migration requires a broader database reset policy or startup contract change.
- Preserving PYTEST behavior would materially complicate the rollout.

## Return format

EOF
        render_return_format
      } >"$output_path"
      ;;
    51)
      {
        cat <<'EOF'
## Problem Statement

Datetime handling is still inconsistent between model defaults and route-level JSON payload construction. The immediate problem is not a missing feature but drift in how timestamps are authored and serialized.

## Why It Matters Now

As the API grows, timestamp inconsistency becomes an ordering and display bug source. This is a narrow runtime-consistency ticket that should be handled before more timestamp-bearing surfaces accumulate.

## Affected Area

- `backend/app/models.py`
- `backend/app/api/routes/applications.py`
- related schema serialization paths that expose timestamped JSON payloads

## Suggested owner

- Baldin Backend Agent

## In-Scope

- Remove route-level `datetime.utcnow()` and `datetime.now()` usage where server-side defaults or explicit UTC helpers should be used instead.
- Normalize JSON payload timestamps to ISO 8601 UTC form.
- Add the smallest convention or helper needed to keep future timestamp handling consistent.

## Non-Goals

- A large schema-type migration on every datetime column.
- Client-side timezone formatting changes.
- Retrofitting old persisted data.

## Required validation

- No route handler still emits naive timestamps.
- JSON timestamp fields include an explicit UTC indicator.
- Existing tests continue to pass or are updated only where behavior intentionally changes.

## Generated-artifact note

No generated artifacts are expected unless response schemas change. If API response shapes move, regenerate `openapi.json` and `frontend/src/schema.d.ts`.

## Dependencies

- Issue #18 if the chosen normalization path requires a migration-backed column change.

## Escalate if

- Fixing the inconsistency requires switching column types or broader data migration work.

## Return format

EOF
        render_return_format
      } >"$output_path"
      ;;
    54)
      {
        cat <<'EOF'
## Problem Statement

The backend has configurable log levels, but it still lacks structured request logs, correlation IDs, and a clear local persistence strategy for debugging across API surfaces.

## Why It Matters Now

Phase 6 requires minimum production safety controls. Without request correlation and structured logging, incident triage and local debugging remain harder than they need to be.

## Affected Area

- `backend/app/main.py`
- backend logging configuration and formatter setup
- local log persistence under the repo's public assets path if DEV mode enables it

## Suggested owner

- Baldin Backend Agent

## In-Scope

- Add request correlation IDs.
- Add structured JSON logging for request and response events.
- Preserve readable console logs for everyday local development.
- Add file-backed DEV logging only if it stays small and local-first.

## Non-Goals

- External log aggregation.
- Full metrics or tracing rollout.
- Frontend telemetry work.

## Required validation

- Responses return a correlation header.
- DEV logs include correlation ID, path, status, and timing-relevant fields.
- PYTEST mode remains stable and does not require file logging.

## Generated-artifact note

No generated artifacts are expected.

## Dependencies

- None.

## Escalate if

- The logging design needs a new external dependency or materially changes runtime startup behavior.

## Return format

EOF
        render_return_format
      } >"$output_path"
      ;;
    55)
      {
        cat <<'EOF'
## Goal

Choose the smallest local vector-store path for document semantic search without committing the repo to an oversized architecture.

## Current blocker

The issue still mixes evaluation, storage design, and product feature delivery. The repo needs a narrow decision first: pgvector, FAISS, or defer.

## Affected repo surfaces

- `backend/app/core/langchain.py`
- embedding-related model or storage changes if a prototype is approved
- local runtime surfaces such as `docker-compose.yml` if a database extension is required

## Likely owner

- Baldin Lead Full-Stack Architect

## What you already tried

- Existing issue context already frames pgvector versus FAISS as the main fork.
- The current repo provides extractor and document capabilities but no approved vector-store contract.

## Validation context

- Produce a clear recommendation with tradeoffs.
- If a prototype is built, prove it works in the local stack without adding cloud dependencies.

## Scope note

- In scope: decision memo, one bounded prototype if needed, migration impact, and operator cost.
- Out of scope: a full RAG agent, multi-turn chat, or broad LLM architecture expansion.

## Generated-artifact note

If the decision prototype changes routes or schemas, regenerate `openapi.json` and `frontend/src/schema.d.ts`. Do not hand-edit generated artifacts.

## Dependencies

- Issue #18 if persistent database storage is chosen and needs migration support.

## Escalate if

- The preferred option requires extra infrastructure beyond the current local Docker Compose posture.

## Return format

EOF
        render_return_format
      } >"$output_path"
      ;;
    59)
      {
        cat <<'EOF'
## Goal

Decide whether LangSmith tracing belongs in the near-term local LLM workflow or should remain deferred.

## Current blocker

This issue is too broad for implementation as-is and is not clearly part of the active hardening plan.

## Affected repo surfaces

- `backend/app/core/conf.py`
- LangChain integration points if tracing is enabled
- local developer workflow docs if the decision is approved

## Likely owner

- Baldin Project Manager

## What you already tried

- Existing issue context identifies the observability value, but no current launch-phase requirement makes it mandatory.

## Validation context

- Decide whether this is a near-term developer-experience requirement.
- If yes, narrow the implementation slice to opt-in local tracing only.

## Scope note

- In scope: a yes or no decision, a smallest-path implementation recommendation, and any config flags required.
- Out of scope: full observability platform adoption.

## Generated-artifact note

No generated artifacts are expected unless API behavior changes, which it should not for an opt-in tracing slice.

## Dependencies

- None.

## Escalate if

- Enabling tracing would require secrets or hosted services that do not fit the current local-first posture.

## Return format

EOF
        render_return_format
      } >"$output_path"
      ;;
    73)
      {
        cat <<'EOF'
## Problem Statement

The Python lint and format path still uses multiple tools where Ruff could collapse the workflow into one faster, simpler check set.

## Why It Matters Now

This is quality-gate work. Faster local feedback and a smaller CI toolchain help keep Phase 2 sustainable as more validation is added.

## Affected Area

- `.pre-commit-config.yaml`
- Python lint and format configuration in the backend toolchain
- CI lint job only if it directly references removed tools

## Suggested owner

- Baldin Lead Full-Stack Architect

## In-Scope

- Replace overlapping Python format and lint hooks with Ruff where equivalent.
- Match the current linting posture instead of expanding rule scope.
- Update CI only if the workflow still references replaced tools.

## Non-Goals

- New type-checking rules.
- Frontend lint changes.
- Large-format churn across the codebase.

## Required validation

- `pre-commit run --all-files` stays green.
- CI linting still passes.
- The repo avoids broad formatting drift unrelated to the tool swap.

## Generated-artifact note

No generated artifacts are expected.

## Dependencies

- None.

## Escalate if

- Matching current formatting behavior requires a broad repo-wide rewrite rather than a clean tool swap.

## Return format

EOF
        render_return_format
      } >"$output_path"
      ;;
    76)
      {
        cat <<'EOF'
## Problem Statement

Registration still needs an explicit minimum password rule so users cannot create trivially weak or broken accounts.

## Why It Matters Now

This is a straightforward security-hardening slice with low implementation risk and clear validation.

## Affected Area

- `backend/app/core/security.py`
- registration validation and any backend tests that cover auth flows

## Suggested owner

- Baldin Backend Agent

## In-Scope

- Enforce a minimum password length during registration.
- Return a clear validation error.
- Add targeted tests for empty and short passwords.

## Non-Goals

- Complex password-strength policies.
- Password reset or breach-check integrations.
- Rate limiting.

## Required validation

- Registration rejects empty passwords.
- Registration rejects passwords shorter than the chosen minimum.
- Existing auth tests still pass.

## Generated-artifact note

No generated artifacts are expected unless auth response schemas change.

## Dependencies

- None.

## Escalate if

- The current auth library integration requires a broader schema or UX change than simple backend validation.

## Return format

EOF
        render_return_format
      } >"$output_path"
      ;;
    82)
      {
        cat <<'EOF'
## Problem Statement

The current Playwright-based crawlers still need reliability hardening around retries, credentials, and output validation.

## Why It Matters Now

This issue remains aligned with the current ETL implementation, unlike broader architecture pivots such as a Scrapy migration.

## Affected Area

- `backend/etl/linkedin/`
- `backend/etl/glassdoor/`
- related ETL configuration and tests

## Suggested owner

- Baldin Backend Agent

## In-Scope

- Add bounded retry and error-handling behavior for transient navigation failures.
- Validate crawler output before insert.
- Document required credentials.
- Add at least one focused test against a mock fixture or equivalent harness.

## Non-Goals

- New scraping targets.
- Anti-detection infrastructure.
- Replacing Playwright with another crawler stack.

## Required validation

- Structured success and failure logging for crawler runs.
- Invalid data is rejected before persistence.
- The test path proves at least one fixture-backed crawler scenario.

## Generated-artifact note

No generated artifacts are expected unless new ETL-facing API routes or schemas are introduced, which they should not be for this slice.

## Dependencies

- None.

## Escalate if

- Reliability fixes point toward a broader crawler-architecture change rather than hardening within the existing Playwright stack.

## Return format

EOF
        render_return_format
      } >"$output_path"
      ;;
    95)
      {
        cat <<'EOF'
## Problem Statement

The Docusaurus site exists, but key contributor and release-path pages are still incomplete enough to slow onboarding and create workflow drift.

## Why It Matters Now

The repo increasingly depends on docs for contributor guidance, contract regeneration, and release planning. Leaving the site half-finished spreads local knowledge into chat history instead of durable documentation.

## Affected Area

- `docs/docs/`
- docs sidebar and API reference integration path
- contributor guidance for local development and schema regeneration

## Suggested owner

- Baldin Project Manager

## In-Scope

- Fill the deployment-guide gap for the current local-first and future release-path story.
- Add or wire the API reference path from `openapi.json`.
- Finish the contributor guide and schema-regeneration guidance.
- Add missing feature overview pages where the site still has obvious stubs.

## Non-Goals

- Marketing content.
- Hosted docs platform changes.
- Editing `docs/build/**` by hand.

## Required validation

- `cd docs && npm run build` succeeds.
- Internal links resolve.
- The updated sidebar exposes the newly completed sections.

## Generated-artifact note

Edit docs sources under `docs/docs/**`. Do not hand-edit `docs/build/**`; rebuild it only through the documented docs workflow if needed.

## Dependencies

- None.

## Escalate if

- API reference generation requires a new Docusaurus plugin or a broader docs-site dependency decision.

## Return format

EOF
        render_return_format
      } >"$output_path"
      ;;
    97)
      {
        cat <<'EOF'
## Goal

Verify whether a backend bootstrap helper is still needed now that Docker Compose is the supported default path.

## Current blocker

The issue proposes a helper script without proving that the current README and Compose workflow leave a recurring setup gap.

## Affected repo surfaces

- `README.md`
- local backend setup workflow
- a new script only if native, outside-Docker development is still a supported path

## Likely owner

- Baldin Project Manager

## What you already tried

- The current repo already installs Playwright in the backend Dockerfile and uses Docker Compose for local setup.

## Validation context

- Confirm whether contributors still need a native-host bootstrap flow.
- If yes, narrow the exact commands that remain repetitive enough to automate.

## Scope note

- In scope: determine whether the gap is real and, if so, define the smallest script contract.
- Out of scope: personal shell aliases or a broad machine bootstrap tool.

## Generated-artifact note

No generated artifacts are expected.

## Dependencies

- None.

## Escalate if

- The repo wants to support multiple parallel local-dev models rather than one documented default.

## Return format

EOF
        render_return_format
      } >"$output_path"
      ;;
    105)
      {
        cat <<'EOF'
## Goal

Resolve whether the current ETL direction should stay on Playwright hardening or open a separate Scrapy evaluation.

## Current blocker

The repo already has Playwright-based crawler infrastructure, so leaving Scrapy as an open implementation issue creates strategy noise rather than a dispatchable task.

## Affected repo surfaces

- `backend/etl/linkedin/`
- `backend/etl/glassdoor/`
- ETL strategy and reliability roadmap

## Likely owner

- Baldin Project Manager

## What you already tried

- The current crawler stack and issue #82 already describe the hardening path within the existing architecture.

## Validation context

- Decide whether Scrapy solves a proven current problem that Playwright hardening cannot cover.
- If yes, rewrite this as a narrow evaluation or spike instead of a direct feature issue.

## Scope note

- In scope: direction decision, comparison criteria, and whether to close or rewrite.
- Out of scope: a large crawler rewrite without a preceding decision.

## Generated-artifact note

No generated artifacts are expected for the decision itself.

## Dependencies

- Issue #82 as the baseline hardening path for the current crawler stack.

## Escalate if

- The ETL team believes the current Playwright approach is structurally insufficient rather than just under-hardened.

## Return format

EOF
        render_return_format
      } >"$output_path"
      ;;
    115)
      {
        cat <<'EOF'
## Problem Statement

Some seed and extract routes still run synchronously, which keeps users waiting for LLM-heavy work that should move to the background.

## Why It Matters Now

This is a runtime hardening issue. Long-running request handlers increase timeout risk and make the local stack feel less reliable under normal usage.

## Affected Area

- remaining synchronous `/seed` and `/extract` backend routes
- any status or polling surface needed to keep the frontend coherent
- relevant backend tests and frontend follow-through if response semantics change

## Suggested owner

- Baldin Lead Full-Stack Architect

## In-Scope

- Move the remaining synchronous routes onto `BackgroundTasks` or the current approved async pattern.
- Return an immediate accepted response with a status reference if the route contract changes.
- Preserve deterministic test behavior in PYTEST mode.

## Non-Goals

- A full task queue rollout.
- WebSocket progress streaming.
- Retry infrastructure beyond the narrow route change.

## Required validation

- The affected routes return promptly instead of blocking.
- Tests cover the new accepted or polling behavior.
- Any frontend caller still has a clear completion path.

## Generated-artifact note

If route or schema shapes change, run `./scripts/update_frontend_schemas.sh` and review frontend consumers. Do not hand-edit generated contract artifacts.

## Dependencies

- None.

## Escalate if

- The route changes need a broader orchestration or task-status design than BackgroundTasks can support cleanly.

## Return format

EOF
        render_return_format
      } >"$output_path"
      ;;
    117)
      {
        cat <<'EOF'
## Goal

Decide whether generated typed fetch clients are a worthwhile replacement path for the current hand-written frontend service layer.

## Current blocker

This is still an evaluation ticket, not a fully approved migration. The repo needs a narrow prototype and tradeoff summary before broad service rewrites begin.

## Affected repo surfaces

- `frontend/src/service/*.tsx`
- frontend API-client generation workflow
- `scripts/update_frontend_schemas.sh` only if the prototype touches the contract-generation path

## Likely owner

- Baldin Frontend Agent

## What you already tried

- The repo already generates `schema.d.ts`, so the open question is whether a generated fetch layer improves maintenance without hurting bundle or ergonomics.

## Validation context

- Prototype one service.
- Record type-safety, bundle, ergonomics, and migration complexity tradeoffs.
- End with a clear adopt or defer recommendation.

## Scope note

- In scope: one prototype service and a decision memo.
- Out of scope: rewriting all services in one pass.

## Generated-artifact note

Keep generated schema artifacts generated. Do not hand-edit `frontend/src/schema.d.ts`. If the prototype changes the schema workflow itself, update the owning script and document the decision.

## Dependencies

- None.

## Escalate if

- The prototype requires backend contract changes or a broader frontend-service rewrite to be meaningful.

## Return format

EOF
        render_return_format
      } >"$output_path"
      ;;
    126)
      {
        cat <<'EOF'
## Goal

Verify whether the reported `backend/Dockerfile.prod` build failure still reproduces on the current branch.

## Current blocker

The issue body does not include reproducible steps or actual failure output, so implementation work would be guesswork.

## Affected repo surfaces

- `backend/Dockerfile.prod`
- any build-time documentation that proves the current expected command

## Likely owner

- Baldin Project Manager

## What you already tried

- The current repo still contains `backend/Dockerfile.prod`, but the issue itself does not say what failed.

## Validation context

- Run the current production Docker build path locally.
- Capture the exact failure output if it still breaks.
- Close the issue if the build now succeeds.

## Scope note

- In scope: reproduce or close.
- Out of scope: redesigning the production image without proof of a current failure.

## Generated-artifact note

No generated artifacts are expected.

## Dependencies

- None.

## Escalate if

- The current build fails for reasons that imply broader release-topology work rather than a Dockerfile fix.

## Return format

EOF
        render_return_format
      } >"$output_path"
      ;;
    148)
      {
        cat <<'EOF'
## Problem Statement

The company lookup dependency appears to return records without checking ownership, which would let authenticated users read or mutate companies they do not own.

## Why It Matters Now

This is a direct authorization gap. It should be treated as a small, high-priority security hardening slice.

## Affected Area

- `backend/app/api/deps.py`
- company routes that depend on `get_company_by_id`
- targeted backend tests for authorization behavior

## Suggested owner

- Baldin Backend Agent

## In-Scope

- Add the missing ownership guard.
- Correct any wrong dependency type annotation in the affected routes.
- Add focused tests for read, update, delete, and extract authorization behavior.

## Non-Goals

- Broader company API redesign.
- Permission-system expansion beyond ownership enforcement.

## Required validation

- Non-owners receive 403 for protected company routes.
- Owners keep the existing happy path.
- Tests cover the authorization boundary.

## Generated-artifact note

If any company-route schemas change, run `./scripts/update_frontend_schemas.sh`. The preferred fix should be backend-only.

## Dependencies

- None.

## Escalate if

- The company routes share a broader dependency bug that affects multiple entity loaders.

## Return format

EOF
        render_return_format
      } >"$output_path"
      ;;
    149)
      {
        cat <<'EOF'
## Problem Statement

The shared pagination dependency still needs an upper bound on `page_size`, which leaves every paginated list vulnerable to oversized queries.

## Why It Matters Now

This is a small availability hardening fix with broad impact because the same dependency is reused across many routes.

## Affected Area

- `backend/app/api/deps.py`
- any route that depends on the shared pagination helper
- targeted backend validation tests

## Suggested owner

- Baldin Backend Agent

## In-Scope

- Add a maximum page size.
- Preserve current defaults unless the bound needs a documented adjustment.
- Add a focused test for over-limit validation.

## Non-Goals

- Reworking all pagination responses.
- Introducing per-route custom limits in the same slice.

## Required validation

- Requests above the max page size return validation failure.
- Existing paginated consumers still work with defaults.

## Generated-artifact note

If any route parameter schemas change in OpenAPI, regenerate `openapi.json` and `frontend/src/schema.d.ts`.

## Dependencies

- None.

## Escalate if

- Different route families need materially different bounds instead of one shared cap.

## Return format

EOF
        render_return_format
      } >"$output_path"
      ;;
    150)
      {
        cat <<'EOF'
## Problem Statement

The Command Center still needs user-visible error handling for failed async actions instead of logging-only catch blocks.

## Why It Matters Now

This is a primary frontend workflow. Silent failures make the page appear successful even when data is stale or an action never landed.

## Affected Area

- `frontend/src/page/command-center.tsx`
- any shared snackbar or feedback pattern reused from existing pages

## Suggested owner

- Baldin Frontend Agent

## In-Scope

- Replace log-only catch blocks with user-visible feedback.
- Ensure loading state resets on failure.
- Reuse the existing frontend feedback pattern instead of inventing a new one.

## Non-Goals

- Backend error-message redesign.
- A global notification framework rewrite.

## Required validation

- All current catch paths surface a user-facing error.
- Loading indicators clear on failure.
- No silent-mutation failure remains on the page.

## Generated-artifact note

No generated artifacts are expected unless the frontend requires new API behavior, which this ticket should avoid.

## Dependencies

- None.

## Escalate if

- The fix reveals missing backend error semantics that need contract changes.

## Return format

EOF
        render_return_format
      } >"$output_path"
      ;;
    151)
      {
        cat <<'EOF'
## Problem Statement

The avatar upload endpoint exists, but it still needs content-based file validation and safer serve headers to avoid spoofed uploads and content sniffing.

## Why It Matters Now

This is a security follow-on to an already shipped feature. The surface is live in both backend and frontend, so the hardening gap should be closed directly.

## Affected Area

- `backend/app/api/routes/users.py`
- avatar storage and serving helpers if needed
- targeted backend avatar tests

## Suggested owner

- Baldin Backend Agent

## In-Scope

- Validate uploads by file signature after reading bytes.
- Reject mismatched content and declared type.
- Add `X-Content-Type-Options: nosniff` on serve responses.
- Add or extend targeted tests for spoofed uploads.

## Non-Goals

- Frontend avatar redesign.
- Client-side image editing.
- New storage backends.

## Required validation

- Spoofed content-type uploads are rejected.
- Valid image uploads still succeed.
- Served avatar responses include `nosniff`.

## Generated-artifact note

No generated artifacts are expected because the preferred fix should not change the route contract.

## Dependencies

- None.

## Escalate if

- The current file-storage helper constrains safer serving behavior in a way that broadens the change.

## Return format

EOF
        render_return_format
      } >"$output_path"
      ;;
    153)
      {
        cat <<'EOF'
## Problem Statement

The crawler runs endpoint still returns an unbounded result set instead of using the shared pagination pattern already present elsewhere in the API.

## Why It Matters Now

This is a small availability hardening issue. Even though the route is admin-only, it should not materialize the full crawler-runs table in one request.

## Affected Area

- `backend/app/api/routes/crawlers.py`
- shared pagination dependency usage in the crawler runs list path
- targeted backend route tests

## Suggested owner

- Baldin Backend Agent

## In-Scope

- Add shared pagination handling to the crawler runs list endpoint.
- Return a bounded result set using the repo's established list-route pattern.
- Add focused validation around default and explicit page sizes.

## Non-Goals

- Redesigning the crawler admin surface.
- Changing the prune endpoint.

## Required validation

- The endpoint accepts page and page_size.
- Results are bounded by the shared pagination policy.
- Existing admin consumers still work with defaults.

## Generated-artifact note

If the response shape changes to a paginated wrapper, regenerate `openapi.json` and `frontend/src/schema.d.ts` and review any admin consumers.

## Dependencies

- Issue #149 should land first or alongside this change so the shared page_size limit is already in place.

## Escalate if

- Existing admin consumers depend on the current list-only response and need a staged contract migration.

## Return format

EOF
        render_return_format
      } >"$output_path"
      ;;
    *)
      {
        cat <<EOF
## Problem Statement

$rationale

## Why It Matters Now

This issue did not have a repo-specific body template override, so it was generated from the fallback classification path.

## Affected Area

- Review the current issue body and repo evidence before assigning implementation.

## Suggested owner

- $owner

## In-Scope

- Clarify the issue scope.
- Replace this fallback body with a repo-specific rewrite before execution.

## Non-Goals

- Implementing a broad change from an underspecified ticket.

## Required validation

- Confirm the issue is still current.
- Rewrite the ticket body before assignment if more context is needed.

## Generated-artifact note

Regenerate contracts only if route or schema changes are introduced after clarification.

## Dependencies

- None.

## Escalate if

- The issue cannot be narrowed without a product or architecture decision.

## Return format

EOF
        render_return_format
      } >"$output_path"
      ;;
  esac
}

build_summary() {
  local manifest_path="$1"
  local summary_path="$2"
  local generated_at="$3"
  local input_path="$4"

  local total_count
  local close_count
  local keep_count
  local decision_count
  local verification_count
  local drift_count

  total_count="$(jq 'length' "$manifest_path")"
  close_count="$(jq '[.[] | select(.disposition | startswith("close-"))] | length' "$manifest_path")"
  keep_count="$(jq '[.[] | select(.disposition == "keep")] | length' "$manifest_path")"
  decision_count="$(jq '[.[] | select(.disposition == "decision")] | length' "$manifest_path")"
  verification_count="$(jq '[.[] | select(.disposition == "verification")] | length' "$manifest_path")"
  drift_count="$(jq '[.[] | select((.drift_from_backlog_audit // "") != "")] | length' "$manifest_path")"

  {
    cat <<EOF
# Issue Cleanup Summary

Generated: $generated_at
Input: $input_path
Project recommendation: $PROJECT_NAME

## Objective summary

This bundle rewrites the current issue export into an issue-cleanup packet. In bundle-only mode it stays advisory. In --apply mode it also uses gh to push issue, label, milestone, and best-effort Project v2 changes back to GitHub.

## Live backlog snapshot

- Total issues processed: $total_count
- Dispatch-ready issues: $keep_count
- Decision tickets: $decision_count
- Verification tickets: $verification_count
- Close candidates: $close_count
- Repo-audit drift items: $drift_count
- Heuristic classifications used: $HEURISTIC_COUNT

## Pass 1 - Dedupe or rescope

EOF
    if [[ -s "$TMP_DIR/summary-close.md" ]]; then
      cat <<'EOF'
Close candidates were separated first so operator effort is not wasted polishing metadata on issues that should likely be closed.

| Issue | Disposition | Why |
|---|---|---|
EOF
      cat "$TMP_DIR/summary-close.md"
      printf '\n'
    fi

    if [[ -s "$TMP_DIR/summary-decision.md" ]]; then
      cat <<'EOF'
The following issues should stay open only as decision or verification tickets until they are narrowed.

| Issue | Status | Owner | Why |
|---|---|---|---|
EOF
      cat "$TMP_DIR/summary-decision.md"
      printf '\n'
    fi

    cat <<'EOF'
## Pass 2 - Dispatch-ready issue bodies

The script generated body files only for issues that should remain open. Each body file is intended for copy-paste into GitHub after review.

| Issue | Recommended title | Owner | Milestone |
|---|---|---|---|
EOF
    cat "$TMP_DIR/summary-open.md"
    printf '\n'

    cat <<'EOF'
## Pass 3 - Labels and project fields

Each kept issue now carries a recommended primary surface label, a Project v2 field set, and a dispatch-ready flag in the manifest.

EOF
    jq -r '
      [.[]
       | select(.disposition == "keep" or .disposition == "decision" or .disposition == "verification")
       | "- #\(.number): labels=" + ((.recommended_labels // []) | join(", ")) + "; status=\(.recommended_project.status); owner=\(.recommended_project.owner); phase=\(.recommended_project.phase)"
      ] | .[]' "$manifest_path"
    printf '\n'

    cat <<'EOF'
## Pass 4 - Milestones

Milestones are assigned only after scope, ownership, and readiness are stable.

EOF
    jq -r '
      [.[]
       | select(.recommended_milestone != null)
       | "- #\(.number): \(.recommended_milestone)"
      ] | .[]' "$manifest_path"
    printf '\n'

    cat <<'EOF'
## Pass 5 - Relationships

Only minimal sequencing relationships are recommended to avoid relationship noise.

EOF
    if [[ -s "$TMP_DIR/summary-relationships.md" ]]; then
      cat <<'EOF'
| Source | Relationship | Target | Reason |
|---|---|---|---|
EOF
      cat "$TMP_DIR/summary-relationships.md"
    else
      echo "- No formal issue-to-issue relationships were recommended."
    fi
    printf '\n'

    if [[ "$drift_count" != "0" ]]; then
      cat <<'EOF'
## Drift from earlier backlog audit

These issues have newer repo evidence that changes the older audit recommendation.

| Issue | Drift note |
|---|---|
EOF
      cat "$TMP_DIR/summary-drift.md"
      printf '\n'
    fi

    cat <<'EOF'
## Final dispatch table

| Issue | Status | Owner | Body file |
|---|---|---|---|
EOF
    jq -r '
      [.[]
       | select(.disposition == "keep" or .disposition == "decision" or .disposition == "verification")
       | "| #\(.number) | \(.recommended_project.status) | \(.suggested_owner) | \(.body_file // "") |"
      ] | .[]' "$manifest_path"
  } >"$summary_path"
}

build_operator_checklist() {
  local manifest_path="$1"
  local checklist_path="$2"
  local generated_at="$3"

  local existing_labels_file="$TMP_DIR/existing-labels.txt"
  local recommended_labels_file="$TMP_DIR/recommended-labels.txt"
  local missing_labels_file="$TMP_DIR/missing-labels.txt"
  local existing_milestones_file="$TMP_DIR/existing-milestones.txt"
  local recommended_milestones_file="$TMP_DIR/recommended-milestones.txt"
  local missing_milestones_file="$TMP_DIR/missing-milestones.txt"

  jq -r '.[].labels[]?.name' "$INPUT_PATH" | sort -u >"$existing_labels_file"
  jq -r '.[] | .recommended_labels[]?' "$manifest_path" | sort -u >"$recommended_labels_file"
  comm -13 "$existing_labels_file" "$recommended_labels_file" >"$missing_labels_file" || true

  jq -r '.[] | .milestone | if . == null then empty else .title // empty end' "$INPUT_PATH" | sort -u >"$existing_milestones_file"
  jq -r '.[] | .recommended_milestone // empty' "$manifest_path" | sort -u >"$recommended_milestones_file"
  comm -13 "$existing_milestones_file" "$recommended_milestones_file" >"$missing_milestones_file" || true

  {
    cat <<EOF
# Operator Checklist

Generated: $generated_at
Project recommendation: $PROJECT_NAME

This checklist covers any operator work that the script could not or did not perform automatically. When run without --apply, treat this as the full manual checklist. When run with --apply, use it for any project-scope fallback, relationship writes, or permission-blocked follow-up.

## 1. Verify or create labels

EOF
    if [[ -s "$missing_labels_file" ]]; then
      while IFS= read -r label; do
        echo "- Create label: $label"
      done <"$missing_labels_file"
    else
      echo "- No new labels are required beyond those already present in the export."
    fi
    printf '\n'

    cat <<'EOF'
## 2. Verify or create milestones

EOF
    if [[ -s "$missing_milestones_file" ]]; then
      while IFS= read -r milestone_name; do
        echo "- Create milestone: $milestone_name"
      done <"$missing_milestones_file"
    else
      echo "- The recommended milestones already exist in the export, or all open tickets defer milestone creation."
    fi
    printf '\n'

    cat <<EOF
## 3. Verify or create the Project v2 board

- Confirm a single Project v2 board exists for the cleaned backlog: $PROJECT_NAME.
- If it does not exist, create it before applying field values.

## 4. Configure Project v2 fields

- Status: Ready, Needs Decision, Needs Verification, Close Candidate
- Surface: backend, frontend, docs, etl, devops, cross-stack
- Owner: Baldin Backend Agent, Baldin Frontend Agent, Baldin Design Lead Agent, Baldin Lead Full-Stack Architect, Baldin Project Manager
- Workstream: Quality Gate, Runtime Foundations, Runtime Hardening, Security Hardening, Availability Hardening, Frontend UX, Docs and Onboarding, Observability, Architecture Decisions, Developer Experience, Verification
- Dispatch Ready: Yes, No
- Phase: Phase 2 - Integration Gate, Phase 5 - Runtime Blockers, Phase 6 - Minimum Safety Controls, Stretch - Feature Completeness, Decision Gate
- Needs Decision: Yes, No

## 5. Apply per-issue updates

| Issue | Status | Labels | Milestone | Owner | Body file |
|---|---|---|---|---|---|
EOF
    jq -r '
      [.[]
       | select(.disposition == "keep" or .disposition == "decision" or .disposition == "verification")
       | "| #\(.number) | \(.recommended_project.status) | " + ((.recommended_labels // []) | join(", ")) + " | " + (.recommended_milestone // "") + " | \(.suggested_owner) | \(.body_file // "") |"
      ] | .[]' "$manifest_path"
    printf '\n'

    cat <<'EOF'
## 6. Apply closure actions

Close candidates should generally be closed before spending time on metadata cleanup.

| Issue | Recommended action | Why |
|---|---|---|
EOF
    jq -r '
      [.[]
       | select(.disposition | startswith("close-"))
       | "| #\(.number) | Close candidate | " + .rationale + " |"
      ] | .[]' "$manifest_path"
    printf '\n'

    cat <<'EOF'
## 7. Apply relationship suggestions

EOF
    if [[ -s "$TMP_DIR/summary-relationships.md" ]]; then
      echo "| Source | Relationship | Target | Reason |"
      echo "|---|---|---|---|"
      cat "$TMP_DIR/summary-relationships.md"
    else
      echo "- No formal relationships need to be created."
    fi
    printf '\n'

    cat <<'EOF'
## 8. Operator note

- In bundle-only mode, this output is advisory.
- In --apply mode, the script already performs live issue, label, milestone, and best-effort Project v2 writes.
- Review drift notes first; they highlight where current repo evidence already moved beyond the earlier backlog audit.
EOF
  } >"$checklist_path"
}

refresh_project_fields_cache() {
  PROJECT_FIELDS_JSON="$(gh project field-list "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --limit 100 --format json)"
}

project_field_id_by_name() {
  local field_name="$1"
  jq -r --arg field_name "$field_name" '
    [.. | objects | select((.name? // "") == $field_name and (.id? != null)) | .id][0] // empty
  ' <<<"$PROJECT_FIELDS_JSON"
}

project_field_option_id() {
  local field_name="$1"
  local option_name="$2"
  jq -r --arg field_name "$field_name" --arg option_name "$option_name" '
    ([.. | objects | select((.name? // "") == $field_name and (.id? != null))][0].options // [])
    | [ .[]? | select((.name // "") == $option_name) | .id ][0] // empty
  ' <<<"$PROJECT_FIELDS_JSON"
}

ensure_project_fields() {
  local field_name=""
  local field_id=""
  local options=""
  local field_names=("Status" "Surface" "Owner" "Workstream" "Dispatch Ready" "Phase" "Needs Decision")

  refresh_project_fields_cache
  for field_name in "${field_names[@]}"; do
    field_id="$(project_field_id_by_name "$field_name")"
    if [[ -n "$field_id" ]]; then
      continue
    fi

    options="$(project_field_options "$field_name")"
    if [[ -z "$options" ]]; then
      log_warn "Skipping creation of project field '$field_name' because no options were defined"
      continue
    fi

    gh project field-create "$PROJECT_NUMBER" \
      --owner "$PROJECT_OWNER" \
      --name "$field_name" \
      --data-type "SINGLE_SELECT" \
      --single-select-options "$options" \
      >/dev/null
    log_info "Created project field '$field_name' on $PROJECT_NAME"
    refresh_project_fields_cache
  done
}

ensure_project_context() {
  local project_list_output=""
  local project_view_output=""
  local project_create_output=""

  if [[ "$SKIP_PROJECT" == "1" ]]; then
    log_warn "Skipping Project v2 writes because --skip-project was passed"
    PROJECT_WRITES_ENABLED=0
    return
  fi

  if ! project_list_output="$(gh project list --owner "$PROJECT_OWNER" --limit 100 --format json 2>&1)"; then
    PROJECT_SCOPE_ERROR="$project_list_output"
    PROJECT_WRITES_ENABLED=0
    log_warn "Project writes disabled: $PROJECT_SCOPE_ERROR"
    return
  fi

  PROJECT_NUMBER="$(jq -r --arg title "$PROJECT_NAME" '[.. | objects | select((.title? // "") == $title and (.number? != null)) | .number][0] // empty' <<<"$project_list_output")"
  PROJECT_ID="$(jq -r --arg title "$PROJECT_NAME" '[.. | objects | select((.title? // "") == $title and (.number? != null) and (.id? != null)) | .id][0] // empty' <<<"$project_list_output")"

  if [[ -z "$PROJECT_NUMBER" ]]; then
    project_create_output="$(gh project create --owner "$PROJECT_OWNER" --title "$PROJECT_NAME" --format json)"
    PROJECT_NUMBER="$(jq -r '[.. | objects | select((.number? != null)) | .number][0] // empty' <<<"$project_create_output")"
    PROJECT_ID="$(jq -r '[.. | objects | select((.id? != null) and (.number? != null)) | .id][0] // empty' <<<"$project_create_output")"
    log_info "Created Project v2 board '$PROJECT_NAME'"
  fi

  if [[ -z "$PROJECT_ID" && -n "$PROJECT_NUMBER" ]]; then
    project_view_output="$(gh project view "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --format json)"
    PROJECT_ID="$(jq -r '[.. | objects | select((.id? != null) and (.number? != null)) | .id][0] // empty' <<<"$project_view_output")"
  fi

  if [[ -z "$PROJECT_NUMBER" || -z "$PROJECT_ID" ]]; then
    PROJECT_WRITES_ENABLED=0
    log_warn "Project writes disabled: could not resolve project number or project ID for '$PROJECT_NAME'"
    return
  fi

  PROJECT_WRITES_ENABLED=1
  ensure_project_fields
}

ensure_labels_exist() {
  local manifest_path="$1"
  local existing_labels=""
  local label_name=""

  existing_labels="$(gh api "repos/$REPO/labels?per_page=100" --paginate --jq '.[].name')"

  while IFS= read -r label_name; do
    [[ -z "$label_name" ]] && continue
    if list_contains "$existing_labels" "$label_name"; then
      continue
    fi

    gh label create "$label_name" \
      --repo "$REPO" \
      --color "$(label_color "$label_name")" \
      --description "$(label_description "$label_name")" \
      >/dev/null
    log_info "Created missing label '$label_name'"
    existing_labels="${existing_labels}"$'\n'"$label_name"
  done < <(
    jq -r '
      .[]
      | select(.disposition == "keep" or .disposition == "decision" or .disposition == "verification")
      | .recommended_labels[]?
    ' "$manifest_path" | sort -u
  )
}

ensure_milestones_exist() {
  local manifest_path="$1"
  local existing_milestones=""
  local milestone_name=""

  existing_milestones="$(gh api "repos/$REPO/milestones?state=all&per_page=100" --paginate --jq '.[].title')"

  while IFS= read -r milestone_name; do
    [[ -z "$milestone_name" ]] && continue
    if list_contains "$existing_milestones" "$milestone_name"; then
      continue
    fi

    gh api "repos/$REPO/milestones" \
      --method POST \
      --field "title=$milestone_name" \
      --silent >/dev/null
    log_info "Created missing milestone '$milestone_name'"
    existing_milestones="${existing_milestones}"$'\n'"$milestone_name"
  done < <(
    jq -r '
      .[]
      | select(.disposition == "keep" or .disposition == "decision" or .disposition == "verification")
      | .recommended_milestone // empty
    ' "$manifest_path" | sort -u
  )
}

fetch_live_issue_json() {
  local number="$1"
  gh api "repos/$REPO/issues/$number"
}

project_item_id_for_issue() {
  local number="$1"
  local items_json=""

  if [[ "$PROJECT_WRITES_ENABLED" != "1" ]]; then
    echo ""
    return
  fi

  items_json="$(gh project item-list "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --limit 500 --format json)"
  jq -r --argjson issue_number "$number" '
    [.. | objects | select((.id? != null) and (.content? | type == "object") and ((.content.number? // -1) == $issue_number)) | .id][0] // empty
  ' <<<"$items_json"
}

ensure_issue_open_for_update() {
  local number="$1"
  local live_issue_json="$2"
  local state=""

  state="$(jq -r '.state // empty' <<<"$live_issue_json")"
  if [[ "$state" != "closed" ]]; then
    return
  fi

  gh issue reopen "$number" \
    --repo "$REPO" \
    --comment "Reopening to apply the current issue-cleanup rewrite." \
    >/dev/null
  log_info "Reopened issue #$number before applying the cleanup rewrite"
}

apply_project_fields_for_issue() {
  local number="$1"
  local manifest_json="$2"
  local field_name=""
  local field_id=""
  local option_value=""
  local option_id=""
  local item_id=""
  local field_names=("Status" "Surface" "Owner" "Workstream" "Dispatch Ready" "Phase" "Needs Decision")

  if [[ "$PROJECT_WRITES_ENABLED" != "1" ]]; then
    return
  fi

  item_id="$(project_item_id_for_issue "$number")"
  if [[ -z "$item_id" ]]; then
    log_warn "Could not resolve a Project v2 item ID for issue #$number after adding it to '$PROJECT_NAME'"
    return
  fi

  for field_name in "${field_names[@]}"; do
    option_value="$(project_field_value "$manifest_json" "$field_name")"
    if [[ -z "$option_value" ]]; then
      continue
    fi

    field_id="$(project_field_id_by_name "$field_name")"
    option_id="$(project_field_option_id "$field_name" "$option_value")"
    if [[ -z "$field_id" || -z "$option_id" ]]; then
      log_warn "Could not resolve Project v2 field metadata for '$field_name=$option_value' on issue #$number"
      continue
    fi

    gh project item-edit \
      --id "$item_id" \
      --project-id "$PROJECT_ID" \
      --field-id "$field_id" \
      --single-select-option-id "$option_id" \
      >/dev/null
  done
  log_info "Updated Project v2 fields for issue #$number"
}

apply_issue_update() {
  local number="$1"
  local manifest_json="$2"
  local recommended_title=""
  local body_file_rel=""
  local body_file_abs=""
  local recommended_milestone=""
  local live_issue_json=""
  local live_labels=""
  local current_managed_labels=""
  local desired_labels=""
  local label_name=""
  local add_labels=""
  local remove_labels=""
  local live_milestone=""
  local project_item_id=""
  local relationship_count="0"
  local cmd=()

  recommended_title="$(jq -r '.recommended_title' <<<"$manifest_json")"
  body_file_rel="$(jq -r '.body_file // empty' <<<"$manifest_json")"
  body_file_abs="$OUT_DIR/$body_file_rel"
  recommended_milestone="$(jq -r '.recommended_milestone // empty' <<<"$manifest_json")"

  if [[ ! -f "$body_file_abs" ]]; then
    log_warn "Skipping issue #$number because body file '$body_file_abs' does not exist"
    return
  fi

  live_issue_json="$(fetch_live_issue_json "$number")"
  ensure_issue_open_for_update "$number" "$live_issue_json"
  live_issue_json="$(fetch_live_issue_json "$number")"

  live_labels="$(jq -r '.labels[]?.name' <<<"$live_issue_json")"
  desired_labels="$(jq -r '.recommended_labels[]?' <<<"$manifest_json")"
  while IFS= read -r label_name; do
    [[ -z "$label_name" ]] && continue
    if managed_routing_label "$label_name"; then
      current_managed_labels="${current_managed_labels}"$'\n'"$label_name"
    fi
  done <<<"$live_labels"

  while IFS= read -r label_name; do
    [[ -z "$label_name" ]] && continue
    if ! list_contains "$live_labels" "$label_name"; then
      add_labels="$(append_csv_value "$add_labels" "$label_name")"
    fi
  done <<<"$desired_labels"

  while IFS= read -r label_name; do
    [[ -z "$label_name" ]] && continue
    if ! list_contains "$desired_labels" "$label_name"; then
      remove_labels="$(append_csv_value "$remove_labels" "$label_name")"
    fi
  done <<<"$current_managed_labels"

  live_milestone="$(jq -r '.milestone.title // empty' <<<"$live_issue_json")"
  project_item_id=""
  if [[ "$PROJECT_WRITES_ENABLED" == "1" ]]; then
    project_item_id="$(project_item_id_for_issue "$number")"
  fi

  cmd=(gh issue edit "$number" --repo "$REPO" --title "$recommended_title" --body-file "$body_file_abs")
  if [[ -n "$add_labels" ]]; then
    cmd+=(--add-label "$add_labels")
  fi
  if [[ -n "$remove_labels" ]]; then
    cmd+=(--remove-label "$remove_labels")
  fi
  if [[ -n "$recommended_milestone" ]]; then
    cmd+=(--milestone "$recommended_milestone")
  elif [[ -n "$live_milestone" ]]; then
    cmd+=(--remove-milestone)
  fi

  "${cmd[@]}" >/dev/null
  log_info "Updated issue #$number title, body, labels, and milestone"

  if [[ "$PROJECT_WRITES_ENABLED" == "1" ]]; then
    if [[ -z "$project_item_id" ]]; then
      gh project item-add "$PROJECT_NUMBER" \
        --owner "$PROJECT_OWNER" \
        --url "https://github.com/$REPO/issues/$number" \
        >/dev/null
      log_info "Added issue #$number to Project v2 '$PROJECT_NAME'"
    fi
    apply_project_fields_for_issue "$number" "$manifest_json"
  fi

  relationship_count="$(jq '[.relationship_suggestions[]?] | length' <<<"$manifest_json")"
  if [[ "$relationship_count" != "0" ]]; then
    log_warn "Relationship suggestions for issue #$number were not applied automatically; see operator-checklist.md"
  fi
}

apply_close_candidate() {
  local number="$1"
  local manifest_json="$2"
  local close_reason=""
  local close_comment=""
  local live_issue_json=""
  local state=""

  live_issue_json="$(fetch_live_issue_json "$number")"
  state="$(jq -r '.state // empty' <<<"$live_issue_json")"
  if [[ "$state" == "closed" ]]; then
    log_info "Issue #$number is already closed; skipping close step"
    return
  fi

  close_reason="$(close_reason_for_disposition "$(jq -r '.disposition' <<<"$manifest_json")")"
  close_comment="$(jq -r '.closure_note // .rationale' <<<"$manifest_json")"

  gh issue close "$number" \
    --repo "$REPO" \
    --reason "$close_reason" \
    --comment "$close_comment" \
    >/dev/null
  log_info "Closed issue #$number with reason '$close_reason'"
}

apply_manifest() {
  local manifest_path="$1"
  local manifest_json=""
  local number=""
  local disposition=""

  require_cmd gh
  if ! gh auth status >/dev/null 2>&1; then
    echo "gh auth status failed. Authenticate gh before running in --apply mode." >&2
    exit 1
  fi

  log_info "Applying issue cleanup manifest to $REPO"
  ensure_labels_exist "$manifest_path"
  ensure_milestones_exist "$manifest_path"
  ensure_project_context

  while IFS= read -r manifest_json; do
    number="$(jq -r '.number' <<<"$manifest_json")"
    disposition="$(jq -r '.disposition' <<<"$manifest_json")"

    case "$disposition" in
      close-*)
        apply_close_candidate "$number" "$manifest_json"
        ;;
      keep|decision|verification)
        apply_issue_update "$number" "$manifest_json"
        ;;
      *)
        log_warn "Skipping issue #$number because disposition '$disposition' is not supported"
        ;;
    esac
  done < <(jq -c '.[]' "$manifest_path")

  if [[ "$PROJECT_WRITES_ENABLED" != "1" ]]; then
    log_warn "Project v2 writes were not completed automatically. Review operator-checklist.md for the remaining manual steps."
  fi
  log_info "Finished apply pass"
}

main() {
  parse_args "$@"

  if [[ -z "$PROJECT_OWNER" ]]; then
    PROJECT_OWNER="${REPO%%/*}"
  fi

  require_cmd jq

  if [[ ! -f "$INPUT_PATH" ]]; then
    echo "Input file not found: $INPUT_PATH" >&2
    exit 1
  fi

  if [[ -e "$OUT_DIR" ]]; then
    if [[ "$FORCE" == "1" ]]; then
      rm -rf "$OUT_DIR"
    else
      echo "Output directory already exists: $OUT_DIR" >&2
      echo "Re-run with --force to replace it." >&2
      exit 1
    fi
  fi

  TMP_DIR="$(mktemp -d)"
  trap 'rm -rf "$TMP_DIR"' EXIT

  mkdir -p "$OUT_DIR/issue-bodies"
  if [[ "$APPLY_MODE" == "1" ]]; then
    APPLY_LOG_FILE="$OUT_DIR/apply-results.md"
    {
      echo "# Apply Results"
      echo ""
      echo "Repository: $REPO"
      echo "Project owner: $PROJECT_OWNER"
      echo "Generated: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
      echo ""
    } >"$APPLY_LOG_FILE"
  fi
  : >"$TMP_DIR/manifest.ndjson"
  : >"$TMP_DIR/summary-close.md"
  : >"$TMP_DIR/summary-decision.md"
  : >"$TMP_DIR/summary-open.md"
  : >"$TMP_DIR/summary-relationships.md"
  : >"$TMP_DIR/summary-drift.md"

  while IFS= read -r issue_json; do
    number="$(jq -r '.number' <<<"$issue_json")"
    if ! is_selected_issue "$number"; then
      continue
    fi

    current_title="$(jq -r '.title' <<<"$issue_json")"
    current_body="$(jq -r '.body // ""' <<<"$issue_json")"
    current_milestone="$(jq -r '.milestone | if . == null then empty else .title // empty end' <<<"$issue_json")"

    classify_issue "$number" "$current_title" "$current_body"

    recommended_labels_json="$(labels_json_for_issue)"
    current_labels_json="$(jq -c '[.labels[]?.name]' <<<"$issue_json")"
    current_assignees_json="$(jq -c '[.assignees[]?.login]' <<<"$issue_json")"
    dependencies_json="$(dependencies_json_for_issue "$number")"
    relationships_json="$(relationships_json_for_issue "$number")"
    body_file=""
    body_template="none"
    closure_note=""

    if [[ "$disposition" == "keep" || "$disposition" == "decision" || "$disposition" == "verification" ]]; then
      body_file="issue-bodies/${number}.md"
      body_template="implementation-ready"
      if [[ "$disposition" != "keep" ]]; then
        body_template="help-request"
      fi
      write_body_file "$number" "$OUT_DIR/$body_file"
      printf '| #%s | %s | %s | %s |\n' \
        "$number" \
        "$(escape_md "$recommended_title")" \
        "$(escape_md "$owner")" \
        "$(escape_md "$milestone")" >>"$TMP_DIR/summary-open.md"
    else
      closure_note="$(closure_note_for_issue "$number")"
      printf '| #%s | %s | %s |\n' \
        "$number" \
        "$(escape_md "$disposition")" \
        "$(escape_md "$rationale")" >>"$TMP_DIR/summary-close.md"
    fi

    if [[ "$disposition" == "decision" || "$disposition" == "verification" ]]; then
      printf '| #%s | %s | %s | %s |\n' \
        "$number" \
        "$(escape_md "$project_status")" \
        "$(escape_md "$owner")" \
        "$(escape_md "$rationale")" >>"$TMP_DIR/summary-decision.md"
    fi

    if [[ -n "$drift_note" ]]; then
      printf '| #%s | %s |\n' "$number" "$(escape_md "$drift_note")" >>"$TMP_DIR/summary-drift.md"
    fi

    jq -c '.[]' <<<"$relationships_json" | while IFS= read -r rel; do
      if [[ -n "$rel" ]]; then
        printf '| #%s | %s | #%s | %s |\n' \
          "$number" \
          "$(escape_md "$(jq -r '.type' <<<"$rel")")" \
          "$(jq -r '.target' <<<"$rel")" \
          "$(escape_md "$(jq -r '.reason' <<<"$rel")")" >>"$TMP_DIR/summary-relationships.md"
      fi
    done

    jq -n \
      --argjson current_labels "$current_labels_json" \
      --argjson current_assignees "$current_assignees_json" \
      --argjson recommended_labels "$recommended_labels_json" \
      --argjson dependencies "$dependencies_json" \
      --argjson relationships "$relationships_json" \
      --arg number "$number" \
      --arg current_title "$current_title" \
      --arg recommended_title "$recommended_title" \
      --arg disposition "$disposition" \
      --arg rationale "$rationale" \
      --arg drift_note "$drift_note" \
      --arg suggested_owner "$owner" \
      --arg recommended_milestone "$milestone" \
      --arg body_file "$body_file" \
      --arg body_template "$body_template" \
      --arg closure_note "$closure_note" \
      --arg project_name "$PROJECT_NAME" \
      --arg surface "$surface" \
      --arg workstream "$workstream" \
      --arg project_status "$project_status" \
      --arg dispatch_ready "$dispatch_ready" \
      --arg needs_decision "$needs_decision" \
      --arg current_milestone "$current_milestone" \
      --argjson heuristic_used "$heuristic_used" \
      '{
        number: ($number | tonumber),
        current_title: $current_title,
        recommended_title: $recommended_title,
        disposition: $disposition,
        rationale: $rationale,
        drift_from_backlog_audit: (if $drift_note == "" then null else $drift_note end),
        suggested_owner: $suggested_owner,
        recommended_labels: $recommended_labels,
        recommended_milestone: (if $recommended_milestone == "" then null else $recommended_milestone end),
        recommended_project: {
          project_name: $project_name,
          status: $project_status,
          surface: $surface,
          owner: $suggested_owner,
          workstream: $workstream,
          dispatch_ready: $dispatch_ready,
          phase: (if $recommended_milestone == "" then null else $recommended_milestone end),
          needs_decision: $needs_decision
        },
        dependencies: $dependencies,
        relationship_suggestions: $relationships,
        body_template: (if $body_template == "none" then null else $body_template end),
        body_file: (if $body_file == "" then null else $body_file end),
        closure_note: (if $closure_note == "" then null else $closure_note end),
        heuristic_used: $heuristic_used,
        current: {
          labels: $current_labels,
          assignees: $current_assignees,
          milestone: (if $current_milestone == "" then null else $current_milestone end)
        }
      }' >>"$TMP_DIR/manifest.ndjson"
  done < <(jq -c '.[]' "$INPUT_PATH")

  if [[ "$STRICT" == "1" && "$HEURISTIC_COUNT" != "0" ]]; then
    echo "Strict mode enabled and $HEURISTIC_COUNT issue(s) required heuristic classification." >&2
    exit 1
  fi

  jq -s 'sort_by(.number)' "$TMP_DIR/manifest.ndjson" >"$OUT_DIR/issue-cleanup-manifest.json"

  generated_at="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  build_summary "$OUT_DIR/issue-cleanup-manifest.json" "$OUT_DIR/issue-cleanup-summary.md" "$generated_at" "$INPUT_PATH"
  build_operator_checklist "$OUT_DIR/issue-cleanup-manifest.json" "$OUT_DIR/operator-checklist.md" "$generated_at"

  if [[ "$APPLY_MODE" == "1" ]]; then
    apply_manifest "$OUT_DIR/issue-cleanup-manifest.json"
  fi

  echo "Generated issue cleanup bundle at: $OUT_DIR"
  echo "- $OUT_DIR/issue-cleanup-summary.md"
  echo "- $OUT_DIR/issue-cleanup-manifest.json"
  echo "- $OUT_DIR/operator-checklist.md"
  echo "- $OUT_DIR/issue-bodies/"
  if [[ "$APPLY_MODE" == "1" ]]; then
    echo "- $OUT_DIR/apply-results.md"
  fi
}

main "$@"
