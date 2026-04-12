import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { SmartToyOutlined as AgentIcon } from '@mui/icons-material';

import type {
  AgentTaskAttrs,
  AgentTaskEventHandler,
  AgentTaskEventType,
  AgentTaskSurfaceKind,
  AgentTaskStatus,
} from '../extensions/agent-task-extension';

interface AgentTaskNodeViewProps extends NodeViewProps {
  surfaceKind: AgentTaskSurfaceKind;
  onAgentTaskEvent?: AgentTaskEventHandler;
}

const STATUS_LABELS: Record<AgentTaskStatus, string> = {
  draft: 'Draft',
  running: 'Running',
  completed: 'Ready to apply',
  failed: 'Failed',
  applied: 'Applied',
  dismissed: 'Dismissed',
};

export const AgentTaskNodeView: React.FC<AgentTaskNodeViewProps> = ({
  node,
  editor,
  getPos,
  updateAttributes,
  surfaceKind,
  onAgentTaskEvent,
}) => {
  const theme = useTheme();
  const [draftPrompt, setDraftPrompt] = useState(
    typeof node.attrs.promptText === 'string' ? node.attrs.promptText : '',
  );

  const isLocked = node.attrs.locked === true;
  const canEdit = editor.isEditable && !isLocked;
  const taskId = typeof node.attrs.taskId === 'string' ? node.attrs.taskId : '';
  const agentId = typeof node.attrs.agentId === 'string' ? node.attrs.agentId : null;
  const agentLabel = typeof node.attrs.agentLabel === 'string' ? node.attrs.agentLabel : null;
  const status = (typeof node.attrs.status === 'string' ? node.attrs.status : 'draft') as AgentTaskStatus;
  const summary = typeof node.attrs.summary === 'string' ? node.attrs.summary : null;
  const isRunning = status === 'running';
  const canChooseAgent = canEdit && !isRunning;
  const canRun = canEdit && !isRunning && Boolean(agentId);
  const canDismiss = canEdit && status !== 'running' && status !== 'applied' && status !== 'dismissed';

  const guidanceText = agentLabel
    ? (
      status === 'completed'
        ? 'The suggested edit is ready to preview and apply back into this document.'
        : status === 'running'
          ? 'This task is running against the current document snapshot. Review the suggestion here when it completes.'
          : status === 'applied'
            ? 'This suggestion has already been applied back into the document and saved as a new version.'
            : status === 'dismissed'
              ? 'This task was dismissed. Choose an agent again if you want to request a new suggestion.'
              : 'Choose instructions, run the task against this document, then review the suggested edit before applying it.'
    )
    : 'Choose an agent, run the task against this document, then review the suggested edit before applying it.';

  useEffect(() => {
    const nextPrompt = typeof node.attrs.promptText === 'string' ? node.attrs.promptText : '';
    if (nextPrompt !== draftPrompt) {
      setDraftPrompt(nextPrompt);
    }
  }, [draftPrompt, node.attrs.promptText]);

  const task = useMemo<AgentTaskAttrs>(() => ({
    taskId,
    agentId,
    agentLabel,
    promptText: draftPrompt,
    status,
    summary,
  }), [agentId, agentLabel, draftPrompt, status, summary, taskId]);

  const emit = useCallback((type: AgentTaskEventType) => {
    if (!task.taskId) return;

    const position = typeof getPos === 'function' ? getPos() ?? null : null;
    onAgentTaskEvent?.({
      type,
      taskId: task.taskId,
      position,
      surfaceKind,
      task,
      editor,
    });
  }, [editor, getPos, onAgentTaskEvent, surfaceKind, task]);

  const persistPrompt = useCallback(() => {
    const currentPrompt = typeof node.attrs.promptText === 'string' ? node.attrs.promptText : '';
    if (draftPrompt === currentPrompt) return;
    updateAttributes({ promptText: draftPrompt });
  }, [draftPrompt, node.attrs.promptText, updateAttributes]);

  return (
    <NodeViewWrapper
      data-block-id={node.attrs.blockId}
      data-block-locked={isLocked ? 'true' : undefined}
      contentEditable={false}
    >
      <Paper
        data-testid="agent-task-node-view"
        variant="outlined"
        sx={{
          my: 1,
          p: 1.5,
          borderColor: status === 'failed' ? theme.palette.error.main : theme.palette.divider,
          backgroundColor: alpha(
            status === 'applied'
              ? theme.palette.success.main
              : status === 'completed'
                ? theme.palette.info.main
                : theme.palette.primary.main,
            0.05,
          ),
          opacity: isLocked ? 0.78 : 1,
        }}
      >
        <Stack spacing={1.25}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <AgentIcon fontSize="small" color="primary" />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {agentLabel ?? 'Agent task'}
            </Typography>
            <Chip label={STATUS_LABELS[status]} size="small" variant="outlined" />
            {taskId && (
              <Chip
                label={`Task ${taskId.slice(0, 8)}`}
                size="small"
                sx={{ fontFamily: theme.typography.fontFamily }}
              />
            )}
            {isLocked && <Chip label="Locked" size="small" />}
          </Stack>

          <Typography variant="caption" color="text.secondary">
            {guidanceText}
          </Typography>

          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={6}
            size="small"
            label="Task instructions"
            value={draftPrompt}
            onChange={(event) => setDraftPrompt(event.target.value)}
            onBlur={persistPrompt}
            disabled={!canChooseAgent}
          />

          {summary && (
            <Typography variant="body2" color="text.secondary">
              {summary}
            </Typography>
          )}

          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                persistPrompt();
                emit('picker_requested');
              }}
              disabled={!canChooseAgent}
            >
              {agentLabel ? 'Change agent' : 'Choose agent'}
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                persistPrompt();
                emit('run_requested');
              }}
              disabled={!canRun}
            >
              Run
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => emit('apply_requested')}
              disabled={!canEdit || status !== 'completed'}
            >
              Apply
            </Button>
            <Button
              size="small"
              color="inherit"
              onClick={() => emit('dismiss_requested')}
              disabled={!canDismiss}
            >
              Dismiss
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </NodeViewWrapper>
  );
};
