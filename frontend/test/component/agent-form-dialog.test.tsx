import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AgentFormDialog from '@/component/agent-form-dialog';
import { UserContext } from '@/context/user-context';

const { mockedNotify } = vi.hoisted(() => ({
  mockedNotify: vi.fn(),
}));

vi.mock('@/context/notification-context', () => ({
  useNotification: () => ({ notify: mockedNotify }),
}));

vi.mock('@/service/agent-chat', () => ({
  getAvailableModels: vi.fn(),
}));

import * as agentChatService from '@/service/agent-chat';
import type { AgentRead } from '@/service/agents';

const mockedGetAvailableModels = vi.mocked(agentChatService.getAvailableModels);

const userContextValue = {
  user: { id: 'u1', first_name: 'Jane', last_name: 'Doe', email: 'jane@test.com' } as never,
  setUser: vi.fn(),
  token: 'test-token',
  setToken: vi.fn(),
  loading: false,
  canAccessTier: vi.fn(() => true),
};

const buildAgent = (overrides: Partial<AgentRead> = {}): AgentRead => ({
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
  ...overrides,
});

const AVAILABLE_MODELS = {
  default_model_name: 'gpt-5.4-nano-2026-03-17',
  default_model_label: 'GPT-5.4 Nano',
  models: [
    { name: 'gpt-5.4-mini-2026-03-17', label: 'GPT-5.4 Mini' },
    { name: 'gpt-5.4-nano-2026-03-17', label: 'GPT-5.4 Nano' },
  ],
};

function renderDialog(agent: AgentRead | null, onSave = vi.fn().mockResolvedValue(undefined)) {
  render(
    <UserContext.Provider value={userContextValue}>
      <AgentFormDialog
        open
        onClose={vi.fn()}
        onSave={onSave}
        agent={agent}
      />
    </UserContext.Provider>,
  );

  return { onSave };
}

async function openModelSelect(user: ReturnType<typeof userEvent.setup>) {
  const modelField = screen.getByRole('combobox', { name: 'Model' });
  await user.click(modelField);
  return screen.getByRole('listbox');
}

describe('AgentFormDialog', () => {
  beforeEach(() => {
    mockedGetAvailableModels.mockReset();
    mockedNotify.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('defaults to Default in create mode and omits configuration when saved unchanged', async () => {
    const user = userEvent.setup();
    mockedGetAvailableModels.mockResolvedValue(AVAILABLE_MODELS as never);

    const { onSave } = renderDialog(null);

    expect(await screen.findByRole('combobox', { name: 'Model' })).toHaveTextContent('Default');
    expect(screen.getByText('Default uses GPT-5.4 Nano (Fast).')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Agent name' }), 'New Agent');
    await user.click(screen.getByRole('button', { name: 'Create Agent' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const payload = onSave.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('configuration');
  });

  it('sends configuration.model_name when a model is selected during create', async () => {
    const user = userEvent.setup();
    mockedGetAvailableModels.mockResolvedValue(AVAILABLE_MODELS as never);

    const { onSave } = renderDialog(null);

    await screen.findByRole('combobox', { name: 'Model' });
    await user.type(screen.getByRole('textbox', { name: 'Agent name' }), 'Model Agent');

    const listbox = await openModelSelect(user);
    await user.click(within(listbox).getByRole('option', { name: 'GPT-5.4 Mini (Balanced)' }));
    await user.click(screen.getByRole('button', { name: 'Create Agent' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      configuration: { model_name: 'gpt-5.4-mini-2026-03-17' },
    });
  });

  it('preloads an edited model and clears only model_name when switched back to Default', async () => {
    const user = userEvent.setup();
    mockedGetAvailableModels.mockResolvedValue(AVAILABLE_MODELS as never);

    const { onSave } = renderDialog(buildAgent({
      configuration: {
        tone: 'direct',
        model_name: 'gpt-5.4-mini-2026-03-17',
      },
    }));

    expect(await screen.findByRole('combobox', { name: 'Model' })).toHaveTextContent('GPT-5.4 Mini (Balanced)');

    const listbox = await openModelSelect(user);
    await user.click(within(listbox).getByRole('option', { name: 'Default' }));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      configuration: { tone: 'direct' },
    });
    expect(onSave.mock.calls[0][0]).not.toMatchObject({
      configuration: { model_name: 'gpt-5.4-mini-2026-03-17' },
    });
  });

  it('preserves an unavailable configured model by injecting it into the select options', async () => {
    const user = userEvent.setup();
    mockedGetAvailableModels.mockResolvedValue({
      default_model_name: 'gpt-5.4-nano-2026-03-17',
      default_model_label: 'GPT-5.4 Nano',
      models: [{ name: 'gpt-5.4-mini-2026-03-17', label: 'GPT-5.4 Mini' }],
    } as never);

    const unavailableModelName = 'gpt-5.4-legacy-preview';
    const { onSave } = renderDialog(buildAgent({
      configuration: {
        tone: 'formal',
        model_name: unavailableModelName,
      },
    }));

    expect(await screen.findByRole('combobox', { name: 'Model' })).toHaveTextContent(unavailableModelName);
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      configuration: {
        tone: 'formal',
        model_name: unavailableModelName,
      },
    });
  });

  it('falls back to Default and still saves when model loading fails', async () => {
    const user = userEvent.setup();
    mockedGetAvailableModels.mockRejectedValue(new Error('Model list unavailable'));

    const { onSave } = renderDialog(null);

    expect(await screen.findByRole('combobox', { name: 'Model' })).toHaveTextContent('Default');
    await waitFor(() => expect(mockedNotify).toHaveBeenCalledWith('Model list unavailable', 'error'));

    await user.type(screen.getByRole('textbox', { name: 'Agent name' }), 'Fallback Agent');
    await user.click(screen.getByRole('button', { name: 'Create Agent' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const payload = onSave.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('configuration');
  });
});
