#!/usr/bin/env bash
# scripts/seed_demo.sh — populate a running Baldin instance with demo data.
#
# Prerequisites:
#   docker-compose up          (db + web services running)
#
# Usage:
#   bash scripts/seed_demo.sh                # uses defaults
#   API_URL=http://localhost:8004 bash scripts/seed_demo.sh
#
# The script registers a demo user, authenticates, and fires each seed
# endpoint in order.  All seed operations run asynchronously (202 Accepted).
# The script polls each operation until it completes or times out.

set -euo pipefail

API="${API_URL:-http://localhost:8004}"
EMAIL="${DEMO_EMAIL:-demo@baldin.io}"
PASSWORD="${DEMO_PASSWORD:-DemoPass1!}"
FIRST="${DEMO_FIRST:-Jane}"
LAST="${DEMO_LAST:-Doe}"
POLL_INTERVAL=2
POLL_TIMEOUT=60

# ── Helpers ───────────────────────────────────────────────────────────

info()  { printf '\033[1;34m▸ %s\033[0m\n' "$*"; }
ok()    { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
fail()  { printf '\033[1;31m✗ %s\033[0m\n' "$*"; exit 1; }

require_cmd() { command -v "$1" >/dev/null 2>&1 || fail "Required command '$1' not found"; }
require_cmd curl
require_cmd jq

# ── Wait for API readiness ────────────────────────────────────────────

info "Waiting for API at $API ..."
for i in $(seq 1 30); do
  if curl -sf "$API/docs" >/dev/null 2>&1; then break; fi
  if [ "$i" -eq 30 ]; then fail "API not reachable after 30 s"; fi
  sleep 1
done
ok "API is ready"

# ── Register demo user ────────────────────────────────────────────────

info "Registering demo user ($EMAIL) ..."
REG=$(curl -sf -w '\n%{http_code}' -X POST "$API/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"first_name\":\"$FIRST\",\"last_name\":\"$LAST\",\"is_superuser\":true}")
REG_CODE=$(echo "$REG" | tail -1)
if [ "$REG_CODE" = "201" ]; then
  ok "User registered"
elif [ "$REG_CODE" = "400" ]; then
  info "User already exists — continuing"
else
  fail "Registration failed (HTTP $REG_CODE)"
fi

# ── Authenticate ──────────────────────────────────────────────────────

info "Logging in ..."
LOGIN=$(curl -sf -X POST "$API/auth/jwt/login" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d "username=$EMAIL&password=$PASSWORD")
TOKEN=$(echo "$LOGIN" | jq -r '.access_token')
[ -n "$TOKEN" ] && [ "$TOKEN" != "null" ] || fail "Login failed — no token returned"
AUTH="Authorization: Bearer $TOKEN"
ok "Authenticated"

# ── Seed helper ───────────────────────────────────────────────────────

seed() {
  local name="$1" path="$2"
  info "Seeding $name ..."
  RESP=$(curl -sf -X POST "$API$path" -H "$AUTH")
  POLL_URL=$(echo "$RESP" | jq -r '.poll_url // empty')
  if [ -z "$POLL_URL" ]; then
    ok "$name — accepted (no poll URL)"
    return
  fi

  # Poll until terminal state or timeout
  local elapsed=0
  while [ $elapsed -lt $POLL_TIMEOUT ]; do
    STATUS=$(curl -sf "$API$POLL_URL" -H "$AUTH" | jq -r '.status // "unknown"')
    case "$STATUS" in
      SUCCESS|success) ok "$name — done"; return ;;
      FAILED|failed)   fail "$name — seed operation failed" ;;
    esac
    sleep $POLL_INTERVAL
    elapsed=$((elapsed + POLL_INTERVAL))
  done
  info "$name — still running after ${POLL_TIMEOUT}s (continuing)"
}

# ── Execute seeds in dependency order ─────────────────────────────────

seed "Skills"        "/skills/seed"
seed "Education"     "/education/seed"
seed "Experiences"   "/experiences/seed"
seed "Certificates"  "/certificate/seed"
seed "Contacts"      "/contacts/seed"
seed "Leads"         "/leads/seed"

echo ""
ok "Demo data seeded. Open http://localhost:5173 and log in as $EMAIL / $PASSWORD"
echo ""
echo "  Dashboard:     http://localhost:5173/"
echo "  Leads:         http://localhost:5173/leads"
echo "  Applications:  http://localhost:5173/applications"
echo "  Documents:     http://localhost:5173/documents"
echo "  Profile:       http://localhost:5173/me"
echo ""
