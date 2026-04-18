import React, { useContext, useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Stack,
  Button,
  Skeleton,
  Tooltip,
  Switch,
  FormControlLabel,
  useTheme,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  CircularProgress,
  Pagination,
  Link,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Edit as EditIcon,
  SmartToyOutlined as AgentsIcon,
  ChatBubbleOutline as ChatIcon,
  ArrowBack as BackIcon,
  HistoryOutlined as HistoryIcon,
  ErrorOutline as ErrorIcon,
  Refresh as RefreshIcon,
  PlayArrow as RerunIcon,
  OpenInNew as OpenIcon,
  Add as AddIcon,
  ArchiveOutlined as ArchiveIcon,
  UnarchiveOutlined as UnarchiveIcon,
  DeleteOutline as DeleteIcon,
} from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import { useNotification } from '../context/notification-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';
import {
  getAgent,
  updateAgent,
  getAgentRuns,
  runAgent,
} from '../service/agents';
import type {
  AgentRead,
  AgentUpdate,
  AgentRunSummaryRead,
  AgentRunsPaginatedRead,
} from '../service/agents';
import {
  createChatSession,
  deleteChatSession,
  getAvailableModels,
  getAllChatSessions,
  updateChatSession,
} from '../service/agent-chat';
import type {
  AgentChatSessionRead,
  AgentChatSessionStatus,
  AgentChatSessionSummaryRead,
} from '../service/agent-chat';
import AgentFormDialog from '../component/agent-form-dialog';
import {
  Caption,
  ConfirmDialog,
  EmptyState,
  StatusChip as Chip,
} from '../design-system';
import { getKindLabel } from '../component/agent-card';
import { ALPHA_CHIP } from '../design-system';
import { timeAgo } from '../util/format';
import {
  getAgentConfiguredModelName,
  getAgentDefaultModelHelperText,
  getAgentModelDisplayLabel,
} from '../util/agent-models';

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
  const [defaultModelName, setDefaultModelName] = useState<string | null>(null);
  const [defaultModelLabel, setDefaultModelLabel] = useState<string | null>(
    null,
  );

  /* Run history state */
  const [runs, setRuns] = useState<AgentRunSummaryRead[]>([]);
  const [runsTotal, setRunsTotal] = useState(0);
  const [runsPage, setRunsPage] = useState(1);
  const [runsLoading, setRunsLoading] = useState(false);
  const [rerunningRunId, setRerunningRunId] = useState<string | null>(null);
  const RUNS_PAGE_SIZE = 10;

  /* Chat sessions state */
  const [chatSessions, setChatSessions] = useState<
    AgentChatSessionSummaryRead[]
  >([]);
  const [chatSessionsLoading, setChatSessionsLoading] = useState(false);
  const [chatSessionsLoadError, setChatSessionsLoadError] = useState<
    string | null
  >(null);
  const [chatSessionFilter, setChatSessionFilter] = useState<
    'active' | 'archived' | 'all'
  >('active');
  const [chatSessionsPage, setChatSessionsPage] = useState(1);
  const [chatSessionActingId, setChatSessionActingId] = useState<string | null>(
    null,
  );
  const [creatingChat, setCreatingChat] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<AgentChatSessionSummaryRead | null>(null);
  const CHAT_SESSIONS_PAGE_SIZE = 8;

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

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!token) {
      setDefaultModelName(null);
      setDefaultModelLabel(null);
      return;
    }

    let isActive = true;

    void (async () => {
      try {
        const response = await getAvailableModels(token);
        if (!isActive) {
          return;
        }
        setDefaultModelName(response.default_model_name);
        setDefaultModelLabel(response.default_model_label);
      } catch {
        if (!isActive) {
          return;
        }
        setDefaultModelName(null);
        setDefaultModelLabel(null);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [token]);

  const handleSaveForm = async (data: AgentUpdate) => {
    if (!token || !agent) return;
    try {
      const updated = await updateAgent(token, agent.id, data);
      setAgent(updated);
      setFormOpen(false);
      notify('Agent updated');
    } catch (e: unknown) {
      notify(
        e instanceof Error ? e.message : 'Failed to update agent',
        'error',
      );
    }
  };

  const handleToggleEnabled = async () => {
    if (!token || !agent) return;
    const next = !agent.is_enabled;
    setAgent((prev) => (prev ? { ...prev, is_enabled: next } : prev));
    try {
      await updateAgent(token, agent.id, { is_enabled: next });
      notify(next ? 'Agent enabled' : 'Agent disabled');
    } catch (e: unknown) {
      setAgent((prev) => (prev ? { ...prev, is_enabled: !next } : prev));
      notify(
        e instanceof Error ? e.message : 'Failed to update agent',
        'error',
      );
    }
  };

  /* ---- Run history ---- */

  const refreshRuns = useCallback(
    async (page = runsPage) => {
      if (!token || !agentId) return;
      setRunsLoading(true);
      try {
        const result: AgentRunsPaginatedRead = await getAgentRuns(
          token,
          agentId,
          {
            page,
            page_size: RUNS_PAGE_SIZE,
          },
        );
        setRuns(result.items);
        setRunsTotal(result.total);
        setRunsPage(page);
      } catch {
        /* run history errors are non-blocking */
      } finally {
        setRunsLoading(false);
      }
    },
    [token, agentId, runsPage, RUNS_PAGE_SIZE],
  );

  useEffect(() => {
    if (agent) refreshRuns(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.id]);

  const refreshChatSessions = useCallback(async () => {
    if (!token || !agentId) return;
    setChatSessionsLoading(true);
    setChatSessionsLoadError(null);
    try {
      const result = await getAllChatSessions(token, agentId);
      setChatSessions(result);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : 'Failed to load chat sessions';
      setChatSessionsLoadError(message);
      notify(message, 'error');
    } finally {
      setChatSessionsLoading(false);
    }
  }, [token, agentId, notify]);

  useEffect(() => {
    if (agent) refreshChatSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.id]);

  useEffect(() => {
    setChatSessionsPage(1);
  }, [chatSessionFilter]);

  const handleRerun = async (run: AgentRunSummaryRead) => {
    if (!token || !agentId || !run.session_document_id || !run.application_id)
      return;
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

  const chatSessionsFiltered = [...chatSessions]
    .filter((chatSession) =>
      chatSessionFilter === 'all'
        ? true
        : chatSession.status === chatSessionFilter,
    )
    .sort((left, right) => {
      const leftTimestamp = left.last_message_at ?? left.updated_at;
      const rightTimestamp = right.last_message_at ?? right.updated_at;
      return (
        new Date(rightTimestamp).getTime() - new Date(leftTimestamp).getTime()
      );
    });

  const chatSessionsTotalPages = Math.max(
    1,
    Math.ceil(chatSessionsFiltered.length / CHAT_SESSIONS_PAGE_SIZE),
  );
  const safeChatSessionsPage = Math.min(
    chatSessionsPage,
    chatSessionsTotalPages,
  );
  const chatSessionsPageItems = chatSessionsFiltered.slice(
    (safeChatSessionsPage - 1) * CHAT_SESSIONS_PAGE_SIZE,
    safeChatSessionsPage * CHAT_SESSIONS_PAGE_SIZE,
  );

  const applyChatSessionUpdate = (updated: AgentChatSessionRead) => {
    setChatSessions((current) =>
      current.map((chatSession) =>
        chatSession.id === updated.id
          ? { ...chatSession, ...updated }
          : chatSession,
      ),
    );
  };

  const handleCreateChat = async () => {
    if (!token || !agent) return;
    setCreatingChat(true);
    try {
      const session = await createChatSession(token, agent.id, {});
      navigate(`/automation/agents/${agent.id}/chat/${session.id}`);
    } catch (e: unknown) {
      notify(
        e instanceof Error ? e.message : 'Failed to create chat session',
        'error',
      );
    } finally {
      setCreatingChat(false);
    }
  };

  const handleUpdateChatStatus = async (
    chatSession: AgentChatSessionSummaryRead,
    status: AgentChatSessionStatus,
  ) => {
    if (!token) return;
    setChatSessionActingId(chatSession.id);
    try {
      const updated = await updateChatSession(token, chatSession.id, {
        status,
      });
      applyChatSessionUpdate(updated);
      notify(status === 'archived' ? 'Chat archived' : 'Chat restored');
    } catch (e: unknown) {
      notify(
        e instanceof Error ? e.message : 'Failed to update chat session',
        'error',
      );
    } finally {
      setChatSessionActingId(null);
    }
  };

  const handleConfirmDeleteChat = async () => {
    if (!token || !deleteTarget) return;
    setChatSessionActingId(deleteTarget.id);
    try {
      await deleteChatSession(token, deleteTarget.id);
      setChatSessions((current) =>
        current.filter((chatSession) => chatSession.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
      notify('Chat deleted');
    } catch (e: unknown) {
      notify(
        e instanceof Error ? e.message : 'Failed to delete chat session',
        'error',
      );
    } finally {
      setChatSessionActingId(null);
    }
  };

  const navigateToChatSession = (chatSession: AgentChatSessionSummaryRead) => {
    navigate(
      `/automation/agents/${agentId ?? chatSession.agent_id}/chat/${chatSession.id}`,
    );
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
          action={{
            label: 'Back to Agents',
            onClick: () => navigate('/automation/agents'),
          }}
        />
      </Box>
    );
  }

  /* ---- Kind color ---- */

  const kColor = (() => {
    switch (agent.kind) {
      case 'cover_letter':
        return theme.palette.primary.main;
      case 'follow_up':
        return theme.palette.secondary.main;
      case 'outreach':
        return theme.palette.info.main;
      default:
        return theme.palette.text.secondary;
    }
  })();

  /* ---- Render ---- */

  const configuredModelName = getAgentConfiguredModelName(agent.configuration);
  const configuredModelLabel = getAgentModelDisplayLabel(configuredModelName);
  const defaultModelHelperText = getAgentDefaultModelHelperText(
    defaultModelName,
    defaultModelLabel,
  );

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Tooltip title="Back to agents">
          <Button
            size="small"
            startIcon={<BackIcon />}
            onClick={() => navigate('/automation/agents')}
            sx={{ mr: 1 }}
          >
            Agents
          </Button>
        </Tooltip>
      </Stack>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
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
              slotProps={{
                typography: { variant: 'caption', color: 'text.secondary' },
              }}
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
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 2.5, lineHeight: 1.6 }}
        >
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

      <Box sx={{ mb: 2.5 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.75 }}>
          Configuration
        </Typography>
        <Stack direction="row" spacing={1.5} alignItems="baseline">
          <Caption>Model</Caption>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {configuredModelLabel}
            </Typography>
            {!configuredModelName && (
              <Caption>{defaultModelHelperText}</Caption>
            )}
          </Box>
        </Stack>
      </Box>

      {/* Timestamps */}
      <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
        <Tooltip title={new Date(agent.created_at).toLocaleString()}>
          <Box>
            <Caption>Created {timeAgo(agent.created_at)}</Caption>
          </Box>
        </Tooltip>
        <Tooltip title={new Date(agent.updated_at).toLocaleString()}>
          <Box>
            <Caption>Updated {timeAgo(agent.updated_at)}</Caption>
          </Box>
        </Tooltip>
      </Stack>

      {/* Run History */}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <HistoryIcon fontSize="small" />
          <span>Run History</span>
          {runsTotal > 0 && (
            <Chip
              label={runsTotal}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 700, height: 22 }}
            />
          )}
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Refresh run history">
            <Box component="span">
              <Button
                size="small"
                aria-label="Refresh run history"
                onClick={() => refreshRuns(1)}
                disabled={runsLoading}
              >
                <RefreshIcon fontSize="small" />
              </Button>
            </Box>
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
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {runs.map((run) => {
                  const statusColor =
                    run.status === 'completed'
                      ? 'success'
                      : run.status === 'failed'
                        ? 'error'
                        : run.status === 'running'
                          ? 'warning'
                          : 'default';
                  return (
                    <TableRow key={run.id} hover>
                      <TableCell>
                        <Tooltip
                          title={new Date(
                            run.completed_at ?? run.created_at,
                          ).toLocaleString()}
                        >
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
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.3,
                            }}
                          >
                            {run.session_document?.title ?? 'Session'}
                            <OpenIcon sx={{ fontSize: 12 }} />
                          </Link>
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {run.session_version ? (
                          <Chip
                            label={`v${run.session_version.version_number}`}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              fontWeight: 700,
                            }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {run.status === 'completed' &&
                          run.session_document_id &&
                          run.application_id &&
                          !run.chat_session_id && (
                            <Tooltip title="Rerun agent into the same session">
                              <Box component="span">
                                <Button
                                  size="small"
                                  startIcon={
                                    rerunningRunId === run.id ? (
                                      <CircularProgress
                                        size={14}
                                        color="inherit"
                                      />
                                    ) : (
                                      <RerunIcon />
                                    )
                                  }
                                  disabled={rerunningRunId !== null}
                                  onClick={() => handleRerun(run)}
                                  sx={{ textTransform: 'none' }}
                                >
                                  Rerun
                                </Button>
                              </Box>
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

      {/* Chat Sessions */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1}
        alignItems={{ md: 'center' }}
        useFlexGap
        sx={{ mb: 1.5, mt: 4 }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <ChatIcon fontSize="small" />
          <Typography component="h2" variant="subtitle1" fontWeight={700}>
            Chat Sessions
          </Typography>
          {chatSessions.length > 0 && (
            <Chip
              label={chatSessions.length}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 700, height: 22 }}
            />
          )}
        </Stack>
        <Box sx={{ flex: 1 }} />
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          useFlexGap
          flexWrap="wrap"
        >
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="chat-session-filter-label">Filter</InputLabel>
            <Select
              labelId="chat-session-filter-label"
              label="Filter"
              value={chatSessionFilter}
              onChange={(event) =>
                setChatSessionFilter(
                  event.target.value as 'active' | 'archived' | 'all',
                )
              }
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
              <MenuItem value="all">All</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh chat sessions">
            <Box component="span">
              <Button
                size="small"
                onClick={() => refreshChatSessions()}
                disabled={chatSessionsLoading || creatingChat}
                aria-label="Refresh chat sessions"
              >
                <RefreshIcon fontSize="small" />
              </Button>
            </Box>
          </Tooltip>
          <Button
            variant="outlined"
            size="small"
            startIcon={
              creatingChat ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <AddIcon />
              )
            }
            onClick={handleCreateChat}
            disabled={creatingChat || chatSessionsLoading}
          >
            {creatingChat ? 'Creating…' : 'New Chat'}
          </Button>
        </Stack>
      </Stack>

      {chatSessionsLoading && chatSessions.length === 0 ? (
        <Skeleton variant="rounded" height={160} />
      ) : chatSessionsLoadError && chatSessions.length === 0 ? (
        <EmptyState
          icon={<ErrorIcon />}
          title="Unable to load chat sessions"
          description={chatSessionsLoadError}
          action={{
            label: 'Retry',
            onClick: refreshChatSessions,
            icon: <RefreshIcon />,
          }}
        />
      ) : chatSessions.length === 0 ? (
        <EmptyState
          icon={<ChatIcon />}
          title="Start a conversation with this agent"
          description="Create a new chat session to launch an interactive conversation."
          action={{
            label: 'New Chat',
            onClick: handleCreateChat,
            icon: <AddIcon />,
          }}
        />
      ) : chatSessionsFiltered.length === 0 ? (
        <EmptyState
          icon={<ChatIcon />}
          title={`No ${chatSessionFilter === 'all' ? '' : `${chatSessionFilter} `}chat sessions`}
          description="Try another filter or create a new chat session."
          action={{
            label: 'New Chat',
            onClick: handleCreateChat,
            icon: <AddIcon />,
          }}
        />
      ) : (
        <>
          <Stack spacing={1.5} sx={{ mb: 2 }}>
            {chatSessionsPageItems.map((chatSession) => {
              const acting = chatSessionActingId === chatSession.id;
              const lastActiveAt =
                chatSession.last_message_at ?? chatSession.updated_at;
              return (
                <Paper key={chatSession.id} variant="outlined">
                  <Stack direction={{ xs: 'column', sm: 'row' }}>
                    <Box
                      role="link"
                      tabIndex={0}
                      onClick={() => navigateToChatSession(chatSession)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          navigateToChatSession(chatSession);
                        }
                      }}
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        p: 2,
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.03),
                        },
                        '&:focus-visible': {
                          outline: `2px solid ${theme.palette.primary.main}`,
                          outlineOffset: '-2px',
                        },
                      }}
                    >
                      <Stack spacing={1.25}>
                        <Stack
                          direction={{ xs: 'column', md: 'row' }}
                          spacing={1}
                          justifyContent="space-between"
                          alignItems={{ md: 'center' }}
                        >
                          <Typography
                            variant="subtitle2"
                            fontWeight={700}
                            noWrap
                          >
                            {chatSession.title?.trim() || 'Untitled chat'}
                          </Typography>
                          <Chip
                            label={
                              chatSession.status === 'archived'
                                ? 'Archived'
                                : 'Active'
                            }
                            size="small"
                            color={
                              chatSession.status === 'archived'
                                ? 'default'
                                : 'success'
                            }
                            variant="outlined"
                            sx={{ width: 'fit-content', fontWeight: 600 }}
                          />
                        </Stack>
                        <Stack
                          direction="row"
                          spacing={1.5}
                          useFlexGap
                          flexWrap="wrap"
                        >
                          <Caption>
                            {chatSession.message_count} message
                            {chatSession.message_count === 1 ? '' : 's'}
                          </Caption>
                          <Caption
                            title={new Date(lastActiveAt).toLocaleString()}
                          >
                            Last active {timeAgo(lastActiveAt)}
                          </Caption>
                          {chatSession.application_id && (
                            <Link
                              component={RouterLink}
                              to={`/applications/${chatSession.application_id}`}
                              underline="hover"
                              variant="caption"
                              onClick={(event) => event.stopPropagation()}
                              sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.35,
                              }}
                            >
                              Application
                              <OpenIcon sx={{ fontSize: 12 }} />
                            </Link>
                          )}
                        </Stack>
                      </Stack>
                    </Box>
                    <Stack
                      direction={{ xs: 'row', sm: 'column' }}
                      spacing={1}
                      justifyContent="center"
                      sx={{
                        p: 2,
                        pt: { xs: 0, sm: 2 },
                        borderLeft: {
                          sm: `1px solid ${theme.palette.divider}`,
                        },
                        borderTop: {
                          xs: `1px solid ${theme.palette.divider}`,
                          sm: 'none',
                        },
                      }}
                    >
                      <Button
                        size="small"
                        startIcon={
                          chatSession.status === 'archived' ? (
                            <UnarchiveIcon />
                          ) : (
                            <ArchiveIcon />
                          )
                        }
                        onClick={() =>
                          handleUpdateChatStatus(
                            chatSession,
                            chatSession.status === 'archived'
                              ? 'active'
                              : 'archived',
                          )
                        }
                        disabled={acting}
                      >
                        {chatSession.status === 'archived'
                          ? 'Restore'
                          : 'Archive'}
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={
                          acting ? (
                            <CircularProgress size={14} color="inherit" />
                          ) : (
                            <DeleteIcon />
                          )
                        }
                        onClick={() => setDeleteTarget(chatSession)}
                        disabled={acting}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
          {chatSessionsTotalPages > 1 && (
            <Stack alignItems="center" sx={{ mb: 2 }}>
              <Pagination
                count={chatSessionsTotalPages}
                page={safeChatSessionsPage}
                onChange={(_, page) => setChatSessionsPage(page)}
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete chat session"
        message={
          <>
            Are you sure you want to delete{' '}
            <strong>
              {deleteTarget?.title?.trim() || 'this chat session'}
            </strong>
            ? This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        loading={
          Boolean(deleteTarget) && chatSessionActingId === deleteTarget?.id
        }
        onConfirm={handleConfirmDeleteChat}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
};

export default AgentDetailPage;
