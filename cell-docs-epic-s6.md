# Plan: Story 6 — Slash-Command Menu

**TL;DR:** Add a "/" command palette to cell-doc editors. Uses `@tiptap/suggestion` (one new package) to handle trigger/filter/keyboard logic. Menu is rendered via `ReactRenderer` from `@tiptap/react` with `position: fixed` placement derived from the suggestion plugin's `clientRect`. Everything integrates at the extension layer — no structural changes to `CellDocEditorSurface`, and the slash menu never appears in `RichTextEditor`.

---

## Architecture decisions

- `ReactRenderer` (already exported from `@tiptap/react`) mounts the menu outside the main React tree — avoids adding `tippy.js`
- MUI `Paper` + `List` for the menu UI with the MUI default theme fallback (fine for dev-preview; the implementing agent should check for a shared theme export if the app's custom colors need to propagate)
- 4 flat callout entries in the palette (Callout Info / Warning / Tip / Danger) rather than one generic "Callout" — makes all variants immediately discoverable without a sub-menu
- An `allow` predicate in the suggestion config restricts the trigger to blocks where all text before `/` is blank (satisfies AC: "at start of an empty block")
- `SlashCommand` extension added inside `buildCellDocExtensions()` only — `buildBaseDocumentExtensions()` is untouched, so `RichTextEditor` is unaffected

---

## Steps

### Phase A — Dependency + Command Items *(independent, can start in parallel)*

1. Add `@tiptap/suggestion ^3.22.2` to `frontend/package.json` dependencies. No other new deps needed; `ReactRenderer` already ships with `@tiptap/react ^3.22.2`.

2. Create `frontend/src/component/cell-doc/extensions/slash-command-items.ts`
   - Type: `SlashCommandItem { title, description?, aliases: string[], command(editor) }`
   - 17 entries: Text, Heading 1/2/3, Bullet List, Numbered List, Task List, Blockquote, Code Block, Callout Info/Warning/Tip/Danger, Toggle, Divider, Table
   - `command` implementations use existing extension commands: `setParagraph`, `setHeading`, `toggleBulletList`, `toggleOrderedList`, `toggleTaskList`, `toggleBlockquote`, `toggleCodeBlock`, `setCallout({ callout_type })`, `setDetails`, `setHorizontalRule`, `insertTable({ rows: 3, cols: 3 })`

### Phase B — Extension + Menu Component *(depends on Phase A)*

3. Create `frontend/src/component/cell-doc/extensions/slash-command-extension.ts`
   - Shape follows `callout-extension.ts` — `Extension.create({ name: 'slashCommand', addProseMirrorPlugins })`
   - `Suggestion` config: `char: '/'`, `pluginKey: new PluginKey('slashCommand')`, `allowSpaces: false`
   - `allow` predicate: `doc.textBetween($from.start(), range.from - 1).trim() === ''` — enforces empty-block-only trigger
   - `items: ({ query }) => filterItems(ALL_SLASH_ITEMS, query)` — case-insensitive match on `title` + `aliases`
   - `render()`: creates `ReactRenderer(SlashCommandMenu, { editor, props })` on `onStart`; calls `component.updateProps(...)` on `onUpdate`; forwards `KeyboardEvent` to `component.ref.onKeyDown(event)` on `onKeyDown`; destroys on `onExit`

4. Create `frontend/src/component/cell-doc/menus/slash-command-menu.tsx` — follow `table-bubble-menu.tsx` + `toggle-node-view.tsx` patterns
   - `forwardRef<SlashCommandMenuHandle, SlashCommandMenuProps>`
   - `SlashCommandMenuHandle: { onKeyDown(event: KeyboardEvent): boolean }`
   - Props: `items`, `command`, `clientRect: (() => DOMRect | null) | null`
   - State: `selectedIndex` (resets to 0 when `items` changes)
   - `useImperativeHandle`: ArrowUp/ArrowDown adjust index; Enter calls `command(items[selectedIndex])` → returns `true`; Escape returns `false` (TipTap dismisses naturally via its own plugin)
   - Render: `position: fixed`, `top: rect.bottom + 4`, `left: rect.left`, `zIndex: 1400`; MUI `Paper` elevation 8; scrollable `List` max-height 320px; `ListItemButton` per item with `selected` prop; `data-testid="slash-command-menu"` on Paper

### Phase C — Wire into factory *(depends on Phase B)*

5. Update `frontend/src/component/cell-doc/extensions/index.ts`
   - Import `SlashCommand` from `./slash-command-extension`
   - Append `SlashCommand` to `buildCellDocExtensions()` return array
   - Barrel-export `SlashCommand`, `SLASH_COMMAND_ITEMS`, `SlashCommandItem`

### Phase D — Tests *(depends on Phase C)*

6. Create `frontend/src/component/cell-doc/test/slash-command.test.tsx` using `EditorHarness`
   - **open**: type `/` in empty paragraph → `data-testid="slash-command-menu"` is in the document
   - **filter**: type `/head` → only heading items remain in list
   - **select-keyboard**: type `/` + ArrowDown + Enter → editor JSON contains heading node
   - **select-click**: type `/` + click "Task List" → editor JSON contains taskList node
   - **dismiss-escape**: type `/` + Escape → menu gone from document
   - **dismiss-click-away**: type `/` + click outside editor → menu gone
   - **isolation**: `EditorHarness` with `buildBaseDocumentExtensions()` only → type `/` → no menu appears

---

## Relevant files

- `frontend/package.json` — add `@tiptap/suggestion ^3.22.2`
- `frontend/src/component/cell-doc/extensions/index.ts` — add SlashCommand, update factory
- `frontend/src/component/cell-doc/extensions/slash-command-items.ts` — **NEW**
- `frontend/src/component/cell-doc/extensions/slash-command-extension.ts` — **NEW**
- `frontend/src/component/cell-doc/menus/slash-command-menu.tsx` — **NEW**
- `frontend/src/component/cell-doc/test/slash-command.test.tsx` — **NEW**

**Reference patterns to reuse:**
- `frontend/src/component/cell-doc/menus/table-bubble-menu.tsx` — MUI Paper/List in a floating menu
- `frontend/src/component/cell-doc/extensions/callout-extension.ts` — Extension factory shape + `declare module '@tiptap/core'` augmentation
- `frontend/src/component/cell-doc/node-views/toggle-node-view.tsx` — `forwardRef` + `useImperativeHandle` pattern
- `frontend/src/component/cell-doc/test/editor-harness.tsx` — Mounted editor test shape

---

## Verification

1. `cd frontend && npx tsc --noEmit` — zero errors
2. `cd frontend && npm run test -- --testPathPattern=slash-command` — all 7 tests pass
3. Manual smoke in the running Compose stack: type `/` in empty cell-doc block → palette opens; type `/head` → filters to headings; Enter inserts heading; Escape dismisses; click outside dismisses
4. Confirm `/` in `RichTextEditor` does NOT trigger the palette

---

## Decisions

- **Callout palette entries**: 4 flat items (Info/Warning/Tip/Danger) rather than one generic entry, to keep all callout variants directly visible and filterable
- **Positioning**: `position: fixed` CSS derived from `clientRect()` — avoids adding `tippy.js` as a dep
- **MUI theme in `ReactRenderer`**: Acceptable without wrapping for dev-preview; Story 8 (`CellDocEditor` shell) can reassess if custom theme colors don't propagate correctly
- **Out of scope**: `CellDocEditor` shell (Story 8), drag handles (Story 7), sub-menus for callout type selection, MUI ThemeProvider wrapping of the `ReactRenderer` mount
