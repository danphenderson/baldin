/**
 * Tests for the block-reorder extension.
 *
 * Tests exercise the exported moveBlockUp / moveBlockDown helpers directly —
 * these are the same functions invoked by Mod-Alt-ArrowUp / Mod-Alt-ArrowDown.
 *
 * Fixture: three single-char paragraphs so ProseMirror positions are
 * deterministic and easy to reason about.
 *
 * Position layout for doc([p("A"), p("B"), p("C")]):
 *   Each paragraph has nodeSize 3 (1 opening + 1 char + 1 closing).
 *   pos 1 = inside block 1 ("A")
 *   pos 4 = inside block 2 ("B")
 *   pos 7 = inside block 3 ("C")
 */
import React, { createRef } from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { JSONContent } from '@tiptap/core';

import { buildCellDocExtensions, moveBlockUp, moveBlockDown } from '../extensions';
import { EditorHarness, type EditorHarnessHandle } from './editor-harness';

const REORDER_DOC: JSONContent = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'A' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'B' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'C' }] },
  ],
};

// Positions inside each block (after the paragraph's opening token).
const POS_IN_BLOCK_1 = 1;
const POS_IN_BLOCK_2 = 4;
const POS_IN_BLOCK_3 = 7;

function getBlockTexts(ref: React.RefObject<EditorHarnessHandle | null>): (string | undefined)[] {
  return (ref.current!.getJSON()?.content ?? []).map(
    (node) => node.content?.[0]?.text,
  );
}

describe('block-reorder extension', () => {
  it('Mod-Alt-ArrowUp on second block swaps it before the first', async () => {
    const ref = createRef<EditorHarnessHandle>();
    render(<EditorHarness ref={ref} extensions={buildCellDocExtensions()} content={REORDER_DOC} />);

    await waitFor(() => expect(ref.current?.editor).toBeTruthy());

    const editor = ref.current!.editor!;
    editor.commands.setTextSelection(POS_IN_BLOCK_2);
    moveBlockUp(editor);

    await waitFor(() => {
      expect(getBlockTexts(ref)).toEqual(['B', 'A', 'C']);
    });
  });

  it('Mod-Alt-ArrowDown on first block swaps it after the second', async () => {
    const ref = createRef<EditorHarnessHandle>();
    render(<EditorHarness ref={ref} extensions={buildCellDocExtensions()} content={REORDER_DOC} />);

    await waitFor(() => expect(ref.current?.editor).toBeTruthy());

    const editor = ref.current!.editor!;
    editor.commands.setTextSelection(POS_IN_BLOCK_1);
    moveBlockDown(editor);

    await waitFor(() => {
      expect(getBlockTexts(ref)).toEqual(['B', 'A', 'C']);
    });
  });

  it('Mod-Alt-ArrowUp on first block (no sibling above) leaves doc unchanged', async () => {
    const ref = createRef<EditorHarnessHandle>();
    render(<EditorHarness ref={ref} extensions={buildCellDocExtensions()} content={REORDER_DOC} />);

    await waitFor(() => expect(ref.current?.editor).toBeTruthy());

    const editor = ref.current!.editor!;
    editor.commands.setTextSelection(POS_IN_BLOCK_1);
    const result = moveBlockUp(editor);

    expect(result).toBe(false);
    expect(getBlockTexts(ref)).toEqual(['A', 'B', 'C']);
  });

  it('Mod-Alt-ArrowDown on last block (no sibling below) leaves doc unchanged', async () => {
    const ref = createRef<EditorHarnessHandle>();
    render(<EditorHarness ref={ref} extensions={buildCellDocExtensions()} content={REORDER_DOC} />);

    await waitFor(() => expect(ref.current?.editor).toBeTruthy());

    const editor = ref.current!.editor!;
    editor.commands.setTextSelection(POS_IN_BLOCK_3);
    const result = moveBlockDown(editor);

    expect(result).toBe(false);
    expect(getBlockTexts(ref)).toEqual(['A', 'B', 'C']);
  });
});
