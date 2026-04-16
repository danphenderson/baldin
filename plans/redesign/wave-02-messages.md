# Wave 02: Messages And Conversation Detail

> Status: `blocked pending approved redesign nodes`
> Default implementation owner: `baldin_frontend`
> Program owner: `baldin_full_stack_architect`

## Scope

- Routes:
  - `/network/messages`
  - `/network/messages/:conversationId`
- Shared layouts or chrome that may move with this wave:
  - list and detail framing only if the approved redesign proves reuse outside this route family

## Required Brief Gate

- Create the wave brief from `plans/redesign/implementation-brief-template.md`.
- Do not start implementation until the brief lists the exact approved redesign node IDs for this route family.
- Do not treat closeout evidence nodes as approval for implementation.

## Handoff Evidence To Preserve

- Direct thread with explicit hierarchy: `109:4207`
- Group thread with participant sidebar: `109:4401`
- Empty state: `109:4612`
- Loading state: `109:4792`
- Error state: `109:4959`

## Route-Family Rules

- Preserve explicit message hierarchy.
- Preserve edit and delete affordances in the approved redesign.
- Preserve the participant-sidebar group-thread variant.
- Keep transient send-progress behavior feature-owned unless reuse is clearly proven across another approved route family.

## Shared-Surface Gate

- Do not promote message-specific hierarchy, conversation actions, or participant semantics into shared surfaces.
- Promote only neutral framing or chrome, and only after reuse is proven outside this route family.

## Backend Default

- Backend work required: `no` by default.
- Open a backend dependency brief only if the approved redesign needs missing message metadata, thread summary data, or a new mutation flow the current API does not support cleanly.

## PR Slicing

1. Shared-foundation PR only if the same framing or chrome is already approved for another route family.
2. One route-family PR for messages and conversation detail.
3. One cleanup PR only if wrapper deletion or docs follow-up should stay separate.

## Validation

- Route-level behavior checks for conversations list and conversation detail.
- Focused component tests if shared framing or list chrome changes materially.
- `cd frontend && ./node_modules/.bin/tsc --noEmit`
- `cd frontend && npm run build`
- `cd frontend && npm run lint:theme` when shared surfaces or import boundaries change
- `cd frontend && npm run storybook:build` when public design-system exports change
- Manual verification against the exact approved redesign nodes from the completed brief
