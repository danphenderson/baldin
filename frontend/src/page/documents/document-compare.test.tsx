import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { UserContext } from '../../context/user-context';
import { ToolbarHeaderContext } from '../../layout/toolbar-header-context';
import { CELL_DOC_EXPORT_CONTRACT_FIXTURE } from '../../component/cell-doc/test/cell-doc-contract-fixtures';
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
    const rightFixture = JSON.parse(JSON.stringify(CELL_DOC_EXPORT_CONTRACT_FIXTURE)) as {
      content: Array<Record<string, unknown>>;
    };
    ((rightFixture.content[4].content as Array<Record<string, unknown>>)[1].content as Array<Record<string, unknown>>)[1]
      .content = [{
      type: 'paragraph',
      content: [{ type: 'text', text: 'Interviewing' }],
    }];

    const leftVersion = createVersion('version-left', 1, CELL_DOC_EXPORT_CONTRACT_FIXTURE as Record<string, unknown>);
    const rightVersion = createVersion('version-right', 2, rightFixture as unknown as Record<string, unknown>);

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

    expect(await screen.findByText('Cell-doc blocks are compared as normalized plain text in this preview scope.')).toBeInTheDocument();
    expect(screen.getByText('[ ] Follow up with recruiter')).toBeInTheDocument();
    expect(screen.getByText('Baldin Labs | Applied')).toBeInTheDocument();
    expect(screen.getByText('Baldin Labs | Interviewing')).toBeInTheDocument();
    expect(screen.getByText('+1 added')).toBeInTheDocument();
    expect(screen.getByText(/1 removed/)).toBeInTheDocument();
  });
});
