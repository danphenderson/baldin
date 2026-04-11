import { Editor } from '@tiptap/core';
import Collaboration from '@tiptap/extension-collaboration';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';

import { buildCellDocExtensions } from './cell-doc/extensions';
import {
  resolveCollaborationBootstrapRetryDelay,
  seedCollaborationDocument,
} from './collaboration-bootstrap';

describe('seedCollaborationDocument', () => {
  it('seeds a Y.Doc from saved tiptap JSON content', () => {
    const ydoc = new Y.Doc();
    const emptyUpdate = Y.encodeStateAsUpdate(new Y.Doc());
    const richContent = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Bootstrap me' }],
        },
      ],
    });

    expect(seedCollaborationDocument(ydoc, richContent)).toBe(true);
    expect(Y.encodeStateAsUpdate(ydoc).byteLength).toBeGreaterThan(emptyUpdate.byteLength);
  });

  it('rejects invalid or non-rich-text content safely', () => {
    expect(seedCollaborationDocument(new Y.Doc(), '{"type":"doc"')).toBe(false);
    expect(seedCollaborationDocument(new Y.Doc(), 'plain text')).toBe(false);
  });

  it('seeds cell-doc content when given the full cell-doc extension graph', () => {
    const ydoc = new Y.Doc();
    const richContent = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Bootstrap' }],
        },
        {
          type: 'callout',
          attrs: { callout_type: 'tip' },
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Cell-doc bootstrap' }] },
          ],
        },
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'H1' }] }] },
              ],
            },
            {
              type: 'tableRow',
              content: [
                { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A1' }] }] },
              ],
            },
          ],
        },
      ],
    });

    expect(seedCollaborationDocument(ydoc, richContent, buildCellDocExtensions())).toBe(true);

    const editor = new Editor({
      element: document.createElement('div'),
      editable: false,
      extensions: [
        ...buildCellDocExtensions(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Collaboration.configure({ document: ydoc }) as any,
      ],
    });

    try {
      const json = editor.getJSON();
      expect(json.content?.[1]?.type).toBe('callout');
      expect(json.content?.[2]?.type).toBe('table');
    } finally {
      editor.destroy();
    }
  });

  it('clamps and backs off bootstrap retry delays for pending claims', () => {
    expect(resolveCollaborationBootstrapRetryDelay(null, 0)).toBe(500);
    expect(resolveCollaborationBootstrapRetryDelay(null, 2)).toBe(1000);
    expect(resolveCollaborationBootstrapRetryDelay(50, 0)).toBe(100);
    expect(resolveCollaborationBootstrapRetryDelay(5000, 0)).toBe(1000);
  });
});
