import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { UserContext } from '@/context/user-context';
import { NotificationProvider } from '@/context/notification-context';
import { createBaldinTheme } from '@/design-system/theme';
import { ToolbarHeaderContext } from '@/layout/toolbar-header-context';

vi.mock('@/service/messages', () => ({
  getConversation: vi.fn(),
  sendMessage: vi.fn(),
  editMessage: vi.fn(),
  deleteMessage: vi.fn(),
  markAsRead: vi.fn(),
}));

vi.mock('@/component/agent-surface', () => ({
  AgentEnabledMultilineField: ({
    value,
    onChange,
    placeholder,
    disabled,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
  }) => (
    <textarea
      aria-label={placeholder ?? 'Message field'}
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

import * as messagesService from '@/service/messages';
import ConversationDetailPage from '@/page/messages/conversation-detail-page';

const mockedGetConversation = vi.mocked(messagesService.getConversation);
const mockedMarkAsRead = vi.mocked(messagesService.markAsRead);

const userContextValue = {
  user: { id: 'user-1', first_name: 'Jane', last_name: 'Doe', email: 'jane@test.com' } as never,
  setUser: vi.fn(),
  token: 'test-token',
  setToken: vi.fn(),
  loading: false,
  canAccessTier: vi.fn(() => true),
};

function renderPage() {
  const theme = createBaldinTheme('dark');

  return render(
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <ToolbarHeaderContext.Provider value={vi.fn()}>
        <UserContext.Provider value={userContextValue}>
          <NotificationProvider>
            <MemoryRouter initialEntries={['/network/messages/conversation-1']}>
              <Routes>
                <Route path="/network/messages/:conversationId" element={<ConversationDetailPage />} />
              </Routes>
            </MemoryRouter>
          </NotificationProvider>
        </UserContext.Provider>
      </ToolbarHeaderContext.Provider>
    </MuiThemeProvider>,
  );
}

describe('ConversationDetailPage', () => {
  beforeEach(() => {
    mockedGetConversation.mockReset();
    mockedMarkAsRead.mockReset();
    mockedMarkAsRead.mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the top-level loading state while the conversation is loading', () => {
    mockedGetConversation.mockReturnValue(new Promise(() => {}) as never);

    renderPage();

    expect(document.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('renders inline feedback when the conversation request fails', async () => {
    mockedGetConversation.mockRejectedValue(new Error('Failed to load conversation'));

    renderPage();

    expect(await screen.findByText('Failed to load conversation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Messages' })).toBeInTheDocument();
  });

  it('renders an empty state while keeping the message composer visible for empty threads', async () => {
    mockedGetConversation.mockResolvedValue({
      id: 'conversation-1',
      type: 'direct',
      title: 'Hiring Team',
      participants: [
        { user_id: 'user-1', display_name: 'Jane Doe', avatar_uri: null },
        { user_id: 'user-2', display_name: 'Alex Recruiter', avatar_uri: null },
      ],
      messages: [],
    } as never);

    renderPage();

    expect(await screen.findByText('No messages yet')).toBeInTheDocument();
    expect(screen.getByText('Send the first one to start the conversation.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type a message…')).toBeInTheDocument();
  });
});
