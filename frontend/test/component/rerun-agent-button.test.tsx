import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserContext } from '@/context/user-context';

const { mockedNotify } = vi.hoisted(() => ({
  mockedNotify: vi.fn(),
}));

vi.mock('@/context/notification-context', () => ({
  useNotification: () => ({ notify: mockedNotify }),
}));

vi.mock('@/service/agents', () => ({
  getRunsBySessionDocument: vi.fn(),
  runAgent: vi.fn(),
}));

import * as agentsService from '@/service/agents';
import RerunAgentButton from '@/component/rerun-agent-button';

const mockedGetRunsBySessionDocument = vi.mocked(agentsService.getRunsBySessionDocument);
const mockedRunAgent = vi.mocked(agentsService.runAgent);

const userContextValue = {
  user: { id: 'u1', first_name: 'Jane', last_name: 'Doe', email: 'jane@test.com' } as never,
  setUser: vi.fn(),
  token: 'test-token',
  setToken: vi.fn(),
  loading: false,
  canAccessTier: vi.fn(() => true),
};

const buildRun = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'run-1',
  created_at: '2026-04-11T12:00:00Z',
  updated_at: '2026-04-11T12:05:00Z',
  agent_id: 'agent-1',
  user_id: 'user-1',
  application_id: 'app-1',
  chat_session_id: null,
  parent_run_id: null,
  trigger_kind: 'manual',
  status: 'completed',
  session_document_id: 'doc-1',
  session_version_id: 'version-1',
  session_document: {
    id: 'doc-1',
    title: 'Session document',
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
  ...overrides,
});

function renderButton() {
  return render(
    <UserContext.Provider value={userContextValue}>
      <RerunAgentButton documentId="doc-1" />
    </UserContext.Provider>,
  );
}

describe('RerunAgentButton', () => {
  beforeEach(() => {
    mockedGetRunsBySessionDocument.mockReset();
    mockedRunAgent.mockReset();
    mockedNotify.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows rerun for standard completed agent runs', async () => {
    mockedGetRunsBySessionDocument.mockResolvedValue({
      items: [buildRun()],
      total: 1,
      page: 1,
      page_size: 1,
    } as never);

    renderButton();

    expect(
      await screen.findByRole('button', {
        name: 'Rerun the agent that created this session to generate a new version',
      }),
    ).toBeInTheDocument();
  });

  it('hides rerun for chat-exported runs', async () => {
    mockedGetRunsBySessionDocument.mockResolvedValue({
      items: [buildRun({ chat_session_id: 'session-1' })],
      total: 1,
      page: 1,
      page_size: 1,
    } as never);

    renderButton();

    await waitFor(() => {
      expect(mockedGetRunsBySessionDocument).toHaveBeenCalledWith('test-token', 'doc-1', { page: 1, page_size: 1 });
    });
    expect(
      screen.queryByRole('button', {
        name: 'Rerun the agent that created this session to generate a new version',
      }),
    ).not.toBeInTheDocument();
  });
});
