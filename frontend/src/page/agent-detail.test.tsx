import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
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

vi.mock('../service/agent-chat', () => ({
  getAvailableModels: vi.fn(),
  getChatSessions: vi.fn(),
  createChatSession: vi.fn(),
  updateChatSession: vi.fn(),
  deleteChatSession: vi.fn(),
}));

import * as agentsService from '../service/agents';
import * as agentChatService from '../service/agent-chat';
import AgentDetailPage from './agent-detail';

const mockedGetAgent = vi.mocked(agentsService.getAgent);
const mockedGetAgentRuns = vi.mocked(agentsService.getAgentRuns);
const mockedGetAvailableModels = vi.mocked(agentChatService.getAvailableModels);
const mockedGetChatSessions = vi.mocked(agentChatService.getChatSessions);
const mockedCreateChatSession = vi.mocked(agentChatService.createChatSession);
const mockedUpdateChatSession = vi.mocked(agentChatService.updateChatSession);
const mockedDeleteChatSession = vi.mocked(agentChatService.deleteChatSession);

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

const buildChatSession = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'session-1',
  created_at: '2026-04-11T12:00:00Z',
  updated_at: '2026-04-11T12:10:00Z',
  agent_id: 'agent-1',
  title: 'Acme intro',
  model_name: 'gpt-5.4-mini',
  status: 'active',
  message_count: 3,
  last_message_at: '2026-04-11T12:09:00Z',
  application_id: 'app-1',
  ...overrides,
});

function renderPage() {
  return render(
    <ToolbarHeaderContext.Provider value={vi.fn()}>
      <UserContext.Provider value={userContextValue}>
        <MemoryRouter initialEntries={['/automation/agents/agent-1']}>
          <Routes>
            <Route path="/automation/agents/:agentId" element={<AgentDetailPage />} />
            <Route path="/automation/agents/:agentId/chat/:sessionId" element={<div>Chat Session Shell</div>} />
            <Route path="/applications/:applicationId" element={<div>Application Page</div>} />
          </Routes>
        </MemoryRouter>
      </UserContext.Provider>
    </ToolbarHeaderContext.Provider>,
  );
}

describe('AgentDetailPage', () => {
  beforeEach(() => {
    mockedGetAgent.mockReset();
    mockedGetAgentRuns.mockReset();
    mockedGetAvailableModels.mockReset();
    mockedGetChatSessions.mockReset();
    mockedCreateChatSession.mockReset();
    mockedUpdateChatSession.mockReset();
    mockedDeleteChatSession.mockReset();
    mockedNotify.mockReset();

    mockedGetAgentRuns.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 10,
    } as never);
    mockedGetAvailableModels.mockResolvedValue({
      default_model_name: 'gpt-5.4-nano-2026-03-17',
      default_model_label: 'GPT-5.4 Nano',
      models: [
        { name: 'gpt-5.4-nano-2026-03-17', label: 'GPT-5.4 Nano' },
        { name: 'gpt-5.4-mini-2026-03-17', label: 'GPT-5.4 Mini' },
      ],
    } as never);
    mockedGetChatSessions.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 500,
    } as never);
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

  it('shows the exact default model wording when no model override is configured', async () => {
    mockedGetAgent.mockResolvedValueOnce(buildAgent() as never);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Cover Letter Agent' })).toBeInTheDocument();
    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByText('Model')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('Default uses GPT-5.4 Nano (Fast).')).toBeInTheDocument();
  });

  it('shows the formatted configured model label when a model override exists', async () => {
    mockedGetAgent.mockResolvedValueOnce({
      ...buildAgent(),
      configuration: { model_name: 'gpt-5.4-mini-2026-03-17' },
    } as never);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Cover Letter Agent' })).toBeInTheDocument();
    expect(screen.getByText('GPT-5.4 Mini (Balanced)')).toBeInTheDocument();
    expect(screen.queryByText(/Default uses /)).not.toBeInTheDocument();
  });

  it('falls back to generic Default wording when default model metadata fails to load', async () => {
    mockedGetAgent.mockResolvedValueOnce(buildAgent() as never);
    mockedGetAvailableModels.mockRejectedValueOnce(new Error('Model list unavailable'));

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Cover Letter Agent' })).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('Default uses the system default model for this agent.')).toBeInTheDocument();
  });

  it('renders the chat-session empty state with a New Chat call to action', async () => {
    mockedGetAgent.mockResolvedValueOnce(buildAgent() as never);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Cover Letter Agent' })).toBeInTheDocument();
    expect(screen.getByText('Chat Sessions')).toBeInTheDocument();
    expect(screen.getByText('Start a conversation with this agent')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'New Chat' }).length).toBeGreaterThan(0);
  });

  it('shows a retry state instead of the empty state when chat-session loading fails', async () => {
    mockedGetAgent.mockResolvedValueOnce(buildAgent() as never);
    mockedGetChatSessions.mockRejectedValueOnce(new Error('Chat sessions unavailable'));

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Cover Letter Agent' })).toBeInTheDocument();
    expect(await screen.findByText('Unable to load chat sessions')).toBeInTheDocument();
    expect(screen.getByText('Chat sessions unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Start a conversation with this agent')).not.toBeInTheDocument();
    expect(mockedNotify).toHaveBeenCalledWith('Chat sessions unavailable', 'error');
  });

  it('lists active chat sessions by recency and links anchored sessions back to the application', async () => {
    mockedGetAgent.mockResolvedValueOnce(buildAgent() as never);
    mockedGetChatSessions.mockResolvedValueOnce({
      items: [
        buildChatSession({
          id: 'session-latest',
          title: 'Latest session',
          last_message_at: '2026-04-11T12:12:00Z',
        }),
        buildChatSession({
          id: 'session-earlier',
          title: 'Earlier session',
          last_message_at: '2026-04-11T12:05:00Z',
          application_id: null,
        }),
        buildChatSession({
          id: 'session-archived',
          title: 'Archived session',
          status: 'archived',
          last_message_at: '2026-04-11T12:15:00Z',
        }),
      ],
      total: 3,
      page: 1,
      page_size: 500,
    } as never);

    renderPage();

    const latest = await screen.findByText('Latest session');
    const earlier = screen.getByText('Earlier session');
    const latestCard = latest.closest('.MuiPaper-root');
    expect(screen.queryByText('Archived session')).not.toBeInTheDocument();
    expect(latestCard).not.toBeNull();
    expect(latest.compareDocumentPosition(earlier) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Application' })).toBeInTheDocument();
    expect(within(latestCard as HTMLElement).getByText('3 messages')).toBeInTheDocument();
  });

  it('filters archived sessions and updates session status through archive and restore actions', async () => {
    const user = userEvent.setup();
    mockedGetAgent.mockResolvedValueOnce(buildAgent() as never);
    mockedGetChatSessions.mockResolvedValueOnce({
      items: [
        buildChatSession({
          id: 'session-active',
          title: 'Active session',
          status: 'active',
        }),
        buildChatSession({
          id: 'session-archived',
          title: 'Archived session',
          status: 'archived',
        }),
      ],
      total: 2,
      page: 1,
      page_size: 500,
    } as never);
    mockedUpdateChatSession
      .mockResolvedValueOnce({
        ...buildChatSession({
          id: 'session-active',
          title: 'Active session',
          status: 'archived',
        }),
        user_id: 'user-1',
        messages: [],
      } as never)
      .mockResolvedValueOnce({
        ...buildChatSession({
          id: 'session-archived',
          title: 'Archived session',
          status: 'active',
        }),
        user_id: 'user-1',
        messages: [],
      } as never);

    renderPage();

    expect(await screen.findByText('Active session')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Archive' }));
    expect(mockedUpdateChatSession).toHaveBeenCalledWith('test-token', 'session-active', { status: 'archived' });
    expect(mockedNotify).toHaveBeenCalledWith('Chat archived');
    expect(screen.queryByText('Active session')).not.toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Filter' }));
    await user.click(await screen.findByRole('option', { name: 'Archived' }));

    const archivedSessionTitle = await screen.findByText('Archived session');
    const archivedSessionCard = archivedSessionTitle.closest('.MuiPaper-root');
    expect(archivedSessionCard).not.toBeNull();
    await user.click(within(archivedSessionCard as HTMLElement).getByRole('button', { name: 'Restore' }));
    expect(mockedUpdateChatSession).toHaveBeenLastCalledWith('test-token', 'session-archived', { status: 'active' });
    expect(mockedNotify).toHaveBeenCalledWith('Chat restored');
  });

  it('deletes chat sessions after confirmation', async () => {
    const user = userEvent.setup();
    mockedGetAgent.mockResolvedValueOnce(buildAgent() as never);
    mockedGetChatSessions.mockResolvedValueOnce({
      items: [buildChatSession({ id: 'session-delete', title: 'Delete me' })],
      total: 1,
      page: 1,
      page_size: 500,
    } as never);
    mockedDeleteChatSession.mockResolvedValueOnce(undefined);

    renderPage();

    expect(await screen.findByText('Delete me')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Delete chat session')).toBeInTheDocument();
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[deleteButtons.length - 1] as HTMLElement);

    await waitFor(() => {
      expect(mockedDeleteChatSession).toHaveBeenCalledWith('test-token', 'session-delete');
    });
    expect(screen.queryByText('Delete me')).not.toBeInTheDocument();
    expect(mockedNotify).toHaveBeenCalledWith('Chat deleted');
  });

  it('hides rerun actions for chat-exported runs', async () => {
    mockedGetAgent.mockResolvedValueOnce(buildAgent() as never);
    mockedGetAgentRuns.mockResolvedValueOnce({
      items: [
        {
          id: 'run-chat-export',
          created_at: '2026-04-11T12:00:00Z',
          updated_at: '2026-04-11T12:05:00Z',
          agent_id: 'agent-1',
          user_id: 'user-1',
          application_id: 'app-1',
          chat_session_id: 'session-1',
          parent_run_id: null,
          trigger_kind: 'manual',
          status: 'completed',
          session_document_id: 'doc-1',
          session_version_id: 'version-1',
          session_document: {
            id: 'doc-1',
            title: 'Chat export',
            kind: 'cell_doc',
            status: 'draft',
          },
          session_version: {
            id: 'version-1',
            created_at: '2026-04-11T12:05:00Z',
            updated_at: '2026-04-11T12:05:00Z',
            version_number: 1,
            name: 'v1',
            content_format: 'tiptap_json',
          },
          error_summary: null,
          completed_at: '2026-04-11T12:05:00Z',
        },
      ],
      total: 1,
      page: 1,
      page_size: 10,
    } as never);

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Cover Letter Agent' })).toBeInTheDocument();
    expect(screen.getByText('Chat export')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rerun' })).not.toBeInTheDocument();
  });

  it('creates a new chat session and navigates to the chat shell route', async () => {
    const user = userEvent.setup();
    mockedGetAgent.mockResolvedValueOnce(buildAgent() as never);
    mockedGetChatSessions.mockResolvedValueOnce({
      items: [buildChatSession({ id: 'session-existing', title: 'Existing session' })],
      total: 1,
      page: 1,
      page_size: 500,
    } as never);
    mockedCreateChatSession.mockResolvedValueOnce({
      ...buildChatSession({ id: 'session-new', title: 'New session' }),
      user_id: 'user-1',
      messages: [],
    } as never);

    renderPage();

    expect(await screen.findByText('Existing session')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'New Chat' }));

    await waitFor(() => {
      expect(mockedCreateChatSession).toHaveBeenCalledWith('test-token', 'agent-1', {});
    });
    expect(await screen.findByText('Chat Session Shell')).toBeInTheDocument();
  });

  it('navigates to the selected existing chat session', async () => {
    const user = userEvent.setup();
    mockedGetAgent.mockResolvedValueOnce(buildAgent() as never);
    mockedGetChatSessions.mockResolvedValueOnce({
      items: [buildChatSession({ id: 'session-open', title: 'Resume session' })],
      total: 1,
      page: 1,
      page_size: 500,
    } as never);

    renderPage();

    await user.click(await screen.findByText('Resume session'));
    expect(await screen.findByText('Chat Session Shell')).toBeInTheDocument();
  });
});
