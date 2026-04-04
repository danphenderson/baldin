import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Stack, Button, TextField,
  useTheme, alpha, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Tooltip, Skeleton, Alert, Divider, Select, MenuItem, FormControl, InputLabel,
  useMediaQuery, InputAdornment, Collapse, TablePagination,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Hub as PipelineIcon, PlayArrow as RunIcon, Delete as DeleteIcon,
  Add as AddIcon, Refresh as RefreshIcon, CheckCircle as SuccessIcon,
  Error as ErrorIcon, HourglassEmpty as PendingIcon, Loop as RunningIcon,
  Edit as EditIcon, Schedule as ScheduleIcon, DataObject as DefinitionIcon,
  WarningAmber as WarningIcon, Search as SearchIcon,
  FiberManualRecord as DotIcon, ExpandMore as ExpandMoreIcon,
  KeyboardArrowRight as CollapseIcon, TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import { AnimatePresence, motion } from 'motion/react';
import { JSONTree } from 'react-json-tree';
import { UserContext } from '../context/user-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';
import {
  type OrchestrationEventRead,
  type OrchestrationEventStatus,
  type OrchestrationPipelineRead,
  type OrchestrationEventPaginatedRead,
  type EventQueryParams,
  getOrchestrationPipelines, createOrchestrationPipeline, deleteOrchestrationPipeline,
  getOrchestrationPipeline, getOrchestrationEvents, createOrchestrationEvent,
  updateOrchestrationPipeline, updateOrchestrationEvent,
  formatURI,
} from '../service/data-orchestration';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type PipelineFormState = { name: string; description: string; definition: string };
type TriggerEventFormState = { message: string; payload: string; pipeline_id: string };

const INITIAL_PIPELINE_FORM: PipelineFormState = { name: '', description: '', definition: '{}' };
const INITIAL_TRIGGER_FORM: TriggerEventFormState = { message: '', payload: '{}', pipeline_id: '' };

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'API request failed';

const isValidJson = (str: string): boolean => {
  try { JSON.parse(str); return true; } catch { return false; }
};

const formatRelativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const STATUS_CONFIG: Record<OrchestrationEventStatus, { icon: React.ReactElement; color: string; label: string }> = {
  success: { icon: <SuccessIcon fontSize="small" />, color: '#10b981', label: 'Success' },
  failure: { icon: <ErrorIcon fontSize="small" />, color: '#f43f5e', label: 'Failed' },
  pending: { icon: <PendingIcon fontSize="small" />, color: '#f59e0b', label: 'Pending' },
  running: { icon: <RunningIcon fontSize="small" />, color: '#06b6d4', label: 'Running' },
};

const JSON_TREE_THEME = {
  scheme: 'baldin',
  base00: 'transparent',
  base01: '#1e293b',
  base02: '#334155',
  base03: '#64748b',
  base04: '#94a3b8',
  base05: '#cbd5e1',
  base06: '#e2e8f0',
  base07: '#f1f5f9',
  base08: '#f43f5e',
  base09: '#f59e0b',
  base0A: '#fbbf24',
  base0B: '#10b981',
  base0C: '#06b6d4',
  base0D: '#06b6d4',
  base0E: '#8b5cf6',
  base0F: '#f43f5e',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const MotionCard = motion.create(Card);

const StatusDot: React.FC<{ status: OrchestrationEventStatus }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <Tooltip title={cfg.label}>
      <DotIcon sx={{ fontSize: 10, color: cfg.color }} aria-label={cfg.label} />
    </Tooltip>
  );
};

const EventStatusChip: React.FC<{ status: OrchestrationEventStatus }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <Chip
      icon={cfg.icon}
      label={cfg.label}
      size="small"
      sx={{
        backgroundColor: alpha(cfg.color, 0.12),
        color: cfg.color,
        fontWeight: 600,
        fontSize: '0.7rem',
        '& .MuiChip-icon': { color: 'inherit' },
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// WF-09  Overview strip card
// ---------------------------------------------------------------------------

const OverviewStrip: React.FC<{ pipelines: OrchestrationPipelineRead[] }> = ({ pipelines }) => {
  const theme = useTheme();

  const stats = useMemo(() => {
    let totalRuns = 0;
    let totalFailures = 0;
    let lastSuccess: string | null = null;
    let recentRuns = 0;
    const oneDayAgo = Date.now() - 86_400_000;

    pipelines.forEach((p) => {
      totalRuns += p.run_count;
      totalFailures += p.failure_count;
      if (p.last_run_at && new Date(p.last_run_at).getTime() > oneDayAgo) recentRuns++;
      if (p.last_run_status === 'success' && p.last_run_at) {
        if (!lastSuccess || p.last_run_at > lastSuccess) lastSuccess = p.last_run_at;
      }
    });

    return { workflows: pipelines.length, totalRuns, totalFailures, recentRuns, lastSuccess };
  }, [pipelines]);

  const items: { label: string; value: string | number; color?: string; icon: React.ReactElement }[] = [
    { label: 'Workflows', value: stats.workflows, icon: <PipelineIcon fontSize="small" /> },
    { label: 'Total runs', value: stats.totalRuns, icon: <TrendingIcon fontSize="small" /> },
    { label: 'Failures', value: stats.totalFailures, color: stats.totalFailures > 0 ? '#f43f5e' : undefined, icon: <ErrorIcon fontSize="small" /> },
    { label: 'Recent (24h)', value: stats.recentRuns, icon: <RunningIcon fontSize="small" /> },
    { label: 'Last success', value: stats.lastSuccess ? formatRelativeTime(stats.lastSuccess) : '—', icon: <SuccessIcon fontSize="small" /> },
  ];

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
        <Stack
          direction="row"
          divider={<Divider orientation="vertical" flexItem />}
          spacing={3}
          sx={{ justifyContent: 'space-around', flexWrap: 'wrap', rowGap: 1 }}
        >
          {items.map((item) => (
            <Box key={item.label} sx={{ textAlign: 'center', minWidth: 80 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mb: 0.25, color: item.color ?? theme.palette.text.secondary }}>
                {item.icon}
              </Box>
              <Typography variant="h6" fontWeight={700} sx={{ color: item.color ?? 'text.primary', lineHeight: 1.2 }}>
                {item.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">{item.label}</Typography>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// WF-10  Workflow card
// ---------------------------------------------------------------------------

const PipelineCard: React.FC<{
  pipe: OrchestrationPipelineRead;
  onView: () => void;
  onEdit: () => void;
  onTrigger: () => void;
  onDelete: () => void;
  index: number;
}> = ({ pipe, onView, onEdit, onTrigger, onDelete, index }) => {
  const theme = useTheme();
  const lastStatusKey = (pipe.last_run_status as OrchestrationEventStatus) ?? null;
  const lastCfg = lastStatusKey ? STATUS_CONFIG[lastStatusKey] : null;

  const srcLabel = formatURI((pipe.definition as Record<string, unknown> | undefined)?.source_uri);
  const dstLabel = formatURI((pipe.definition as Record<string, unknown> | undefined)?.destination_uri);

  return (
    <MotionCard
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      sx={{
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:hover': {
          borderColor: alpha(theme.palette.primary.main, 0.3),
          boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.08)}`,
        },
      }}
      onClick={onView}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        {/* Header row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.14)}, ${alpha(theme.palette.secondary.main, 0.10)})`,
              }}
            >
              <PipelineIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body1" fontWeight={700} noWrap>
                {pipe.name || 'Untitled Workflow'}
              </Typography>
              {pipe.description && (
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                  {pipe.description}
                </Typography>
              )}
            </Box>
          </Box>
          <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0, ml: 1 }}>
            <Tooltip title="Edit">
              <IconButton
                size="small"
                aria-label={`Edit ${pipe.name || 'workflow'}`}
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                sx={{ color: theme.palette.text.secondary }}
              >
                <EditIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Trigger run">
              <IconButton
                size="small"
                aria-label={`Trigger run for ${pipe.name || 'workflow'}`}
                onClick={(e) => { e.stopPropagation(); onTrigger(); }}
                sx={{ color: theme.palette.primary.main }}
              >
                <RunIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete workflow">
              <IconButton
                size="small"
                aria-label={`Delete ${pipe.name || 'workflow'}`}
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                sx={{ color: theme.palette.error.main, opacity: 0.7, '&:hover': { opacity: 1 } }}
              >
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* Source / Destination summary */}
        {(srcLabel || dstLabel) && (
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            {srcLabel && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <DotIcon sx={{ fontSize: 6, color: '#06b6d4' }} /> {srcLabel}
              </Typography>
            )}
            {srcLabel && dstLabel && (
              <Typography variant="caption" color="text.disabled">&rarr;</Typography>
            )}
            {dstLabel && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <DotIcon sx={{ fontSize: 6, color: '#8b5cf6' }} /> {dstLabel}
              </Typography>
            )}
          </Stack>
        )}

        {/* Metadata row – last run status, time, run count */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
          {lastCfg && (
            <Chip
              icon={lastCfg.icon}
              label={lastCfg.label}
              size="small"
              sx={{
                backgroundColor: alpha(lastCfg.color, 0.12),
                color: lastCfg.color,
                fontWeight: 600,
                fontSize: '0.65rem',
                height: 22,
                '& .MuiChip-icon': { color: 'inherit' },
              }}
            />
          )}
          {pipe.last_run_at && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ScheduleIcon sx={{ fontSize: 13 }} />
              {formatRelativeTime(pipe.last_run_at)}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {pipe.run_count} run{pipe.run_count !== 1 ? 's' : ''}
            {pipe.failure_count > 0 && (
              <Typography component="span" variant="caption" sx={{ color: '#f43f5e', ml: 0.5 }}>
                ({pipe.failure_count} failed)
              </Typography>
            )}
          </Typography>
        </Box>
      </CardContent>
    </MotionCard>
  );
};

// ---------------------------------------------------------------------------
// WF-11  Run history row
// ---------------------------------------------------------------------------

const EventRow: React.FC<{
  evt: OrchestrationEventRead;
  pipelineName: string;
  onStatusChange: (status: OrchestrationEventStatus) => void;
  index: number;
}> = ({ evt, pipelineName, onStatusChange, index }) => {
  const theme = useTheme();
  const statusKey = evt.status ?? 'pending';
  const cfg = STATUS_CONFIG[statusKey];

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.25,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          transition: 'border-color 0.15s',
          '&:hover': { borderColor: alpha(cfg.color, 0.3) },
        }}
      >
        {/* Status indicator */}
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            backgroundColor: alpha(cfg.color, 0.12),
            color: cfg.color,
          }}
        >
          {cfg.icon}
        </Box>

        {/* Content */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {evt.message || 'Untitled run'}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.25 }}>
            {pipelineName && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {pipelineName}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ScheduleIcon sx={{ fontSize: 11 }} />
              {formatRelativeTime(evt.created_at)}
            </Typography>
          </Stack>
        </Box>

        {/* Quick status transitions */}
        <Tooltip title="Change status">
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <Select
              value={statusKey}
              onChange={(e: SelectChangeEvent) => onStatusChange(e.target.value as OrchestrationEventStatus)}
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: cfg.color,
                height: 30,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(cfg.color, 0.25) },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(cfg.color, 0.5) },
                '& .MuiSelect-icon': { color: cfg.color },
              }}
              renderValue={(val) => STATUS_CONFIG[val as OrchestrationEventStatus]?.label ?? val}
            >
              {(['pending', 'running', 'success', 'failure'] as const).map((s) => (
                <MenuItem key={s} value={s} sx={{ fontSize: '0.8rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: STATUS_CONFIG[s].color, display: 'flex' }}>{STATUS_CONFIG[s].icon}</Box>
                    {STATUS_CONFIG[s].label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Tooltip>
      </Box>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const PipelinesPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { token } = useContext(UserContext);

  // Data
  const [pipelines, setPipelines] = useState<OrchestrationPipelineRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Paginated run history (WF-11)
  const [eventsPage, setEventsPage] = useState<OrchestrationEventPaginatedRead>({ items: [], total: 0, page: 1, page_size: 20 });
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventPage, setEventPage] = useState(0); // 0-indexed for MUI TablePagination
  const [eventPageSize, setEventPageSize] = useState(20);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrchestrationEventStatus | 'all'>('all');
  const [pipelineFilter, setPipelineFilter] = useState<string>('all');

  // Dialogs
  const [selectedPipeline, setSelectedPipeline] = useState<OrchestrationPipelineRead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newPipeline, setNewPipeline] = useState<PipelineFormState>(INITIAL_PIPELINE_FORM);
  const [triggerOpen, setTriggerOpen] = useState(false);
  const [triggerForm, setTriggerForm] = useState<TriggerEventFormState>(INITIAL_TRIGGER_FORM);
  const [editPipeOpen, setEditPipeOpen] = useState(false);
  const [editPipeForm, setEditPipeForm] = useState<PipelineFormState & { id: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrchestrationPipelineRead | null>(null);

  // Derived
  const pipelineNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    pipelines.forEach((p) => { map[p.id] = p.name || 'Untitled'; });
    return map;
  }, [pipelines]);

  const filteredPipelines = useMemo(() => {
    if (!search) return pipelines;
    const q = search.toLowerCase();
    return pipelines.filter(
      (p) => (p.name ?? '').toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q),
    );
  }, [pipelines, search]);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const refreshPipelines = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const pipes = await getOrchestrationPipelines(token);
      setPipelines(pipes || []);
      setError('');
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    }
    setLoading(false);
  }, [token]);

  const refreshEvents = useCallback(async () => {
    if (!token) return;
    setEventsLoading(true);
    try {
      const params: EventQueryParams = {
        page: eventPage + 1, // API is 1-indexed
        page_size: eventPageSize,
      };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (pipelineFilter !== 'all') params.pipeline_id = pipelineFilter;
      const result = await getOrchestrationEvents(token, params);
      setEventsPage(result);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    }
    setEventsLoading(false);
  }, [token, eventPage, eventPageSize, statusFilter, pipelineFilter]);

  const refresh = useCallback(async () => {
    await Promise.all([refreshPipelines(), refreshEvents()]);
  }, [refreshPipelines, refreshEvents]);

  useEffect(() => { refreshPipelines(); }, [refreshPipelines]);
  useEffect(() => { refreshEvents(); }, [refreshEvents]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleCreate = async () => {
    if (!token) return;
    if (!isValidJson(newPipeline.definition)) {
      setError('Workflow definition must be valid JSON');
      return;
    }
    try {
      await createOrchestrationPipeline(token, {
        ...newPipeline,
        definition: JSON.parse(newPipeline.definition),
      });
      setCreateOpen(false);
      setNewPipeline(INITIAL_PIPELINE_FORM);
      refresh();
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  const handleConfirmDelete = async () => {
    if (!token || !deleteTarget) return;
    try {
      await deleteOrchestrationPipeline(token, deleteTarget.id);
      setDeleteTarget(null);
      refresh();
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  const handleTrigger = async () => {
    if (!token) return;
    if (!triggerForm.pipeline_id) { setError('Select a workflow to trigger'); return; }
    if (!isValidJson(triggerForm.payload)) { setError('Payload must be valid JSON'); return; }
    try {
      await createOrchestrationEvent(token, {
        ...triggerForm,
        payload: JSON.parse(triggerForm.payload) as Record<string, unknown>,
        status: 'pending',
      });
      setTriggerOpen(false);
      setTriggerForm(INITIAL_TRIGGER_FORM);
      refresh();
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  const viewPipeline = async (pipeline: OrchestrationPipelineRead) => {
    if (!token) return;
    try {
      const detail = await getOrchestrationPipeline(token, pipeline.id);
      setSelectedPipeline(detail);
      setDetailOpen(true);
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  const handleUpdatePipeline = async () => {
    if (!token || !editPipeForm?.id) return;
    if (!isValidJson(editPipeForm.definition)) { setError('Definition must be valid JSON'); return; }
    try {
      await updateOrchestrationPipeline(token, editPipeForm.id, {
        name: editPipeForm.name,
        description: editPipeForm.description,
        definition: JSON.parse(editPipeForm.definition),
      });
      setEditPipeOpen(false);
      setEditPipeForm(null);
      refresh();
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  const handleUpdateEventStatus = async (eventId: string, newStatus: OrchestrationEventStatus) => {
    if (!token) return;
    try {
      await updateOrchestrationEvent(token, eventId, { status: newStatus });
      refreshEvents();
      refreshPipelines(); // summary fields may change
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  usePageToolbarHeader('Workflows', `${pipelines.length} workflow${pipelines.length !== 1 ? 's' : ''}`);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box>
      {/* ---- WF-09 Overview strip ---- */}
      {!loading && pipelines.length > 0 && <OverviewStrip pipelines={pipelines} />}

      {/* ---- Page header ---- */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: 2,
          mb: 3,
        }}
      >
        <Box />
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Tooltip title="Refresh">
            <IconButton
              onClick={refresh}
              aria-label="Refresh workflows"
              sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '10px' }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<RunIcon />} onClick={() => setTriggerOpen(true)}>
            Trigger Run
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New Workflow
          </Button>
        </Stack>
      </Box>

      {/* ---- Error banner ---- */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Search & filter bar ---- */}
      {!loading && (pipelines.length > 0 || eventsPage.total > 0) && (
        <Stack direction="row" spacing={1.5} sx={{ mb: 3, flexWrap: 'wrap', rowGap: 1 }}>
          <TextField
            size="small"
            placeholder="Search workflows…"
            aria-label="Search workflows"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ flex: 1, maxWidth: 340 }}
          />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e: SelectChangeEvent) => { setStatusFilter(e.target.value as OrchestrationEventStatus | 'all'); setEventPage(0); }}
            >
              <MenuItem value="all">All statuses</MenuItem>
              {(['pending', 'running', 'success', 'failure'] as const).map((s) => (
                <MenuItem key={s} value={s}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: STATUS_CONFIG[s].color, display: 'flex' }}>{STATUS_CONFIG[s].icon}</Box>
                    {STATUS_CONFIG[s].label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Workflow</InputLabel>
            <Select
              value={pipelineFilter}
              label="Workflow"
              onChange={(e: SelectChangeEvent) => { setPipelineFilter(e.target.value); setEventPage(0); }}
            >
              <MenuItem value="all">All workflows</MenuItem>
              {pipelines.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.name || 'Untitled'}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      )}

      {/* ---- Loading skeletons ---- */}
      {loading ? (
        <Grid container spacing={3} aria-busy="true" aria-label="Loading workflows">
          <Grid size={{ xs: 12, md: 5 }}>
            <Skeleton variant="text" width={80} height={20} sx={{ mb: 2 }} />
            <Stack spacing={2}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />
              ))}
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <Skeleton variant="text" width={120} height={20} sx={{ mb: 2 }} />
            <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
          </Grid>
        </Grid>
      ) : (
        <Grid container spacing={3}>
          {/* ---- Pipelines column ---- */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              WORKFLOWS
            </Typography>

            {filteredPipelines.length === 0 ? (
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2,
                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)}, ${alpha(theme.palette.secondary.main, 0.08)})`,
                    }}
                  >
                    <PipelineIcon sx={{ fontSize: 28, color: alpha(theme.palette.primary.main, 0.5) }} />
                  </Box>
                  <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>
                    {search ? 'No matching workflows' : 'No workflows yet'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 260, mx: 'auto' }}>
                    {search
                      ? 'Try a different search term or clear your filter.'
                      : 'Create your first workflow to automate your job search.'}
                  </Typography>
                  {!search && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
                      New Workflow
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Stack spacing={2}>
                <AnimatePresence mode="popLayout">
                  {filteredPipelines.map((pipe, i) => (
                    <PipelineCard
                      key={pipe.id}
                      pipe={pipe}
                      index={i}
                      onView={() => viewPipeline(pipe)}
                      onEdit={() => {
                        setEditPipeForm({
                          id: pipe.id,
                          name: pipe.name ?? '',
                          description: pipe.description ?? '',
                          definition: JSON.stringify(pipe.definition ?? {}, null, 2),
                        });
                        setEditPipeOpen(true);
                      }}
                      onTrigger={() => {
                        setTriggerForm({ ...INITIAL_TRIGGER_FORM, pipeline_id: pipe.id });
                        setTriggerOpen(true);
                      }}
                      onDelete={() => setDeleteTarget(pipe)}
                    />
                  ))}
                </AnimatePresence>
              </Stack>
            )}
          </Grid>

          {/* ---- WF-11 Paginated run history ---- */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              RUN HISTORY
              {eventsPage.total > 0 && (
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  ({eventsPage.total} total)
                </Typography>
              )}
            </Typography>

            {eventsLoading ? (
              <Stack spacing={1}>
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} variant="rounded" height={56} sx={{ borderRadius: 2 }} />
                ))}
              </Stack>
            ) : eventsPage.items.length === 0 ? (
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mx: 'auto',
                      mb: 2,
                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)}, ${alpha(theme.palette.secondary.main, 0.08)})`,
                    }}
                  >
                    <ScheduleIcon sx={{ fontSize: 28, color: alpha(theme.palette.primary.main, 0.5) }} />
                  </Box>
                  <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>
                    {statusFilter !== 'all' || pipelineFilter !== 'all' ? 'No matching runs' : 'No runs yet'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280, mx: 'auto' }}>
                    {statusFilter !== 'all' || pipelineFilter !== 'all'
                      ? 'Adjust your status or workflow filter to see runs.'
                      : 'Runs will appear here when you trigger a workflow.'}
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <>
                <Stack spacing={1}>
                  {eventsPage.items.map((evt, i) => (
                    <EventRow
                      key={evt.id}
                      evt={evt}
                      index={i}
                      pipelineName={pipelineNameMap[evt.pipeline_id ?? ''] ?? ''}
                      onStatusChange={(s) => handleUpdateEventStatus(evt.id, s)}
                    />
                  ))}
                </Stack>
                {eventsPage.total > eventPageSize && (
                  <TablePagination
                    component="div"
                    count={eventsPage.total}
                    page={eventPage}
                    onPageChange={(_, newPage) => setEventPage(newPage)}
                    rowsPerPage={eventPageSize}
                    onRowsPerPageChange={(e) => { setEventPageSize(parseInt(e.target.value, 10)); setEventPage(0); }}
                    rowsPerPageOptions={[10, 20, 50]}
                    sx={{ mt: 1 }}
                  />
                )}
              </>
            )}
          </Grid>
        </Grid>
      )}

      {/* ================================================================== */}
      {/* Dialogs                                                            */}
      {/* ================================================================== */}

      {/* ---- Create Pipeline ---- */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth aria-labelledby="create-pipeline-title">
        <DialogTitle id="create-pipeline-title" fontWeight={700}>Create Workflow</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              autoFocus
              placeholder="e.g. LinkedIn Lead Enrichment"
              value={newPipeline.name}
              onChange={(e) => setNewPipeline((p) => ({ ...p, name: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Description"
              placeholder="What does this workflow do?"
              multiline
              minRows={2}
              value={newPipeline.description}
              onChange={(e) => setNewPipeline((p) => ({ ...p, description: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Definition (JSON)"
              multiline
              rows={5}
              value={newPipeline.definition}
              onChange={(e) => setNewPipeline((p) => ({ ...p, definition: e.target.value }))}
              error={newPipeline.definition.length > 0 && !isValidJson(newPipeline.definition)}
              helperText={
                newPipeline.definition.length > 0 && !isValidJson(newPipeline.definition)
                  ? 'Invalid JSON'
                  : ' '
              }
              slotProps={{
                input: {
                  sx: { fontFamily: 'monospace', fontSize: '0.85rem' },
                },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newPipeline.name.trim() || !isValidJson(newPipeline.definition)}
          >
            Create Workflow
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- Trigger Event ---- */}
      <Dialog open={triggerOpen} onClose={() => setTriggerOpen(false)} maxWidth="sm" fullWidth aria-labelledby="trigger-event-title">
        <DialogTitle id="trigger-event-title" fontWeight={700}>Trigger Run</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Pipeline</InputLabel>
              <Select
                value={triggerForm.pipeline_id}
                label="Pipeline"
                onChange={(e: SelectChangeEvent) => setTriggerForm((p) => ({ ...p, pipeline_id: e.target.value }))}
              >
                {pipelines.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PipelineIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      {p.name || 'Untitled'}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Message"
              placeholder="Describe this event…"
              value={triggerForm.message}
              onChange={(e) => setTriggerForm((p) => ({ ...p, message: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Payload (JSON)"
              multiline
              rows={4}
              value={triggerForm.payload}
              onChange={(e) => setTriggerForm((p) => ({ ...p, payload: e.target.value }))}
              error={triggerForm.payload.length > 0 && !isValidJson(triggerForm.payload)}
              helperText={
                triggerForm.payload.length > 0 && !isValidJson(triggerForm.payload)
                  ? 'Invalid JSON'
                  : ' '
              }
              slotProps={{
                input: {
                  sx: { fontFamily: 'monospace', fontSize: '0.85rem' },
                },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setTriggerOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<RunIcon />}
            onClick={handleTrigger}
            disabled={!triggerForm.pipeline_id || !isValidJson(triggerForm.payload)}
          >
            Trigger
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- Edit Pipeline ---- */}
      <Dialog open={editPipeOpen} onClose={() => setEditPipeOpen(false)} maxWidth="sm" fullWidth aria-labelledby="edit-pipeline-title">
        <DialogTitle id="edit-pipeline-title" fontWeight={700}>Edit Workflow</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              autoFocus
              value={editPipeForm?.name || ''}
              onChange={(e) => setEditPipeForm((p) => p ? ({ ...p, name: e.target.value }) : p)}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              minRows={2}
              value={editPipeForm?.description || ''}
              onChange={(e) => setEditPipeForm((p) => p ? ({ ...p, description: e.target.value }) : p)}
            />
            <TextField
              fullWidth
              label="Definition (JSON)"
              multiline
              rows={5}
              value={editPipeForm?.definition || '{}'}
              onChange={(e) => setEditPipeForm((p) => p ? ({ ...p, definition: e.target.value }) : p)}
              error={!!(editPipeForm?.definition && !isValidJson(editPipeForm.definition))}
              helperText={
                editPipeForm?.definition && !isValidJson(editPipeForm.definition)
                  ? 'Invalid JSON'
                  : ' '
              }
              slotProps={{
                input: {
                  sx: { fontFamily: 'monospace', fontSize: '0.85rem' },
                },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setEditPipeOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpdatePipeline}
            disabled={!editPipeForm?.name?.trim() || !isValidJson(editPipeForm?.definition ?? '{}')}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- WF-12  Pipeline Detail (summary-first, advanced JSON sections) ---- */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth aria-labelledby="pipeline-detail-title">
        {selectedPipeline && (
          <PipelineDetailContent
            pipeline={selectedPipeline}
            onClose={() => setDetailOpen(false)}
            onEdit={() => {
              setEditPipeForm({
                id: selectedPipeline.id,
                name: selectedPipeline.name ?? '',
                description: selectedPipeline.description ?? '',
                definition: JSON.stringify(selectedPipeline.definition ?? {}, null, 2),
              });
              setDetailOpen(false);
              setEditPipeOpen(true);
            }}
            onTrigger={() => {
              setTriggerForm({ ...INITIAL_TRIGGER_FORM, pipeline_id: selectedPipeline.id });
              setDetailOpen(false);
              setTriggerOpen(true);
            }}
          />
        )}
      </Dialog>

      {/* ---- Delete Confirmation ---- */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
        aria-labelledby="delete-pipeline-title"
      >
        <DialogTitle id="delete-pipeline-title" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: alpha(theme.palette.error.main, 0.1),
              flexShrink: 0,
            }}
          >
            <WarningIcon sx={{ color: theme.palette.error.main }} />
          </Box>
          <Typography variant="h6" fontWeight={700}>Delete Workflow</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete{' '}
            <Typography component="span" fontWeight={600} color="text.primary">
              {deleteTarget?.name || 'this workflow'}
            </Typography>
            ? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={handleConfirmDelete}>
            Delete Workflow
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// WF-12  Pipeline Detail dialog content (summary-first, collapsible advanced)
// ---------------------------------------------------------------------------

const PipelineDetailContent: React.FC<{
  pipeline: OrchestrationPipelineRead;
  onClose: () => void;
  onEdit: () => void;
  onTrigger: () => void;
}> = ({ pipeline, onClose, onEdit, onTrigger }) => {
  const theme = useTheme();
  const [definitionOpen, setDefinitionOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(true);

  const srcLabel = formatURI((pipeline.definition as Record<string, unknown> | undefined)?.source_uri);
  const dstLabel = formatURI((pipeline.definition as Record<string, unknown> | undefined)?.destination_uri);
  const lastStatusKey = (pipeline.last_run_status as OrchestrationEventStatus) ?? null;
  const lastCfg = lastStatusKey ? STATUS_CONFIG[lastStatusKey] : null;

  return (
    <>
      <DialogTitle id="pipeline-detail-title" sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.14)}, ${alpha(theme.palette.secondary.main, 0.10)})`,
            }}
          >
            <PipelineIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {pipeline.name || 'Untitled Workflow'}
            </Typography>
            {pipeline.description && (
              <Typography variant="body2" color="text.secondary">
                {pipeline.description}
              </Typography>
            )}
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          {/* Summary metadata (WF-12: summary-first) */}
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ScheduleIcon sx={{ fontSize: 13 }} />
              Created {formatRelativeTime(pipeline.created_at)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {pipeline.run_count} run{pipeline.run_count !== 1 ? 's' : ''}
            </Typography>
            {pipeline.failure_count > 0 && (
              <Typography variant="caption" sx={{ color: '#f43f5e' }}>
                {pipeline.failure_count} failed
              </Typography>
            )}
            {lastCfg && (
              <Chip
                icon={lastCfg.icon}
                label={`Last: ${lastCfg.label}`}
                size="small"
                sx={{
                  backgroundColor: alpha(lastCfg.color, 0.12),
                  color: lastCfg.color,
                  fontWeight: 600,
                  fontSize: '0.65rem',
                  height: 22,
                  '& .MuiChip-icon': { color: 'inherit' },
                }}
              />
            )}
            {pipeline.last_run_at && (
              <Typography variant="caption" color="text.secondary">
                Last run {formatRelativeTime(pipeline.last_run_at)}
              </Typography>
            )}
          </Stack>

          {/* Source / Destination display */}
          {(srcLabel || dstLabel) && (
            <Box sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                {srcLabel && (
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DotIcon sx={{ fontSize: 8, color: '#06b6d4' }} /> Source: {srcLabel}
                  </Typography>
                )}
                {srcLabel && dstLabel && <Typography variant="body2" color="text.disabled">&rarr;</Typography>}
                {dstLabel && (
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <DotIcon sx={{ fontSize: 8, color: '#8b5cf6' }} /> Dest: {dstLabel}
                  </Typography>
                )}
              </Stack>
            </Box>
          )}

          <Divider />

          {/* Collapsible definition (advanced) */}
          <Box>
            <Box
              onClick={() => setDefinitionOpen((o) => !o)}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'pointer', mb: definitionOpen ? 1.5 : 0 }}
            >
              {definitionOpen ? <ExpandMoreIcon sx={{ fontSize: 18 }} /> : <CollapseIcon sx={{ fontSize: 18 }} />}
              <DefinitionIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="subtitle2" color="text.secondary">
                DEFINITION (JSON)
              </Typography>
            </Box>
            <Collapse in={definitionOpen}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  background: alpha(theme.palette.text.primary, 0.03),
                  border: `1px solid ${theme.palette.divider}`,
                  overflow: 'auto',
                  maxHeight: 240,
                  '& > ul': { margin: '0 !important', padding: '0 !important' },
                }}
              >
                <JSONTree
                  data={pipeline.definition ?? {}}
                  theme={JSON_TREE_THEME}
                  invertTheme={theme.palette.mode === 'light'}
                  hideRoot
                  shouldExpandNodeInitially={() => true}
                />
              </Box>
            </Collapse>
          </Box>

          {/* Runs section */}
          {pipeline.events.length > 0 && (
            <Box>
              <Box
                onClick={() => setEventsOpen((o) => !o)}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'pointer', mb: eventsOpen ? 1.5 : 0 }}
              >
                {eventsOpen ? <ExpandMoreIcon sx={{ fontSize: 18 }} /> : <CollapseIcon sx={{ fontSize: 18 }} />}
                <Typography variant="subtitle2" color="text.secondary">
                  RUNS ({pipeline.events.length})
                </Typography>
              </Box>
              <Collapse in={eventsOpen}>
                <Stack spacing={1}>
                  {pipeline.events.map((evt) => {
                    const statusKey = evt.status ?? 'pending';
                    const cfg = STATUS_CONFIG[statusKey];
                    return (
                      <Box
                        key={evt.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          p: 1.5,
                          borderRadius: 2,
                          border: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: alpha(cfg.color, 0.12),
                            color: cfg.color,
                            flexShrink: 0,
                          }}
                        >
                          {cfg.icon}
                        </Box>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={500} noWrap>
                            {evt.message || 'Untitled run'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatRelativeTime(evt.created_at)}
                          </Typography>
                        </Box>
                        <EventStatusChip status={statusKey} />
                      </Box>
                    );
                  })}
                </Stack>
              </Collapse>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Close</Button>
        <Button variant="outlined" startIcon={<EditIcon />} onClick={onEdit}>
          Edit
        </Button>
        <Button variant="contained" startIcon={<RunIcon />} onClick={onTrigger}>
          Trigger Run
        </Button>
      </DialogActions>
    </>
  );
};

export default PipelinesPage;
