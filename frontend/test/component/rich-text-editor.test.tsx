import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RichTextEditor from '@/component/rich-text-editor';

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
  };
}

describe('RichTextEditor', () => {
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

  it('applies explicit external content replacements through the resync key', async () => {
    const initialDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Alpha beta' }] }],
    };
    const replacementDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Gamma delta' }] }],
    };

    const fakeEditor = createFakeEditor(initialDoc);
    useEditorMock.mockReturnValue(fakeEditor);

    const { rerender } = render(
      <RichTextEditor
        content={JSON.stringify(initialDoc)}
        contentFormat="tiptap_json"
        externalContentKey={0}
        onChange={vi.fn()}
        readOnly
      />,
    );

    rerender(
      <RichTextEditor
        content={JSON.stringify(replacementDoc)}
        contentFormat="tiptap_json"
        externalContentKey={1}
        onChange={vi.fn()}
        readOnly
      />,
    );

    await waitFor(() => {
      expect(fakeEditor.commands.setContent).toHaveBeenCalledWith(replacementDoc, { emitUpdate: false });
    });
  });

  it('keeps the editor extension graph stable when only awareness users change', () => {
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
      <RichTextEditor
        content=""
        contentFormat="tiptap_json"
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
      <RichTextEditor
        content=""
        contentFormat="tiptap_json"
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

  it('notifies the page layer when the editor instance is ready', async () => {
    const fakeEditor = createFakeEditor({ type: 'doc', content: [] });
    const onEditorReady = vi.fn();

    useEditorMock.mockReturnValue(fakeEditor);

    render(
      <RichTextEditor
        content=""
        contentFormat="tiptap_json"
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
