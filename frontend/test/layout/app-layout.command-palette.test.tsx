import React, { useState } from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dialog, DialogContent, DialogTitle, Button } from '@mui/material';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AppLayout from '@/layout/app-layout';
import ThemeProvider from '@/theme/theme-provider';
import { NotificationProvider } from '@/context/notification-context';
import { UserContext } from '@/context/user-context';

const { mockedLogout, mockedGetUnreadCount } = vi.hoisted(() => ({
  mockedLogout: vi.fn().mockResolvedValue(undefined),
  mockedGetUnreadCount: vi.fn().mockResolvedValue({ total_unread: 0 }),
}));

vi.mock('@/service/auth', async () => {
  const actual = await vi.importActual<typeof import('@/service/auth')>('@/service/auth');
  return {
    ...actual,
    logout: mockedLogout,
  };
});

vi.mock('@/service/messages', async () => {
  const actual = await vi.importActual<typeof import('@/service/messages')>('@/service/messages');
  return {
    ...actual,
    getUnreadCount: mockedGetUnreadCount,
  };
});

const userContextValue = {
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

const ShellPage: React.FC = () => {
  const [blockingDialogOpen, setBlockingDialogOpen] = useState(false);

  return (
    <div>
      <button type="button" data-testid="shell-target">Shell target</button>
      <input aria-label="Shell input" />
      <button type="button" onClick={() => setBlockingDialogOpen(true)}>
        Open blocking dialog
      </button>
      <Dialog open={blockingDialogOpen} onClose={() => setBlockingDialogOpen(false)}>
        <DialogTitle>Blocking Dialog</DialogTitle>
        <DialogContent>Dialog body</DialogContent>
      </Dialog>
    </div>
  );
};

function renderLayout(initialEntry = '/') {
  return render(
    <ThemeProvider>
      <NotificationProvider>
        <UserContext.Provider value={userContextValue}>
          <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<ShellPage />} />
                <Route path="applications/board" element={<div data-testid="board-page">Board page</div>} />
                <Route path="workflows" element={<div data-testid="workflows-page">Workflows page</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </UserContext.Provider>
      </NotificationProvider>
    </ThemeProvider>,
  );
}

describe('AppLayout command palette', () => {
  beforeEach(() => {
    mockedLogout.mockClear();
    mockedGetUnreadCount.mockClear();
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
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('opens with Ctrl+K and Cmd+K, then closes with Escape', async () => {
    renderLayout();

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(await screen.findByTestId('command-palette-input')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByTestId('command-palette-input')).not.toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(await screen.findByTestId('command-palette-input')).toBeInTheDocument();
  });

  it('opens with slash from non-editable shell content', async () => {
    renderLayout();

    const shellTarget = screen.getByTestId('shell-target');
    shellTarget.focus();
    fireEvent.keyDown(shellTarget, { key: '/' });

    expect(await screen.findByTestId('command-palette-input')).toBeInTheDocument();
  });

  it('does not open with slash from an input', async () => {
    renderLayout();

    const input = screen.getByRole('textbox', { name: 'Shell input' });
    input.focus();
    fireEvent.keyDown(input, { key: '/' });

    await waitFor(() => {
      expect(screen.queryByTestId('command-palette-input')).not.toBeInTheDocument();
    });
  });

  it('does not open while another dialog is already open', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: 'Open blocking dialog' }));
    expect(await screen.findByRole('dialog', { name: 'Blocking Dialog' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    await waitFor(() => {
      expect(screen.queryByTestId('command-palette-input')).not.toBeInTheDocument();
    });
  });

  it('navigates to a canonical route when Enter executes the highlighted command', async () => {
    const user = userEvent.setup();
    renderLayout();

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = await screen.findByTestId('command-palette-input');
    await user.type(input, 'board');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(await screen.findByTestId('board-page')).toBeInTheDocument();
  });

  it('opens the shared workflow dialog from the shell action', async () => {
    const user = userEvent.setup();
    renderLayout();

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = await screen.findByTestId('command-palette-input');
    await user.type(input, 'new workflow');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(await screen.findByRole('dialog', { name: 'Create Workflow' })).toBeInTheDocument();
  });
});
