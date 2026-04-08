import { Editor } from '@tiptap/core';
import Collaboration from '@tiptap/extension-collaboration';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';
import type * as Y from 'yjs';

import { parseTiptapDocument } from './document-content';

const DEFAULT_COLLABORATION_BOOTSTRAP_RETRY_DELAY_MS = 500;
const MAX_COLLABORATION_BOOTSTRAP_RETRY_DELAY_MS = 1000;
const MIN_COLLABORATION_BOOTSTRAP_RETRY_DELAY_MS = 100;

export function resolveCollaborationBootstrapRetryDelay(
  retryAfterMs?: number | null,
  attempt = 0,
): number {
  const fallbackDelay = Math.min(
    DEFAULT_COLLABORATION_BOOTSTRAP_RETRY_DELAY_MS * (2 ** attempt),
    MAX_COLLABORATION_BOOTSTRAP_RETRY_DELAY_MS,
  );

  if (typeof retryAfterMs !== 'number' || Number.isNaN(retryAfterMs)) {
    return fallbackDelay;
  }

  return Math.min(
    MAX_COLLABORATION_BOOTSTRAP_RETRY_DELAY_MS,
    Math.max(MIN_COLLABORATION_BOOTSTRAP_RETRY_DELAY_MS, Math.round(retryAfterMs)),
  );
}

export function seedCollaborationDocument(ydoc: Y.Doc, content: string): boolean {
  const tiptapDocument = parseTiptapDocument(content);
  if (!tiptapDocument || typeof document === 'undefined') {
    return false;
  }

  const editor = new Editor({
    element: document.createElement('div'),
    editable: false,
    content: undefined,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Collaboration.configure({ document: ydoc }),
    ],
  });

  try {
    editor.commands.setContent(tiptapDocument, { emitUpdate: false });
    return true;
  } finally {
    editor.destroy();
  }
}
