import React, { createRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { JSONContent } from '@tiptap/core';

import { buildCellDocExtensions } from '../extensions';
import { EditorHarness, type EditorHarnessHandle } from './editor-harness';

const TOGGLE_DOC: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'details',
      attrs: { open: true },
      content: [
        { type: 'detailsSummary', content: [{ type: 'text', text: 'Summary line' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Collapsed body content' }] },
      ],
    },
  ],
};

describe('toggle extension', () => {
  it('loads details/detailsSummary content and preserves open state', async () => {
    const ref = createRef<EditorHarnessHandle>();
    render(<EditorHarness ref={ref} extensions={buildCellDocExtensions()} content={TOGGLE_DOC} />);

    await waitFor(() => {
      expect(ref.current?.editor).toBeTruthy();
    });

    const json = ref.current!.getJSON()!;
    const details = json.content?.find((n) => n.type === 'details');
    expect(details).toBeTruthy();
    expect(details!.attrs?.open).toBe(true);

    const summary = details!.content?.find((n) => n.type === 'detailsSummary');
    expect(summary).toBeTruthy();
    expect(summary!.content?.[0]?.text).toBe('Summary line');
  });

  it('toggles the open attr through the disclosure control while keeping the summary visible', async () => {
    const user = userEvent.setup();
    const ref = createRef<EditorHarnessHandle>();
    render(<EditorHarness ref={ref} extensions={buildCellDocExtensions()} content={TOGGLE_DOC} />);

    await waitFor(() => {
      expect(ref.current?.editor).toBeTruthy();
    });

    const body = screen.getByText('Collapsed body content');
    expect(screen.getByText('Summary line')).toBeVisible();
    expect(body).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Collapse toggle' }));

    await waitFor(() => {
      const details = ref.current!.getJSON()!.content?.find((n) => n.type === 'details');
      expect(details!.attrs?.open).toBe(false);
    });

    expect(screen.getByTestId('toggle-summary-preview')).toHaveTextContent('Summary line');
    expect(screen.getByTestId('toggle-summary-preview')).toBeVisible();
    expect(body).not.toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Expand toggle' }));

    await waitFor(() => {
      const details = ref.current!.getJSON()!.content?.find((n) => n.type === 'details');
      expect(details!.attrs?.open).toBe(true);
    });

    expect(body).toBeVisible();
  });

  it('preserves detailsSummary and body content through serialization', async () => {
    const ref = createRef<EditorHarnessHandle>();
    render(<EditorHarness ref={ref} extensions={buildCellDocExtensions()} content={TOGGLE_DOC} />);

    await waitFor(() => {
      expect(ref.current?.editor).toBeTruthy();
    });

    const json = ref.current!.getJSON()!;
    const details = json.content?.find((n) => n.type === 'details');
    expect(details!.content).toHaveLength(2);
    expect(details!.content![0].type).toBe('detailsSummary');
    expect(details!.content![1].type).toBe('paragraph');
    expect(details!.content![1].content?.[0]?.text).toBe('Collapsed body content');
  });
});
