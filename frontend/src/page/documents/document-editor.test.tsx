import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { UserContext } from '../../context/user-context';
import { ToolbarHeaderContext } from '../../layout/toolbar-header-context';
import DocumentEditorPage from './document-editor';
import * as documentService from '../../service/documents';

vi.mock('../../component/rich-text-editor', () => ({
  default: ({ content, contentFormat, externalContentKey, onChange }: {
    content: string;
    contentFormat: string;
    externalContentKey?: number | string;
    onChange: (json: string, text: string) => void;
  }) => (
    <div>
      <div data-testid="mock-editor-format">{contentFormat}</div>
      <div data-testid="mock-editor-content">{content}</div>
      <div data-testid="mock-editor-sync">{String(externalContentKey ?? '')}</div>
      <button
        type="button"
        onClick={() => onChange(
          JSON.stringify({
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Rich hello world' }] }],
          }),
          'Rich hello world',
        )}
      >
        Emit rich change
      </button>
    </div>
  ),
}));

vi.mock('../../service/documents', async () => {
  const actual = await vi.importActual<typeof import('../../service/documents')>('../../service/documents');
  return {
    ...actual,
    getDocument: vi.fn(),
    getVersions: vi.fn(),
    createDocument: vi.fn(),
    createVersion: vi.fn(),
  };
});

const mockedGetDocument = vi.mocked(documentService.getDocument);
const mockedGetVersions = vi.mocked(documentService.getVersions);

function renderDocumentEditor(route: string) {
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
            <Route path="/workspace/new" element={<DocumentEditorPage />} />
            <Route path="/workspace/:id/edit" element={<DocumentEditorPage />} />
          </Routes>
        </MemoryRouter>
      </UserContext.Provider>
    </ToolbarHeaderContext.Provider>,
  );
}

describe('DocumentEditorPage', () => {
  beforeEach(() => {
    mockedGetDocument.mockReset();
    mockedGetVersions.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes tiptap JSON counts immediately on load and version switch', async () => {
    mockedGetDocument.mockResolvedValue({
      id: 'doc-1',
      title: 'Resume',
      kind: 'resume',
      viewer_role: null,
      head_version: {
        content: JSON.stringify({
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Alpha beta' }] }],
        }),
        content_format: 'tiptap_json',
        content_type: 'custom',
        version_number: 1,
      },
    } as never);

    mockedGetVersions.mockResolvedValue([
      {
        id: 'version-1',
        version_number: 1,
        created_at: '2026-04-05T12:00:00Z',
        content: JSON.stringify({
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Gamma delta epsilon' }] }],
        }),
        content_format: 'tiptap_json',
        content_type: 'custom',
      },
    ] as never);

    renderDocumentEditor('/workspace/doc-1/edit');

    expect(await screen.findByText('2 words · 10 chars')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Load version 1'));

    await waitFor(() => {
      expect(screen.getByText('3 words · 19 chars')).toBeInTheDocument();
    });
    expect(screen.getByTestId('mock-editor-sync')).toHaveTextContent('2');
  });

  it('shows readable plain text and matching counts after rich-to-plain format switch', async () => {
    renderDocumentEditor('/workspace/new');

    fireEvent.click(screen.getByRole('button', { name: 'Emit rich change' }));

    await waitFor(() => {
      expect(screen.getByText('3 words · 16 chars')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Plain Text' }));

    expect(screen.getByTestId('mock-editor-format')).toHaveTextContent('plain_text');
    expect(screen.getByTestId('mock-editor-content')).toHaveTextContent('Rich hello world');
    expect(screen.getByTestId('mock-editor-content')).not.toHaveTextContent('{"type":"doc"');
    expect(screen.getByText('3 words · 16 chars')).toBeInTheDocument();
  });
});
