import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { UserContext } from '../../context/user-context';
import { ToolbarHeaderContext } from '../../layout/toolbar-header-context';
import DocumentComparePage from './document-compare';
import * as documentService from '../../service/documents';

vi.mock('../../service/documents', async () => {
  const actual = await vi.importActual<typeof import('../../service/documents')>('../../service/documents');
  return {
    ...actual,
    getDocument: vi.fn(),
    getVersion: vi.fn(),
    createVersion: vi.fn(),
  };
});

const mockedGetDocument = vi.mocked(documentService.getDocument);
const mockedGetVersion = vi.mocked(documentService.getVersion);

function createVersion(
  id: string,
  versionNumber: number,
  content: Record<string, unknown>,
  blockSnapshot: documentService.DocumentVersionRead['block_snapshot'],
  overrides: Partial<documentService.DocumentVersionRead> = {},
): documentService.DocumentVersionRead {
  return {
    id,
    name: null,
    version_number: versionNumber,
    created_at: `2026-04-1${versionNumber}T12:00:00Z`,
    content: JSON.stringify(content),
    content_format: 'tiptap_json',
    content_type: 'custom',
    change_summary: `Version ${versionNumber}`,
    source_file: null,
    block_snapshot: blockSnapshot,
    ...overrides,
  } as documentService.DocumentVersionRead;
}

function renderCompare(route = '/workspace/doc-1/compare?left=version-left&right=version-right') {
  return render(
    <ToolbarHeaderContext.Provider value={vi.fn()}>
      <UserContext.Provider
        value={{
          user: null,
          setUser: vi.fn(),
          token: 'token-123',
          setToken: vi.fn(),
          loading: false,
          canAccessTier: vi.fn(() => true),
        }}
      >
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/workspace/:id/compare" element={<DocumentComparePage />} />
          </Routes>
        </MemoryRouter>
      </UserContext.Provider>
    </ToolbarHeaderContext.Provider>,
  );
}

describe('DocumentComparePage', () => {
  beforeEach(() => {
    mockedGetDocument.mockReset();
    mockedGetVersion.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('compares cell-doc versions using normalized block text from the shared helper', async () => {
    const leftFixture = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { blockId: 'block-1' },
          content: [{ type: 'text', text: 'Cell-doc export contract' }],
        },
        {
          type: 'taskList',
          attrs: { blockId: 'list-1' },
          content: [
            {
              type: 'taskItem',
              attrs: { blockId: 'block-2', checked: false },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Follow up with recruiter' }] }],
            },
          ],
        },
        {
          type: 'embedBlock',
          attrs: {
            blockId: 'block-3',
            label: 'Interview prep notes',
            previewText: 'Prepare STAR stories',
          },
        },
      ],
    };
    const rightFixture = {
      type: 'doc',
      content: [
        {
          type: 'taskList',
          attrs: { blockId: 'list-1' },
          content: [
            {
              type: 'taskItem',
              attrs: { blockId: 'block-2', checked: false },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Follow up with recruiter' }] }],
            },
          ],
        },
        {
          type: 'paragraph',
          attrs: { blockId: 'block-1' },
          content: [{ type: 'text', text: 'Cell-doc export contract updated' }],
        },
        {
          type: 'embedBlock',
          attrs: {
            blockId: 'block-3',
            label: 'Interview prep notes',
            previewText: 'Prepare STAR stories',
          },
        },
        {
          type: 'mentionBlock',
          attrs: {
            blockId: 'block-4',
            label: 'Casey Blocks',
          },
        },
      ],
    };
    const leftSnapshot = [
      {
        id: 'block-1',
        block_type: 'paragraph',
        content: [{ type: 'text', text: 'Cell-doc export contract' }],
        properties: {},
        position: 0,
        children: [],
      },
      {
        id: 'list-1',
        block_type: 'task_list',
        content: [],
        properties: {},
        position: 1,
        children: [
          {
            id: 'block-2',
            block_type: 'task_item',
            content: [{ type: 'text', text: 'Follow up with recruiter' }],
            properties: { checked: false },
            position: 0,
            children: [],
          },
        ],
      },
      {
        id: 'block-3',
        block_type: 'embed',
        content: [],
        properties: { label: 'Interview prep notes', previewText: 'Prepare STAR stories' },
        position: 2,
        children: [],
      },
    ] as documentService.DocumentVersionRead['block_snapshot'];
    const rightSnapshot = [
      {
        id: 'list-1',
        block_type: 'task_list',
        content: [],
        properties: {},
        position: 0,
        children: [
          {
            id: 'block-2',
            block_type: 'task_item',
            content: [{ type: 'text', text: 'Follow up with recruiter' }],
            properties: { checked: false },
            position: 0,
            children: [],
          },
        ],
      },
      {
        id: 'block-1',
        block_type: 'paragraph',
        content: [{ type: 'text', text: 'Cell-doc export contract updated' }],
        properties: {},
        position: 1,
        children: [],
      },
      {
        id: 'block-3',
        block_type: 'embed',
        content: [],
        properties: { label: 'Interview prep notes', previewText: 'Prepare STAR stories' },
        position: 2,
        children: [],
      },
      {
        id: 'block-4',
        block_type: 'mention',
        content: [],
        properties: { label: 'Casey Blocks' },
        position: 3,
        children: [],
      },
    ] as documentService.DocumentVersionRead['block_snapshot'];

    const leftVersion = createVersion('version-left', 1, leftFixture as Record<string, unknown>, leftSnapshot);
    const rightVersion = createVersion('version-right', 2, rightFixture as unknown as Record<string, unknown>, rightSnapshot);

    mockedGetDocument.mockResolvedValue({
      id: 'doc-1',
      title: 'Cell Doc Compare',
      kind: 'cell_doc',
      viewer_role: null,
    } as documentService.DocumentDetailRead);
    mockedGetVersion.mockImplementation(async (_token, _docId, versionId) => (
      versionId === 'version-left' ? leftVersion : rightVersion
    ));

    renderCompare();

    expect(await screen.findByText('Cell-doc versions are compared block-by-block from saved block snapshots.')).toBeInTheDocument();
    expect(screen.getAllByText('Cell-doc export contract updated').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Casey Blocks').length).toBeGreaterThan(0);
    expect(screen.getByText('+1 added')).toBeInTheDocument();
    expect(screen.getByText('1 changed')).toBeInTheDocument();
    expect(screen.getByText('1 moved')).toBeInTheDocument();
  });
});
