import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
import AgentDetailPage from './agent-detail';

const mockedGetAgent = vi.mocked(agentsService.getAgent);

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
  instructions: 'Focus on measurable outcomes and role fit.',
  configuration: {},
});

function renderPage() {
  return render(
    <ToolbarHeaderContext.Provider value={vi.fn()}>
      <UserContext.Provider value={userContextValue}>
        <MemoryRouter initialEntries={['/automation/agents/agent-1']}>
          <Routes>
            <Route path="/automation/agents/:agentId" element={<AgentDetailPage />} />
          </Routes>
        </MemoryRouter>
      </UserContext.Provider>
    </ToolbarHeaderContext.Provider>,
  );
}

describe('AgentDetailPage', () => {
  beforeEach(() => {
    mockedGetAgent.mockReset();
    mockedNotify.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows a retry state instead of the not-found copy when loading fails', async () => {
    const user = userEvent.setup();

    mockedGetAgent
      .mockRejectedValueOnce(new Error('Network down'))
      .mockResolvedValueOnce(buildAgent() as never);

    renderPage();

    expect(await screen.findByText('Unable to load agent')).toBeInTheDocument();
    expect(screen.getByText('Network down')).toBeInTheDocument();
    expect(screen.queryByText('Agent not found')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('heading', { name: 'Cover Letter Agent' })).toBeInTheDocument();
    await waitFor(() => expect(mockedGetAgent).toHaveBeenCalledTimes(2));
    expect(mockedNotify).toHaveBeenCalledWith('Network down', 'error');
  });

  it('shows Default in the configuration section when no model override is configured', async () => {
    mockedGetAgent.mockResolvedValueOnce(buildAgent() as never);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Cover Letter Agent' })).toBeInTheDocument();
    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByText('Model')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('shows the formatted configured model label when a model override exists', async () => {
    mockedGetAgent.mockResolvedValueOnce({
      ...buildAgent(),
      configuration: { model_name: 'gpt-5.4-mini-2026-03-17' },
    } as never);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Cover Letter Agent' })).toBeInTheDocument();
    expect(screen.getByText('GPT-5.4 Mini (Balanced)')).toBeInTheDocument();
  });
});
