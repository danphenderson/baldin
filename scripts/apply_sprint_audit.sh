#!/usr/bin/env bash
# =======================================================================
# apply_sprint_audit.sh — Update the 5 validated feat-sprint audit issues
# with detailed, evidence-backed bodies.
#
# Usage:
#   bash scripts/apply_sprint_audit.sh          # dry-run (prints only)
#   APPLY=1 bash scripts/apply_sprint_audit.sh  # live — pushes to GitHub
#
# Prerequisites:
#   - gh CLI authenticated (`gh auth status`)
#   - jq on PATH
#
# Context:
#   A code-first audit of the feat-sprint branch produced 20 candidates.
#   Six issues (#148–#153) were filed.  Second-pass review invalidated
#   #152 (application CRUD test coverage already exists in
#   test_applications_routes.py).  #152 was closed.
#
#   This script updates the remaining 5 issues with detailed bodies
#   containing code evidence, severity scoring, and acceptance criteria.
# =======================================================================
set -euo pipefail

REPO="danphenderson/baldin"

# -------------------------------------------------------------------
# helpers
# -------------------------------------------------------------------

update_issue() {
  local number="$1"
  local title="$2"
  local body="$3"

  if [[ "${APPLY:-0}" == "1" ]]; then
    echo "  ✏️  Updating #${number}..."
    gh api "repos/${REPO}/issues/${number}" \
      --method PATCH \
      --field title="$title" \
      --field body="$body" \
      --silent
    echo "  ✅ #${number} updated."
  else
    echo ""
    echo "========================================"
    echo "DRY-RUN — Issue #${number}"
    echo "========================================"
    echo "Title: ${title}"
    echo ""
    echo "$body"
    echo ""
  fi
}

echo ""
echo "apply_sprint_audit.sh"
echo "====================="
echo "Mode: ${APPLY:+LIVE}${APPLY:-DRY-RUN}"
echo "Repo: ${REPO}"
echo ""

# ===================================================================
# #148  Companies API — no ownership checks
# ===================================================================

update_issue 148 \
  "Companies API has no ownership checks — any user can mutate or delete any company" \
  "## Problem

The \`get_company_by_id\` dependency resolves a company by primary key but
**never compares the requesting user's ID** against the company's
\`user_id\` foreign key.  Every route that depends on it (\`PUT /{id}\`,
\`DELETE /{id}\`, \`GET /{id}\`, extraction) therefore allows any
authenticated user to read, update, or delete any other user's company
row.

Compare with the ownership-checked pattern used elsewhere in the same
file for other entities.

## Code Evidence

### \`backend/app/api/deps.py\` — \`get_company_by_id\` (line 411)

\`\`\`python
async def get_company_by_id(
    id: UUID4, db: AsyncSession = Depends(get_async_session)
) -> models.Company:
    company = await db.get(models.Company, id)
    if not company:
        raise await _404(company, id)
    await log.info(f\"get_company_by_id: {company}\")
    return company
\`\`\`

**Missing:** No \`user: schemas.UserRead = Depends(get_current_user)\`
parameter; no \`if company.user_id != user.id: raise _403(...)\` guard.

### Contrast: \`get_education\` (line 660)

\`\`\`python
async def get_education(
    id: UUID4,
    db: AsyncSession = Depends(get_async_session),
    user: schemas.UserRead = Depends(get_current_user),
) -> models.Education:
    education = await db.get(models.Education, id)
    if not education:
        raise await _404(education, id)
    if education.user_id != user.id:
        raise await _403(user.id, education, id)
    return education
\`\`\`

### Contrast: \`get_application\` (line 654)

Checks \`application.user_id != user.id\` and raises 403.

### Affected routes in \`backend/app/api/routes/companies.py\`

| Route | Line | Consequence |
|-------|------|-------------|
| \`PUT /{id}\` | 56 | Any user can overwrite any company's fields |
| \`DELETE /{id}\` | 71 | Any user can delete any company |
| \`GET /{id}\` | 46 | Any user can read another user's company |
| \`POST /{id}/extract\` | ~95 | Any user can trigger extraction on another user's company |

Additionally, \`delete_company\` has a **wrong type annotation**:
\`\`\`python
company: schemas.CompanyRead = Depends(get_company_by_id)
#        ^^^^^^^^^^^^^^^^^^  should be models.Company
\`\`\`

## Severity

| Dimension | Score |
|-----------|-------|
| Security impact | **Critical** — full IDOR on company CRUD |
| Blast radius | All company routes (4 endpoints) |
| Fix complexity | Low — add \`user\` dep + ownership check (same pattern as 10+ other deps) |

## Suggested Fix

Add \`user: schemas.UserRead = Depends(get_current_user)\` to
\`get_company_by_id\`, then add the standard ownership check:

\`\`\`python
if company.user_id != user.id:
    raise await _403(user.id, company, id)
\`\`\`

Fix the type annotation on \`delete_company\` to \`models.Company\`.

## Acceptance Criteria

- [ ] \`GET /companies/{id}\` returns 403 when the company belongs to another user
- [ ] \`PUT /companies/{id}\` returns 403 when the company belongs to another user
- [ ] \`DELETE /companies/{id}\` returns 403 when the company belongs to another user
- [ ] \`POST /companies/{id}/extract\` returns 403 for non-owner
- [ ] \`delete_company\` type annotation uses \`models.Company\`
- [ ] At least one test validates the ownership guard

## References

- \`backend/app/api/deps.py:411-418\` — \`get_company_by_id\`
- \`backend/app/api/routes/companies.py:56-80\` — affected routes
- \`backend/app/api/deps.py:654-666\` — correct ownership pattern in \`get_application\`"

# ===================================================================
# #149  pagination upper bound
# ===================================================================

update_issue 149 \
  "Global pagination dependency \`get_pagination_params\` has no upper bound on page_size" \
  "## Problem

\`get_pagination_params\` enforces \`ge=1\` on both \`page\` and
\`page_size\`, but sets **no upper bound** (\`le=...\`).  A caller can
request \`page_size=999999\` and the \`.limit()\` clause will ask
PostgreSQL to materialise the entire table before returning.

This dependency is reused by **every paginated list endpoint** in the
API.  A single oversized request can spike memory and slow down the
single-worker dev server for all concurrent users.

## Code Evidence

### \`backend/app/api/deps.py\` — \`get_pagination_params\` (line 94)

\`\`\`python
async def get_pagination_params(
    page: int = Query(1, ge=1, description=\"Page number starting from 1\"),
    page_size: int = Query(10, ge=1, description=\"Number of records per page\"),
    request_count: bool = Query(False, description=\"Return total count of records\"),
) -> schemas.Pagination:
    return schemas.Pagination(
        page=page, page_size=page_size, request_count=request_count
    )
\`\`\`

**Missing:** \`le=100\` (or similar) on \`page_size\`.

### Downstream consumers

Every \`List\` route that calls \`Depends(get_pagination_params)\` is
affected.  Grep shows at least 15 call-sites across:

- applications, companies, leads, resumes, cover-letters,
  skills, experiences, education, certificates, contacts,
  action-items, connections, messages, documents, notifications

### Verification

\`\`\`bash
grep -rn 'Depends(get_pagination_params)' backend/app/api/routes/ | wc -l
# → 15+
\`\`\`

## Severity

| Dimension | Score |
|-----------|-------|
| Availability impact | **High** — single request can exhaust worker memory |
| Blast radius | All paginated list endpoints (~15 routes) |
| Fix complexity | **Trivial** — add \`le=100\` (or \`le=200\`) to the Query declaration |

## Suggested Fix

\`\`\`python
page_size: int = Query(10, ge=1, le=100, description=\"Number of records per page\"),
\`\`\`

The change is one line and automatically propagated to every consumer.

## Acceptance Criteria

- [ ] \`page_size\` validates \`le=100\` (or a documented maximum)
- [ ] Requests with \`page_size > max\` return 422 with a clear message
- [ ] No existing frontend page breaks (current default is 10; max pages request ≤50)
- [ ] One test validates the upper-bound rejection

## References

- \`backend/app/api/deps.py:94-101\` — \`get_pagination_params\`
- \`backend/app/schemas.py\` — \`Pagination\` schema"

# ===================================================================
# #150  Command Center silent errors
# ===================================================================

update_issue 150 \
  "Command Center silently swallows all API errors — no user-visible error feedback" \
  "## Problem

The Command Center page has **9 separate \`catch\` blocks** that all
follow the same pattern: \`console.error(e)\` with no user-facing
feedback.  When an API call fails (network issue, 401 expiry, 500
backend error), the UI appears to succeed silently — stale data remains
on screen and the user has no indication that their action failed.

This is the primary landing page and contains the most interactive
features (dismiss, snooze, complete, refresh, load-more).

## Code Evidence

### \`frontend/src/page/command-center.tsx\`

Every async action handler catches errors identically:

\`\`\`typescript
// Pattern repeated 9 times across:
//   refresh(), lightRefresh(), handleComplete(),
//   handleDismiss(), handleSnooze(), handleUnsnooze(),
//   handleAction(), loadMoreFeed(), inline fetch calls
} catch (e) {
  console.error(e);
}
\`\`\`

**Missing in all 9 blocks:**
- No \`setError()\` or error state
- No toast / snackbar notification
- No retry prompt
- No loading-state cleanup on failure (some leave spinner active)

### Verification

\`\`\`bash
grep -c 'console.error' frontend/src/page/command-center.tsx
# → 9
\`\`\`

### Contrast: other pages

\`applications-board-page.tsx\` uses a snackbar pattern for mutation
errors.  The command center does not follow this established pattern.

## Severity

| Dimension | Score |
|-----------|-------|
| UX impact | **High** — user actions fail silently on primary page |
| Data integrity risk | Medium — stale data displayed after failed mutations |
| Fix complexity | **Low** — add shared error state + MUI Snackbar (pattern exists in repo) |

## Suggested Fix

1. Add \`const [error, setError] = useState<string | null>(null)\`
2. In each catch block: \`setError('Failed to <action>. Please try again.')\`
3. Render an MUI \`<Snackbar>\` with auto-dismiss that clears on close
4. Ensure loading states are reset in \`finally\` blocks

The applications board page already uses this pattern and can serve as a
reference.

## Acceptance Criteria

- [ ] All 9 catch blocks surface a user-visible error message
- [ ] Failed mutations do not leave stale data displayed
- [ ] Loading spinners are cleared on error (not just success)
- [ ] Error feedback uses the existing MUI Snackbar pattern
- [ ] No \`console.error\`-only catch blocks remain on the page

## References

- \`frontend/src/page/command-center.tsx\` — all 9 catch blocks
- \`frontend/src/page/applications/applications-board-page.tsx\` — reference Snackbar pattern"

# ===================================================================
# #151  Avatar upload — no magic-byte validation
# ===================================================================

update_issue 151 \
  "Avatar upload lacks magic-byte validation — spoofed content-type allows arbitrary file storage" \
  "## Problem

The avatar upload endpoint (\`POST /users/me/avatar\`) validates the
file's \`Content-Type\` **header** but does not inspect the file's
actual bytes (magic bytes / file signature).  An attacker can upload
any file (HTML, SVG with embedded JS, polyglot PDF/JS) by setting
\`Content-Type: image/jpeg\` in the multipart header.

The stored file is then served back by \`GET /users/{id}/avatar\` with
a content type inferred from the file extension (which is derived from
the original content-type header).  This creates a stored-XSS /
content-sniffing attack surface.

## Code Evidence

### \`backend/app/api/routes/users.py\` — \`upload_avatar\` (line 177)

\`\`\`python
@router.post(\"/me/avatar\", response_model=schemas.UserRead)
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_async_session),
    current_user: models.User = Depends(get_current_user),
):
    content_type = file.content_type or \"\"
    if content_type not in ALLOWED_AVATAR_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                f\"Unsupported image type '{content_type}'. \"
                f\"Allowed: {', '.join(sorted(ALLOWED_AVATAR_CONTENT_TYPES))}\"
            ),
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_AVATAR_UPLOAD_BYTES:
        raise HTTPException(...)

    # === No magic-byte check on file_bytes here ===

    relative_path = build_avatar_path(current_user.id, content_type)
    save_avatar_file(relative_path, file_bytes)
\`\`\`

**Missing:** Check that \`file_bytes[:N]\` matches expected image
signatures before writing to disk.

### Contrast: Document upload already validates magic bytes

\`backend/app/api/routes/documents.py\` (line ~349) validates
\`%PDF-\` magic bytes for PDF uploads, demonstrating the repo already
has this pattern.

### Known image signatures

| Format | Magic bytes |
|--------|-------------|
| JPEG | \`\\xff\\xd8\\xff\` |
| PNG | \`\\x89PNG\\r\\n\\x1a\\n\` |
| GIF | \`GIF87a\` or \`GIF89a\` |
| WebP | \`RIFF....WEBP\` |

## Severity

| Dimension | Score |
|-----------|-------|
| Security impact | **High** — stored XSS / content-sniffing via spoofed upload |
| Blast radius | Avatar serve endpoint (\`GET /users/{id}/avatar\`) |
| Fix complexity | **Low** — add ~15 lines of signature checking after \`file.read()\` |

## Suggested Fix

After \`file_bytes = await file.read()\`, add:

\`\`\`python
_IMAGE_SIGNATURES = {
    \"image/jpeg\": [b\"\\xff\\xd8\\xff\"],
    \"image/png\":  [b\"\\x89PNG\\r\\n\\x1a\\n\"],
    \"image/gif\":  [b\"GIF87a\", b\"GIF89a\"],
    \"image/webp\": [b\"RIFF\"],
}

sigs = _IMAGE_SIGNATURES.get(content_type, [])
if not any(file_bytes.startswith(sig) for sig in sigs):
    raise HTTPException(
        status_code=400,
        detail=\"File content does not match the declared image type.\",
    )
\`\`\`

Also add \`X-Content-Type-Options: nosniff\` on the serve response.

## Acceptance Criteria

- [ ] Upload rejects a non-image file sent with \`Content-Type: image/jpeg\`
- [ ] Upload accepts a valid JPEG/PNG/GIF/WebP with correct content-type
- [ ] \`GET /users/{id}/avatar\` response includes \`X-Content-Type-Options: nosniff\`
- [ ] At least one test validates rejection of a spoofed file
- [ ] Existing avatar upload flow still works for real images

## References

- \`backend/app/api/routes/users.py:177-209\` — \`upload_avatar\`
- \`backend/app/api/routes/documents.py:~349\` — PDF magic-byte check pattern
- \`backend/app/core/document_storage.py\` — \`save_avatar_file\`, \`build_avatar_path\`"

# ===================================================================
# #153  Crawler runs — no pagination
# ===================================================================

update_issue 153 \
  "Crawler runs endpoint returns unbounded result set — no pagination" \
  "## Problem

\`GET /crawlers/runs\` returns \`result.scalars().all()\` with **no
\`.limit()\` or \`.offset()\` clause**.  Unlike every other list
endpoint in the API, this route does not use
\`get_pagination_params\`.  Over time, crawler runs accumulate
unboundedly and the response payload will grow without limit.

The route is superuser-gated, which reduces the risk to admin users
only, but still allows a single admin request to materialise the
entire \`crawler_runs\` table.

## Code Evidence

### \`backend/app/api/routes/crawlers.py\` — \`list_crawler_runs\` (line 86)

\`\`\`python
@router.get(\"/runs\", response_model=list[schemas.CrawlerRunRead])
async def list_crawler_runs(
    db: AsyncSession = Depends(get_async_session),
    source: str | None = Query(None, description=\"Filter by pipeline source\"),
    status: str | None = Query(None, description=\"Filter by run status\"),
    pipeline_id: UUID4 | None = Query(None, description=\"Filter by pipeline ID\"),
    trigger_type: str | None = Query(None, description=\"Filter by trigger type\"),
):
    query = select(models.CrawlerRun)
    # ... filter clauses ...
    query = query.order_by(models.CrawlerRun.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()  # <-- no .limit()
\`\`\`

**Missing:**
- No \`Depends(get_pagination_params)\` — unlike all other list routes
- No \`.limit()\` or \`.offset()\` on the query
- Response model is \`list[...]\` not a paginated wrapper

### Contrast: other list endpoints

\`\`\`python
# applications list — uses pagination
@router.get(\"/\", response_model=schemas.PaginatedResponse[schemas.ApplicationRead])
async def list_applications(
    pagination: schemas.Pagination = Depends(get_pagination_params),
    ...
):
    query = query.offset(...).limit(pagination.page_size)
\`\`\`

### Mitigation note

The crawlers router is gated by \`dependencies=[Depends(get_current_superuser)]\`
at the router level, so only admin users can hit this endpoint.  The
risk is lower than a user-facing endpoint but the unbounded query
pattern is still an availability concern.

## Severity

| Dimension | Score |
|-----------|-------|
| Availability impact | **Medium** — unbounded DB query (admin-only) |
| Consistency | **Medium** — only list endpoint without pagination |
| Fix complexity | **Low** — add \`Depends(get_pagination_params)\` + offset/limit |

## Suggested Fix

\`\`\`python
@router.get(\"/runs\", response_model=schemas.PaginatedResponse[schemas.CrawlerRunRead])
async def list_crawler_runs(
    pagination: schemas.Pagination = Depends(get_pagination_params),
    db: AsyncSession = Depends(get_async_session),
    source: str | None = Query(None),
    status: str | None = Query(None),
    pipeline_id: UUID4 | None = Query(None),
    trigger_type: str | None = Query(None),
):
    query = select(models.CrawlerRun)
    # ... existing filters ...
    query = query.order_by(models.CrawlerRun.created_at.desc())
    query = query.offset((pagination.page - 1) * pagination.page_size)
    query = query.limit(pagination.page_size)
    result = await db.execute(query)
    return result.scalars().all()
\`\`\`

## Acceptance Criteria

- [ ] \`GET /crawlers/runs\` accepts \`page\` and \`page_size\` query params
- [ ] Response is bounded by \`page_size\` (default 10, max per #149)
- [ ] Existing frontend admin consumers pass \`page_size\` or use defaults
- [ ] \`prune_crawler_runs\` endpoint is unchanged

## References

- \`backend/app/api/routes/crawlers.py:86-109\` — \`list_crawler_runs\`
- \`backend/app/api/deps.py:94-101\` — \`get_pagination_params\`
- \`backend/app/api/routes/applications.py:138\` — reference paginated list pattern"

# ===================================================================
# Summary
# ===================================================================

echo ""
echo "============================================"
echo "Sprint audit update complete."
echo "============================================"
echo ""
echo "Issues updated:"
echo "  #148 — Companies API ownership (Security/Critical)"
echo "  #149 — Pagination upper bound (Availability/High)"
echo "  #150 — Command Center silent errors (UX/High)"
echo "  #151 — Avatar magic-byte validation (Security/High)"
echo "  #153 — Crawler runs pagination (Availability/Medium)"
echo ""
echo "Issue closed during second-pass review:"
echo "  #152 — Application CRUD tests (already covered by"
echo "          test_applications_routes.py — 16 tests, 519 lines)"
echo ""
if [[ "${APPLY:-0}" != "1" ]]; then
  echo "This was a DRY RUN. To apply:"
  echo "  APPLY=1 bash scripts/apply_sprint_audit.sh"
fi
