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

import { buildCellDocExtensions, moveBlockUp } from '@/component/cell-doc/extensions';
import {
  CELL_DOC_EXPORT_CONTRACT_FIXTURE,
  CELL_DOC_TABLE_FIXTURE,
} from './cell-doc-contract-fixtures';

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
  const updateA = Y.encodeStateAsUpdate(a, Y.encodeStateVector(b));
  const updateB = Y.encodeStateAsUpdate(b, Y.encodeStateVector(a));
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

function getTopLevelNodeTypes(documentJson: JSONContent): string[] {
  return (documentJson.content ?? []).map(node => node.type ?? 'unknown');
}

function findTopLevelNode(documentJson: JSONContent, type: string): JSONContent | undefined {
  return documentJson.content?.find(node => node.type === type) as JSONContent | undefined;
}

function getParagraphText(documentJson: JSONContent, index: number): string | undefined {
  const paragraph = documentJson.content?.[index] as JSONContent | undefined;
  return paragraph?.content?.[0]?.text;
}

const SIMPLE_REORDER_FIXTURE: JSONContent = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Block one' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Block two' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Block three' }] },
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
      editorA.commands.setContent(CELL_DOC_TABLE_FIXTURE, { emitUpdate: false });

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
      editorA.commands.setContent(CELL_DOC_TABLE_FIXTURE, { emitUpdate: false });
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

  it('preserves the export-facing block contract while syncing toggle edits', () => {
    const ydocA = new Y.Doc();
    const ydocB = new Y.Doc();

    const editorA = createCollabEditor(ydocA);
    const editorB = createCollabEditor(ydocB);

    try {
      editorA.commands.setContent(CELL_DOC_EXPORT_CONTRACT_FIXTURE, { emitUpdate: false });
      syncDocs(ydocA, ydocB);

      replaceText(editorA, 'Interview prep notes', 'Panel prep notes');

      syncDocs(ydocA, ydocB);

      const finalA = editorA.getJSON();
      const finalB = editorB.getJSON();
      const callout = findTopLevelNode(finalA, 'callout');
      const details = findTopLevelNode(finalA, 'details');

      expect(finalA).toEqual(finalB);
      expect(getTopLevelNodeTypes(finalA)).toEqual([
        'paragraph',
        'taskList',
        'callout',
        'details',
        'table',
        'paragraph',
      ]);
      expect(callout?.attrs?.callout_type).toBe('tip');
      expect(details?.content?.[0]?.type).toBe('detailsSummary');
      expect(details?.content?.[0]?.content?.[0]?.text).toBe('Panel prep notes');
      expect(getTableCellText(finalA, 1, 0)).toBe('Baldin Labs');
      expect(getTableCellText(finalA, 1, 1)).toBe('Applied');
    } finally {
      editorA.destroy();
      editorB.destroy();
    }
  });

  it('propagates block reorder across sessions', () => {
    const ydocA = new Y.Doc();
    const ydocB = new Y.Doc();

    const editorA = createCollabEditor(ydocA);
    const editorB = createCollabEditor(ydocB);

    try {
      editorA.commands.setContent(SIMPLE_REORDER_FIXTURE, { emitUpdate: false });
      syncDocs(ydocA, ydocB);

      const blockThreePosition = findTextPosition(editorA, 'Block three');
      expect(blockThreePosition).toBeGreaterThan(0);
      editorA.commands.setTextSelection(blockThreePosition);
      moveBlockUp(editorA);

      syncDocs(ydocA, ydocB);

      const finalA = editorA.getJSON();
      const finalB = editorB.getJSON();

      expect(finalA).toEqual(finalB);
      expect(getTopLevelNodeTypes(finalA)).toEqual([
        'paragraph',
        'paragraph',
        'paragraph',
      ]);
      expect(getParagraphText(finalA, 0)).toBe('Block one');
      expect(getParagraphText(finalA, 1)).toBe('Block three');
      expect(getParagraphText(finalA, 2)).toBe('Block two');
    } finally {
      editorA.destroy();
      editorB.destroy();
    }
  });
});
