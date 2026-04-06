import { describe, expect, it } from 'vitest';
import {
  extractPlainTextFromDocumentContent,
  normalizeDocumentContent,
} from './document-content';

describe('document-content helpers', () => {
  it('extracts readable plain text from tiptap JSON content', () => {
    const richContent = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Alpha beta' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Gamma' }] }],
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Delta' }] }],
            },
          ],
        },
      ],
    });

    expect(extractPlainTextFromDocumentContent(richContent, 'tiptap_json')).toBe('Alpha beta\nGamma\nDelta');
  });

  it('never surfaces raw serialized JSON when tiptap content cannot be normalized', () => {
    expect(extractPlainTextFromDocumentContent('{"type":"doc"', 'tiptap_json')).toBe('');
    expect(extractPlainTextFromDocumentContent('{"foo":"bar"}', 'tiptap_json')).toBe('');
  });

  it('preserves mislabeled plain text and returns normalized editor state', () => {
    expect(extractPlainTextFromDocumentContent('Already readable', 'tiptap_json')).toBe('Already readable');

    expect(normalizeDocumentContent('Plain text body', 'plain_text')).toEqual({
      storedContent: 'Plain text body',
      plainText: 'Plain text body',
    });
  });
});
