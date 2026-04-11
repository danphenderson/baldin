## Plan: Story 7 Block Drag-Handle & Reorder

Two-track strategy: a **keyboard reorder extension ships unconditionally**; a **visual drag handle ships only if `tiptap-extension-global-drag-handle` passes a 4-point compatibility check** (standard blocks, callout ReactNodeView, toggle ReactNodeView, Yjs collaboration sync). The keyboard path satisfies the acceptance criteria on its own — the drag handle is a UX upgrade.

---

### Phase 1 — Keyboard Reorder (guaranteed)

**Step 1.** Create `frontend/src/component/cell-doc/extensions/block-reorder-extension.ts`
- Core helper `moveTopLevelBlock(editor, direction: 'up'|'down'): boolean`:
  - Resolve `$anchor.before(1)` → `topNodePos` (position before the current depth-1 block)
  - Get the sibling via `state.doc.resolve(topNodePos).$nodeBefore` or `.$nodeAfter`
  - Guard: return `false` if no sibling (first/last block)
  - Single-step swap: `tr.replaceWith(prevStart, topNodePos + current.nodeSize, Fragment.from([current, prev]))` — `Fragment` imported from `@tiptap/pm/model`
  - Dispatch; the transaction flows through the Yjs plugin automatically → collaborative reorder
- Export top-level `moveBlockUp(editor)` and `moveBlockDown(editor)` — Story 8's block ⋮ menu will import these
- TipTap `Extension.create()` binding `addKeyboardShortcuts()`:
  - `Mod-Alt-ArrowUp` / `Mod-Alt-ArrowDown` (VS Code move-line bindings; avoids macOS system conflicts with `Mod-Shift-Arrow`)

**Step 2.** Modify `frontend/src/component/cell-doc/extensions/index.ts`
- Import the new extension, add it to `buildCellDocExtensions()`
- Re-export `moveBlockUp`, `moveBlockDown` from the barrel

---

### Phase 2 — Drag Handle (conditional on library evaluation)

**Step 3.** Verify `tiptap-extension-global-drag-handle` supports TipTap v3.22.x
- If no v3-compatible release → skip Phase 2 entirely; keyboard ships

**Step 4.** (if compatible) `npm install tiptap-extension-global-drag-handle` → `frontend/package.json`

**Step 5.** (if compatible) Create `frontend/src/component/cell-doc/extensions/drag-handle-extension.ts`
- Export a configured `GlobalDragHandle` wrapper (width 24px, standard scroll thresholds, CSS import)

**Step 6.** (if compatible) Add drag-handle extension to `buildCellDocExtensions()` alongside keyboard extension

**Step 7 — Validation gate** (manual smoke in docker-compose, all 4 must pass):
- a. Drag paragraph/heading → moves
- b. Drag callout node (ReactNodeView) → moves correctly
- c. Drag toggle node (ReactNodeView) → moves correctly
- d. Second Yjs session tab reflects the reordered positions

→ Any failure: remove the library + extension file + `package.json` entry; keyboard-only ships

---

### Phase 3 — Tests

**Step 8.** Create `frontend/src/component/cell-doc/test/block-reorder.test.tsx`
- Follows the `task-list-extension.test.tsx` pattern: `EditorHarness` + `createRef<EditorHarnessHandle>` + `waitFor`
- Fixture: `{ type: 'doc', content: [paragraphA, paragraphB, paragraphC] }`
- Cases:
  - `Mod-Alt-ArrowUp` on second block → JSON shows paragraphB then paragraphA
  - `Mod-Alt-ArrowDown` on first block → same result
  - `Mod-Alt-ArrowUp` on first block (no previous sibling) → JSON unchanged
  - `Mod-Alt-ArrowDown` on last block (no next sibling) → JSON unchanged
  - (If drag handle shipped) DOM smoke: handle element present after editor mount

---

### Relevant Files

| File | Status |
|------|--------|
| `frontend/src/component/cell-doc/extensions/block-reorder-extension.ts` | NEW |
| `frontend/src/component/cell-doc/extensions/drag-handle-extension.ts` | NEW (conditional) |
| `frontend/src/component/cell-doc/extensions/index.ts` | MODIFY — add extension + re-export helpers |
| `frontend/src/component/cell-doc/test/block-reorder.test.tsx` | NEW |
| `frontend/package.json` | MODIFY (conditional — drag handle lib only) |

---

### Verification

1. `cd frontend && npx tsc --noEmit` — zero errors
2. `cd frontend && npm run test -- block-reorder` — all cases pass
3. Manual: 3-block cell doc in docker-compose → `Mod+Alt+ArrowUp/Down` swaps blocks
4. (If drag handle shipped): hover → gutter handle visible; drag → moves; Yjs tab 2 reflects order
5. `cd frontend && VITE_API_URL=https://api.example.com npm run build` — clean

---

### Decisions

- `@dnd-kit` is **not used** — deep ProseMirror position mapping is not warranted when the TipTap extension handles it natively
- `@tiptap/extension-drag-handle` (TipTap Pro) is excluded by the epic's open-source constraint
- `moveBlockUp` / `moveBlockDown` are **exported** for reuse in Story 8's ⋮ menu (Move up / Move down)
- Story 8 ⋮ menu items are **out of scope** for Story 7

---

### Further Considerations

1. **Keyboard shortcut platform conflicts** — `Mod-Shift-ArrowUp/Down` collides with macOS "select to doc start/end". `Mod-Alt-ArrowUp/Down` is recommended (matches VS Code move-line). Confirm on macOS and Windows before finalising bindings.
2. **tiptap-extension-global-drag-handle v3 support** — the executing agent must verify this npm package has TipTap v3.22.x support. If TipTap v3 ships a first-party open-source `@tiptap/extension-drag-handle` (non-Pro), prefer that instead.
3. **ProseMirror `Fragment` import** — use `@tiptap/pm/model` (already a transitive dep) rather than `prosemirror-model` directly, consistent with the rest of the extension files.
