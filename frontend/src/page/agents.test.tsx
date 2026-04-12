import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { UserContext } from '../context/user-context';
import { ToolbarHeaderContext } from '../layout/toolbar-header-context';

const { mockedNotify } = vi.hoisted(() => ({
  mockedNotify: vi.fn(),
}));

vi.mock('../context/notification-context', () => ({
  useNotification: () => ({ notify: mockedNotify }),
}));

vi.mock('../service/agents', () => ({
  getAgents: vi.fn(),
  getAgent: vi.fn(),
  createAgent: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
  getAgentRuns: vi.fn(),
  runAgent: vi.fn(),
}));

import * as agentsService from '../service/agents';
import AgentsPage from './agents';

const mockedGetAgents = vi.mocked(agentsService.getAgents);

const userContextValue = {
  user: { id: 'u1', first_name: 'Jane', last_name: 'Doe', email: 'jane@test.com' } as never,
  setUser: vi.fn(),
  token: 'test-token',
  setToken: vi.fn(),
  loading: false,
  canAccessTier: vi.fn(() => true),
};

const buildAgent = () => ({
  id: 'agent-1',
  created_at: '2026-04-11T12:00:00Z',
  updated_at: '2026-04-11T12:00:00Z',
  user_id: 'user-1',
  name: 'Cover Letter Agent',
  description: 'Drafts reusable workspace sessions for applications.',
  kind: 'cover_letter',
  is_enabled: true,
});

function renderPage() {
  return render(
    <ToolbarHeaderContext.Provider value={vi.fn()}>
      <UserContext.Provider value={userContextValue}>
        <MemoryRouter>
          <AgentsPage />
        </MemoryRouter>
      </UserContext.Provider>
    </ToolbarHeaderContext.Provider>,
  );
}

describe('AgentsPage', () => {
  beforeEach(() => {
    mockedGetAgents.mockReset();
    mockedNotify.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows a retry state instead of the empty-state copy when the list fails to load', async () => {
    const user = userEvent.setup();

    mockedGetAgents
      .mockRejectedValueOnce(new Error('Network down'))
      .mockResolvedValueOnce([buildAgent()] as never);

    renderPage();

    expect(await screen.findByText('Unable to load agents')).toBeInTheDocument();
    expect(screen.getByText('Network down')).toBeInTheDocument();
    expect(screen.queryByText('Create your first agent')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Cover Letter Agent')).toBeInTheDocument();
    await waitFor(() => expect(mockedGetAgents).toHaveBeenCalledTimes(2));
    expect(mockedNotify).toHaveBeenCalledWith('Network down', 'error');
  });

  it('describes both Run Agent workspaces and Chat with Agent conversations in the empty state', async () => {
    mockedGetAgents.mockResolvedValueOnce([] as never);

    renderPage();

    expect(await screen.findByText('Create your first agent')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Agents support both Run Agent workspaces and Chat with Agent conversations for job-search tasks like cover letters, follow-ups, and outreach.',
      ),
    ).toBeInTheDocument();
  });
});
