import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { UserContext } from '../../context/user-context';
import { NotificationProvider } from '../../context/notification-context';
import { ToolbarHeaderContext } from '../../layout/toolbar-header-context';

vi.mock('../../service/messages', () => ({
  getConversations: vi.fn(),
}));

vi.mock('../../component/new-conversation-dialog', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div>compose-dialog</div> : null),
}));

import * as messagesService from '../../service/messages';
import ConversationsPage from './conversations-page';

const mockedGetConversations = vi.mocked(messagesService.getConversations);

const userContextValue = {
  user: { id: 'user-1', first_name: 'Jane', last_name: 'Doe', email: 'jane@test.com' } as never,
  setUser: vi.fn(),
  token: 'test-token',
  setToken: vi.fn(),
  loading: false,
  canAccessTier: vi.fn(() => true),
};

function renderPage() {
  return render(
    <ToolbarHeaderContext.Provider value={vi.fn()}>
      <UserContext.Provider value={userContextValue}>
        <NotificationProvider>
          <MemoryRouter>
            <ConversationsPage />
          </MemoryRouter>
        </NotificationProvider>
      </UserContext.Provider>
    </ToolbarHeaderContext.Provider>,
  );
}

describe('ConversationsPage', () => {
  beforeEach(() => {
    mockedGetConversations.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the loading state while conversations are being fetched', () => {
    mockedGetConversations.mockReturnValue(new Promise(() => {}) as never);

    renderPage();

    expect(document.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  it('renders an empty state when there are no conversations', async () => {
    mockedGetConversations.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
    } as never);

    renderPage();

    expect(await screen.findByText('No conversations yet')).toBeInTheDocument();
    expect(screen.getByText('Conversations')).toBeInTheDocument();
    expect(screen.getByText('Direct and group conversations')).toBeInTheDocument();
    expect(screen.getByText('Start a conversation from a connection\'s profile or Discover.')).toBeInTheDocument();
    expect(document.querySelectorAll('.MuiCard-root').length).toBeGreaterThan(0);
  });

  it('opens the compose dialog from the toolbar action', async () => {
    const user = userEvent.setup();
    mockedGetConversations.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
    } as never);

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'New Message' }));

    expect(screen.getByText('compose-dialog')).toBeInTheDocument();
  });
});
