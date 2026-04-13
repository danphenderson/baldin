import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CellDocEditor from '@/component/cell-doc/cell-doc-editor';

const useEditorMock = vi.fn();
const useCollaborativeEditorMock = vi.fn();

vi.mock('@tiptap/react', () => ({
  useEditor: (...args: unknown[]) => useEditorMock(...args),
  EditorContent: () => <div data-testid="editor-content" />,
}));

vi.mock('@/component/use-collaborative-editor', () => ({
  useCollaborativeEditor: (...args: unknown[]) => useCollaborativeEditorMock(...args),
}));

function createFakeEditor(currentJson: Record<string, unknown>) {
  return {
    commands: {
      setContent: vi.fn(),
    },
    getJSON: vi.fn(() => currentJson),
    setEditable: vi.fn(),
    isEditable: true,
  };
}

describe('CellDocEditor shell', () => {
  beforeEach(() => {
    useEditorMock.mockReset();
    useCollaborativeEditorMock.mockReset();
    useCollaborativeEditorMock.mockReturnValue({
      ydoc: null,
      provider: null,
      connected: false,
      connectionStatus: 'disconnected',
      connectedUsers: [],
      localUser: { name: 'Test User', color: '#336699' },
    });
  });

  it('keeps the editor extension graph stable when only collaborator awareness changes', () => {
    const sharedDoc = { kind: 'ydoc' };
    const sharedProvider = { kind: 'provider' };
    const localUser = { name: 'Test User', color: '#336699' };
    const fakeEditor = createFakeEditor({ type: 'doc', content: [] });

    useEditorMock.mockReturnValue(fakeEditor);
    useCollaborativeEditorMock
      .mockReturnValueOnce({
        ydoc: sharedDoc,
        provider: sharedProvider,
        connected: true,
        connectionStatus: 'connected',
        connectedUsers: [{ clientId: 1, name: 'Alice', color: '#000000' }],
        localUser,
      })
      .mockReturnValueOnce({
        ydoc: sharedDoc,
        provider: sharedProvider,
        connected: true,
        connectionStatus: 'connected',
        connectedUsers: [
          { clientId: 1, name: 'Alice', color: '#000000' },
          { clientId: 2, name: 'Bob', color: '#ffffff' },
        ],
        localUser,
      });

    const { rerender } = render(
      <CellDocEditor
        content=""
        collaborative
        documentId="doc-1"
        token="token-123"
        onChange={vi.fn()}
        readOnly
      />,
    );

    const firstExtensions = useEditorMock.mock.calls[0]?.[0]?.extensions;
    const firstDependency = useEditorMock.mock.calls[0]?.[1]?.[0];

    rerender(
      <CellDocEditor
        content=""
        collaborative
        documentId="doc-1"
        token="token-123"
        onChange={vi.fn()}
        readOnly
      />,
    );

    expect(useEditorMock.mock.calls[1]?.[0]?.extensions).toBe(firstExtensions);
    expect(useEditorMock.mock.calls[1]?.[1]?.[0]).toBe(firstDependency);
  });

  it('does not resync external content after Yjs owns the collaborative document', async () => {
    const initialDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Collaborative draft' }] }],
    };
    const replacementDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Server replacement' }] }],
    };

    const fakeEditor = createFakeEditor(initialDoc);
    useEditorMock.mockReturnValue(fakeEditor);
    useCollaborativeEditorMock.mockReturnValue({
      ydoc: { kind: 'ydoc' },
      provider: { kind: 'provider' },
      connected: true,
      connectionStatus: 'connected',
      connectedUsers: [],
      localUser: { name: 'Test User', color: '#336699' },
    });

    const { rerender } = render(
      <CellDocEditor
        content={JSON.stringify(initialDoc)}
        collaborative
        documentId="doc-1"
        token="token-123"
        externalContentKey={0}
        onChange={vi.fn()}
        readOnly
      />,
    );

    rerender(
      <CellDocEditor
        content={JSON.stringify(replacementDoc)}
        collaborative
        documentId="doc-1"
        token="token-123"
        externalContentKey={1}
        onChange={vi.fn()}
        readOnly
      />,
    );

    await waitFor(() => {
      expect(fakeEditor.commands.setContent).not.toHaveBeenCalled();
    });
  });

  it('renders collaboration status chrome for reconnecting sessions', () => {
    const fakeEditor = createFakeEditor({ type: 'doc', content: [] });
    useEditorMock.mockReturnValue(fakeEditor);
    useCollaborativeEditorMock.mockReturnValue({
      ydoc: { kind: 'ydoc' },
      provider: { kind: 'provider' },
      connected: false,
      connectionStatus: 'connecting',
      connectedUsers: [{ clientId: 1, name: 'Alice', color: '#000000' }],
      localUser: { name: 'Test User', color: '#336699' },
    });

    render(
      <CellDocEditor
        content=""
        collaborative
        documentId="doc-connecting"
        token="token-connecting"
        onChange={vi.fn()}
        readOnly
      />,
    );

    expect(screen.getByTestId('connection-status-connecting')).toBeInTheDocument();
    expect(screen.getAllByText('Reconnecting…').length).toBeGreaterThan(0);
  });

  it('notifies the page layer when the editor instance is ready', async () => {
    const fakeEditor = createFakeEditor({ type: 'doc', content: [] });
    const onEditorReady = vi.fn();

    useEditorMock.mockReturnValue(fakeEditor);

    render(
      <CellDocEditor
        content=""
        documentId="doc-1"
        token="token-123"
        onChange={vi.fn()}
        onEditorReady={onEditorReady}
        readOnly
      />,
    );

    await waitFor(() => {
      expect(onEditorReady).toHaveBeenCalledWith(fakeEditor);
    });
  });
});
