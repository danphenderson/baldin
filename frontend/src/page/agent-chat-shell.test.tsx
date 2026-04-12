import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { UserContext } from '../context/user-context';
import { ToolbarHeaderContext } from '../layout/toolbar-header-context';

const { mockedNotify } = vi.hoisted(() => ({
  mockedNotify: vi.fn(),
}));

vi.mock('../context/notification-context', () => ({
  useNotification: () => ({ notify: mockedNotify }),
}));

vi.mock('../service/agent-chat', () => ({
  getChatSession: vi.fn(),
  getChatHistory: vi.fn(),
  saveChatToDocument: vi.fn(),
  sendChatMessage: vi.fn(),
  updateChatSession: vi.fn(),
}));

vi.mock('../service/agents', () => ({
  getAgent: vi.fn(),
}));

import * as agentChatService from '../service/agent-chat';
import * as agentsService from '../service/agents';
import AgentChatShellPage from './agent-chat-shell';
import type { AgentChatMessageRead } from '../service/agent-chat';

const mockedGetChatSession = vi.mocked(agentChatService.getChatSession);
const mockedGetChatHistory = vi.mocked(agentChatService.getChatHistory);
const mockedSaveChatToDocument = vi.mocked(agentChatService.saveChatToDocument);
const mockedSendChatMessage = vi.mocked(agentChatService.sendChatMessage);
const mockedUpdateChatSession = vi.mocked(agentChatService.updateChatSession);
const mockedGetAgent = vi.mocked(agentsService.getAgent);

const userContextValue = {
  user: { id: 'u1', first_name: 'Jane', last_name: 'Doe', email: 'jane@test.com' } as never,
  setUser: vi.fn(),
  token: 'test-token',
  setToken: vi.fn(),
  loading: false,
  canAccessTier: vi.fn(() => true),
};

const buildSession = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'session-1',
  created_at: '2026-04-11T12:00:00Z',
  updated_at: '2026-04-11T12:10:00Z',
  agent_id: 'agent-1',
  title: 'Acme intro',
  model_name: 'gpt-5.4-mini-2026-03-17',
  status: 'active',
  message_count: 3,
  last_message_at: '2026-04-11T12:09:00Z',
  application_id: 'app-1',
  user_id: 'user-1',
  message_history: {
    has_more_before: false,
    next_before: null,
  },
  messages: [
    {
      id: 'message-system',
      role: 'system',
      content: 'Use the application context and keep responses concise.',
      created_at: '2026-04-11T12:00:00Z',
      metadata: {},
    },
    {
      id: 'message-user',
      role: 'user',
      content: 'Draft a short intro.',
      created_at: '2026-04-11T12:01:00Z',
      metadata: {},
    },
    {
      id: 'message-assistant',
      role: 'assistant',
      content: 'Here is a **strong** intro.',
      created_at: '2026-04-11T12:01:05Z',
      metadata: {},
    },
  ],
  ...overrides,
});

const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
};

function renderPage(initialRoute: string) {
  return render(
    <ToolbarHeaderContext.Provider value={vi.fn()}>
      <UserContext.Provider value={userContextValue}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/automation/agents/:agentId/chat/:sessionId" element={<><AgentChatShellPage /><LocationDisplay /></>} />
            <Route path="/applications/:applicationId" element={<div>Application Page</div>} />
            <Route path="/workspace/:id/edit" element={<LocationDisplay />} />
          </Routes>
        </MemoryRouter>
      </UserContext.Provider>
    </ToolbarHeaderContext.Provider>,
  );
}

describe('AgentChatShellPage', () => {
  beforeEach(() => {
    mockedGetChatSession.mockReset();
    mockedGetChatHistory.mockReset();
    mockedSaveChatToDocument.mockReset();
    mockedSendChatMessage.mockReset();
    mockedUpdateChatSession.mockReset();
    mockedGetAgent.mockReset();
    mockedNotify.mockReset();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    mockedGetAgent.mockResolvedValue({
      id: 'agent-1',
      name: 'Cover Letter Agent',
      description: 'Writes cover letters',
      kind: 'cover_letter',
      is_enabled: true,
      instructions: 'Keep it sharp.',
      configuration: {},
      created_at: '2026-04-11T12:00:00Z',
      updated_at: '2026-04-11T12:00:00Z',
      user_id: 'user-1',
    } as never);
    mockedGetChatHistory.mockResolvedValue({
      items: [],
      has_more_before: false,
      next_before: null,
    } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads the chat session, agent context, and threaded messages', async () => {
    mockedGetChatSession.mockResolvedValue(buildSession() as never);

    renderPage('/automation/agents/agent-1/chat/session-1');

    expect(await screen.findByText('Cover Letter Agent')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Acme intro' })).toBeInTheDocument();
    expect(screen.getByText('Draft a short intro.')).toBeInTheDocument();
    expect(screen.getByText('strong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Application/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Chat message' })).toBeInTheDocument();
    expect(mockedGetChatSession).toHaveBeenCalledWith('test-token', 'session-1', 50);
    expect(mockedGetAgent).toHaveBeenCalledWith('test-token', 'agent-1');
  });

  it('loads older history through the cursor endpoint without duplicating the newest slice', async () => {
    const user = userEvent.setup();
    mockedGetChatSession.mockResolvedValue(buildSession({
      message_count: 55,
      message_history: {
        has_more_before: true,
        next_before: 'cursor-before-1',
      },
      messages: [
        {
          id: 'message-6',
          role: 'user',
          content: 'Newest retained user message',
          created_at: '2026-04-11T12:06:00Z',
          metadata: {},
        },
        {
          id: 'message-7',
          role: 'assistant',
          content: 'Newest retained assistant message',
          created_at: '2026-04-11T12:07:00Z',
          metadata: {},
        },
      ],
    }) as never);
    mockedGetChatHistory.mockResolvedValue({
      items: [
        {
          id: 'message-1',
          role: 'system',
          content: 'Earlier system context',
          created_at: '2026-04-11T12:00:00Z',
          metadata: {},
        },
        {
          id: 'message-2',
          role: 'user',
          content: 'Earlier user message',
          created_at: '2026-04-11T12:01:00Z',
          metadata: {},
        },
        {
          id: 'message-6',
          role: 'user',
          content: 'Newest retained user message',
          created_at: '2026-04-11T12:06:00Z',
          metadata: {},
        },
      ],
      has_more_before: false,
      next_before: null,
    } as never);

    renderPage('/automation/agents/agent-1/chat/session-1');

    await user.click(await screen.findByRole('button', { name: /load earlier messages/i }));

    await waitFor(() => {
      expect(mockedGetChatHistory).toHaveBeenCalledWith('test-token', 'session-1', {
        before: 'cursor-before-1',
        limit: 50,
      });
    });
    expect(screen.getByText('Earlier user message')).toBeInTheDocument();
    expect(screen.getAllByText('Newest retained user message')).toHaveLength(1);
  });

  it('renders duplicate-timestamp canonical messages in stable id order', async () => {
    mockedGetChatSession.mockResolvedValue(buildSession({
      message_count: 3,
      messages: [
        {
          id: 'message-b',
          role: 'assistant',
          content: 'Second by id',
          created_at: '2026-04-11T12:01:00Z',
          metadata: {},
        },
        {
          id: 'message-a',
          role: 'assistant',
          content: 'First by id',
          created_at: '2026-04-11T12:01:00Z',
          metadata: {},
        },
        {
          id: 'message-c',
          role: 'assistant',
          content: 'Later message',
          created_at: '2026-04-11T12:02:00Z',
          metadata: {},
        },
      ],
    }) as never);

    renderPage('/automation/agents/agent-1/chat/session-1');

    await screen.findByText('Cover Letter Agent');

    const first = screen.getByText('First by id');
    const second = screen.getByText('Second by id');

    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  it('preserves older loaded history across session refresh and advances the older cursor', async () => {
    const user = userEvent.setup();
    let onDoneHandler: ((message: AgentChatMessageRead) => void) | null = null;

    mockedGetChatSession
      .mockResolvedValueOnce(buildSession({
        message_count: 60,
        message_history: {
          has_more_before: true,
          next_before: 'cursor-before-1',
        },
        messages: [
          {
            id: 'message-6',
            role: 'user',
            content: 'Newest retained user message',
            created_at: '2026-04-11T12:06:00Z',
            metadata: {},
          },
          {
            id: 'message-7',
            role: 'assistant',
            content: 'Newest retained assistant message',
            created_at: '2026-04-11T12:07:00Z',
            metadata: {},
          },
        ],
      }) as never)
      .mockResolvedValueOnce(buildSession({
        message_count: 62,
        message_history: {
          has_more_before: true,
          next_before: 'cursor-before-0',
        },
        messages: [
          {
            id: 'message-6',
            role: 'user',
            content: 'Newest retained user message',
            created_at: '2026-04-11T12:06:00Z',
            metadata: {},
          },
          {
            id: 'message-7',
            role: 'assistant',
            content: 'Newest retained assistant message',
            created_at: '2026-04-11T12:07:00Z',
            metadata: {},
          },
          {
            id: 'message-user-persisted',
            role: 'user',
            content: 'Help me tailor this intro.',
            created_at: '2026-04-11T12:08:00Z',
            metadata: {},
          },
          {
            id: 'message-assistant-persisted',
            role: 'assistant',
            content: 'Tailored answer complete.',
            created_at: '2026-04-11T12:08:10Z',
            metadata: {},
          },
        ],
      }) as never);
    mockedGetChatHistory
      .mockResolvedValueOnce({
        items: [
          {
            id: 'message-1',
            role: 'system',
            content: 'Earlier system context',
            created_at: '2026-04-11T12:00:00Z',
            metadata: {},
          },
          {
            id: 'message-2',
            role: 'user',
            content: 'Earlier user message',
            created_at: '2026-04-11T12:01:00Z',
            metadata: {},
          },
        ],
        has_more_before: true,
        next_before: 'cursor-before-0',
      } as never)
      .mockResolvedValueOnce({
        items: [
          {
            id: 'message-0',
            role: 'system',
            content: 'Oldest context',
            created_at: '2026-04-11T11:59:00Z',
            metadata: {},
          },
        ],
        has_more_before: false,
        next_before: null,
      } as never);
    mockedSendChatMessage.mockImplementation((_, __, ___, ____, onDone) => {
      onDoneHandler = onDone;
      return new AbortController();
    });

    renderPage('/automation/agents/agent-1/chat/session-1');

    await user.click(await screen.findByRole('button', { name: /load earlier messages/i }));
    expect(await screen.findByText('Earlier user message')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Chat message' }), 'Help me tailor this intro.');
    await user.keyboard('{Enter}');

    await act(async () => {
      onDoneHandler?.({
        id: 'message-assistant-persisted',
        role: 'assistant',
        content: 'Tailored answer complete.',
        created_at: '2026-04-11T12:08:10Z',
        metadata: {},
      });
    });

    await waitFor(() => {
      expect(mockedGetChatSession).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByText('Earlier user message')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /load earlier messages/i }));

    await waitFor(() => {
      expect(mockedGetChatHistory).toHaveBeenNthCalledWith(2, 'test-token', 'session-1', {
        before: 'cursor-before-0',
        limit: 50,
      });
    });
  });

  it('redirects to the canonical agent-scoped route when the session belongs to another agent', async () => {
    mockedGetChatSession.mockResolvedValue(buildSession({ agent_id: 'agent-2' }) as never);
    mockedGetAgent.mockResolvedValue({
      id: 'agent-2',
      name: 'Different Agent',
      description: '',
      kind: 'custom',
      is_enabled: true,
      instructions: '',
      configuration: {},
      created_at: '2026-04-11T12:00:00Z',
      updated_at: '2026-04-11T12:00:00Z',
      user_id: 'user-1',
    } as never);

    renderPage('/automation/agents/wrong-agent/chat/session-1');

    await waitFor(() => {
      expect(screen.getByTestId('location-display')).toHaveTextContent('/automation/agents/agent-2/chat/session-1');
    });
  });

  it('streams assistant output, then syncs canonical history after completion', async () => {
    const user = userEvent.setup();
    let onDeltaHandler: ((chunk: string) => void) | null = null;
    let onDoneHandler: ((message: AgentChatMessageRead) => void) | null = null;

    mockedGetChatSession
      .mockResolvedValueOnce(buildSession({
        message_count: 1,
        messages: [{
          id: 'message-system',
          role: 'system',
          content: 'Use the application context and keep responses concise.',
          created_at: '2026-04-11T12:00:00Z',
          metadata: {},
        }],
      }) as never)
      .mockResolvedValueOnce(buildSession({
        message_count: 3,
        messages: [
          {
            id: 'message-system',
            role: 'system',
            content: 'Use the application context and keep responses concise.',
            created_at: '2026-04-11T12:00:00Z',
            metadata: {},
          },
          {
            id: 'message-user-persisted',
            role: 'user',
            content: 'Help me tailor this intro.',
            created_at: '2026-04-11T12:02:00Z',
            metadata: {},
          },
          {
            id: 'message-assistant-persisted',
            role: 'assistant',
            content: 'Tailored answer complete.',
            created_at: '2026-04-11T12:02:10Z',
            metadata: {},
          },
        ],
      }) as never);

    mockedSendChatMessage.mockImplementation((_, __, ___, onDelta, onDone) => {
      onDeltaHandler = onDelta;
      onDoneHandler = onDone;
      return new AbortController();
    });

    renderPage('/automation/agents/agent-1/chat/session-1');

    await user.type(await screen.findByRole('textbox', { name: 'Chat message' }), 'Help me tailor this intro.');
    await user.keyboard('{Enter}');

    expect(mockedSendChatMessage).toHaveBeenCalledWith(
      'test-token',
      'session-1',
      'Help me tailor this intro.',
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
    expect(screen.getByText('Thinking…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

    await act(async () => {
      onDeltaHandler?.('Tailored ');
      onDeltaHandler?.('answer');
    });

    expect(screen.getByText('Tailored answer')).toBeInTheDocument();

    await act(async () => {
      onDoneHandler?.({
        id: 'message-assistant-persisted',
        role: 'assistant',
        content: 'Tailored answer complete.',
        created_at: '2026-04-11T12:02:10Z',
        metadata: {},
      });
    });

    await waitFor(() => {
      expect(mockedGetChatSession).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText('Tailored answer complete.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('aborts in-flight streaming when the user cancels', async () => {
    const user = userEvent.setup();
    const controller = new AbortController();
    const abortSpy = vi.spyOn(controller, 'abort');

    mockedGetChatSession.mockResolvedValue(buildSession({
      message_count: 1,
      messages: [{
        id: 'message-system',
        role: 'system',
        content: 'Use the application context and keep responses concise.',
        created_at: '2026-04-11T12:00:00Z',
        metadata: {},
      }],
    }) as never);
    mockedSendChatMessage.mockImplementation(() => controller);

    renderPage('/automation/agents/agent-1/chat/session-1');

    await user.type(await screen.findByRole('textbox', { name: 'Chat message' }), 'Stop when ready');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(abortSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('supports inline title editing', async () => {
    const user = userEvent.setup();
    mockedGetChatSession.mockResolvedValue(buildSession() as never);
    mockedUpdateChatSession.mockResolvedValue({
      ...buildSession(),
      title: 'Renamed chat',
    } as never);

    renderPage('/automation/agents/agent-1/chat/session-1');

    await user.click(await screen.findByRole('button', { name: 'Edit title' }));
    await user.clear(screen.getByLabelText('Session title'));
    await user.type(screen.getByLabelText('Session title'), 'Renamed chat');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockedUpdateChatSession).toHaveBeenCalledWith('test-token', 'session-1', { title: 'Renamed chat' });
    });
    expect(await screen.findByRole('heading', { name: 'Renamed chat' })).toBeInTheDocument();
  });

  it('saves the chat as a document and exposes an open-document action', async () => {
    const user = userEvent.setup();
    mockedGetChatSession.mockResolvedValue(buildSession() as never);
    mockedSaveChatToDocument.mockResolvedValue({
      document_id: 'doc-1',
      version_id: 'version-1',
    } as never);

    renderPage('/automation/agents/agent-1/chat/session-1');

    await user.click(await screen.findByRole('button', { name: 'Save as Document' }));

    await waitFor(() => {
      expect(mockedSaveChatToDocument).toHaveBeenCalledWith('test-token', 'session-1', {});
    });
    expect(await screen.findByText('Chat saved as a document.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open document' }));

    await waitFor(() => {
      expect(screen.getByTestId('location-display')).toHaveTextContent('/workspace/doc-1/edit');
    });
  });

  it('disables save when the session has no assistant message yet', async () => {
    mockedGetChatSession.mockResolvedValue(buildSession({
      message_count: 1,
      messages: [{
        id: 'message-system',
        role: 'system',
        content: 'Use the application context and keep responses concise.',
        created_at: '2026-04-11T12:00:00Z',
        metadata: {},
      }],
    }) as never);

    renderPage('/automation/agents/agent-1/chat/session-1');

    expect(await screen.findByRole('button', { name: 'Save as Document' })).toBeDisabled();
  });

  it('surfaces save failures without navigating away', async () => {
    const user = userEvent.setup();
    mockedGetChatSession.mockResolvedValue(buildSession() as never);
    mockedSaveChatToDocument.mockRejectedValue(new Error('Save failed'));

    renderPage('/automation/agents/agent-1/chat/session-1');

    await user.click(await screen.findByRole('button', { name: 'Save as Document' }));

    await waitFor(() => {
      expect(mockedNotify).toHaveBeenCalledWith('Save failed', 'error');
    });
    expect(screen.getByTestId('location-display')).toHaveTextContent('/automation/agents/agent-1/chat/session-1');
  });

  it('shows inline retry UI after a send failure and retries the message', async () => {
    const user = userEvent.setup();
    let onErrorHandler: ((message: string) => void) | null = null;

    mockedGetChatSession.mockResolvedValue(buildSession({
      message_count: 1,
      messages: [{
        id: 'message-system',
        role: 'system',
        content: 'Use the application context and keep responses concise.',
        created_at: '2026-04-11T12:00:00Z',
        metadata: {},
      }],
    }) as never);
    mockedSendChatMessage.mockImplementation((_, __, ___, ____, _____, onError) => {
      onErrorHandler = onError;
      return new AbortController();
    });

    renderPage('/automation/agents/agent-1/chat/session-1');

    await user.type(await screen.findByRole('textbox', { name: 'Chat message' }), 'Retry this');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await act(async () => {
      onErrorHandler?.('Network interrupted');
    });

    expect(await screen.findByText('Network interrupted')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(mockedSendChatMessage).toHaveBeenCalledTimes(2);
    });
    expect(mockedSendChatMessage.mock.calls[1]?.[2]).toBe('Retry this');
  });

  it('disables the composer for archived sessions', async () => {
    mockedGetChatSession.mockResolvedValue(buildSession({ status: 'archived' }) as never);

    renderPage('/automation/agents/agent-1/chat/session-1');

    const textbox = await screen.findByRole('textbox', { name: 'Chat message' });
    expect(textbox).toBeDisabled();
    expect(screen.getByText(/archived\. restore it from the agent detail page/i)).toBeInTheDocument();
  });
});
