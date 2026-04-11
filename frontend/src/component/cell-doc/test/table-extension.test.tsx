import React, { createRef } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Editor } from '@tiptap/core';
import type { JSONContent } from '@tiptap/core';

import { buildCellDocExtensions } from '../extensions';
import { EditorHarness, type EditorHarnessHandle } from './editor-harness';

const TABLE_DOC: JSONContent = {
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

function findTextPosition(editor: Editor, text: string): number {
  let foundPosition = -1;

  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text === text && foundPosition === -1) {
      foundPosition = pos;
    }
  });

  return foundPosition;
}

async function showTableMenu(editor: Editor, text: string) {
  const position = findTextPosition(editor, text);
  expect(position).toBeGreaterThan(0);

  await act(async () => {
    editor.commands.focus();
    editor.commands.setTextSelection(position);
  });

  return screen.findByTestId('table-bubble-menu');
}

describe('table extension', () => {
  it('loads table content and preserves structure', async () => {
    const ref = createRef<EditorHarnessHandle>();
    render(<EditorHarness ref={ref} extensions={buildCellDocExtensions()} content={TABLE_DOC} />);

    await waitFor(() => {
      expect(ref.current?.editor).toBeTruthy();
    });

    const json = ref.current!.getJSON()!;
    const table = json.content?.find((n) => n.type === 'table');
    expect(table).toBeTruthy();

    const rows = table!.content ?? [];
    expect(rows).toHaveLength(2);
    expect(rows[0].content?.[0].type).toBe('tableHeader');
    expect(rows[1].content?.[0].type).toBe('tableCell');
  });

  it('adds a column through the contextual table controls', async () => {
    const user = userEvent.setup();
    const ref = createRef<EditorHarnessHandle>();
    render(<EditorHarness ref={ref} extensions={buildCellDocExtensions()} content={TABLE_DOC} />);

    await waitFor(() => {
      expect(ref.current?.editor).toBeTruthy();
    });

    const editor = ref.current!.editor!;

    const menu = await showTableMenu(editor, 'H1');
    await user.click(within(menu).getByRole('button', { name: 'Add column after' }));

    await waitFor(() => {
      const json = editor.getJSON();
      const table = json.content?.find((n) => n.type === 'table');
      const firstRowCells = (table!.content![0] as JSONContent).content ?? [];
      expect(firstRowCells).toHaveLength(3);
    });
  });

  it('adds a row through the contextual table controls', async () => {
    const user = userEvent.setup();
    const ref = createRef<EditorHarnessHandle>();
    render(<EditorHarness ref={ref} extensions={buildCellDocExtensions()} content={TABLE_DOC} />);

    await waitFor(() => {
      expect(ref.current?.editor).toBeTruthy();
    });

    const editor = ref.current!.editor!;

    const menu = await showTableMenu(editor, 'A2');
    await user.click(within(menu).getByRole('button', { name: 'Add row after' }));

    await waitFor(() => {
      const json = editor.getJSON();
      const table = json.content?.find((n) => n.type === 'table');
      expect(table!.content).toHaveLength(3);
    });
  });

  it('deletes a column through the contextual table controls', async () => {
    const user = userEvent.setup();
    const ref = createRef<EditorHarnessHandle>();
    render(<EditorHarness ref={ref} extensions={buildCellDocExtensions()} content={TABLE_DOC} />);

    await waitFor(() => {
      expect(ref.current?.editor).toBeTruthy();
    });

    const editor = ref.current!.editor!;

    const menu = await showTableMenu(editor, 'H1');
    await user.click(within(menu).getByRole('button', { name: 'Delete column' }));

    await waitFor(() => {
      const json = editor.getJSON();
      const table = json.content?.find((n) => n.type === 'table');
      const firstRowCells = (table!.content![0] as JSONContent).content ?? [];
      expect(firstRowCells).toHaveLength(1);
    });
  });

  it('deletes a row through the contextual table controls', async () => {
    const user = userEvent.setup();
    const ref = createRef<EditorHarnessHandle>();
    render(<EditorHarness ref={ref} extensions={buildCellDocExtensions()} content={TABLE_DOC} />);

    await waitFor(() => {
      expect(ref.current?.editor).toBeTruthy();
    });

    const editor = ref.current!.editor!;

    const menu = await showTableMenu(editor, 'A2');
    await user.click(within(menu).getByRole('button', { name: 'Delete row' }));

    await waitFor(() => {
      const json = editor.getJSON();
      const table = json.content?.find((n) => n.type === 'table');
      expect(table!.content).toHaveLength(1);
    });
  });
});
