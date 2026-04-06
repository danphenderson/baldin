import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';

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

  it('clamps and backs off bootstrap retry delays for pending claims', () => {
    expect(resolveCollaborationBootstrapRetryDelay(null, 0)).toBe(500);
    expect(resolveCollaborationBootstrapRetryDelay(null, 2)).toBe(1000);
    expect(resolveCollaborationBootstrapRetryDelay(50, 0)).toBe(100);
    expect(resolveCollaborationBootstrapRetryDelay(5000, 0)).toBe(1000);
  });
});
