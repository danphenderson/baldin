# Wave 02: Network — Discover, Connections, And Messages

> Status: `archived historical redesign reference`
> Default implementation owner: `baldin_frontend`
> Program owner: `baldin_full_stack_architect`

## Canonical Inputs

- Start from `docs/docs/reference/operator-design-forward-path.md` for the active delivery contract.
- Treat this packet as archived redesign context only.
- Use `plans/v2.1/*`, `operator-design/`, and shipped route code for active implementation work.
- If you need historical comparison, cite the exact archived Figma nodes or notes from this packet in the active brief.

## Routes In Scope

- Routes:
  - `/network/messages`
  - `/network/messages/:conversationId`
  - `/network/connections`
  - `/network/discover`
  - `/network/discover/:userId`
- Shared layouts or chrome that may move with this wave:
  - `NetworkGroupLayout`
  - List and detail framing only if reuse is proven across another route family

## Explicit Out Of Scope

- `/me`
- `/applications/*`
- `/leads/*`
- `/settings/*`
- `/workflows/*`
- `/admin/*`
- `/workspace/*`
- `/automation/agents/*`

## Implementation Constraints

- Preserve explicit message hierarchy.
- Preserve edit and delete affordances in the approved redesign.
- Preserve the participant-sidebar group-thread variant.
- Connections and discover surfaces follow the cross-screen interaction contract defined in the redesign handoff.
- Keep transient send-progress behavior feature-owned unless reuse is clearly proven across another approved route family.

## API Surfaces Consumed

- `messageService` — conversations listing, message CRUD, thread state.
- `networkService` — connections listing, discover search, connection requests.
- Known API gaps: discover search and user detail may need new backend endpoints depending on the approved redesign.

## Backend Default

- Backend work required: `no` by default.
- Open a backend dependency brief only if the approved redesign needs missing message metadata, thread summary data, or a new mutation flow the current API does not support cleanly.

## PR Slicing

1. Shared-foundation PR only if the same framing or chrome is already approved for another route family.
2. One route-family PR for messages, conversation detail, discover, and connections.
3. One cleanup PR only if wrapper deletion or docs follow-up should stay separate.

## Validation

- Route-level behavior checks for conversations list, conversation detail, connections list, discover list, and user detail.
- Focused component tests if shared framing or list chrome changes materially.
- `cd frontend && ./node_modules/.bin/tsc --noEmit`
- `cd frontend && npm run build`
- `cd frontend && npm run lint:theme` when shared surfaces or import boundaries change
- `cd frontend && npm run test -- <targeted shared-surface test files>` when public shared React behavior changes
- Manual verification against the exact approved redesign nodes from the completed brief
