import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UserContext } from '@/context/user-context';

vi.mock('@/service/agents', async () => {
  const actual = await vi.importActual<typeof import('@/service/agents')>('@/service/agents');
  return {
    ...actual,
    getAgents: vi.fn(),
    getFilteredAgentRuns: vi.fn(),
    createAgentSurfaceRun: vi.fn(),
    applyAgentSurfaceRun: vi.fn(),
    dismissAgentSurfaceRun: vi.fn(),
  };
});

import AgentEnabledMultilineField from '@/component/agent-surface/agent-enabled-multiline-field';
import {
  applyAgentSurfaceRun,
  createAgentSurfaceRun,
  getAgents,
  getFilteredAgentRuns,
  type AgentRunRead,
  type AgentSummaryRead,
} from '@/service/agents';

const mockedGetAgents = vi.mocked(getAgents);
const mockedGetFilteredAgentRuns = vi.mocked(getFilteredAgentRuns);
const mockedCreateAgentSurfaceRun = vi.mocked(createAgentSurfaceRun);
const mockedApplyAgentSurfaceRun = vi.mocked(applyAgentSurfaceRun);

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
    name: 'Helper Agent',
    description: 'Suggests edits',
    kind: 'custom',
    is_enabled: true,
    ...overrides,
  };
}

function buildRun(overrides: Partial<AgentRunRead> = {}): AgentRunRead {
  return {
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
    source_field_key: 'notes',
    source_route: '/workspace/test',
    source_anchor_id: 'surface-1',
    apply_status: 'pending',
    applied_at: null,
    suggested_edit: {
      operation: 'replace_selection',
      content_format: 'plain_text',
      summary: 'Replace the selected text.',
      content: 'everyone',
    },
    session_document_id: null,
    session_version_id: null,
    session_document: null,
    session_version: null,
    error_summary: null,
    completed_at: '2026-04-11T12:00:10Z',
    input_context: {},
    ...overrides,
  };
}

function renderField() {
  const ControlledField = () => {
    const [value, setValue] = useState('Hello world');

    return (
      <AgentEnabledMultilineField
        label="Notes"
        value={value}
        onChange={setValue}
        surfaceId="surface-1"
        fieldKey="notes"
        multiline
      />
    );
  };

  return render(
    <UserContext.Provider value={userContextValue}>
      <MemoryRouter initialEntries={['/workspace/test']}>
        <ControlledField />
      </MemoryRouter>
    </UserContext.Provider>,
  );
}

describe('AgentEnabledMultilineField', () => {
  beforeEach(() => {
    mockedGetAgents.mockReset();
    mockedGetFilteredAgentRuns.mockReset();
    mockedCreateAgentSurfaceRun.mockReset();
    mockedApplyAgentSurfaceRun.mockReset();
    mockedGetAgents.mockResolvedValue([buildAgent()]);
    mockedGetFilteredAgentRuns.mockResolvedValue({
      items: [],
      page: 1,
      page_size: 1,
      total: 0,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('preserves mention-time selection intent and applies replace-selection suggestions over the token', async () => {
    const user = userEvent.setup();
    mockedCreateAgentSurfaceRun.mockResolvedValue(buildRun());
    mockedApplyAgentSurfaceRun.mockResolvedValue(buildRun({ apply_status: 'applied', applied_at: '2026-04-11T12:01:00Z' }));

    renderField();

    const input = screen.getByLabelText('Notes') as HTMLTextAreaElement;
    await act(async () => {
      input.focus();
      input.setSelectionRange(6, 11);
      fireEvent.keyDown(input, { key: '@', code: 'Digit2', charCode: 64 });
      fireEvent.change(input, { target: { value: 'Hello @' } });
    });

    await waitFor(() => {
      expect(mockedGetAgents).toHaveBeenCalledWith('test-token');
    });

    await user.click(screen.getByRole('combobox', { name: 'Agent' }));
    await user.click(await screen.findByRole('option', { name: /Helper Agent/i }));
    await user.type(screen.getByLabelText('Instructions'), 'Tighten this phrase.');
    await user.click(screen.getByRole('button', { name: 'Run task' }));

    await waitFor(() => {
      expect(mockedCreateAgentSurfaceRun).toHaveBeenCalled();
    });

    expect(mockedCreateAgentSurfaceRun).toHaveBeenCalledWith(
      'test-token',
      'agent-1',
      expect.objectContaining({
        surface_content: 'Hello @Helper Agent',
        selection_text: 'world',
        selection_start: 6,
        selection_end: 11,
        requested_apply_mode: 'replace_selection',
      }),
    );

    expect(input).toHaveValue('Hello @Helper Agent');

    await user.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => {
      expect(mockedApplyAgentSurfaceRun).toHaveBeenCalledWith('test-token', 'run-1', {});
    });

    expect(input).toHaveValue('Hello everyone');
  });
});
