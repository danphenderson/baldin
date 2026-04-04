import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Stack, Button, TextField,
  useTheme, alpha, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Tooltip, Skeleton, Alert, Divider, Select, MenuItem, FormControl, InputLabel,
  Badge, useMediaQuery, InputAdornment,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Hub as PipelineIcon, PlayArrow as RunIcon, Delete as DeleteIcon,
  Add as AddIcon, Refresh as RefreshIcon, CheckCircle as SuccessIcon,
  Error as ErrorIcon, HourglassEmpty as PendingIcon, Loop as RunningIcon,
  Edit as EditIcon, Schedule as ScheduleIcon, DataObject as DefinitionIcon,
  WarningAmber as WarningIcon, Search as SearchIcon,
  FiberManualRecord as DotIcon,
} from '@mui/icons-material';
import { AnimatePresence, motion } from 'motion/react';
import { JSONTree } from 'react-json-tree';
import { UserContext } from '../context/user-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';
import {
  type OrchestrationEventRead,
  type OrchestrationEventStatus,
  type OrchestrationPipelineRead,
  getOrchestrationPipelines, createOrchestrationPipeline, deleteOrchestrationPipeline,
  getOrchestrationPipeline, getOrchestrationEvents, createOrchestrationEvent,
  updateOrchestrationPipeline, updateOrchestrationEvent,
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
// Pipeline Card
// ---------------------------------------------------------------------------

const PipelineCard: React.FC<{
  pipe: OrchestrationPipelineRead;
  events: OrchestrationEventRead[];
  onView: () => void;
  onEdit: () => void;
  onTrigger: () => void;
  onDelete: () => void;
  index: number;
}> = ({ pipe, events, onView, onEdit, onTrigger, onDelete, index }) => {
  const theme = useTheme();

  const pipeEvents = useMemo(
    () => events.filter((e) => e.pipeline_id === pipe.id),
    [events, pipe.id],
  );

  const statusSummary = useMemo(() => {
    const counts: Partial<Record<OrchestrationEventStatus, number>> = {};
    pipeEvents.forEach((e) => {
      const s = e.status ?? 'pending';
      counts[s] = (counts[s] ?? 0) + 1;
    });
    return counts;
  }, [pipeEvents]);

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

        {/* Metadata row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ScheduleIcon sx={{ fontSize: 13 }} />
            {formatRelativeTime(pipe.created_at)}
          </Typography>
          <Badge
            badgeContent={pipeEvents.length}
            color="primary"
            max={99}
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.65rem',
                height: 16,
                minWidth: 16,
                ...(pipeEvents.length === 0 && { display: 'none' }),
              },
            }}
          >
            <Typography variant="caption" color="text.secondary">runs</Typography>
          </Badge>
          {Object.keys(statusSummary).length > 0 && (
            <Stack direction="row" spacing={0.25} sx={{ ml: 'auto' }}>
              {(Object.entries(statusSummary) as [OrchestrationEventStatus, number][]).map(([s, count]) => (
                <Tooltip key={s} title={`${count} ${STATUS_CONFIG[s].label.toLowerCase()}`}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                    <StatusDot status={s} />
                    <Typography variant="caption" sx={{ color: STATUS_CONFIG[s].color, fontWeight: 600, fontSize: '0.65rem' }}>
                      {count}
                    </Typography>
                  </Box>
                </Tooltip>
              ))}
            </Stack>
          )}
        </Box>
      </CardContent>
    </MotionCard>
  );
};

// ---------------------------------------------------------------------------
// Event Row
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
  const [events, setEvents] = useState<OrchestrationEventRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrchestrationEventStatus | 'all'>('all');

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

  const filteredEvents = useMemo(() => {
    let evts = events;
    if (statusFilter !== 'all') {
      evts = evts.filter((e) => e.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      evts = evts.filter(
        (e) =>
          (e.message ?? '').toLowerCase().includes(q) ||
          (pipelineNameMap[e.pipeline_id ?? ''] ?? '').toLowerCase().includes(q),
      );
    }
    return evts;
  }, [events, statusFilter, search, pipelineNameMap]);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [pipes, evts] = await Promise.all([
        getOrchestrationPipelines(token),
        getOrchestrationEvents(token),
      ]);
      setPipelines(pipes || []);
      setEvents(evts || []);
      setError('');
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

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
      refresh();
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  // ---------------------------------------------------------------------------
  // Event counts for summary bar
  // ---------------------------------------------------------------------------

  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = { total: events.length };
    events.forEach((e) => { counts[e.status ?? 'pending'] = (counts[e.status ?? 'pending'] ?? 0) + 1; });
    return counts;
  }, [events]);

  usePageToolbarHeader('Workflows', `${pipelines.length} workflow${pipelines.length !== 1 ? 's' : ''}`);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box>
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
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
          {Object.entries(eventCounts).filter(([k]) => k !== 'total').map(([status, count]) => (
            <Typography
              key={status}
              variant="body2"
              sx={{
                color: STATUS_CONFIG[status as OrchestrationEventStatus]?.color ?? 'text.secondary',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <DotIcon sx={{ fontSize: 8 }} />
              {count} {status}
            </Typography>
          ))}
        </Stack>
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
      {!loading && (pipelines.length > 0 || events.length > 0) && (
        <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
          <TextField
            size="small"
            placeholder="Search workflows & runs…"
            aria-label="Search workflows and runs"
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
              onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value as OrchestrationEventStatus | 'all')}
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
                      events={events}
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

          {/* ---- Events column ---- */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              RECENT RUNS
            </Typography>

            {filteredEvents.length === 0 ? (
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
                    {search || statusFilter !== 'all' ? 'No matching runs' : 'No runs yet'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280, mx: 'auto' }}>
                    {search || statusFilter !== 'all'
                      ? 'Adjust your search or status filter to see runs.'
                      : 'Runs will appear here when you trigger a workflow.'}
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Stack spacing={1}>
                {filteredEvents.slice(0, 30).map((evt, i) => (
                  <EventRow
                    key={evt.id}
                    evt={evt}
                    index={i}
                    pipelineName={pipelineNameMap[evt.pipeline_id ?? ''] ?? ''}
                    onStatusChange={(s) => handleUpdateEventStatus(evt.id, s)}
                  />
                ))}
                {filteredEvents.length > 30 && (
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', pt: 1 }}>
                    Showing 30 of {filteredEvents.length} runs
                  </Typography>
                )}
              </Stack>
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

      {/* ---- Pipeline Detail ---- */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth aria-labelledby="pipeline-detail-title">
        {selectedPipeline && (
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
                    {selectedPipeline.name || 'Untitled Workflow'}
                  </Typography>
                  {selectedPipeline.description && (
                    <Typography variant="body2" color="text.secondary">
                      {selectedPipeline.description}
                    </Typography>
                  )}
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Stack spacing={3}>
                {/* Metadata */}
                <Stack direction="row" spacing={2}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ScheduleIcon sx={{ fontSize: 13 }} />
                    Created {formatRelativeTime(selectedPipeline.created_at)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedPipeline.events.length} run{selectedPipeline.events.length !== 1 ? 's' : ''}
                  </Typography>
                </Stack>

                <Divider />

                {/* Definition */}
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <DefinitionIcon sx={{ fontSize: 16 }} />
                    DEFINITION
                  </Typography>
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
                      data={selectedPipeline.definition ?? {}}
                      theme={JSON_TREE_THEME}
                      invertTheme={theme.palette.mode === 'light'}
                      hideRoot
                      shouldExpandNodeInitially={() => true}
                    />
                  </Box>
                </Box>

                {/* Events */}
                {selectedPipeline.events.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                      RUNS ({selectedPipeline.events.length})
                    </Typography>
                    <Stack spacing={1}>
                      {selectedPipeline.events.map((evt) => {
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
                  </Box>
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={() => setDetailOpen(false)}>Close</Button>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => {
                  setEditPipeForm({
                    id: selectedPipeline.id,
                    name: selectedPipeline.name ?? '',
                    description: selectedPipeline.description ?? '',
                    definition: JSON.stringify(selectedPipeline.definition ?? {}, null, 2),
                  });
                  setDetailOpen(false);
                  setEditPipeOpen(true);
                }}
              >
                Edit
              </Button>
              <Button
                variant="contained"
                startIcon={<RunIcon />}
                onClick={() => {
                  setTriggerForm({ ...INITIAL_TRIGGER_FORM, pipeline_id: selectedPipeline.id });
                  setDetailOpen(false);
                  setTriggerOpen(true);
                }}
              >
                Trigger Run
              </Button>
            </DialogActions>
          </>
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

export default PipelinesPage;
