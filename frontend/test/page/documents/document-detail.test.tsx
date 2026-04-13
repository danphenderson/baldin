import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { UserContext } from '@/context/user-context';
import { ToolbarHeaderContext } from '@/layout/toolbar-header-context';
import { CELL_DOC_EXPORT_CONTRACT_FIXTURE } from '../../component/cell-doc/cell-doc-contract-fixtures';
import DocumentDetailPage from '@/page/documents/document-detail';
import * as documentService from '@/service/documents';

vi.mock('@/component/rich-text-editor', () => ({
  default: ({ content, readOnly }: { content: string; readOnly?: boolean }) => (
    <div data-testid="mock-rich-text-editor" data-read-only={String(!!readOnly)}>
      {content}
    </div>
  ),
}));

vi.mock('@/service/documents', async () => {
  const actual = await vi.importActual<typeof import('@/service/documents')>('@/service/documents');
  return {
    ...actual,
    getDocument: vi.fn(),
    getDocumentActivity: vi.fn(),
  };
});

const mockedGetDocument = vi.mocked(documentService.getDocument);
const mockedGetDocumentActivity = vi.mocked(documentService.getDocumentActivity);

function createVersion(
  overrides: Partial<documentService.DocumentVersionRead> = {},
): documentService.DocumentVersionRead {
  return {
    id: 'version-1',
    name: null,
    version_number: 1,
    created_at: '2026-04-11T12:00:00Z',
    content: JSON.stringify(CELL_DOC_EXPORT_CONTRACT_FIXTURE),
    content_format: 'tiptap_json',
    content_type: 'custom',
    change_summary: 'Initial draft',
    source_file: null,
    ...overrides,
  } as documentService.DocumentVersionRead;
}

function createDocument(
  kind: documentService.DocumentKind,
  overrides: Partial<documentService.DocumentDetailRead> = {},
): documentService.DocumentDetailRead {
  const version = createVersion();

  return {
    id: 'doc-1',
    title: 'Job search playbook',
    kind,
    status: 'draft',
    is_pinned: false,
    version_count: 1,
    created_at: '2026-04-10T10:00:00Z',
    updated_at: '2026-04-11T12:00:00Z',
    viewer_role: null,
    head_version: version,
    versions: [version],
    owner_full_name: 'Owner Example',
    owner_email: 'owner@example.com',
    shared_by_full_name: 'Sharer Example',
    shared_by_email: 'sharer@example.com',
    shared_at: '2026-04-11T12:05:00Z',
    share_updated_at: '2026-04-11T12:05:00Z',
    ...overrides,
  } as documentService.DocumentDetailRead;
}

function renderDocumentDetail(route = '/workspace/doc-1') {
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
            <Route path="/workspace/:id" element={<DocumentDetailPage />} />
          </Routes>
        </MemoryRouter>
      </UserContext.Provider>
    </ToolbarHeaderContext.Provider>,
  );
}

describe('DocumentDetailPage', () => {
  beforeEach(() => {
    mockedGetDocument.mockReset();
    mockedGetDocumentActivity.mockReset();
    mockedGetDocumentActivity.mockResolvedValue([] as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders shared cell-doc version previews with the read-only cell-doc editor', async () => {
    const version = createVersion();
    mockedGetDocument.mockResolvedValue(createDocument('cell_doc', {
      viewer_role: 'viewer',
      head_version: version,
      versions: [version],
    }) as never);

    const user = userEvent.setup();
    renderDocumentDetail();

    expect(await screen.findByText('Shared context')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit document' })).toBeDisabled();

    await user.click(screen.getByLabelText('Expand version 1'));

    expect(await screen.findByText('Follow up with recruiter')).toBeInTheDocument();
    expect(screen.getByText('Highlight quantified wins')).toBeInTheDocument();
    expect(await screen.findByTestId('toggle-summary-preview')).toHaveTextContent('Interview prep notes');
    expect(screen.getByText('Baldin Labs')).toBeInTheDocument();
    expect(screen.queryByLabelText('Block actions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-rich-text-editor')).not.toBeInTheDocument();
  });

  it('keeps non-cell-doc version previews on the read-only rich-text editor', async () => {
    const version = createVersion({
      content: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Resume summary paragraph' }],
          },
        ],
      }),
    });
    mockedGetDocument.mockResolvedValue(createDocument('resume', {
      head_version: version,
      versions: [version],
    }) as never);

    const user = userEvent.setup();
    renderDocumentDetail();

    expect(await screen.findByText('Version History (1)')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Expand version 1'));

    expect(await screen.findByTestId('mock-rich-text-editor')).toHaveAttribute('data-read-only', 'true');
    expect(screen.getByTestId('mock-rich-text-editor')).toHaveTextContent('Resume summary paragraph');
  });
});
