import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AgentCard from './agent-card';
import type { AgentSummaryRead } from '../service/agents';

const buildAgent = (overrides: Partial<AgentSummaryRead> = {}): AgentSummaryRead => ({
  id: 'agent-1',
  created_at: '2026-04-11T12:00:00Z',
  updated_at: '2026-04-11T12:00:00Z',
  user_id: 'user-1',
  name: 'Cover Letter Agent',
  description: 'Drafts reusable workspace sessions for applications.',
  kind: 'cover_letter',
  is_enabled: true,
  ...overrides,
});

describe('AgentCard', () => {
  it('opens when the card itself receives keyboard activation', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <AgentCard
        agent={buildAgent()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleEnabled={vi.fn()}
        onClick={onClick}
      />,
    );

    const card = screen.getByRole('button', { name: 'Open agent Cover Letter Agent' });
    await act(async () => {
      card.focus();
    });
    await user.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('keeps nested keyboard actions from bubbling into the card open action', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onToggleEnabled = vi.fn();

    render(
      <AgentCard
        agent={buildAgent()}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleEnabled={onToggleEnabled}
        onClick={onClick}
      />,
    );

    const editButton = screen.getByRole('button', { name: 'Edit Cover Letter Agent' });
    await act(async () => {
      editButton.focus();
    });
    await user.keyboard('{Enter}');

    const deleteButton = screen.getByRole('button', { name: 'Delete Cover Letter Agent' });
    await act(async () => {
      deleteButton.focus();
    });
    await user.keyboard('{Enter}');

    const toggle = screen.getByRole('checkbox', { name: 'Toggle Cover Letter Agent enabled' });
    await act(async () => {
      toggle.focus();
    });
    fireEvent.keyDown(toggle, { key: ' ', code: 'Space', charCode: 32 });
    await user.click(toggle);

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onToggleEnabled).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });
});
