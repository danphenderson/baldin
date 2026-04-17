# Wave 05: Workspace Documents And Automation Agents

> Status: `blocked pending approved redesign nodes`
> Default implementation owner: `baldin_frontend`
> Program owner: `baldin_full_stack_architect`

## Canonical Inputs

- Read `docs/docs/reference/baldin-redesign-handoff.md` first.
- Use `docs/docs/engineering/redesign-implementation-program.md` for phase gates, PR slicing, and validation defaults.
- Do not start implementation until the completed brief cites the exact approved Figma node IDs for this wave.

## Routes In Scope

- Routes:
  - `/workspace`
  - `/workspace/*`
  - `/automation/agents`
  - `/automation/agents/*`
- Shared layouts or chrome that may move with this wave:
  - `AutomationGroupLayout`
  - Workspace document list and detail chrome, only if reuse is proven

## Explicit Out Of Scope

- `/me`
- `/applications/*`
- `/leads/*`
- `/network/*`
- `/settings/*`
- `/workflows/*`
- `/admin/*`

## Implementation Constraints

- Apply the cross-screen interaction contract defined in the redesign handoff.
- Workspace document surfaces follow standard collection-page conventions.
- Agent surfaces follow the same populated, filtered, and detail-state patterns used in Wave 04 workflow surfaces.
- Keep agent-specific configuration, execution monitoring, and scheduling semantics feature-owned.
- Keep document-specific upload, preview, and tagging behavior feature-owned.

## API Surfaces Consumed

- `workspaceService` — document listing, detail, upload, tagging.
- `agentService` — agent listing, configuration, execution history.
- Known API gaps: both workspace and agent APIs are newer surfaces and may need new backend endpoints depending on the approved redesign.

## Backend Default

- Backend work required: `no` by default.
- Open a backend dependency brief only if the approved redesign requires new workspace CRUD, agent configuration, execution-monitoring endpoints, or other contract changes the current APIs cannot support.

## PR Slicing

1. Shared-foundation PR only if cross-family reuse is already proven.
2. One route-family PR for workspace documents and automation agents.
3. One cleanup PR only if wrapper deletion or docs follow-up should stay separate.

## Validation

- Route-level behavior checks for workspace list, workspace detail, agents list, and agent detail.
- Focused component tests if shared framing or chrome changes materially.
- `cd frontend && ./node_modules/.bin/tsc --noEmit`
- `cd frontend && npm run build`
- `cd frontend && npm run lint:theme` when shared surfaces or import boundaries change
- `cd frontend && npm run storybook:build` when public design-system exports change
- Manual verification against the exact approved redesign nodes from the completed brief
