import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Chip, Stack, Button, Skeleton, Tooltip, Switch, FormControlLabel,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Edit as EditIcon,
  SmartToyOutlined as AgentsIcon,
  ArrowBack as BackIcon,
  HistoryOutlined as HistoryIcon,
  ErrorOutline as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import { useNotification } from '../context/notification-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';
import { getAgent, updateAgent } from '../service/agents';
import type { AgentRead, AgentUpdate } from '../service/agents';
import AgentFormDialog from '../component/agent-form-dialog';
import EmptyState from '../component/common/empty-state';
import { Caption } from '../component/common/text';
import { getKindLabel } from '../component/agent-card';
import { ALPHA_CHIP } from '../theme/effects';
import { timeAgo } from '../util/format';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const AgentDetailPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { token } = useContext(UserContext);
  const { notify } = useNotification();
  const navigate = useNavigate();
  const theme = useTheme();

  const [agent, setAgent] = useState<AgentRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  usePageToolbarHeader(
    agent?.name ?? 'Agent',
    agent ? getKindLabel(agent.kind) : undefined,
  );

  const refresh = useCallback(async () => {
    if (!token || !agentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    try {
      const result = await getAgent(token, agentId);
      setAgent(result);
      setLoadError(null);
      setNotFound(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load agent';
      setAgent(null);
      if (/not found/i.test(message)) {
        setNotFound(true);
      } else {
        setLoadError(message);
        notify(message, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [token, agentId, notify]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSaveForm = async (data: AgentUpdate) => {
    if (!token || !agent) return;
    try {
      const updated = await updateAgent(token, agent.id, data);
      setAgent(updated);
      setFormOpen(false);
      notify('Agent updated');
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Failed to update agent', 'error');
    }
  };

  const handleToggleEnabled = async () => {
    if (!token || !agent) return;
    const next = !agent.is_enabled;
    setAgent((prev) => prev ? { ...prev, is_enabled: next } : prev);
    try {
      await updateAgent(token, agent.id, { is_enabled: next });
      notify(next ? 'Agent enabled' : 'Agent disabled');
    } catch (e: unknown) {
      setAgent((prev) => prev ? { ...prev, is_enabled: !next } : prev);
      notify(e instanceof Error ? e.message : 'Failed to update agent', 'error');
    }
  };

  /* ---- Loading skeleton ---- */

  if (loading) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" height={24} width={140} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={80} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={120} />
      </Box>
    );
  }

  /* ---- Not found ---- */

  if (loadError) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <EmptyState
          icon={<ErrorIcon />}
          title="Unable to load agent"
          description={loadError}
          action={{ label: 'Retry', onClick: refresh, icon: <RefreshIcon /> }}
        />
      </Box>
    );
  }

  if (notFound || !agent) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <EmptyState
          icon={<AgentsIcon />}
          title="Agent not found"
          description="This agent may have been deleted."
          action={{ label: 'Back to Agents', onClick: () => navigate('/network/agents') }}
        />
      </Box>
    );
  }

  /* ---- Kind color ---- */

  const kColor = (() => {
    switch (agent.kind) {
      case 'cover_letter': return theme.palette.primary.main;
      case 'follow_up': return theme.palette.secondary.main;
      case 'outreach': return theme.palette.info.main;
      default: return theme.palette.text.secondary;
    }
  })();

  /* ---- Render ---- */

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Tooltip title="Back to agents">
          <Button
            size="small"
            startIcon={<BackIcon />}
            onClick={() => navigate('/network/agents')}
            sx={{ mr: 1 }}
          >
            Agents
          </Button>
        </Tooltip>
      </Stack>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 0.75 }}>
            {agent.name}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={getKindLabel(agent.kind)}
              size="small"
              sx={{
                bgcolor: alpha(kColor, ALPHA_CHIP),
                color: kColor,
                fontWeight: 600,
              }}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={agent.is_enabled}
                  onChange={handleToggleEnabled}
                />
              }
              label={agent.is_enabled ? 'Enabled' : 'Disabled'}
              slotProps={{ typography: { variant: 'caption', color: 'text.secondary' } }}
              sx={{ ml: 0.5 }}
            />
          </Stack>
        </Box>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => setFormOpen(true)}
          size="small"
        >
          Edit
        </Button>
      </Stack>

      {/* Description */}
      {agent.description && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.6 }}>
          {agent.description}
        </Typography>
      )}

      {/* Instructions */}
      {agent.instructions && (
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
            Instructions
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.65 }}
          >
            {agent.instructions}
          </Typography>
        </Box>
      )}

      {/* Timestamps */}
      <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
        <Tooltip title={new Date(agent.created_at).toLocaleString()}>
          <Box><Caption>Created {timeAgo(agent.created_at)}</Caption></Box>
        </Tooltip>
        <Tooltip title={new Date(agent.updated_at).toLocaleString()}>
          <Box><Caption>Updated {timeAgo(agent.updated_at)}</Caption></Box>
        </Tooltip>
      </Stack>

      {/* Run history placeholder — Story 10 */}
      <EmptyState
        icon={<HistoryIcon />}
        title="No runs yet"
        description="Run this agent from an application to see session history here."
      />

      {/* Edit dialog */}
      <AgentFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveForm}
        agent={agent}
      />
    </Box>
  );
};

export default AgentDetailPage;
