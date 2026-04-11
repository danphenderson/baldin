import React, { createRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { JSONContent } from '@tiptap/core';

import { buildCellDocExtensions } from '../extensions';
import { EditorHarness, type EditorHarnessHandle } from './editor-harness';

const CALLOUT_DOC: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'callout',
      attrs: { callout_type: 'info' },
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'This is an info callout.' }] },
      ],
    },
  ],
};

describe('callout extension', () => {
  it('loads callout content and preserves callout_type attr', async () => {
    const ref = createRef<EditorHarnessHandle>();
    render(<EditorHarness ref={ref} extensions={buildCellDocExtensions()} content={CALLOUT_DOC} />);

    await waitFor(() => {
      expect(ref.current?.editor).toBeTruthy();
    });

    const json = ref.current!.getJSON()!;
    const callout = json.content?.find((n) => n.type === 'callout');
    expect(callout).toBeTruthy();
    expect(callout!.attrs?.callout_type).toBe('info');
    expect(screen.getByText('This is an info callout.')).toBeVisible();
  });

  it('updates callout_type attr via the rendered picker', async () => {
    const user = userEvent.setup();
    const ref = createRef<EditorHarnessHandle>();
    render(<EditorHarness ref={ref} extensions={buildCellDocExtensions()} content={CALLOUT_DOC} />);

    await waitFor(() => {
      expect(ref.current?.editor).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: 'Callout type: Info' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Warning' }));

    await waitFor(() => {
      const callout = ref.current!.getJSON()!.content?.find((n) => n.type === 'callout');
      expect(callout!.attrs?.callout_type).toBe('warning');
    });
  });

  it('supports all four callout types through the picker', async () => {
    const user = userEvent.setup();
    const ref = createRef<EditorHarnessHandle>();
    render(<EditorHarness ref={ref} extensions={buildCellDocExtensions()} content={CALLOUT_DOC} />);

    await waitFor(() => {
      expect(ref.current?.editor).toBeTruthy();
    });

    for (const [label, calloutType] of [
      ['Info', 'info'],
      ['Warning', 'warning'],
      ['Tip', 'tip'],
      ['Danger', 'danger'],
    ] as const) {
      await user.click(screen.getByRole('button', { name: /Callout type:/ }));
      await user.click(await screen.findByRole('menuitem', { name: label }));

      await waitFor(() => {
        const callout = ref.current!.getJSON()!.content?.find((n) => n.type === 'callout');
        expect(callout!.attrs?.callout_type).toBe(calloutType);
      });
    }
  });
});
