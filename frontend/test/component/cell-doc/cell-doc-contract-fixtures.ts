import type { JSONContent } from '@tiptap/core';

export const CELL_DOC_TABLE_FIXTURE: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableHeader',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'H1' }] }],
            },
            {
              type: 'tableHeader',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'H2' }] }],
            },
          ],
        },
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableCell',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A1' }] }],
            },
            {
              type: 'tableCell',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A2' }] }],
            },
          ],
        },
      ],
    },
  ],
};

export const CELL_DOC_EXPORT_CONTRACT_FIXTURE: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Cell-doc export contract' }],
    },
    {
      type: 'taskList',
      content: [
        {
          type: 'taskItem',
          attrs: { checked: false },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Follow up with recruiter' }] }],
        },
        {
          type: 'taskItem',
          attrs: { checked: true },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tailor resume bullet' }] }],
        },
      ],
    },
    {
      type: 'callout',
      attrs: { callout_type: 'tip' },
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Highlight quantified wins' }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Use concrete metrics' }] }],
            },
          ],
        },
      ],
    },
    {
      type: 'details',
      attrs: { open: false },
      content: [
        {
          type: 'detailsSummary',
          content: [{ type: 'text', text: 'Interview prep notes' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Prepare STAR stories' }],
        },
      ],
    },
    {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableHeader',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Company' }] }],
            },
            {
              type: 'tableHeader',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Status' }] }],
            },
          ],
        },
        {
          type: 'tableRow',
          content: [
            {
              type: 'tableCell',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Baldin Labs' }] }],
            },
            {
              type: 'tableCell',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Applied' }] }],
            },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Closing note' }],
    },
  ],
};
