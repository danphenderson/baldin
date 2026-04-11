# Plan: Story 8 — Cell-Doc Editor Shell (Notion-Like UI)

**TL;DR:** Wire the existing cell-doc extension stack (Stories 5–7) into a fully integrated `CellDocEditor` component, add it to the document-editor page behind a `cell_doc` kind discriminator, implement inline floating formatting menu and block ⋮ context menu, connect collaboration with cell-doc extensions, and make create/save/version-restore work end-to-end for the `cell_doc` kind.

---

## Objective

Deliver the Story 8 acceptance criteria: when `kind === 'cell_doc'`, the document editor page mounts `CellDocEditor` instead of `RichTextEditor`. The cell-doc editor provides a Notion-like authoring experience with no fixed toolbar, a floating inline format menu on text selection, a block-level ⋮ context menu, inline title editing, "Type '/' for commands" placeholder, and end-to-end collaboration. `cell_doc` appears as a peer option in the "New Document" kind picker.

---

## Verified Baseline

Stories 5, 6, and 7 are shipped. The following are confirmed ready:

- `buildCellDocExtensions()` returns all block extensions: task list, callout, toggle, table, slash command, block reorder.
- `CellDocEditorSurface` mounts `EditorContent` + `TableBubbleMenu` with full cell-doc block styles.
- `SlashCommand` extension triggers "/" command palette with 17 items.
- `BlockReorder` extension provides `Mod-Alt-ArrowUp/Down` and exports `moveBlockUp()` / `moveBlockDown()` helpers for the ⋮ menu.
- `seedCollaborationDocument()` accepts optional `extensions` param (defaults to base); must pass `buildCellDocExtensions()` for cell-doc documents.
- `useCollaborativeEditor` hook manages bootstrap, Yjs doc, WebSocket provider, awareness. Currently always seeds with base extensions.
- `document-editor.tsx` has `KIND_OPTIONS` without `cell_doc`, always mounts `RichTextEditor`, and manages title/kind/content/format/version state.
- `document-detail.tsx` and `document-list.tsx` already have `cell_doc` in their `KIND_META` with label and icon.
- Generated schema types include `cell_doc` kind, all block schemas, and block CRUD routes.
- Service layer exports block type aliases but no block CRUD function wrappers.

---

## Architecture Decisions

1. **`CellDocEditor` is a sibling of `RichTextEditor`, not a wrapper around it.** They share base extensions via `buildBaseDocumentExtensions()` but diverge in toolbar, extensions, and surface styling. The document-editor page uses a kind-based conditional to mount one or the other.

2. **No fixed toolbar.** Inline formatting uses TipTap's `BubbleMenu` from `@tiptap/react/menus` — appears on text selection with bold/italic/underline/strikethrough/code/link controls. This replaces the RichTextEditor toolbar for cell-doc.

3. **Block ⋮ menu is a positioned DOM element** that appears on block hover or focus in the left gutter. It provides: Turn into… (submenu with block type conversion), Duplicate, Delete, Move up, Move down.

4. **Collaboration bootstrap must pass cell-doc extensions.** `useCollaborativeEditor` currently calls `seedCollaborationDocument(ydocInstance, bootstrap.content)` without extensions. For cell-doc, it must call `seedCollaborationDocument(ydocInstance, bootstrap.content, buildCellDocExtensions({ disableUndoRedo: true }))`. The cleanest approach: add an optional `extensions` parameter to `useCollaborativeEditor` options and pass it through to `seedCollaborationDocument`.

5. **Content format is always `tiptap_json` for cell-doc.** The format toggle in the header is hidden when kind is `cell_doc`. Version save uses the existing `createVersion` flow with `content_format: 'tiptap_json'`.

6. **Inline title editing** — the document title renders as an editable `<input>` at the top of the editor area, styled to look like a heading, rather than using the standard `TextField` in the form header. The header `TextField` still exists but is replaced visually by the inline title when `kind === 'cell_doc'`.

7. **`cell_doc` is a peer, not the default.** It adds to `KIND_OPTIONS` without changing the default kind selection.

---

## Implementation Plan

### Phase A — `useCollaborativeEditor` extension injection

**Goal:** Allow the collaboration hook to seed with custom extensions so cell-doc documents bootstrap with the correct TipTap schema.

**File:** `frontend/src/component/use-collaborative-editor.ts`

**Changes:**

1. Add optional `seedExtensions?: Extensions` to `UseCollaborativeEditorOptions` interface.
2. In the `initialize` function, when calling `seedCollaborationDocument(ydocInstance, bootstrap.content)`, pass `options.seedExtensions` as the third argument:
   ```ts
   seedCollaborationDocument(ydocInstance, bootstrap.content, seedExtensions);
   ```
3. Add `seedExtensions` to the `useEffect` dependency array.

**Impact:** Backward-compatible. When `seedExtensions` is `undefined`, `seedCollaborationDocument` falls back to `buildBaseDocumentExtensions()` as before. `RichTextEditor` callers are unchanged.

---

### Phase B — `CellDocEditor` component

**Goal:** Create the main cell-doc editor component that owns TipTap editor instantiation, collaboration, inline formatting, and the editing surface.

**New file:** `frontend/src/component/cell-doc/cell-doc-editor.tsx`

**Props interface:**
```ts
interface CellDocEditorProps {
  content: string;                           // TipTap JSON string
  onChange: (json: string, plainText: string) => void;
  externalContentKey: number | string;       // trigger re-sync from outside
  readOnly?: boolean;
  placeholder?: string;
  minHeight?: string;
  collaborative?: boolean;
  documentId?: string;
  token?: string;
  collaborationUserName?: string;
}
```

**Internal structure:**

1. **Collaboration hook:** Call `useCollaborativeEditor` with `seedExtensions: buildCellDocExtensions({ disableUndoRedo: true })` when `collaborative` is true.

2. **Editor instantiation:** `useEditor()` with:
   - `extensions`: `buildCellDocExtensions({ disableUndoRedo: collaborative })` + `Placeholder` + (if collaborative) `Collaboration` + `CollaborationCursor`
   - `content`: non-collaborative initial content parsed from props
   - `editable: !readOnly`
   - `onUpdate`: call `onChange(JSON.stringify(e.getJSON()), e.getText())`

3. **External content sync:** Same `externalContentKey` pattern as `RichTextEditor` — when key changes and not collaborative, call `editor.commands.setContent(...)`.

4. **Render:**
   - Connection status indicator (when collaborative, reuse the same dot + user count pattern from RichTextEditor)
   - `CellDocEditorSurface` with the editor instance
   - `InlineFormatMenu` (Phase C) — only when `!readOnly`
   - `BlockContextMenu` (Phase D) — only when `!readOnly`

**Collaboration status:** Reuse the same `connectionStatus`, `connectedUsers`, `localUser` state from the hook. Render a small status bar above the editor surface (dot + connected count + user color circles).

---

### Phase C — Inline floating format menu

**Goal:** On text selection, show a floating toolbar with basic inline formatting controls (replacing the fixed toolbar in RichTextEditor).

**New file:** `frontend/src/component/cell-doc/menus/inline-format-menu.tsx`

**Implementation:**

1. Use `BubbleMenu` from `@tiptap/react/menus` (same import as `TableBubbleMenu`).
2. `shouldShow`: return `true` when editor has a text selection (`!selection.empty`) and the selection is not inside a code block.
3. Controls (icon buttons in a horizontal `Paper`):
   - Bold (`toggleBold`)
   - Italic (`toggleItalic`)
   - Underline (`toggleUnderline`)
   - Strikethrough (`toggleStrike`)
   - Code (`toggleCode`)
   - Link (prompt for URL → `setLink` / `unsetLink` toggle)
4. Each button shows active/pressed state based on `editor.isActive('bold')`, etc.
5. `data-testid="inline-format-menu"`
6. Styling: MUI `Paper` elevation 8, horizontal `Stack` of `IconButton` components, `zIndex: 1400`.

**Why a separate file:** The inline format menu is cell-doc-specific. `RichTextEditor` retains its fixed toolbar.

---

### Phase D — Block ⋮ context menu

**Goal:** On hovering/focusing a top-level block in the editor, show a "⋮" button in the left gutter. Clicking it opens a context menu with block operations.

**New file:** `frontend/src/component/cell-doc/menus/block-context-menu.tsx`

**Implementation:**

1. **Gutter button:** A small `IconButton` (⋮ / `MoreVert`) positioned absolutely in the left margin of the currently hovered block. Detect the hovered block via a ProseMirror plugin that tracks the DOM element under the pointer (or via `mouseover` event delegation on the editor wrapper).

2. **Menu items:**
   - "Turn into…" → submenu: Paragraph, Heading 1/2/3, Bullet List, Numbered List, Task List, Blockquote, Code Block, Callout, Toggle, Table
     - Conversion uses TipTap commands: `setParagraph()`, `setHeading({ level })`, `toggleBulletList()`, etc. — same commands as slash-command-items.
   - "Duplicate" → `editor.commands.insertContentAt(blockEndPos, blockNode.toJSON())`
   - "Delete" → `editor.commands.deleteRange({ from: blockPos, to: blockPos + blockNode.nodeSize })`
   - "Move up" → `moveBlockUp(editor)` (imported from block-reorder-extension)
   - "Move down" → `moveBlockDown(editor)` (imported from block-reorder-extension)

3. **Rendering:** MUI `Menu` anchored to the gutter button. "Turn into" is a nested `Menu` or a flat section with visual grouping.

4. **`data-testid="block-context-menu"`**

**Approach notes:**
- The gutter tracking can be done with a TipTap extension that adds a `decorations` plugin (returns a `DecorationSet` with a widget at the start of the hovered top-level node), OR it can be done outside ProseMirror via DOM event delegation on the editor container (simpler for dev-preview).
- For dev-preview scope, the DOM-based approach is preferred: attach a `mouseenter` listener on the `CellDocEditorSurface` wrapper, find the closest `.ProseMirror > *` ancestor, position the button relative to that element's bounding rect.

---

### Phase E — Wire into document-editor page

**Goal:** Integrate `CellDocEditor` into `document-editor.tsx` behind the `kind === 'cell_doc'` discriminator.

**File:** `frontend/src/page/documents/document-editor.tsx`

**Changes:**

1. **Add `cell_doc` to `KIND_OPTIONS`:**
   ```ts
   { value: 'cell_doc', label: 'Cell Doc', icon: <GridViewIcon fontSize="small" /> }
   ```
   Use `GridView` (or `ViewModule` or `DashboardCustomize`) from `@mui/icons-material` — match the icon used in `document-detail.tsx` / `document-list.tsx` `KIND_META`.

2. **Add `cell_doc` to `KIND_HINTS`:**
   ```ts
   cell_doc: { placeholder: "Type '/' for commands", defaultContentType: 'custom' }
   ```

3. **Conditional editor mount:**
   Replace the single `<RichTextEditor ... />` with:
   ```tsx
   {kind === 'cell_doc' ? (
     <CellDocEditor
       content={editorContent}
       onChange={(json, text) => { setContent(json); setPlainText(text); }}
       externalContentKey={externalContentKey}
       readOnly={isReadOnly}
       placeholder={KIND_HINTS[kind]?.placeholder}
       minHeight="400px"
       collaborative={collaborative}
       documentId={id}
       token={token ?? undefined}
       collaborationUserName={currentUserName}
     />
   ) : (
     <RichTextEditor ... />  // existing props unchanged
   )}
   ```

4. **Force `tiptap_json` format for `cell_doc`:**
   - When kind changes to `cell_doc`, force `contentFormat` to `'tiptap_json'`.
   - Hide the Rich Text / Plain Text toggle when `kind === 'cell_doc'`.

5. **Inline title for cell_doc (optional polish):**
   - When `kind === 'cell_doc'` and not `isCreate`, render the title as an editable styled `<input>` inside the editor area above `CellDocEditor`, rather than using the Paper header `TextField`.
   - The Paper header title field is hidden or replaced for cell-doc.
   - For create mode, keep the standard header form since the user needs to select kind/title before the editor appears.

6. **Version save for cell_doc:**
   - No change needed to `handleSave`. The existing `createVersion` call sends `content` (TipTap JSON string) and `content_format: 'tiptap_json'`. The backend handles `block_snapshot` and block sync for cell-doc versions.

---

### Phase F — Tests

**New file:** `frontend/src/component/cell-doc/test/cell-doc-editor.test.tsx`

**Cases:**

1. **mounts-with-cell-doc-extensions:** `CellDocEditor` with initial content → editor renders, `/` triggers slash command menu.
2. **inline-format-menu-on-selection:** select text → `data-testid="inline-format-menu"` visible; toggle bold → active state changes.
3. **block-context-menu:** hover block → `⋮` button visible → click → `data-testid="block-context-menu"` opens → "Delete" removes the block.
4. **move-up-down-via-menu:** 3-block doc → ⋮ menu on block 2 → "Move down" → block order changes.
5. **turn-into:** paragraph block → ⋮ menu → "Turn into… → Heading 1" → block is now heading.
6. **placeholder:** empty cell doc → "Type '/' for commands" placeholder visible.
7. **read-only-no-menus:** `readOnly={true}` → no inline format menu, no ⋮ button, editor not editable.

**Existing test updates:**

- `frontend/src/component/use-collaborative-editor.test.ts` — add a case verifying `seedExtensions` is forwarded to `seedCollaborationDocument`.

---

## Relevant Files

| File | Status | Owner |
|------|--------|-------|
| `frontend/src/component/use-collaborative-editor.ts` | MODIFY — add `seedExtensions` option | Phase A |
| `frontend/src/component/cell-doc/cell-doc-editor.tsx` | **NEW** — main CellDocEditor component | Phase B |
| `frontend/src/component/cell-doc/menus/inline-format-menu.tsx` | **NEW** — floating format toolbar | Phase C |
| `frontend/src/component/cell-doc/menus/block-context-menu.tsx` | **NEW** — block ⋮ menu | Phase D |
| `frontend/src/page/documents/document-editor.tsx` | MODIFY — kind discriminator, KIND_OPTIONS, KIND_HINTS | Phase E |
| `frontend/src/component/cell-doc/test/cell-doc-editor.test.tsx` | **NEW** — CellDocEditor tests | Phase F |
| `frontend/src/component/use-collaborative-editor.test.ts` | MODIFY — seedExtensions test | Phase F |
| `frontend/src/component/cell-doc/cell-doc-editor-surface.tsx` | POSSIBLE MODIFY — may need minor style adjustments for inline title or gutter space | Phase B/E |

**Reference patterns to reuse:**
- `frontend/src/component/rich-text-editor.tsx` — editor setup, collaboration wiring, external content sync
- `frontend/src/component/cell-doc/cell-doc-editor-surface.tsx` — surface and block styles
- `frontend/src/component/cell-doc/menus/table-bubble-menu.tsx` — BubbleMenu usage pattern
- `frontend/src/component/cell-doc/menus/slash-command-menu.tsx` — MUI Paper/List menu pattern
- `frontend/src/component/cell-doc/extensions/slash-command-items.ts` — block-type command definitions (reuse for "Turn into" submenu)
- `frontend/src/component/cell-doc/extensions/block-reorder-extension.ts` — `moveBlockUp/Down` exports

---

## Integration Points and Risks

### Collaboration seeding correctness
**Risk:** If `seedExtensions` is not passed when bootstrapping a cell-doc, the Yjs document will be seeded with only base extensions, causing cell-doc-specific nodes (task lists, callouts, toggles, tables) to be silently dropped from the seeded content.
**Mitigation:** The `CellDocEditor` component always passes `buildCellDocExtensions()` as `seedExtensions`. A test case verifies this path.

### Block ⋮ menu DOM positioning
**Risk:** Detecting the hovered block and positioning the gutter button correctly is fragile across different block types (especially node views like callout and toggle which have wrapper elements).
**Mitigation:** Use `event.target.closest('.ProseMirror > *')` to find the top-level block element. Use `getBoundingClientRect()` relative to the editor container. If a node view renders nested wrappers, the `closest` selector still finds the ProseMirror top-level child.

### "Turn into" limitations
**Risk:** Not all block types can be converted to all other types (e.g., a table cannot become a heading). TipTap commands will no-op when conversion is impossible.
**Mitigation:** This is acceptable for dev-preview. "Turn into" fires the command; if TipTap cannot perform the conversion, nothing happens. No error is shown. Future polish can disable invalid conversions.

### Content format enforcement
**Risk:** If a user creates a `cell_doc` with `plain_text` format, the editor would receive raw text instead of TipTap JSON.
**Mitigation:** Force `contentFormat` to `'tiptap_json'` whenever `kind === 'cell_doc'`. Hide the format toggle.

---

## Verification

1. `cd frontend && npx tsc --noEmit` — zero errors
2. `cd frontend && npx vitest run src/component/cell-doc/test/cell-doc-editor src/component/use-collaborative-editor.test.ts` — all tests pass
3. `cd frontend && VITE_API_URL=https://api.example.com npm run build` — clean build
4. Manual smoke in docker-compose stack:
   - Create new document → select "Cell Doc" kind → editor shows `CellDocEditor` with empty placeholder
   - Type "/" → slash command palette opens → select "Heading 1" → heading inserted
   - Select text → inline format menu appears → toggle bold → text is bold
   - Hover a block → ⋮ button visible → click → context menu opens → "Delete" removes block
   - ⋮ menu → "Move down" → block reordered
   - ⋮ menu → "Turn into → Bullet List" → block converted
   - Save version → navigate to detail → cell doc content displays correctly
   - Open same doc in second tab → collaboration works, cursor awareness shows
   - Create a non-cell-doc (resume) → `RichTextEditor` with toolbar, not `CellDocEditor`

---

## Decisions

- **No `@tiptap/extension-floating-menu` dependency.** `BubbleMenu` from `@tiptap/react/menus` (already available) is sufficient for the inline format menu. A floating menu that appears on empty lines is not needed — the slash command already covers that UX.
- **Block ⋮ menu uses DOM event delegation, not a ProseMirror decoration plugin.** Simpler for dev-preview; can be upgraded to a decoration-based approach later.
- **"Turn into" is fire-and-forget.** Invalid conversions silently no-op rather than showing disabled items. This avoids needing a TipTap-internal schema inspection layer.
- **MUI `Menu` anchoring** for the block context menu (declarative, auto-positions, handles overflow). Consistent with the app's MUI pattern.
- **Collaboration status UI reuses the same visual pattern as RichTextEditor** (colored dot, user count, user circles) but rendered inside `CellDocEditor` rather than sharing a component. If the pattern is already extracted to a shared component by Story 8 start time, reuse it; otherwise, inline the small status bar.
- **Inline title is a stretch goal.** If the implementing agent finds that inline title editing adds significant complexity (focus management between title input and ProseMirror, undo/redo boundary), it should defer and keep the standard header `TextField` for cell-doc. The acceptance criteria require "title editable inline at top" but the paper header `TextField` already provides title editing — the inline treatment is a UX polish layer.

---

## Out of Scope

- Block CRUD API wiring from the frontend (block persistence is handled server-side via version save)
- Service-layer block CRUD function wrappers
- Read-only cell-doc detail view (Story 10)
- Cell-doc compare view (Story 10)
- PDF export for cell-doc blocks (Story 9)
- Contract regeneration (Story 11)
- Drag handles (Story 7 shipped keyboard reorder; drag handle is a separate evaluation)
- Block animations, block colors, @-mentions, nested page links
- Mobile-first optimization

---

## Owner and Sequencing

**Owner:** Baldin Frontend Agent

**Sequencing:**
- Phase A (collab hook extension injection) must land first — everything else depends on correct collaboration seeding.
- Phase B (CellDocEditor component) depends on Phase A.
- Phases C and D (inline format menu, block ⋮ menu) can be developed in parallel with Phase B's skeleton, then integrated.
- Phase E (document-editor page wiring) depends on Phases B, C, D being ready.
- Phase F (tests) should be written alongside each phase but final integration tests run after Phase E.

**Dependencies:**
- Stories 5, 6, 7 complete (verified above).
- Phase 1 backend + contract regen complete (verified — `schema.d.ts` includes `cell_doc` kind and block types).
