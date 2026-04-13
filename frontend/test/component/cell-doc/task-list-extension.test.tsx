import React, { createRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { JSONContent } from '@tiptap/core';

import { buildCellDocExtensions } from '@/component/cell-doc/extensions';
import { EditorHarness, type EditorHarnessHandle } from './editor-harness';

const TASK_LIST_DOC: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'taskList',
      content: [
        {
          type: 'taskItem',
          attrs: { checked: false },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Buy milk' }] }],
        },
        {
          type: 'taskItem',
          attrs: { checked: true },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Write tests' }] }],
        },
      ],
    },
  ],
};

describe('task-list extension', () => {
  it('loads task list content and preserves checked attrs in JSON', async () => {
    const ref = createRef<EditorHarnessHandle>();
    render(<EditorHarness ref={ref} extensions={buildCellDocExtensions()} content={TASK_LIST_DOC} />);

    await waitFor(() => {
      expect(ref.current?.editor).toBeTruthy();
    });

    const json = ref.current!.getJSON()!;
    const taskList = json.content?.find((n) => n.type === 'taskList');
    expect(taskList).toBeTruthy();

    const items = taskList!.content ?? [];
    expect(items).toHaveLength(2);
    expect(items[0].attrs?.checked).toBe(false);
    expect(items[1].attrs?.checked).toBe(true);
  });

  it('toggles task item checked state via command', async () => {
    const user = userEvent.setup();
    const ref = createRef<EditorHarnessHandle>();
    render(<EditorHarness ref={ref} extensions={buildCellDocExtensions()} content={TASK_LIST_DOC} />);

    await waitFor(() => {
      expect(ref.current?.editor).toBeTruthy();
    });

    const [firstCheckbox] = screen.getAllByRole('checkbox');
    expect(firstCheckbox).not.toBeChecked();

    await user.click(firstCheckbox);

    await waitFor(() => {
      const json = ref.current!.getJSON()!;
      const firstItem = json.content?.[0]?.content?.[0] as JSONContent | undefined;
      expect(firstItem?.attrs?.checked).toBe(true);
    });
  });
});
