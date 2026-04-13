import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Stack, Button, TextField,
  useTheme, alpha, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Tooltip, Skeleton, Alert, Divider, Select, MenuItem, FormControl, InputLabel,
  Switch, FormControlLabel, Collapse, TablePagination,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Hub as PipelineIcon, PlayArrow as RunIcon, Add as AddIcon,
  Refresh as RefreshIcon, CheckCircle as SuccessIcon,
  Error as ErrorIcon, HourglassEmpty as PendingIcon, Loop as RunningIcon,
  Edit as EditIcon, Schedule as ScheduleIcon,
  FiberManualRecord as DotIcon, ExpandMore as ExpandMoreIcon,
  TrendingUp as TrendingIcon, Cancel as CancelIcon,
  Pause as PauseIcon, PlayCircle as ResumeIcon,
  BugReport as CrawlerIcon,
} from '@mui/icons-material';
import { AnimatePresence, motion } from 'motion/react';
import { UserContext } from '../context/user-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';
import EmptyState from '../component/common/empty-state';
import ConfirmDialog from '../component/common/confirm-dialog';
import { AgentEnabledMultilineField } from '../component/agent-surface';
import {
  type CrawlerPipelineRead,
  type CrawlerPipelineCreate,
  type CrawlerPipelineUpdate,
  type CrawlerRunRead,
  type CrawlerRunsPaginatedRead,
  type CrawlerRunStatus,
  type CrawlerSourceType,
  getCrawlerPipelines, createCrawlerPipeline, updateCrawlerPipeline,
  getCrawlerRuns, triggerCrawlerRun, cancelCrawlerRun, pauseCrawlerRun, resumeCrawlerRun,
  retryCrawlerRun,
} from '../service/crawlers';
import { monoFontFamily } from '../design-system/tokens/typography';
import { getStatusColors } from '../theme/status-colors';
import { softBrandGradient } from '../theme/effects';
import { MetricStrip } from '../design-system';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

const getCrawlerStatusConfig = (theme: import('@mui/material/styles').Theme) => {
  const sc = getStatusColors(theme);
  return {
    success: { icon: <SuccessIcon fontSize="small" />, color: sc.success, label: 'Success' },
    failed: { icon: <ErrorIcon fontSize="small" />, color: sc.failed, label: 'Failed' },
    pending: { icon: <PendingIcon fontSize="small" />, color: sc.pending, label: 'Pending' },
    running: { icon: <RunningIcon fontSize="small" />, color: sc.running, label: 'Running' },
    cancelled: { icon: <CancelIcon fontSize="small" />, color: sc.cancelled, label: 'Cancelled' },
    paused: { icon: <PauseIcon fontSize="small" />, color: sc.paused, label: 'Paused' },
    pending_review: { icon: <PendingIcon fontSize="small" />, color: sc.pending_review, label: 'Pending Review' },
  } as Record<CrawlerRunStatus, { icon: React.ReactElement; color: string; label: string }>;
};

const getSourceColors = (theme: import('@mui/material/styles').Theme) => {
  const sc = getStatusColors(theme);
  return {
    linkedin: sc.linkedin,
    glassdoor: sc.glassdoor,
  } as Record<CrawlerSourceType, string>;
};

type PipelineFormState = {
  name: string;
  description: string;
  source: CrawlerSourceType;
  query_definition: string;
  schedule_definition: string;
  enabled: boolean;
  requires_approval: boolean;
  execution_policy: string;
  extraction_policy: string;
};

const INITIAL_FORM: PipelineFormState = {
  name: '',
  description: '',
  source: 'linkedin',
  query_definition: '{}',
  schedule_definition: '{}',
  enabled: true,
  requires_approval: false,
  execution_policy: '{}',
  extraction_policy: '{}',
};

const DEFAULT_RUN_PAGE_SIZE = 10;

const EMPTY_RUNS_PAGE: CrawlerRunsPaginatedRead = {
  items: [],
  total: 0,
  page: 1,
  page_size: DEFAULT_RUN_PAGE_SIZE,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const MotionCard = motion.create(Card);

const RunStatusChip: React.FC<{ status: CrawlerRunStatus }> = ({ status }) => {
  const theme = useTheme();
  const STATUS_CONFIG = getCrawlerStatusConfig(theme);
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
// Overview strip
// ---------------------------------------------------------------------------

const OverviewStrip: React.FC<{ pipelines: CrawlerPipelineRead[] }> = ({ pipelines }) => {
  const theme = useTheme();

  const stats = useMemo(() => {
    let totalRuns = 0;
    let failedRuns = 0;
    let activePipelines = 0;

    pipelines.forEach((p) => {
      totalRuns += p.run_count ?? 0;
      if (p.last_run_status === 'failed') failedRuns++;
      if (p.enabled) activePipelines++;
    });

    return { total: pipelines.length, active: activePipelines, totalRuns, failedRuns };
  }, [pipelines]);

  return (
    <Box sx={{ mb: 3 }}>
      <MetricStrip
        variant="card"
        items={[
          { label: 'Pipelines', value: stats.total, icon: <PipelineIcon fontSize="small" /> },
          { label: 'Active', value: stats.active, icon: <SuccessIcon fontSize="small" /> },
          { label: 'Total runs', value: stats.totalRuns, icon: <TrendingIcon fontSize="small" /> },
          { label: 'Failed runs', value: stats.failedRuns, color: stats.failedRuns > 0 ? theme.palette.error.main : undefined, icon: <ErrorIcon fontSize="small" /> },
        ]}
      />
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Pipeline card
// ---------------------------------------------------------------------------

const CrawlerPipelineCard: React.FC<{
  pipe: CrawlerPipelineRead;
  onEdit: () => void;
  onTrigger: () => void;
  onToggleEnabled: () => void;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  runs: CrawlerRunRead[];
  runsTotal: number;
  runPage: number;
  runPageSize: number;
  runsLoading: boolean;
  onRunPageChange: (page: number) => void;
  onRunPageSizeChange: (pageSize: number) => void;
  onCancelRun: (runId: string) => void;
  onPauseRun: (runId: string) => void;
  onResumeRun: (runId: string) => void;
  onRetryRun: (runId: string) => void;
  index: number;
}> = ({
  pipe,
  onEdit,
  onTrigger,
  onToggleEnabled,
  expandedId,
  onToggleExpand,
  runs,
  runsTotal,
  runPage,
  runPageSize,
  runsLoading,
  onRunPageChange,
  onRunPageSizeChange,
  onCancelRun,
  onPauseRun,
  onResumeRun,
  onRetryRun,
  index,
}) => {
  const theme = useTheme();
  const STATUS_CONFIG = getCrawlerStatusConfig(theme);
  const SOURCE_COLORS = getSourceColors(theme);
  const lastStatusKey = pipe.last_run_status ?? null;
  const lastCfg = lastStatusKey ? STATUS_CONFIG[lastStatusKey] : null;
  const expanded = expandedId === pipe.id;

  return (
    <MotionCard
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      sx={{
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:hover': {
          borderColor: alpha(theme.palette.primary.main, 0.3),
          boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.08)}`,
        },
      }}
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
                background: softBrandGradient(theme, {
                  startTone: 'main',
                  endTone: 'main',
                  startOpacity: 0.14,
                  endOpacity: 0.1,
                }),
              }}
            >
              <CrawlerIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body1" fontWeight={700} noWrap>
                {pipe.name || 'Untitled Pipeline'}
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
              <IconButton size="small" aria-label={`Edit ${pipe.name}`} onClick={onEdit} sx={{ color: theme.palette.text.secondary }}>
                <EditIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Trigger run">
              <IconButton size="small" aria-label={`Trigger run for ${pipe.name}`} onClick={onTrigger} sx={{ color: theme.palette.primary.main }}>
                <RunIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={pipe.enabled ? 'Disable' : 'Enable'}>
              <IconButton size="small" aria-label={`Toggle ${pipe.name}`} onClick={onToggleEnabled} sx={{ color: pipe.enabled ? theme.palette.success.main : theme.palette.text.disabled }}>
                <DotIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* Source + enabled badge */}
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <Chip
            label={pipe.source}
            size="small"
            sx={{
              backgroundColor: alpha(SOURCE_COLORS[pipe.source] ?? theme.palette.primary.main, 0.12),
              color: SOURCE_COLORS[pipe.source] ?? theme.palette.primary.main,
              fontWeight: 600,
              fontSize: '0.65rem',
              height: 22,
              textTransform: 'capitalize',
            }}
          />
          <Chip
            label={pipe.enabled ? 'Enabled' : 'Disabled'}
            size="small"
            sx={{
              backgroundColor: alpha(pipe.enabled ? theme.palette.success.main : theme.palette.text.secondary, 0.12),
              color: pipe.enabled ? theme.palette.success.main : theme.palette.text.secondary,
              fontWeight: 600,
              fontSize: '0.65rem',
              height: 22,
            }}
          />
        </Stack>

        {/* Metadata row */}
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
            {pipe.run_count ?? 0} run{(pipe.run_count ?? 0) !== 1 ? 's' : ''}
          </Typography>
        </Box>

        {/* Query definition summary */}
        {pipe.query_definition && Object.keys(pipe.query_definition).length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontFamily: monoFontFamily, fontSize: '0.65rem' }} noWrap>
            {JSON.stringify(pipe.query_definition).slice(0, 120)}
            {JSON.stringify(pipe.query_definition).length > 120 ? '…' : ''}
          </Typography>
        )}

        {/* Expand toggle for runs */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
          <IconButton
            size="small"
            onClick={() => onToggleExpand(pipe.id)}
            aria-label={expanded ? 'Collapse runs' : 'Expand runs'}
            sx={{ color: theme.palette.text.secondary }}
          >
            <ExpandMoreIcon sx={{ fontSize: 20, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </IconButton>
        </Box>

        {/* Run history */}
        <Collapse in={expanded}>
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Run History
            {runsTotal > 0 && (
              <Box component="span" sx={{ ml: 0.75, color: 'text.secondary', fontWeight: 500 }}>
                ({runsTotal} total)
              </Box>
            )}
          </Typography>
          {runsLoading ? (
            <Stack spacing={1}>
              {[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={40} />)}
            </Stack>
          ) : runs.length === 0 ? (
            <Typography variant="caption" color="text.secondary">No runs yet.</Typography>
          ) : (
            <>
              <Stack spacing={1}>
                {runs.map((run) => (
                  <Box
                    key={run.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 1.5,
                      py: 1,
                      borderRadius: '6px',
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <RunStatusChip status={run.status} />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ScheduleIcon sx={{ fontSize: 11 }} />
                        {formatRelativeTime(run.created_at)}
                      </Typography>
                      {run.error_summary && (
                        <Typography variant="caption" color="error" noWrap sx={{ display: 'block' }}>
                          {run.error_summary}
                        </Typography>
                      )}
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      {(run.status === 'running' || run.status === 'pending') && (
                        <Tooltip title="Cancel">
                          <IconButton size="small" onClick={() => onCancelRun(run.id)}>
                            <CancelIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {run.status === 'running' && (
                        <Tooltip title="Pause">
                          <IconButton size="small" onClick={() => onPauseRun(run.id)}>
                            <PauseIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {run.status === 'paused' && (
                        <Tooltip title="Resume">
                          <IconButton size="small" onClick={() => onResumeRun(run.id)}>
                            <ResumeIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {(run.status === 'failed' || run.status === 'cancelled') && (
                        <Tooltip title="Retry">
                          <IconButton size="small" onClick={() => onRetryRun(run.id)}>
                            <RefreshIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </Box>
                ))}
              </Stack>
              {runsTotal > 0 && (
                <TablePagination
                  component="div"
                  count={runsTotal}
                  page={runPage}
                  onPageChange={(_, nextPage) => onRunPageChange(nextPage)}
                  rowsPerPage={runPageSize}
                  onRowsPerPageChange={(event) => onRunPageSizeChange(parseInt(event.target.value, 10))}
                  rowsPerPageOptions={[5, 10, 20]}
                  labelRowsPerPage="Runs per page"
                  sx={{
                    mt: 1,
                    px: 0,
                    '& .MuiTablePagination-toolbar': { minHeight: 44, px: 0 },
                    '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                      fontSize: '0.75rem',
                    },
                  }}
                />
              )}
            </>
          )}
        </Collapse>
      </CardContent>
    </MotionCard>
  );
};

// ---------------------------------------------------------------------------
// Pipeline form dialog
// ---------------------------------------------------------------------------

const PipelineFormDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  form: PipelineFormState;
  setForm: React.Dispatch<React.SetStateAction<PipelineFormState>>;
  title: string;
  submitLabel: string;
  loading: boolean;
}> = ({ open, onClose, onSubmit, form, setForm, title, submitLabel, loading }) => {
  const jsonFields: { key: keyof PipelineFormState; label: string }[] = [
    { key: 'query_definition', label: 'Query Definition (JSON)' },
    { key: 'schedule_definition', label: 'Schedule Definition (JSON)' },
    { key: 'execution_policy', label: 'Execution Policy (JSON)' },
    { key: 'extraction_policy', label: 'Extraction Policy (JSON)' },
  ];

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        <TextField
          label="Name"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          fullWidth
          required
          size="small"
        />
        <TextField
          label="Description"
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          fullWidth
          size="small"
        />
        <FormControl size="small" fullWidth>
          <InputLabel>Source</InputLabel>
          <Select
            value={form.source}
            label="Source"
            onChange={(e: SelectChangeEvent) => setForm((prev) => ({ ...prev, source: e.target.value as CrawlerSourceType }))}
          >
            <MenuItem value="linkedin">LinkedIn</MenuItem>
            <MenuItem value="glassdoor">Glassdoor</MenuItem>
          </Select>
        </FormControl>
        <FormControlLabel
          control={
            <Switch
              checked={form.enabled}
              onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
            />
          }
          label="Enabled"
        />
        <FormControlLabel
          control={
            <Switch
              checked={form.requires_approval}
              onChange={(e) => setForm((prev) => ({ ...prev, requires_approval: e.target.checked }))}
            />
          }
          label="Require human review"
        />
        {jsonFields.map(({ key, label }) => (
          <AgentEnabledMultilineField
            key={key}
            label={label}
            value={String(form[key])}
            onChange={(nextValue) => setForm((prev) => ({ ...prev, [key]: nextValue }))}
            fullWidth
            multiline
            minRows={3}
            maxRows={8}
            size="small"
            surfaceId={form.name || 'crawler-pipeline-dialog'}
            fieldKey={`crawler_${key}`}
            entityRefs={[]}
            error={!isValidJson(form[key] as string)}
            helperText={!isValidJson(form[key] as string) ? 'Invalid JSON' : undefined}
            slotProps={{ input: { sx: { fontFamily: monoFontFamily, fontSize: '0.8rem' } } }}
          />
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          disabled={loading || !form.name || !isValidJson(form.query_definition)}
        >
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const CrawlersPage: React.FC = () => {
  const theme = useTheme();
  const { token } = useContext(UserContext);

  const [pipelines, setPipelines] = useState<CrawlerPipelineRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create / edit dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [formState, setFormState] = useState<PipelineFormState>(INITIAL_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Trigger confirm
  const [triggerConfirmOpen, setTriggerConfirmOpen] = useState(false);
  const [triggerPipelineId, setTriggerPipelineId] = useState<string | null>(null);

  // Expanded card run history
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedRunsPipelineId, setExpandedRunsPipelineId] = useState<string | null>(null);
  const [expandedRunsPage, setExpandedRunsPage] = useState<CrawlerRunsPaginatedRead>(EMPTY_RUNS_PAGE);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runPage, setRunPage] = useState(0);
  const [runPageSize, setRunPageSize] = useState(DEFAULT_RUN_PAGE_SIZE);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchPipelines = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getCrawlerPipelines(token);
      setPipelines(data);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchPipelines(); }, [fetchPipelines]);

  const fetchRuns = useCallback(async (pipelineId: string, page: number, pageSize: number) => {
    if (!token) return;
    if (expandedRunsPipelineId !== pipelineId) {
      setExpandedRunsPage(EMPTY_RUNS_PAGE);
    }
    setExpandedRunsPipelineId(pipelineId);
    setRunsLoading(true);
    try {
      const data = await getCrawlerRuns(token, {
        pipeline_id: pipelineId,
        page: page + 1,
        page_size: pageSize,
      });
      setExpandedRunsPage(data);
      setRunPage(page);
      setRunPageSize(pageSize);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setRunsLoading(false);
    }
  }, [expandedRunsPipelineId, token]);

  const refreshPageData = useCallback(async (pipelineId?: string, page = runPage) => {
    await Promise.all([
      fetchPipelines(),
      pipelineId ? fetchRuns(pipelineId, page, runPageSize) : Promise.resolve(),
    ]);
  }, [fetchPipelines, fetchRuns, runPage, runPageSize]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleToggleExpand = useCallback((id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);
    void fetchRuns(id, 0, runPageSize);
  }, [expandedId, fetchRuns, runPageSize]);

  const handleRunPageChange = useCallback((page: number) => {
    if (!expandedId) return;
    void fetchRuns(expandedId, page, runPageSize);
  }, [expandedId, fetchRuns, runPageSize]);

  const handleRunPageSizeChange = useCallback((pageSize: number) => {
    if (!expandedId) return;
    void fetchRuns(expandedId, 0, pageSize);
  }, [expandedId, fetchRuns]);

  const handleCreate = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const payload: CrawlerPipelineCreate = {
        name: formState.name,
        source: formState.source,
        query_definition: JSON.parse(formState.query_definition),
        enabled: formState.enabled,
        requires_approval: formState.requires_approval,
        ...(formState.description ? { description: formState.description } : {}),
        ...(formState.schedule_definition !== '{}' ? { schedule_definition: JSON.parse(formState.schedule_definition) } : {}),
        ...(formState.execution_policy !== '{}' ? { execution_policy: JSON.parse(formState.execution_policy) } : {}),
        ...(formState.extraction_policy !== '{}' ? { extraction_policy: JSON.parse(formState.extraction_policy) } : {}),
      };
      await createCrawlerPipeline(token, payload);
      setCreateOpen(false);
      setFormState(INITIAL_FORM);
      fetchPipelines();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (pipe: CrawlerPipelineRead) => {
    setEditId(pipe.id);
    setFormState({
      name: pipe.name,
      description: pipe.description ?? '',
      source: pipe.source,
      query_definition: JSON.stringify(pipe.query_definition, null, 2),
      schedule_definition: JSON.stringify(pipe.schedule_definition ?? {}, null, 2),
      enabled: pipe.enabled,
      requires_approval: (pipe as any).requires_approval ?? false,
      execution_policy: JSON.stringify(pipe.execution_policy ?? {}, null, 2),
      extraction_policy: JSON.stringify(pipe.extraction_policy ?? {}, null, 2),
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!token || !editId) return;
    setSubmitting(true);
    try {
      const payload: CrawlerPipelineUpdate = {
        name: formState.name,
        enabled: formState.enabled,
        requires_approval: formState.requires_approval,
        query_definition: JSON.parse(formState.query_definition),
        ...(formState.description ? { description: formState.description } : {}),
        ...(formState.schedule_definition !== '{}' ? { schedule_definition: JSON.parse(formState.schedule_definition) } : {}),
        ...(formState.execution_policy !== '{}' ? { execution_policy: JSON.parse(formState.execution_policy) } : {}),
        ...(formState.extraction_policy !== '{}' ? { extraction_policy: JSON.parse(formState.extraction_policy) } : {}),
      };
      await updateCrawlerPipeline(token, editId, payload);
      setEditOpen(false);
      setEditId(null);
      setFormState(INITIAL_FORM);
      fetchPipelines();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleEnabled = async (pipe: CrawlerPipelineRead) => {
    if (!token) return;
    try {
      await updateCrawlerPipeline(token, pipe.id, { enabled: !pipe.enabled });
      fetchPipelines();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    }
  };

  const handleTrigger = async () => {
    if (!token || !triggerPipelineId) return;
    try {
      await triggerCrawlerRun(token, triggerPipelineId);
      setTriggerConfirmOpen(false);
      setTriggerPipelineId(null);
      await refreshPageData(
        expandedId === triggerPipelineId ? triggerPipelineId : undefined,
        0,
      );
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    }
  };

  const handleCancelRun = async (runId: string) => {
    if (!token) return;
    try {
      await cancelCrawlerRun(token, runId);
      await refreshPageData(expandedId ?? undefined);
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  const handlePauseRun = async (runId: string) => {
    if (!token) return;
    try {
      await pauseCrawlerRun(token, runId);
      await refreshPageData(expandedId ?? undefined);
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  const handleResumeRun = async (runId: string) => {
    if (!token) return;
    try {
      await resumeCrawlerRun(token, runId);
      await refreshPageData(expandedId ?? undefined);
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  const handleRetryRun = async (runId: string) => {
    if (!token) return;
    try {
      await retryCrawlerRun(token, runId);
      await refreshPageData(expandedId ?? undefined, 0);
    } catch (e: unknown) { setError(getErrorMessage(e)); }
  };

  usePageToolbarHeader('Crawlers', `${pipelines.length} crawlers`);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <Box>
      {/* Overview strip */}
      {!loading && pipelines.length > 0 && <OverviewStrip pipelines={pipelines} />}

      {/* Error alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Actions bar */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setFormState(INITIAL_FORM); setCreateOpen(true); }}>
          New Pipeline
        </Button>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void refreshPageData(expandedId ?? undefined)} disabled={loading || runsLoading}>
          Refresh
        </Button>
      </Stack>

      {/* Loading state */}
      {loading && (
        <Grid container spacing={2}>
          {[0, 1, 2].map((i) => (
            <Grid key={i} size={{ xs: 12, md: 6, lg: 4 }}>
              <Skeleton variant="rounded" height={200} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty state */}
      {!loading && pipelines.length === 0 && (
        <EmptyState
          icon={<CrawlerIcon />}
          title="No crawler pipelines configured"
          description="Set up automated job crawlers to discover leads automatically."
          action={{ label: 'New Pipeline', onClick: () => { setFormState(INITIAL_FORM); setCreateOpen(true); }, icon: <AddIcon /> }}
        />
      )}

      {/* Pipeline cards grid */}
      {!loading && pipelines.length > 0 && (
        <Grid container spacing={2}>
          <AnimatePresence>
            {pipelines.map((pipe, i) => (
              <Grid key={pipe.id} size={{ xs: 12, md: 6, lg: 4 }}>
                <CrawlerPipelineCard
                  pipe={pipe}
                  onEdit={() => openEdit(pipe)}
                  onTrigger={() => { setTriggerPipelineId(pipe.id); setTriggerConfirmOpen(true); }}
                  onToggleEnabled={() => handleToggleEnabled(pipe)}
                  expandedId={expandedId}
                  onToggleExpand={handleToggleExpand}
                  runs={expandedId === pipe.id && expandedRunsPipelineId === pipe.id ? expandedRunsPage.items : []}
                  runsTotal={expandedId === pipe.id && expandedRunsPipelineId === pipe.id ? expandedRunsPage.total : 0}
                  runPage={runPage}
                  runPageSize={runPageSize}
                  runsLoading={expandedId === pipe.id && runsLoading}
                  onRunPageChange={handleRunPageChange}
                  onRunPageSizeChange={handleRunPageSizeChange}
                  onCancelRun={handleCancelRun}
                  onPauseRun={handlePauseRun}
                  onResumeRun={handleResumeRun}
                  onRetryRun={handleRetryRun}
                  index={i}
                />
              </Grid>
            ))}
          </AnimatePresence>
        </Grid>
      )}

      {/* Create dialog */}
      <PipelineFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        form={formState}
        setForm={setFormState}
        title="Create Crawler Pipeline"
        submitLabel="Create"
        loading={submitting}
      />

      {/* Edit dialog */}
      <PipelineFormDialog
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditId(null); }}
        onSubmit={handleEdit}
        form={formState}
        setForm={setFormState}
        title="Edit Crawler Pipeline"
        submitLabel="Save"
        loading={submitting}
      />

      {/* Trigger confirm dialog */}
      <ConfirmDialog
        open={triggerConfirmOpen}
        title="Trigger Crawler Run"
        message="This will start a new crawl run for this pipeline. Continue?"
        confirmLabel="Trigger"
        destructive={false}
        onConfirm={handleTrigger}
        onCancel={() => { setTriggerConfirmOpen(false); setTriggerPipelineId(null); }}
      />
    </Box>
  );
};

export default CrawlersPage;
