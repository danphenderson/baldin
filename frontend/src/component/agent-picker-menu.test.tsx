import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ChatBubbleOutline as ChatIcon } from '@mui/icons-material';
import { UserContext } from '../context/user-context';

vi.mock('../service/agents', () => ({
  getAgents: vi.fn(),
}));

import * as agentsService from '../service/agents';
import AgentPickerMenu from './agent-picker-menu';

const mockedGetAgents = vi.mocked(agentsService.getAgents);
type PickerAgent = ReturnType<typeof buildAgent>;

const userContextValue = {
  user: { id: 'u1', first_name: 'Jane', last_name: 'Doe', email: 'jane@test.com' } as never,
  setUser: vi.fn(),
  token: 'test-token',
  setToken: vi.fn(),
  loading: false,
  canAccessTier: vi.fn(() => true),
};

const buildAgent = (id: string, name: string) => ({
  id,
  name,
  description: `${name} description`,
  kind: 'custom',
  is_enabled: true,
  created_at: '2026-04-11T12:00:00Z',
  updated_at: '2026-04-11T12:00:00Z',
});

function renderMenu() {
  return render(
    <UserContext.Provider value={userContextValue}>
      <MemoryRouter>
        <AgentPickerMenu
          buttonLabel="Chat with Agent"
          busyLabel="Opening chat…"
          idleIcon={<ChatIcon />}
          onAgentSelected={vi.fn().mockResolvedValue(undefined)}
        />
      </MemoryRouter>
    </UserContext.Provider>,
  );
}

describe('AgentPickerMenu', () => {
  beforeEach(() => {
    mockedGetAgents.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading on reopen instead of leaving stale agent options interactive', async () => {
    const user = userEvent.setup();
    let resolveSecondFetch!: (agents: PickerAgent[]) => void;
    const secondFetch = new Promise<PickerAgent[]>((resolve) => {
      resolveSecondFetch = resolve;
    });

    mockedGetAgents
      .mockResolvedValueOnce([buildAgent('agent-1', 'First Agent')] as never)
      .mockImplementationOnce(() => secondFetch as never);

    renderMenu();

    await user.click(screen.getByRole('button', { name: 'Chat with Agent' }));
    expect(await screen.findByRole('menuitem', { name: /First Agent/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('menuitem', { name: /First Agent/i })).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Chat with Agent' }));

    expect(screen.getByText('Loading agents…')).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /First Agent/i })).not.toBeInTheDocument();

    resolveSecondFetch([buildAgent('agent-2', 'Second Agent')]);

    expect(await screen.findByRole('menuitem', { name: /Second Agent/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /First Agent/i })).not.toBeInTheDocument();
  });
});
