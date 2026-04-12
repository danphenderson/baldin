import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AgentTaskNodeView } from '../node-views/agent-task-node-view';

function buildProps(status: 'draft' | 'running' | 'completed' | 'failed' | 'applied' | 'dismissed') {
  return {
    editor: { isEditable: true } as never,
    node: {
      attrs: {
        taskId: 'task-12345678',
        agentId: 'agent-1',
        agentLabel: 'Planner',
        promptText: 'Tighten this section',
        status,
      },
    } as never,
    getPos: () => 12,
    updateAttributes: vi.fn(),
    surfaceKind: 'cell_doc_editor' as const,
    onAgentTaskEvent: vi.fn(),
    decorations: [],
    innerDecorations: {} as never,
    selected: false,
    extension: {} as never,
    HTMLAttributes: {},
    deleteNode: vi.fn(),
    view: {} as never,
  };
}

describe('AgentTaskNodeView', () => {
  it('shows accurate running guidance and disables duplicate task actions while a run is active', () => {
    render(<AgentTaskNodeView {...buildProps('running')} />);

    expect(
      screen.getByText(
        'This task is running against the current document snapshot. Review the suggestion here when it completes.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change agent' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Run' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeDisabled();
  });
});
