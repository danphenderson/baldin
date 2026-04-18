import { describe, expect, it } from 'vitest';
import {
  extractPlainTextFromBlockSnapshot,
  extractPlainTextFromDocumentContent,
  flattenDocumentBlockSnapshot,
  normalizeDocumentContent,
} from '@/component/document-content';
import { CELL_DOC_EXPORT_CONTRACT_FIXTURE } from './cell-doc/cell-doc-contract-fixtures';

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

  it('extracts saved label and preview text from atomic cell-doc blocks', () => {
    expect(extractPlainTextFromDocumentContent(JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'mentionBlock',
          attrs: { label: 'Casey Blocks' },
        },
        {
          type: 'embedBlock',
          attrs: { label: 'Interview prep notes', previewText: 'Prepare STAR stories' },
        },
      ],
    }), 'tiptap_json')).toBe([
      'Casey Blocks',
      'Prepare STAR stories',
    ].join('\n'));
  });

  it('flattens block snapshots into block-aware compare rows', () => {
    const snapshot = [
      {
        id: 'block-1',
        block_type: 'paragraph',
        content: [{ type: 'text', text: 'Alpha beta' }],
        properties: {},
        position: 0,
        children: [],
      },
      {
        id: 'block-2',
        block_type: 'mention',
        content: [],
        properties: { label: 'Casey Blocks' },
        position: 1,
        children: [],
      },
      {
        id: 'block-3',
        block_type: 'embed',
        content: [],
        properties: { label: 'Interview prep', previewText: 'Prepare STAR stories' },
        position: 2,
        children: [],
      },
    ];

    expect(flattenDocumentBlockSnapshot(snapshot)).toEqual([
      { blockId: 'block-1', blockType: 'paragraph', path: '0', text: 'Alpha beta' },
      { blockId: 'block-2', blockType: 'mention', path: '1', text: 'Casey Blocks' },
      { blockId: 'block-3', blockType: 'embed', path: '2', text: 'Prepare STAR stories' },
    ]);
    expect(extractPlainTextFromBlockSnapshot(snapshot)).toBe([
      'Alpha beta',
      'Casey Blocks',
      'Prepare STAR stories',
    ].join('\n'));
  });
});
