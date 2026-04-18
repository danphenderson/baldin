# Wave 01: Flagship Journey — Aspirations, Leads, And Applications

> Status: `blocked pending approved redesign nodes`
> Default implementation owner: `baldin_frontend`
> Program owner: `baldin_full_stack_architect`

## Canonical Inputs

- Read `docs/docs/reference/baldin-redesign-handoff.md` first.
- Use `docs/docs/engineering/redesign-implementation-program.md` for phase gates, PR slicing, and validation defaults.
- Do not start implementation until the completed brief cites the exact approved Figma node IDs for this wave.

## Routes In Scope

- Routes:
  - `/me` (flagship profile anchoring aspirations)
  - `/me/aspirations/roles`
  - `/me/aspirations/companies`
  - `/applications`
  - `/applications/board`
  - `/applications/:applicationId`
  - `/leads`
  - `/leads/companies`
- Shared layouts or chrome that may move with this wave:
  - `IdentityGroupLayout`
  - `ApplicationsGroupLayout`
  - `LeadsGroupLayout`
  - collection-page heading hierarchy and section framing
  - `MetricStrip` or equivalent collection summary framing
  - shared status presentation only if promotion is approved

## Explicit Out Of Scope

- `/dashboard` beyond the required aggregation follow-on tracked in the brief
- `/network/*`
- `/settings/*`
- `/workflows/*`
- `/admin/*`
- `/workspace/*`
- `/automation/agents/*`

## Implementation Constraints

- Apply the approved collection-page hierarchy and section-framing rules.
- Keep the `/me` profile anchor aligned to flagship direction-setting work rather than account-settings chrome.
- Keep application detail section-based. Do not reintroduce tab assumptions.
- Preserve board drag and drop behavior while updating presentation.
- Preserve application stage semantics and reminder behavior unless the approved redesign explicitly changes them.
- Keep route-specific action semantics and transient board behavior feature-owned unless reuse is proven elsewhere.
- Aspirations surfaces (`/me/aspirations/*`) define direction — do not collapse them into the profile settings wave.

## API Surfaces Consumed

- `frontend/src/service/users.tsx` — `/me` profile anchor, profile extract, and identity updates.
- `frontend/src/service/aspirations.ts` — aspirations roles and companies CRUD plus suggestion flows.
- `frontend/src/service/leads.tsx` and `frontend/src/service/companies.tsx` — leads, ranked state, lead-company collections, and company detail.
- `frontend/src/service/applications.tsx` — applications listing, detail, create, and stage-transition flows.
- Known API gaps: approved flagship-summary or cross-route aggregation needs should be called out explicitly in the implementation brief before backend work opens.

## Backend Default

- Backend work required: `no` by default.
- Open a backend dependency brief only if the approved redesign needs new profile or aspiration summary fields, lead or application collection aggregation, or a new mutation flow the current API cannot support.

## PR Slicing

1. Shared-foundation PR only if cross-family reuse is already proven.
2. One route-family PR for the flagship journey: profile anchor, aspirations, leads, applications, and their local collection chrome.
3. One cleanup PR only if wrapper deletion or docs follow-up should stay separate.

## Validation

- Route-level behavior checks for `/me`, aspirations roles, aspirations companies, leads, lead companies, applications queue, applications board, and application detail.
- Focused component tests if shared collection chrome or section framing changes materially.
- `cd frontend && ./node_modules/.bin/tsc --noEmit`
- `cd frontend && npm run build`
- `cd frontend && npm run lint:theme` when shared surfaces or import boundaries change
- `cd frontend && npm run test -- <targeted shared-surface test files>` when public shared React behavior changes
- Manual verification against the exact approved redesign nodes from the completed brief
