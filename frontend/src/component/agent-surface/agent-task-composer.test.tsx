import React, { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserContext } from '../../context/user-context';
import type { AgentRunRead } from '../../service/agents';

vi.mock('../../service/agents', async () => {
  const actual = await vi.importActual<typeof import('../../service/agents')>('../../service/agents');
  return {
    ...actual,
    getAgents: vi.fn(),
  };
});

import { getAgents, type AgentSummaryRead } from '../../service/agents';
import AgentTaskComposer from './agent-task-composer';
import type { AgentTaskComposerDraft } from './types';

const mockedGetAgents = vi.mocked(getAgents);

const userContextValue = {
  user: { id: 'u1', first_name: 'Jane', last_name: 'Doe', email: 'jane@test.com' } as never,
  setUser: vi.fn(),
  token: 'test-token',
  setToken: vi.fn(),
  loading: false,
  canAccessTier: vi.fn(() => true),
};

function buildAgent(overrides: Partial<AgentSummaryRead> = {}): AgentSummaryRead {
  return {
    id: 'agent-1',
    created_at: '2026-04-11T12:00:00Z',
    updated_at: '2026-04-11T12:00:00Z',
    user_id: 'user-1',
    name: 'Cover Letter Workspace',
    description: 'Builds a draft workspace',
    kind: 'cover_letter',
    is_enabled: true,
    ...overrides,
  };
}

function renderComposer(options?: {
  initialDraft?: AgentTaskComposerDraft;
  run?: AgentRunRead | null;
  onRun?: ReturnType<typeof vi.fn>;
  onApply?: ReturnType<typeof vi.fn>;
  onDismiss?: ReturnType<typeof vi.fn>;
}) {
  const onRun = options?.onRun ?? vi.fn().mockResolvedValue(undefined);
  const onApply = options?.onApply ?? vi.fn().mockResolvedValue(undefined);
  const onDismiss = options?.onDismiss ?? vi.fn().mockResolvedValue(undefined);
  const initialDraft = options?.initialDraft ?? { agentId: null, promptText: '' };

  const ControlledComposer = () => {
    const [draft, setDraft] = useState(initialDraft);

    return (
      <AgentTaskComposer
        draft={draft}
        onDraftChange={setDraft}
        onRun={onRun}
        onApply={onApply}
        onDismiss={onDismiss}
        run={options?.run ?? null}
      />
    );
  };

  return {
    onRun,
    onApply,
    onDismiss,
    ...render(
      <UserContext.Provider value={userContextValue}>
        <ControlledComposer />
      </UserContext.Provider>,
    ),
  };
}

describe('AgentTaskComposer', () => {
  beforeEach(() => {
    mockedGetAgents.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads enabled agents, captures instructions, and submits the selected agent', async () => {
    const user = userEvent.setup();
    mockedGetAgents.mockResolvedValue([
      buildAgent(),
      buildAgent({ id: 'agent-2', name: 'Disabled Agent', is_enabled: false }),
    ]);

    const { onRun } = renderComposer();

    await waitFor(() => {
      expect(mockedGetAgents).toHaveBeenCalledWith('test-token');
    });

    await user.click(screen.getByRole('combobox', { name: 'Agent' }));
    expect(await screen.findByRole('option', { name: /Cover Letter Workspace/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Disabled Agent/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: /Cover Letter Workspace/i }));
    await user.type(screen.getByLabelText('Instructions'), 'Tighten the introduction and make it more concise.');
    await user.click(screen.getByRole('button', { name: 'Run task' }));

    expect(onRun).toHaveBeenCalledWith(expect.objectContaining({
      agent: expect.objectContaining({ id: 'agent-1', name: 'Cover Letter Workspace' }),
      draft: expect.objectContaining({
        agentId: 'agent-1',
        promptText: 'Tighten the introduction and make it more concise.',
      }),
    }));
  });

  it('renders preview state and forwards apply and dismiss actions', async () => {
    const user = userEvent.setup();
    mockedGetAgents.mockResolvedValue([buildAgent()]);

    const run: AgentRunRead = {
      id: 'run-1',
      created_at: '2026-04-11T12:00:00Z',
      updated_at: '2026-04-11T12:00:10Z',
      agent_id: 'agent-1',
      user_id: 'user-1',
      application_id: null,
      chat_session_id: null,
      parent_run_id: null,
      trigger_kind: 'surface_mention',
      status: 'completed',
      source_surface_kind: 'multiline_text_field',
      source_document_id: null,
      source_field_key: 'cover_letter_notes',
      source_route: '/applications/app-1',
      source_anchor_id: null,
      apply_status: 'pending',
      applied_at: null,
      suggested_edit: {
        operation: 'append_to_surface',
        content_format: 'plain_text',
        summary: 'Adds a sharper opening paragraph.',
        content: 'Here is a stronger opening paragraph.',
      },
      session_document_id: null,
      session_version_id: null,
      session_document: null,
      session_version: null,
      error_summary: null,
      completed_at: '2026-04-11T12:00:10Z',
      input_context: {},
    };

    const { onApply, onDismiss } = renderComposer({
      initialDraft: { agentId: 'agent-1', promptText: 'Improve the opening paragraph.' },
      run,
    });

    expect(await screen.findByText('Preview ready')).toBeInTheDocument();
    expect(screen.getByText('Adds a sharper opening paragraph.')).toBeInTheDocument();
    expect(screen.getByText('Here is a stronger opening paragraph.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith(run);

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledWith(run);
  });
});
