import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, Chip, Stack, Button, Skeleton, Tooltip, Switch, FormControlLabel,
  useTheme, Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, CircularProgress, Pagination, Link,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Edit as EditIcon,
  SmartToyOutlined as AgentsIcon,
  ArrowBack as BackIcon,
  HistoryOutlined as HistoryIcon,
  ErrorOutline as ErrorIcon,
  Refresh as RefreshIcon,
  PlayArrow as RerunIcon,
  OpenInNew as OpenIcon,
} from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import { useNotification } from '../context/notification-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';
import { getAgent, updateAgent, getAgentRuns, runAgent } from '../service/agents';
import type { AgentRead, AgentUpdate, AgentRunSummaryRead, AgentRunsPaginatedRead } from '../service/agents';
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

  /* Run history state */
  const [runs, setRuns] = useState<AgentRunSummaryRead[]>([]);
  const [runsTotal, setRunsTotal] = useState(0);
  const [runsPage, setRunsPage] = useState(1);
  const [runsLoading, setRunsLoading] = useState(false);
  const [rerunningRunId, setRerunningRunId] = useState<string | null>(null);
  const RUNS_PAGE_SIZE = 10;

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

  /* ---- Run history ---- */

  const refreshRuns = useCallback(async (page = runsPage) => {
    if (!token || !agentId) return;
    setRunsLoading(true);
    try {
      const result: AgentRunsPaginatedRead = await getAgentRuns(token, agentId, {
        page,
        page_size: RUNS_PAGE_SIZE,
      });
      setRuns(result.items);
      setRunsTotal(result.total);
      setRunsPage(page);
    } catch {
      /* run history errors are non-blocking */
    } finally {
      setRunsLoading(false);
    }
  }, [token, agentId, runsPage, RUNS_PAGE_SIZE]);

  useEffect(() => {
    if (agent) refreshRuns(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.id]);

  const handleRerun = async (run: AgentRunSummaryRead) => {
    if (!token || !agentId || !run.session_document_id || !run.application_id) return;
    setRerunningRunId(run.id);
    try {
      const result = await runAgent(token, agentId, {
        application_id: run.application_id,
        session_document_id: run.session_document_id,
      });
      notify('Rerun completed');
      if (result.session_document_id) {
        navigate(`/workspace/${result.session_document_id}/edit`);
      } else {
        await refreshRuns(1);
      }
    } catch (e: unknown) {
      notify(e instanceof Error ? e.message : 'Rerun failed', 'error');
    } finally {
      setRerunningRunId(null);
    }
  };

  const runsTotalPages = Math.ceil(runsTotal / RUNS_PAGE_SIZE);

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

      {/* Run History */}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <HistoryIcon fontSize="small" />
          <span>Run History</span>
          {runsTotal > 0 && (
            <Chip label={runsTotal} size="small" variant="outlined" sx={{ fontWeight: 700, height: 22 }} />
          )}
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Refresh run history">
            <Button size="small" onClick={() => refreshRuns(1)} disabled={runsLoading}>
              <RefreshIcon fontSize="small" />
            </Button>
          </Tooltip>
        </Stack>
      </Typography>

      {runsLoading && runs.length === 0 ? (
        <Skeleton variant="rounded" height={120} />
      ) : runs.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon />}
          title="No runs yet"
          description="Run this agent from an application to see session history here."
        />
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>When</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Session</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Version</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {runs.map((run) => {
                  const statusColor =
                    run.status === 'completed' ? 'success' :
                    run.status === 'failed' ? 'error' :
                    run.status === 'running' ? 'warning' : 'default';
                  return (
                    <TableRow key={run.id} hover>
                      <TableCell>
                        <Tooltip title={new Date(run.completed_at ?? run.created_at).toLocaleString()}>
                          <Typography variant="caption">
                            {timeAgo(run.completed_at ?? run.created_at)}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={run.status}
                          size="small"
                          color={statusColor}
                          variant="outlined"
                          sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell>
                        {run.session_document_id ? (
                          <Link
                            component={RouterLink}
                            to={`/workspace/${run.session_document_id}/edit`}
                            underline="hover"
                            variant="caption"
                            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3 }}
                          >
                            {run.session_document?.title ?? 'Session'}
                            <OpenIcon sx={{ fontSize: 12 }} />
                          </Link>
                        ) : (
                          <Typography variant="caption" color="text.disabled">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {run.session_version ? (
                          <Chip
                            label={`v${run.session_version.version_number}`}
                            size="small"
                            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.disabled">—</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {run.status === 'completed' && run.session_document_id && run.application_id && (
                          <Tooltip title="Rerun agent into the same session">
                            <Button
                              size="small"
                              startIcon={
                                rerunningRunId === run.id
                                  ? <CircularProgress size={14} color="inherit" />
                                  : <RerunIcon />
                              }
                              disabled={rerunningRunId !== null}
                              onClick={() => handleRerun(run)}
                              sx={{ textTransform: 'none' }}
                            >
                              Rerun
                            </Button>
                          </Tooltip>
                        )}
                        {run.status === 'failed' && run.error_summary && (
                          <Tooltip title={run.error_summary}>
                            <ErrorIcon fontSize="small" color="error" />
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          {runsTotalPages > 1 && (
            <Stack alignItems="center" sx={{ mb: 2 }}>
              <Pagination
                count={runsTotalPages}
                page={runsPage}
                onChange={(_, p) => refreshRuns(p)}
                size="small"
              />
            </Stack>
          )}
        </>
      )}

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
