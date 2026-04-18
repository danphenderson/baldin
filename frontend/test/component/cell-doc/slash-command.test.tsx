/**
 * Tests for the slash-command palette extension.
 *
 * Uses EditorHarness + createRef<EditorHarnessHandle> + act/waitFor pattern.
 * The menu is rendered via ReactRenderer into document.body, so
 * screen.findByTestId / screen.queryByTestId work across the full DOM.
 */
import React, { act, createRef } from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor } from '@tiptap/core';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { buildCellDocExtensions } from '@/component/cell-doc/extensions';
import { buildBaseDocumentExtensions } from '@/component/cell-doc/extensions/base-extensions';
import { buildTableExtensions } from '@/component/cell-doc/extensions/table-extensions';
import { EditorHarness, type EditorHarnessHandle } from './editor-harness';
import AppLayout from '@/layout/app-layout';
import ThemeProvider from '@/theme/theme-provider';
import { NotificationProvider } from '@/context/notification-context';
import { UserContext } from '@/context/user-context';

const { mockedGetUnreadCount } = vi.hoisted(() => ({
  mockedGetUnreadCount: vi.fn().mockResolvedValue({ total_unread: 0 }),
}));

vi.mock('@/service/messages', async () => {
  const actual = await vi.importActual<typeof import('@/service/messages')>('@/service/messages');
  return {
    ...actual,
    getUnreadCount: mockedGetUnreadCount,
  };
});

vi.mock('@/service/auth', async () => {
  const actual = await vi.importActual<typeof import('@/service/auth')>('@/service/auth');
  return {
    ...actual,
    logout: vi.fn().mockResolvedValue(undefined),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mountEditor(extensions = buildCellDocExtensions()) {
  const ref = createRef<EditorHarnessHandle>();
  render(<EditorHarness ref={ref} extensions={extensions} />);
  return ref;
}

const shellUserContextValue = {
  user: {
    id: 'user-1',
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@test.com',
    is_superuser: false,
  } as never,
  setUser: vi.fn(),
  token: 'test-token',
  setToken: vi.fn(),
  loading: false,
  canAccessTier: vi.fn(() => true),
};

function mountEditorInShell(extensions = buildCellDocExtensions()) {
  const ref = createRef<EditorHarnessHandle>();
  render(
    <ThemeProvider>
      <NotificationProvider>
        <UserContext.Provider value={shellUserContextValue}>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<EditorHarness ref={ref} extensions={extensions} />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </UserContext.Provider>
      </NotificationProvider>
    </ThemeProvider>,
  );
  return ref;
}

async function waitForEditor(ref: React.RefObject<EditorHarnessHandle | null>) {
  await waitFor(() => expect(ref.current?.editor).toBeTruthy());
  return ref.current!.editor!;
}

/**
 * Insert '/' into the editor via TipTap commands (bypasses jsdom
 * contenteditable limitations while still going through ProseMirror
 * transaction dispatch so the Suggestion plugin reacts).
 */
function typeSlash(editor: Editor) {
  act(() => {
    editor.commands.focus();
    editor.commands.insertContent('/');
  });
}

function editorDom(editor: Editor): HTMLElement {
  return editor.view.dom as HTMLElement;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('slash-command extension', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn(() => 'light'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
    });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('open: typing / in an empty block shows the palette', async () => {
    const ref = mountEditor();
    const editor = await waitForEditor(ref);

    typeSlash(editor);

    await screen.findByTestId('slash-command-menu');
  });

  it('filter: typing /head shows only heading items', async () => {
    const ref = mountEditor();
    const editor = await waitForEditor(ref);

    act(() => {
      editor.commands.focus();
      editor.commands.insertContent('/head');
    });

    const menu = await screen.findByTestId('slash-command-menu');
    const items = menu.querySelectorAll('[role="option"]');
    expect(items.length).toBeGreaterThan(0);
    items.forEach((item) => {
      expect(item.textContent?.toLowerCase()).toMatch(/heading/i);
    });
  });

  it('select-keyboard: ArrowDown + Enter inserts the selected block', async () => {
    const ref = mountEditor();
    const editor = await waitForEditor(ref);

    typeSlash(editor);
    await screen.findByTestId('slash-command-menu');

    // ArrowDown → selects "Heading 1" (index 1, since index 0 is "Text")
    fireEvent.keyDown(editorDom(editor), { key: 'ArrowDown', code: 'ArrowDown' });
    // Enter → execute command
    fireEvent.keyDown(editorDom(editor), { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      const json = ref.current!.getJSON()!;
      const hasHeading = json.content?.some((n) => n.type === 'heading');
      expect(hasHeading).toBe(true);
    });
  });

  it('select-click: clicking "Task List" item inserts a task list', async () => {
    const ref = mountEditor();
    const editor = await waitForEditor(ref);

    typeSlash(editor);
    await screen.findByTestId('slash-command-menu');

    // Click the "Task List" list item button
    const taskListButton = await screen.findByText('Task List');
    await userEvent.click(taskListButton);

    await waitFor(() => {
      const json = ref.current!.getJSON()!;
      const hasTaskList = json.content?.some((n) => n.type === 'taskList');
      expect(hasTaskList).toBe(true);
    });
  });

  it('select-click: clicking "Agent Task" inserts an agent task block', async () => {
    const ref = mountEditor();
    const editor = await waitForEditor(ref);

    typeSlash(editor);
    await screen.findByTestId('slash-command-menu');

    const agentTaskButton = await screen.findByText('Agent Task');
    await userEvent.click(agentTaskButton);

    await waitFor(() => {
      const json = ref.current!.getJSON()!;
      const hasAgentTask = json.content?.some((n) => n.type === 'agentTask');
      expect(hasAgentTask).toBe(true);
    });
  });

  it('select-click: clicking "Mention" still inserts a mention block', async () => {
    const ref = mountEditor();
    const editor = await waitForEditor(ref);

    act(() => {
      editor.commands.focus();
      editor.commands.insertContent('/mention');
    });

    await screen.findByTestId('slash-command-menu');

    const mentionButton = await screen.findByText('Mention');
    await userEvent.click(mentionButton);

    await waitFor(() => {
      const json = ref.current!.getJSON()!;
      const hasMentionBlock = json.content?.some((n) => n.type === 'mentionBlock');
      expect(hasMentionBlock).toBe(true);
    });
  });

  it('dismiss-escape: pressing Escape closes the palette', async () => {
    const ref = mountEditor();
    const editor = await waitForEditor(ref);

    typeSlash(editor);
    await screen.findByTestId('slash-command-menu');

    fireEvent.keyDown(editorDom(editor), { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByTestId('slash-command-menu')).not.toBeInTheDocument();
    });
  });

  it('dismiss-click-away: blurring the editor closes the palette', async () => {
    const ref = mountEditor();
    const editor = await waitForEditor(ref);

    typeSlash(editor);
    await screen.findByTestId('slash-command-menu');

    // Blur the editor (simulates a click outside)
    act(() => {
      fireEvent.blur(editorDom(editor));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('slash-command-menu')).not.toBeInTheDocument();
    });
  });

  it('isolation: extensions without SlashCommand do not activate the palette', async () => {
    // Include table extensions so CellDocEditorSurface/TableBubbleMenu work correctly,
    // but omit SlashCommand — that is the critical isolation assertion.
    const baseExtensions = [
      ...buildBaseDocumentExtensions(),
      ...buildTableExtensions(),
    ];
    const ref = mountEditor(baseExtensions);
    const editor = await waitForEditor(ref);

    act(() => {
      editor.commands.focus();
      editor.commands.insertContent('/');
    });

    // Give any async suggestion startup time to potentially fire
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(screen.queryByTestId('slash-command-menu')).not.toBeInTheDocument();
  });

  it('keeps the global command palette closed when slash is typed inside the editor shell', async () => {
    const ref = mountEditorInShell();
    const editor = await waitForEditor(ref);

    fireEvent.keyDown(editorDom(editor), { key: '/', code: 'Slash' });
    typeSlash(editor);

    await screen.findByTestId('slash-command-menu');
    expect(screen.queryByTestId('command-palette-input')).not.toBeInTheDocument();
  });
});
