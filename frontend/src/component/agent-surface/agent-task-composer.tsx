import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import {
  CheckRounded as ApplyIcon,
  CloseRounded as DismissIcon,
  ExpandLess as CollapseIcon,
  ExpandMore as ExpandIcon,
  PlayArrowRounded as RunIcon,
} from '@mui/icons-material';
import { InlineFeedback, StatusChip } from '../../design-system';
import { UserContext } from '../../context/user-context';
import { getAgents, type AgentSummaryRead } from '../../service/agents';
import { getKindLabel, kindColor } from '../agent-card';
import {
  canApplyAgentSurfaceRun,
  canDismissAgentSurfaceRun,
  canSubmitAgentTaskComposerDraft,
  getAgentSurfaceRunDisplayState,
} from './helpers';
import type { AgentSurfaceRunRecord, AgentTaskComposerDraft } from './types';

export type AgentTaskComposerPendingAction = 'run' | 'apply' | 'dismiss';

export interface AgentTaskComposerSubmitPayload {
  agent: AgentSummaryRead;
  draft: AgentTaskComposerDraft;
}

export interface AgentTaskComposerProps {
  draft: AgentTaskComposerDraft;
  onDraftChange: (nextDraft: AgentTaskComposerDraft) => void;
  onRun: (payload: AgentTaskComposerSubmitPayload) => Promise<void> | void;
  onApply?: (run: AgentSurfaceRunRecord) => Promise<void> | void;
  onDismiss?: (run: AgentSurfaceRunRecord) => Promise<void> | void;
  run?: AgentSurfaceRunRecord | null;
  disabled?: boolean;
  pendingAction?: AgentTaskComposerPendingAction | null;
  errorMessage?: string | null;
  autoFocus?: boolean;
  runButtonLabel?: string;
  promptLabel?: string;
  promptPlaceholder?: string;
}

type StatusTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

function getStatusChipTone(tone: 'info' | 'success' | 'warning' | 'error'): StatusTone {
  switch (tone) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'danger';
    case 'info':
    default:
      return 'info';
  }
}

const AgentTaskComposer: React.FC<AgentTaskComposerProps> = ({
  draft,
  onDraftChange,
  onRun,
  onApply,
  onDismiss,
  run = null,
  disabled = false,
  pendingAction = null,
  errorMessage = null,
  autoFocus = false,
  runButtonLabel = 'Run task',
  promptLabel = 'Instructions',
  promptPlaceholder = 'Describe the edit you want the agent to suggest…',
}) => {
  const theme = useTheme();
  const { token } = useContext(UserContext);
  const fetchRequestIdRef = useRef(0);

  const [availableAgents, setAvailableAgents] = useState<AgentSummaryRead[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [agentLoadError, setAgentLoadError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(Boolean(run?.suggested_edit));

  const loadAgents = useCallback(async () => {
    const requestId = fetchRequestIdRef.current + 1;
    fetchRequestIdRef.current = requestId;

    if (!token) {
      setAvailableAgents([]);
      setAgentLoadError('Sign in to load enabled agents.');
      setLoadingAgents(false);
      return;
    }

    setLoadingAgents(true);
    setAgentLoadError(null);

    try {
      const agents = await getAgents(token);
      if (fetchRequestIdRef.current !== requestId) {
        return;
      }
      setAvailableAgents(agents.filter((agent) => agent.is_enabled));
    } catch (error) {
      if (fetchRequestIdRef.current !== requestId) {
        return;
      }
      setAvailableAgents([]);
      setAgentLoadError(error instanceof Error ? error.message : 'Failed to load agents.');
    } finally {
      if (fetchRequestIdRef.current === requestId) {
        setLoadingAgents(false);
      }
    }
  }, [token]);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    if (run?.suggested_edit) {
      setPreviewOpen(true);
    }
  }, [run?.id, run?.suggested_edit]);

  const selectedAgent = useMemo(
    () => availableAgents.find((agent) => agent.id === draft.agentId) ?? null,
    [availableAgents, draft.agentId],
  );
  const hasUnavailableSelection = Boolean(
    draft.agentId && !selectedAgent && availableAgents.length > 0 && !loadingAgents,
  );
  const displayState = run ? getAgentSurfaceRunDisplayState(run) : null;
  const runBusy = pendingAction === 'run' || run?.status === 'pending' || run?.status === 'running';
  const applyBusy = pendingAction === 'apply';
  const dismissBusy = pendingAction === 'dismiss';
  const canRun = !disabled && !pendingAction && canSubmitAgentTaskComposerDraft(draft) && Boolean(selectedAgent);
  const showApply = Boolean(run && onApply && canApplyAgentSurfaceRun(run));
  const showDismiss = Boolean(run && onDismiss && canDismissAgentSurfaceRun(run));
  const preview = run?.suggested_edit ?? null;

  const handleAgentChange = (_event: unknown, nextAgent: AgentSummaryRead | null) => {
    onDraftChange({
      ...draft,
      agentId: nextAgent?.id ?? null,
    });
  };

  const handlePromptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onDraftChange({
      ...draft,
      promptText: event.target.value,
    });
  };

  const handleRun = () => {
    if (!selectedAgent || !canRun) {
      return;
    }

    void onRun({
      agent: selectedAgent,
      draft: {
        agentId: selectedAgent.id,
        promptText: draft.promptText,
      },
    });
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          justifyContent="space-between"
          alignItems={{ sm: 'center' }}
        >
          <Box>
            <Typography variant="subtitle2">Agent task</Typography>
            <Typography variant="caption" color="text.secondary">
              Select an enabled agent, describe the edit, and review the suggested change before applying it.
            </Typography>
          </Box>
          {displayState && (
            <StatusChip
              label={displayState.label}
              emphasis={displayState.tone === 'warning' ? 'outline' : 'soft'}
              tone={getStatusChipTone(displayState.tone)}
            />
          )}
        </Stack>

        {errorMessage && (
          <InlineFeedback tone="error" density="compact">
            {errorMessage}
          </InlineFeedback>
        )}

        {agentLoadError && (
          <InlineFeedback tone="error" density="compact">
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              justifyContent="space-between"
              alignItems={{ sm: 'center' }}
            >
              <Typography variant="body2">{agentLoadError}</Typography>
              <Button size="small" onClick={() => void loadAgents()} disabled={loadingAgents}>
                Retry
              </Button>
            </Stack>
          </InlineFeedback>
        )}

        {hasUnavailableSelection && (
          <InlineFeedback tone="warning" density="compact">
            The previously selected agent is no longer enabled. Choose another agent before running this task.
          </InlineFeedback>
        )}

        <Autocomplete<AgentSummaryRead, false, false, false>
          size="small"
          options={availableAgents}
          value={selectedAgent}
          openOnFocus
          loading={loadingAgents}
          disabled={disabled || !token}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, current) => option.id === current.id}
          noOptionsText={loadingAgents ? 'Loading agents…' : 'No enabled agents available'}
          onChange={handleAgentChange}
          renderOption={(props, option) => {
            const { key, ...optionProps } = props;

            return (
              <Box component="li" key={key} {...optionProps}>
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: kindColor(option.kind, theme),
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap>{option.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getKindLabel(option.kind)}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Agent"
              helperText={loadingAgents ? 'Loading enabled agents…' : 'Only enabled agents appear here.'}
            />
          )}
        />

        <TextField
          fullWidth
          multiline
          minRows={3}
          maxRows={8}
          autoFocus={autoFocus}
          label={promptLabel}
          placeholder={promptPlaceholder}
          value={draft.promptText}
          onChange={handlePromptChange}
          disabled={disabled}
          helperText="This composer is plain text only and does not trigger nested agent mentions."
        />

        {preview && (
          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default' }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle2">Suggested edit</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {preview.operation.replace(/_/g, ' ')} • {preview.content_format.replace(/_/g, ' ')}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setPreviewOpen((value) => !value)}
                  startIcon={previewOpen ? <CollapseIcon /> : <ExpandIcon />}
                >
                  {previewOpen ? 'Hide' : 'Show'}
                </Button>
              </Stack>
              {preview.summary && (
                <Typography variant="body2">{preview.summary}</Typography>
              )}
              <Collapse in={previewOpen}>
                <Box
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '8px',
                    bgcolor: 'background.paper',
                    px: 1.5,
                    py: 1.25,
                    whiteSpace: 'pre-wrap',
                    maxHeight: 240,
                    overflow: 'auto',
                    fontSize: '0.95rem',
                  }}
                >
                  {preview.content}
                </Box>
              </Collapse>
            </Stack>
          </Paper>
        )}

        {run?.status === 'failed' && run.error_summary && (
          <InlineFeedback tone="error" density="compact">
            {run.error_summary}
          </InlineFeedback>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button
            variant="contained"
            onClick={handleRun}
            disabled={!canRun}
            startIcon={runBusy ? <CircularProgress size={16} color="inherit" /> : <RunIcon />}
          >
            {runBusy ? 'Running…' : runButtonLabel}
          </Button>
          {showApply && run && onApply && (
            <Button
              variant="outlined"
              onClick={() => void onApply(run)}
              disabled={disabled || Boolean(pendingAction && pendingAction !== 'apply')}
              startIcon={applyBusy ? <CircularProgress size={16} color="inherit" /> : <ApplyIcon />}
            >
              {applyBusy ? 'Applying…' : 'Apply'}
            </Button>
          )}
          {showDismiss && run && onDismiss && (
            <Button
              variant="text"
              color="inherit"
              onClick={() => void onDismiss(run)}
              disabled={disabled || Boolean(pendingAction && pendingAction !== 'dismiss')}
              startIcon={dismissBusy ? <CircularProgress size={16} color="inherit" /> : <DismissIcon />}
            >
              {dismissBusy ? 'Dismissing…' : 'Dismiss'}
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
};

export default AgentTaskComposer;
