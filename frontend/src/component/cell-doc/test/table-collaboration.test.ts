/**
 * Table collaboration test.
 *
 * Mandatory Story 5 gate: two Y.Doc instances using the shared
 * cell-doc extension factory sync table edits bidirectionally.
 */
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { Editor } from '@tiptap/core';
import Collaboration from '@tiptap/extension-collaboration';
import type { JSONContent } from '@tiptap/core';

import { buildCellDocExtensions } from '../extensions';

function createCollabEditor(ydoc: Y.Doc): Editor {
  return new Editor({
    element: document.createElement('div'),
    extensions: [
      ...buildCellDocExtensions(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Collaboration.configure({ document: ydoc }) as any,
    ],
  });
}

function syncDocs(a: Y.Doc, b: Y.Doc): void {
  const updateA = Y.encodeStateAsUpdate(a);
  const updateB = Y.encodeStateAsUpdate(b);
  Y.applyUpdate(b, updateA);
  Y.applyUpdate(a, updateB);
}

function findTextPosition(editor: Editor, text: string): number {
  let foundPosition = -1;

  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text === text && foundPosition === -1) {
      foundPosition = pos;
    }
  });

  return foundPosition;
}

function replaceText(editor: Editor, fromText: string, toText: string): void {
  const position = findTextPosition(editor, fromText);
  expect(position).toBeGreaterThan(0);

  editor.commands.insertContentAt({ from: position, to: position + fromText.length }, toText);
}

function getTableCellText(documentJson: JSONContent, rowIndex: number, cellIndex: number): string | undefined {
  const table = documentJson.content?.find((node) => node.type === 'table');
  const row = table?.content?.[rowIndex] as JSONContent | undefined;
  const cell = row?.content?.[cellIndex] as JSONContent | undefined;
  const paragraph = cell?.content?.[0] as JSONContent | undefined;
  return paragraph?.content?.[0]?.text;
}

const TABLE_CONTENT: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'H1' }] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'H2' }] }] },
          ],
        },
        {
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A1' }] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A2' }] }] },
          ],
        },
      ],
    },
  ],
};

describe('table collaboration', () => {
  it('syncs concurrent table cell edits between two sessions', () => {
    const ydocA = new Y.Doc();
    const ydocB = new Y.Doc();

    // Create editors
    const editorA = createCollabEditor(ydocA);
    const editorB = createCollabEditor(ydocB);

    try {
      // Seed initial content via editor A
      editorA.commands.setContent(TABLE_CONTENT, { emitUpdate: false });

      // Sync so editor B has the table
      syncDocs(ydocA, ydocB);

      replaceText(editorA, 'A1', 'X1');
      replaceText(editorB, 'A2', 'Y2');

      syncDocs(ydocA, ydocB);

      const finalA = editorA.getJSON();
      const finalB = editorB.getJSON();

      expect(finalA).toEqual(finalB);
      expect(getTableCellText(finalA, 1, 0)).toBe('X1');
      expect(getTableCellText(finalA, 1, 1)).toBe('Y2');
      expect(getTableCellText(finalA, 0, 1)).toBe('H2');
    } finally {
      editorA.destroy();
      editorB.destroy();
    }
  });

  it('preserves table structure when adding rows collaboratively', () => {
    const ydocA = new Y.Doc();
    const ydocB = new Y.Doc();

    const editorA = createCollabEditor(ydocA);
    const editorB = createCollabEditor(ydocB);

    try {
      // Seed
      editorA.commands.setContent(TABLE_CONTENT, { emitUpdate: false });
      syncDocs(ydocA, ydocB);

      const cellPosition = findTextPosition(editorA, 'A2');
      expect(cellPosition).toBeGreaterThan(0);

      editorA.commands.setTextSelection(cellPosition);
      editorA.commands.addRowAfter();

      // Sync
      syncDocs(ydocA, ydocB);

      const finalA = editorA.getJSON();
      const finalB = editorB.getJSON();

      const tableA = finalA.content?.find((n) => n.type === 'table');
      const tableB = finalB.content?.find((n) => n.type === 'table');

      // Both should have 3 rows now
      expect(tableA!.content).toHaveLength(3);
      expect(tableB!.content).toHaveLength(3);
      expect(finalA).toEqual(finalB);
    } finally {
      editorA.destroy();
      editorB.destroy();
    }
  });
});
