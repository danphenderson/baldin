/**
 * Block reorder extension for cell-doc.
 *
 * Provides:
 *   - `moveBlockUp(editor)`   — exported helper (reused by Story 8's ⋮ menu)
 *   - `moveBlockDown(editor)` — exported helper (reused by Story 8's ⋮ menu)
 *   - `BlockReorder`          — TipTap Extension wiring Mod-Alt-ArrowUp/Down
 *
 * Keyboard shortcuts:
 *   Mod-Alt-ArrowUp   — move current top-level block before the one above
 *   Mod-Alt-ArrowDown — move current top-level block after the one below
 *
 * `Mod-Alt-Arrow` matches VS Code's move-line bindings and avoids the
 * macOS system conflict on `Mod-Shift-Arrow` (select-to-doc-start/end).
 *
 * The transaction dispatched here flows through the Yjs collaboration
 * plugin automatically, so collaborative reorder works without extra wiring.
 *
 * Fragment is imported from @tiptap/pm/model (a transitive dep) rather
 * than prosemirror-model directly, consistent with the rest of the codebase.
 */
import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import { Fragment } from '@tiptap/pm/model';

/**
 * Core helper — moves the top-level block that contains the current
 * selection one step in the given direction.
 *
 * Returns `false` and performs no dispatch when the block is already
 * at the boundary (first block for 'up', last block for 'down').
 */
function moveTopLevelBlock(editor: Editor, direction: 'up' | 'down'): boolean {
  const { state } = editor;
  const { selection } = state;
  const { $anchor } = selection;

  // Guard: cursor must be inside at least one block (depth ≥ 1).
  if ($anchor.depth < 1) return false;

  // Position just before the opening token of the depth-1 ancestor.
  const topNodePos = $anchor.before(1);
  // The depth-1 node itself (paragraph, callout, details, table, …).
  const currentNode = $anchor.node(1);
  const tr = state.tr;

  if (direction === 'up') {
    // $nodeBefore at topNodePos is the preceding sibling at depth 1.
    const $pos = state.doc.resolve(topNodePos);
    const prev = $pos.nodeBefore;
    if (!prev) return false;                          // already at the top

    const prevStart = topNodePos - prev.nodeSize;
    tr.replaceWith(
      prevStart,
      topNodePos + currentNode.nodeSize,
      Fragment.from([currentNode, prev]),
    );
    editor.view.dispatch(tr);
    return true;
  } else {
    // Position just after the closing token of the depth-1 ancestor.
    const afterPos = $anchor.after(1);
    // $nodeAfter at afterPos is the following sibling at depth 1.
    const $pos = state.doc.resolve(afterPos);
    const next = $pos.nodeAfter;
    if (!next) return false;                          // already at the bottom

    tr.replaceWith(
      topNodePos,
      afterPos + next.nodeSize,
      Fragment.from([next, currentNode]),
    );
    editor.view.dispatch(tr);
    return true;
  }
}

/**
 * Move the block containing the current cursor one position up.
 * Exported for reuse in Story 8's ⋮ block menu (Move up action).
 */
export function moveBlockUp(editor: Editor): boolean {
  return moveTopLevelBlock(editor, 'up');
}

/**
 * Move the block containing the current cursor one position down.
 * Exported for reuse in Story 8's ⋮ block menu (Move down action).
 */
export function moveBlockDown(editor: Editor): boolean {
  return moveTopLevelBlock(editor, 'down');
}

/**
 * TipTap Extension that wires keyboard shortcuts for block reordering.
 */
export const BlockReorder = Extension.create({
  name: 'blockReorder',

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-ArrowUp': () => moveTopLevelBlock(this.editor, 'up'),
      'Mod-Alt-ArrowDown': () => moveTopLevelBlock(this.editor, 'down'),
    };
  },
});
