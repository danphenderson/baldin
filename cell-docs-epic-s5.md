# Story 5 Plan - Frontend Block Extensions

This document replaces the first-pass draft for Story 5 in `cell-docs-epic.md`. It includes an audit of the draft and a corrected implementation plan that is ready to hand to the frontend implementation owner. It also reflects the shipped Phase 1 backend and contract work that landed in commit `136f40b61c05c3b80876356148fa58892e6dd244`.

## Objective

Deliver the Story 5 frontend slice for cell-doc block extensions:

- task lists
- callouts
- toggles
- tables

The goal is to ship reusable TipTap extensions, the minimal interactive UI those extensions require, and the mandatory collaboration validation for tables without widening scope into Story 8 routing, shell, or kind-picker work.

## Verified Baseline

- Phase 1 is shipped. The backend block model, block CRUD routes, version `block_snapshot`, and regenerated contracts landed in commit `136f40b61c05c3b80876356148fa58892e6dd244`.
- `frontend/src/schema.d.ts` now includes `cell_doc`, block CRUD/reorder/sync routes, `DocumentBlock*` schemas, extended document activity types, and `DocumentVersionRead.block_snapshot`.
- `frontend/src/service/documents.tsx` still does not export block type aliases or wrap the shipped block endpoints.
- `frontend/src/page/documents/document-list.tsx` and `frontend/src/page/documents/document-detail.tsx` recognize `cell_doc` in their kind metadata, but `frontend/src/page/documents/document-editor.tsx` still omits `cell_doc` from `KIND_OPTIONS` and still routes everything through `RichTextEditor`.
- `frontend/src/page/documents/document-detail.tsx` still uses `RichTextEditor` for read-only TipTap version previews, while `frontend/src/page/documents/document-list.tsx` and `frontend/src/page/documents/document-compare.tsx` still use local plain-text extractors for TipTap JSON.
- The TipTap schema is duplicated today between `frontend/src/component/rich-text-editor.tsx` and `frontend/src/component/collaboration-bootstrap.ts`.
- Frontend tests run on Vitest, not Jest (`frontend/package.json`).
- Story 5 still needs to stay additive: Story 8 owns cell-doc routing, kind picker changes, inline document title UX, and the dedicated editor shell.

## Current Frontend Integration Points

These are the actual integration points Story 5 has to respect after Phase 1.

1. **Generated contract surface is ready.**
  The frontend already has generated knowledge of block routes and schemas in `frontend/src/schema.d.ts`, so Story 5 should consume existing generated types rather than inventing local block contracts.

2. **The service layer is behind the contract.**
  `frontend/src/service/documents.tsx` has no block endpoint wrappers yet. Story 5 does not need to consume block CRUD routes, but if it needs type aliases it should add narrow exports instead of bypassing the service layer pattern.

3. **Document list and detail pages are metadata-aware only.**
  `frontend/src/page/documents/document-list.tsx` and `frontend/src/page/documents/document-detail.tsx` know the `cell_doc` label and icon, but they do not have dedicated block rendering behavior.

4. **The editor entry point is still the flat editor path.**
  `frontend/src/page/documents/document-editor.tsx` still excludes `cell_doc` from `KIND_OPTIONS` and mounts `RichTextEditor` as the only TipTap editor. Story 5 should prepare reusable block extensions for Story 8, not force premature route integration.

5. **Current text extraction is duplicated and block-naive.**
  `frontend/src/component/document-content.ts`, `frontend/src/page/documents/document-list.tsx`, and `frontend/src/page/documents/document-compare.tsx` each flatten TipTap JSON to plain text separately. Story 5 should avoid widening into those surfaces unless a new node breaks shared helper assumptions badly enough to require a narrow safety fix.

## Audit of the First Pass

The draft is directionally useful, but it is not implementation-ready. The main issues are below.

1. **It adds extensions without fixing schema drift.**
   The repo already has two separate editor extension arrays: one in `rich-text-editor.tsx` and one in `collaboration-bootstrap.ts`. Adding a third isolated cell-doc extension bundle without introducing a shared factory would make collaboration seeding and real editor behavior diverge.

2. **The proposed folder layout is too generic for the repo.**
   `frontend/src/component/extensions/` is not scoped to the feature and will age poorly once Story 8 adds a dedicated cell-doc editor. This work should live under a feature-local cell-doc surface.

3. **The task-list plan conflicts with the backend block model.**
   The draft enables `TaskItem.configure({ nested: true })`, but the backend block model for Story 1 only defines `task_item` without child blocks. Nested task items would create unsupported structures and serialization drift.

4. **The node contract is underspecified where it matters most.**
   The draft treats node names as if they cleanly match backend block types. They do not. Backend block types include `toggle` and `table_cell`; the frontend node plan includes `details`, `detailsSummary`, `tableCell`, and `tableHeader`. That mapping has to be frozen in Story 5 or the backend serializer and Story 9 PDF work will drift.

5. **The callout content model is too narrow and would block valid future content.**
   Restricting `callout` content to a small fixed set like `(paragraph | heading | bulletList | orderedList | taskList)+` is too brittle. The spike allows optional child blocks, which means tables, code blocks, blockquotes, and future block types need a clearer contract.

6. **The table-header fallback in the draft is factually wrong.**
   The draft mentions a backend `table_header` block type. The block model uses `table_cell` with header metadata, not a separate `table_header` block row type.

7. **It misses a Story 5 acceptance criterion by deferring table controls.**
   Story 5 requires interactive row and column add/remove behavior. The draft defers that UI to Story 8, which leaves Story 5 incomplete.

8. **The proposed tests would give false confidence.**
   Directly rendering NodeView React components is not enough to validate TipTap node views. `ReactNodeViewRenderer` only behaves correctly inside a mounted editor with `EditorContent`. A mounted harness is required.

9. **The collaboration test is too detached from runtime wiring.**
   A headless two-editor Yjs test is necessary, but it needs to run against the same shared extension factory that production uses. Otherwise the test can pass while the live editor and bootstrap seeding still disagree.

10. **The verification command is wrong for this repo.**
    `npm run test -- --testPathPattern=extensions` is a Jest-style flag and does not match the repo's Vitest setup.

11. **The dependency plan is incomplete.**
    If `npm install` is part of the slice, `frontend/package-lock.json` is part of the expected change set.

## Final Strategy

Story 5 should be implemented as a feature-local, reusable cell-doc extension package with a single shared extension factory. The plan needs to do four things at once:

1. Remove current schema duplication risk between the live editor and collaboration bootstrap seeding.
2. Freeze the frontend node contract so Story 2 serialization and Story 9 PDF export have stable names and attrs to target.
3. Ship the smallest interactive UI required by Story 5 itself, especially table controls.
4. Keep Story 5 additive so Story 8 can compose these primitives into `CellDocEditor` without rewriting them.
5. Reuse the shipped generated contract surface without prematurely wiring block CRUD into page-level UI.

## Adopted Node Contract

This plan freezes the frontend-side node contract for Story 5.

- `taskList` / `taskItem`
  - maps to backend `task_list` / `task_item`
  - keep nested task items disabled for now

- `callout`
  - `attrs.callout_type` in `info | warning | tip | danger`
  - use content shape `paragraph block*`
  - the first paragraph represents the callout's inline body content
  - following blocks represent optional child blocks

- `details` + `detailsSummary`
  - represents backend `toggle`
  - `detailsSummary` stores the summary line
  - remaining `details` children represent the collapsed body blocks

- `table`, `tableRow`, `tableCell`, `tableHeader`
  - maps to backend `table`, `table_row`, and `table_cell`
  - header-ness stays a property of a table cell on the backend
  - no backend `table_header` block row type is introduced

This contract should be treated as the frontend source of truth for Story 5, Story 8, and the frontend-facing expectations for backend serialization.

## Implementation Plan

### Phase 1 - Dependencies and feature layout

Add the missing TipTap packages to `frontend/package.json` and update `frontend/package-lock.json`:

- `@tiptap/extension-task-list`
- `@tiptap/extension-task-item`
- `@tiptap/extension-table`
- `@tiptap/extension-table-row`
- `@tiptap/extension-table-cell`
- `@tiptap/extension-table-header`

Create a feature-local folder instead of the generic `component/extensions` path:

- `frontend/src/component/cell-doc/extensions/`
- `frontend/src/component/cell-doc/node-views/`
- `frontend/src/component/cell-doc/menus/`
- `frontend/src/component/cell-doc/test/`

Use `@tiptap/react/menus` for contextual table controls. No extra menu package needs to be added beyond the current TipTap stack.

If Story 5 needs contract-derived frontend types for the extension surface or tests, add narrow re-exports from `frontend/src/service/documents.tsx` instead of importing generated schema types ad hoc across the feature.

### Phase 2 - Shared extension factory

Before adding new block nodes, extract the current shared document editor setup into reusable helpers.

Create a base helper, for example:

- `buildBaseDocumentExtensions(options)`

This helper should own the extensions that are currently duplicated between:

- `frontend/src/component/rich-text-editor.tsx`
- `frontend/src/component/collaboration-bootstrap.ts`

Then create a cell-doc-specific helper, for example:

- `buildCellDocExtensions(options)`

This helper should layer Story 5 block extensions on top of the base helper.

Important constraints:

- Story 5 should **not** route `cell_doc` through `RichTextEditor` yet.
- Story 5 should **not** change `KIND_OPTIONS` yet.
- Story 5 **should** ensure that collaboration bootstrap seeding and future `CellDocEditor` runtime use the same schema and node names.
- Story 5 should **not** add page-level block CRUD wiring unless an implementation detail makes a tiny service-layer export unavoidable.

### Phase 3 - Task list extension

Implement a dedicated task-list module that:

- configures `TaskList`
- configures `TaskItem` with nesting disabled
- exports a reusable extension bundle from the cell-doc feature surface
- includes scoped styling for checkbox alignment and list spacing

The Story 5 requirement here is not only serialization. The mounted editor must prove that users can click the checkbox and see the checked state persist in TipTap JSON.

### Phase 4 - Callout extension

Implement a `callout` node with:

- `attrs.callout_type`
- content shape `paragraph block*`
- a React node view rendered through `ReactNodeViewRenderer`

Split the node spec from the view implementation:

- node definition in `extensions/`
- reusable `CalloutNodeView` and `CalloutTypePicker` components in `node-views/`

The node view should provide:

- visible callout type affordance
- keyboard-accessible type switching
- styling that can be reused later by Story 8 rather than rewritten inside the editor shell

Avoid baking Story 8's final visual language into the extension itself. Keep the logic reusable and the presentation light.

### Phase 5 - Toggle extension

Implement `details` and `detailsSummary` nodes with:

- persisted `open` state on `details`
- accessible disclosure semantics
- a React node view that exposes collapse/expand behavior

Split toggle behavior the same way as callout:

- node spec in `extensions/`
- `ToggleNodeView` in `node-views/`

The mounted editor must prove:

- the summary line is editable
- the open/closed state changes correctly
- the serialized JSON preserves the `details` and `detailsSummary` shape

### Phase 6 - Table extension and controls

Implement the TipTap table suite with `resizable: false` for Story 5.

In addition to the raw table nodes, Story 5 must ship a minimal contextual control surface for:

- add column before
- add column after
- delete column
- add row before
- add row after
- delete row

This should be implemented as a small table-focused contextual menu under `frontend/src/component/cell-doc/menus/`, using `BubbleMenu` from `@tiptap/react/menus` or an equivalent local wrapper.

This control surface belongs in Story 5 because row/column add-remove is part of Story 5 acceptance, not Story 8 polish.

### Phase 7 - Mounted editor harness for tests

Create a lightweight editor harness under `frontend/src/component/cell-doc/test/` that:

- mounts a real TipTap editor with `EditorContent`
- uses the shared extension factory
- can enable or disable collaboration
- can expose the current JSON to tests

Use this harness for all interaction tests involving:

- callout node views
- toggle node views
- table contextual controls
- task item checkbox behavior

Do not rely on direct React rendering of raw NodeView components as the primary proof for Story 5. That approach bypasses real TipTap node-view behavior.

### Phase 8 - Collaboration alignment

Update `seedCollaborationDocument()` so it shares the same base extension helper and cell-doc extension bundle used by the mounted harness and future runtime editor.

This is necessary because the repo currently seeds Yjs docs with a separate editor configuration. Story 5 is the right place to eliminate that drift before the table collaboration test is treated as authoritative.

### Phase 9 - Tests

Add the following targeted tests.

- `task-list-extension.test.tsx`
  - mounted checkbox interaction
  - JSON checked-state persistence

- `callout-extension.test.tsx`
  - mounted type switching through the real node view
  - JSON attr assertions for `callout_type`

- `toggle-extension.test.tsx`
  - mounted disclosure interaction
  - JSON assertions for `details` and `detailsSummary`

- `table-extension.test.tsx`
  - mounted contextual table controls
  - row and column add/remove assertions
  - JSON shape assertions for table nodes

- `table-collaboration.test.ts`
  - two `Y.Doc` instances
  - two editors using the shared cell-doc extension factory
  - bidirectional `Y.applyUpdate()` sync
  - concurrent edits in separate table cells
  - identical final JSON in both sessions
  - no thrown errors and no dropped cell content

Extend existing tests only where Story 5 changes shared behavior:

- `frontend/src/component/collaboration-bootstrap.test.ts`
- `frontend/src/component/rich-text-editor.test.tsx`

If Story 5 needs a safety fix in `document-content.ts`, update that helper's tests too, but do not broaden into Story 10 read-only rendering work.

## Files Expected to Change

Core package and shared editor surfaces:

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/src/component/rich-text-editor.tsx`
- `frontend/src/component/collaboration-bootstrap.ts`
- optionally `frontend/src/service/documents.tsx` for narrow block type re-exports

New cell-doc feature surface:

- `frontend/src/component/cell-doc/extensions/*`
- `frontend/src/component/cell-doc/node-views/*`
- `frontend/src/component/cell-doc/menus/*`
- `frontend/src/component/cell-doc/test/*`

Targeted tests:

- `frontend/src/component/collaboration-bootstrap.test.ts`
- `frontend/src/component/rich-text-editor.test.tsx`
- optionally `frontend/src/component/document-content.ts`
- optionally `frontend/src/component/document-content.test.ts`

## Validation

Run the smallest useful checks first.

1. `cd frontend && npm install`
2. `cd frontend && ./node_modules/.bin/tsc --noEmit`
3. `cd frontend && npx vitest run src/component/cell-doc src/component/collaboration-bootstrap.test.ts src/component/rich-text-editor.test.tsx`
4. `cd frontend && VITE_API_URL=https://api.example.com npm run build`

Mandatory Story 5 gate:

- the table collaboration test must pass using the same shared extension factory the runtime will use

## Out of Scope for Story 5

Do not absorb the following into this slice:

- `CellDocEditor` route integration
- `KIND_OPTIONS` updates
- document list/detail/compare rendering rewrites
- block CRUD page wiring
- slash-command menu
- drag handles or keyboard reorder
- inline title editing for cell docs
- version save/block sync wiring
- read-only detail/compare rendering
- contract regeneration unless backend changes force it separately

Those belong to Stories 6 through 10.

## Done When

Story 5 is complete when all of the following are true:

- all four block families exist behind a shared cell-doc extension factory
- the live editor base schema and collaboration bootstrap no longer drift apart
- callout, toggle, and table interactions are proven in a mounted editor harness
- table row and column controls are implemented, not deferred
- the two-session table collaboration test passes against the real shared extension graph
- Story 5 remains additive and does not pull Story 8 shell work into the slice
