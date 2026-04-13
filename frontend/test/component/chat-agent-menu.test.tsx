import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { UserContext } from '@/context/user-context';

const { mockedNotify } = vi.hoisted(() => ({
  mockedNotify: vi.fn(),
}));

vi.mock('@/context/notification-context', () => ({
  useNotification: () => ({ notify: mockedNotify }),
}));

vi.mock('@/service/agents', () => ({
  getAgents: vi.fn(),
}));

vi.mock('@/service/agent-chat', () => ({
  createChatSession: vi.fn(),
}));

import * as agentsService from '@/service/agents';
import * as agentChatService from '@/service/agent-chat';
import ChatAgentMenu from '@/component/chat-agent-menu';

const mockedGetAgents = vi.mocked(agentsService.getAgents);
const mockedCreateChatSession = vi.mocked(agentChatService.createChatSession);

const userContextValue = {
  user: { id: 'u1', first_name: 'Jane', last_name: 'Doe', email: 'jane@test.com' } as never,
  setUser: vi.fn(),
  token: 'test-token',
  setToken: vi.fn(),
  loading: false,
  canAccessTier: vi.fn(() => true),
};

function renderMenu() {
  return render(
    <UserContext.Provider value={userContextValue}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<ChatAgentMenu applicationId="app-123" />} />
          <Route path="/automation/agents/:agentId/chat/:sessionId" element={<div>Chat Session Shell</div>} />
        </Routes>
      </MemoryRouter>
    </UserContext.Provider>,
  );
}

describe('ChatAgentMenu', () => {
  beforeEach(() => {
    mockedGetAgents.mockReset();
    mockedCreateChatSession.mockReset();
    mockedNotify.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads enabled agents and creates an anchored chat session before navigating', async () => {
    const user = userEvent.setup();
    mockedGetAgents.mockResolvedValueOnce([
      {
        id: 'agent-1',
        name: 'Cover Letter Agent',
        description: 'Writes letters',
        kind: 'cover_letter',
        is_enabled: true,
        created_at: '2026-04-11T12:00:00Z',
        updated_at: '2026-04-11T12:00:00Z',
      },
      {
        id: 'agent-2',
        name: 'Disabled Agent',
        description: 'Disabled',
        kind: 'custom',
        is_enabled: false,
        created_at: '2026-04-11T12:00:00Z',
        updated_at: '2026-04-11T12:00:00Z',
      },
    ] as never);
    mockedCreateChatSession.mockResolvedValueOnce({
      id: 'session-1',
      created_at: '2026-04-11T12:00:00Z',
      updated_at: '2026-04-11T12:00:00Z',
      agent_id: 'agent-1',
      title: 'Acme intro',
      model_name: 'gpt-5.4-mini',
      status: 'active',
      message_count: 0,
      last_message_at: null,
      application_id: 'app-123',
      user_id: 'user-1',
      messages: [],
    } as never);

    renderMenu();

    await user.click(screen.getByRole('button', { name: 'Chat with Agent' }));

    expect(await screen.findByRole('menuitem', { name: /Cover Letter Agent/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Disabled Agent/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: /Cover Letter Agent/i }));

    await waitFor(() => {
      expect(mockedCreateChatSession).toHaveBeenCalledWith('test-token', 'agent-1', {
        application_id: 'app-123',
      });
    });
    expect(await screen.findByText('Chat Session Shell')).toBeInTheDocument();
  });

  it('surfaces launch failures through notifications', async () => {
    const user = userEvent.setup();
    mockedGetAgents.mockResolvedValueOnce([
      {
        id: 'agent-1',
        name: 'Cover Letter Agent',
        description: 'Writes letters',
        kind: 'cover_letter',
        is_enabled: true,
        created_at: '2026-04-11T12:00:00Z',
        updated_at: '2026-04-11T12:00:00Z',
      },
    ] as never);
    mockedCreateChatSession.mockRejectedValueOnce(new Error('Chat launch failed.'));

    renderMenu();

    await user.click(screen.getByRole('button', { name: 'Chat with Agent' }));
    await user.click(await screen.findByRole('menuitem', { name: /Cover Letter Agent/i }));

    await waitFor(() => {
      expect(mockedNotify).toHaveBeenCalledWith('Chat launch failed.', 'error');
    });
  });
});
