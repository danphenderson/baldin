import React, { act, createRef } from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { buildCellDocExtensions } from '../extensions';
import { buildBaseDocumentExtensions } from '../extensions/base-extensions';
import { EditorHarness, type EditorHarnessHandle } from './editor-harness';

describe('agentTask extension', () => {
  it('inserts an agent task node with a stable task id and emits an insert event', async () => {
    const onAgentTaskEvent = vi.fn();
    const ref = createRef<EditorHarnessHandle>();

    render(
      <EditorHarness
        ref={ref}
        extensions={buildCellDocExtensions({
          surfaceKind: 'cell_doc_editor',
          onAgentTaskEvent,
        })}
      />,
    );

    await waitFor(() => expect(ref.current?.editor).toBeTruthy());

    act(() => {
      ref.current!.editor!.commands.insertAgentTask({
        agentId: 'agent-1',
        agentLabel: 'Planner',
      });
    });

    await waitFor(() => {
      const node = ref.current!.getJSON()?.content?.[0];
      expect(node?.type).toBe('agentTask');
      expect(typeof node?.attrs?.taskId).toBe('string');
      expect(node?.attrs?.agentId).toBe('agent-1');
    });

    expect(onAgentTaskEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'inserted',
      surfaceKind: 'cell_doc_editor',
      taskId: expect.any(String),
      task: expect.objectContaining({
        agentId: 'agent-1',
        agentLabel: 'Planner',
      }),
    }));
  });

  it('normalizes duplicate task ids on mount', async () => {
    const ref = createRef<EditorHarnessHandle>();

    render(
      <EditorHarness
        ref={ref}
        extensions={buildCellDocExtensions({
          surfaceKind: 'cell_doc_editor',
        })}
        content={{
          type: 'doc',
          content: [
            { type: 'agentTask', attrs: { taskId: 'duplicate-task' } },
            { type: 'agentTask', attrs: { taskId: 'duplicate-task' } },
          ],
        }}
      />,
    );

    await waitFor(() => expect(ref.current?.editor).toBeTruthy());

    await waitFor(() => {
      const tasks = ref.current!.getJSON()?.content ?? [];
      const firstTaskId = tasks[0]?.attrs?.taskId;
      const secondTaskId = tasks[1]?.attrs?.taskId;

      expect(typeof firstTaskId).toBe('string');
      expect(typeof secondTaskId).toBe('string');
      expect(firstTaskId).not.toBe(secondTaskId);
    });
  });
});
