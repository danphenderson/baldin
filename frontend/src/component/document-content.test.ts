import { describe, expect, it } from 'vitest';
import {
  extractPlainTextFromDocumentContent,
  normalizeDocumentContent,
} from './document-content';
import { CELL_DOC_EXPORT_CONTRACT_FIXTURE } from './cell-doc/test/cell-doc-contract-fixtures';

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

  it('normalizes cell-doc blocks into readable plain text for compare flows', () => {
    expect(extractPlainTextFromDocumentContent(
      JSON.stringify(CELL_DOC_EXPORT_CONTRACT_FIXTURE),
      'tiptap_json',
    )).toBe([
      'Cell-doc export contract',
      '[ ] Follow up with recruiter',
      '[x] Tailor resume bullet',
      '[tip] Highlight quantified wins',
      'Use concrete metrics',
      'Interview prep notes',
      'Prepare STAR stories',
      'Company | Status',
      'Baldin Labs | Applied',
      'Closing note',
    ].join('\n'));
  });
});
