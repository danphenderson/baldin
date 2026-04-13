import React, { useContext, useState, useMemo, useDeferredValue, useCallback } from 'react';
import {
  Box, Typography, TextField, InputAdornment, Stack, Chip, Divider,
  IconButton, Tooltip, Snackbar, FormControl, InputLabel,
  Select, MenuItem, useMediaQuery,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import {
  Search as SearchIcon,
  ArrowForward as ArrowIcon,
  Delete as DeleteIcon,
  WorkOutline as WorkIcon,
  LocationOn as LocationIcon,
  AttachMoney as SalaryIcon,
  Explore as ExploreIcon,
  SearchOff as SearchOffIcon,
  Warning as WarningIcon,
  Description as DocIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/user-context';
import { usePageToolbarHeader } from '../../layout/toolbar-header-context';
import {
  useApplications,
  useStageColumns,
  relativeDate,
  nextStage,
  effectiveStage,
  isClosed,
  applicationDocumentCount,
  applicationHasResume,
  applicationHasCoverLetter,
  type Column,
} from './use-applications';
import type { ApplicationRead } from '../../service/applications';
import ConfirmDialog from '../../component/common/confirm-dialog';
import {
  CollectionToolbar,
  EmptyState,
  InlineFeedback,
  LoadingState,
  CardShell,
  MetricStrip,
  StatusChip,
} from '../../design-system';

/* ------------------------------------------------------------------ */
/*  Sort options                                                       */
/* ------------------------------------------------------------------ */

type SortKey = 'updated' | 'company' | 'stage' | 'due';
type SurfaceTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'updated', label: 'Recently Updated' },
  { value: 'company', label: 'Company A–Z' },
  { value: 'stage', label: 'Pipeline Stage' },
  { value: 'due', label: 'Due Date' },
];

/** Static stage ordering (no colors needed for sort comparisons). */
const STAGE_KEYS = ['registered', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'];
const STAGE_ORDER = Object.fromEntries(STAGE_KEYS.map((k, i) => [k, i]));

function stageOf(app: ApplicationRead): string {
  return effectiveStage(app);
}

function stageTone(status: string): SurfaceTone {
  switch (status) {
    case 'applied':
      return 'primary';
    case 'screening':
      return 'info';
    case 'interview':
      return 'warning';
    case 'offer':
      return 'success';
    case 'rejected':
      return 'danger';
    case 'registered':
    case 'withdrawn':
    default:
      return 'neutral';
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ApplicationsQueuePage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { token } = useContext(UserContext);
  const { columns: COLUMNS, allStatusColumns: ALL_STATUS_COLUMNS } = useStageColumns();

  const columnFor = (status: string): Column =>
    ALL_STATUS_COLUMNS.find((c) => c.key === status) ?? ALL_STATUS_COLUMNS[0];

  const {
    applications, loading, error, success, setError, setSuccess,
    handleAdvance, handleDelete, confirmDelete, deleteTarget, setDeleteTarget,
  } = useApplications(token);

  /* ---- Local UI state ---- */
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('updated');
  const [resumeFilter, setResumeFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [coverLetterFilter, setCoverLetterFilter] = useState<'all' | 'yes' | 'no'>('all');

  /* ---- Metrics ---- */
  const totalCount = applications.length;
  const activeCount = useMemo(
    () => applications.filter((a) => !isClosed(a)).length,
    [applications],
  );
  const interviewCount = useMemo(
    () => applications.filter((a) => stageOf(a) === 'interview').length,
    [applications],
  );
  const offerCount = useMemo(
    () => applications.filter((a) => stageOf(a) === 'offer').length,
    [applications],
  );
  const rejectedCount = useMemo(
    () => applications.filter((a) => isClosed(a)).length,
    [applications],
  );

  usePageToolbarHeader(
    'Applications',
    `${totalCount} applications`,
  );

  /* ---- Filtering + sorting ---- */
  const filtered = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();

    return applications.filter((app) => {
      const lead = app.lead;
      const matchesSearch =
        !q ||
        [lead?.title, lead?.companies?.[0]?.name, lead?.location].some((f) =>
          f?.toLowerCase().includes(q),
        );

      const stage = stageOf(app);
      const matchesStage = stageFilter === 'all' || stage === stageFilter;

      const matchesActive =
        activeFilter === 'all' ||
        (activeFilter === 'active' && !isClosed(app)) ||
        (activeFilter === 'closed' && isClosed(app));

      const matchesResume =
        resumeFilter === 'all' ||
        (resumeFilter === 'yes' && applicationHasResume(app)) ||
        (resumeFilter === 'no' && !applicationHasResume(app));

      const matchesCoverLetter =
        coverLetterFilter === 'all' ||
        (coverLetterFilter === 'yes' && applicationHasCoverLetter(app)) ||
        (coverLetterFilter === 'no' && !applicationHasCoverLetter(app));

      return matchesSearch && matchesStage && matchesActive && matchesResume && matchesCoverLetter;
    });
  }, [deferredSearch, stageFilter, activeFilter, applications, resumeFilter, coverLetterFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    switch (sortKey) {
      case 'company':
        copy.sort((a, b) =>
          (a.lead?.companies?.[0]?.name || '').localeCompare(
            b.lead?.companies?.[0]?.name || '',
          ),
        );
        break;
      case 'stage':
        copy.sort(
          (a, b) =>
            (STAGE_ORDER[stageOf(a)] ?? 99) - (STAGE_ORDER[stageOf(b)] ?? 99),
        );
        break;
      case 'due':
        copy.sort((a, b) => {
          const aDue = a.next_step_due ? new Date(a.next_step_due).getTime() : Infinity;
          const bDue = b.next_step_due ? new Date(b.next_step_due).getTime() : Infinity;
          return aDue - bDue;
        });
        break;
      case 'updated':
      default:
        copy.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        );
    }
    return copy;
  }, [filtered, sortKey]);

  /* ---- Handlers ---- */
  const handleCardClick = useCallback(
    (app: ApplicationRead) => {
      navigate(`/applications/${app.id}`);
    },
    [navigate],
  );

  /* ================================================================ */
  /*  JSX                                                              */
  /* ================================================================ */

  return (
    <Box>
      {/* ── Feedback alerts ── */}
      {error && (
        <InlineFeedback
          tone="error"
          onClose={() => setError('')}
          sx={{ mb: 2 }}
        >
            {error}
        </InlineFeedback>
      )}
      {success && (
        <InlineFeedback
          tone="success"
          onClose={() => setSuccess('')}
          sx={{ mb: 2 }}
        >
            {success}
        </InlineFeedback>
      )}

      {/* ── Metric strip ── */}
      <MetricStrip
        variant="inline"
        items={[
          { label: 'Total', value: totalCount },
          { label: 'Active', value: activeCount, color: COLUMNS[0].color },
          { label: 'Interviewing', value: interviewCount, color: COLUMNS[2].color },
          { label: 'Offers', value: offerCount, color: COLUMNS[3].color },
          { label: 'Closed', value: rejectedCount, color: ALL_STATUS_COLUMNS.find((c) => c.key === 'rejected')!.color },
        ]}
      />

      {/* ── Search + filters + sort ── */}
      <CollectionToolbar
        sx={{ mb: 3, mt: 2 }}
        search={(
          <TextField
            size="small"
            placeholder="Search by title, company, or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flexGrow: 1 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                'aria-label': 'Search applications',
              },
            }}
          />
        )}
        controls={(
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel id="apps-sort-label">Sort</InputLabel>
            <Select
              labelId="apps-sort-label"
              value={sortKey}
              label="Sort"
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              {SORT_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        secondary={applications.length > 0 ? (
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1}
            alignItems={{ md: 'center' }}
            sx={{ flexWrap: 'wrap', rowGap: 1, columnGap: 1 }}
          >
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              <Chip
                label="All Stages"
                size="small"
                variant={stageFilter === 'all' ? 'filled' : 'outlined'}
                color={stageFilter === 'all' ? 'primary' : 'default'}
                onClick={() => setStageFilter('all')}
                sx={{ fontWeight: stageFilter === 'all' ? 600 : 400 }}
              />
              {ALL_STATUS_COLUMNS.map((col) => (
                <Chip
                  key={col.key}
                  label={col.label}
                  size="small"
                  variant={stageFilter === col.key ? 'filled' : 'outlined'}
                  onClick={() => setStageFilter(stageFilter === col.key ? 'all' : col.key)}
                  sx={
                    stageFilter === col.key
                      ? { bgcolor: col.color, color: theme.palette.getContrastText(col.color), fontWeight: 600 }
                      : { borderColor: alpha(col.color, 0.4), color: col.color }
                  }
                />
              ))}
            </Stack>
            <Divider
              data-testid="applications-filter-divider"
              orientation={isMobile ? 'horizontal' : 'vertical'}
              flexItem
              sx={{ alignSelf: 'stretch' }}
            />
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {(['all', 'active', 'closed'] as const).map((key) => (
                <Chip
                  key={key}
                  label={key === 'all' ? 'All' : key === 'active' ? 'Active' : 'Closed'}
                  size="small"
                  variant={activeFilter === key ? 'filled' : 'outlined'}
                  color={activeFilter === key ? 'primary' : 'default'}
                  onClick={() => setActiveFilter(key)}
                  sx={{ fontWeight: activeFilter === key ? 600 : 400 }}
                />
              ))}
              <Chip
                icon={<DocIcon sx={{ fontSize: '0.85rem !important' }} />}
                label="Has Resume"
                size="small"
                variant={resumeFilter === 'yes' ? 'filled' : 'outlined'}
                color={resumeFilter === 'yes' ? 'success' : 'default'}
                onClick={() => setResumeFilter(resumeFilter === 'yes' ? 'all' : 'yes')}
                sx={{ fontWeight: resumeFilter === 'yes' ? 600 : 400 }}
              />
              <Chip
                icon={<DocIcon sx={{ fontSize: '0.85rem !important' }} />}
                label="Has Cover Letter"
                size="small"
                variant={coverLetterFilter === 'yes' ? 'filled' : 'outlined'}
                color={coverLetterFilter === 'yes' ? 'success' : 'default'}
                onClick={() => setCoverLetterFilter(coverLetterFilter === 'yes' ? 'all' : 'yes')}
                sx={{ fontWeight: coverLetterFilter === 'yes' ? 600 : 400 }}
              />
            </Stack>
          </Stack>
        ) : undefined}
      />

      {/* ── Application list ── */}
      {loading ? (
        <LoadingState kind="list" count={5} itemHeight={96} />
      ) : sorted.length === 0 ? (
        applications.length === 0 ? (
          <EmptyState
            icon={<WorkIcon />}
            title="No applications tracked"
            description="Apply to a lead to start tracking your application progress."
            primaryAction={{
              label: 'Browse Leads',
              onClick: () => navigate('/leads'),
              icon: <ExploreIcon />,
            }}
          />
        ) : (
          <EmptyState
            icon={<SearchOffIcon />}
            title="No results match your filters"
            description="Try adjusting your search or clearing filters."
          />
        )
      ) : (
        <Stack spacing={1.5}>
          {sorted.map((app) => {
            const lead = app.lead;
            const stage = stageOf(app);
            const column = columnFor(stage);
            const companyName = lead?.companies?.[0]?.name;
            const canAdvance = nextStage(stage) !== null;
            const documentCount = applicationDocumentCount(app);

            return (
              <CardShell
                key={app.id}
                onClick={() => handleCardClick(app)}
                interactive
                tone={stageTone(column.key)}
                density="compact"
                sx={{
                  '&:hover': {
                    boxShadow: `0 4px 16px ${alpha(column.color, 0.15)}`,
                    '& .queue-actions': { opacity: 1 },
                  },
                }}
                contentSx={{
                  p: 2,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 2,
                }}
                aria-label={`View ${lead?.title || 'application'} details`}
              >
                <Box
                  sx={{
                    width: 4,
                    alignSelf: 'stretch',
                    borderRadius: '8px',
                    bgcolor: column.color,
                    flexShrink: 0,
                  }}
                >
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 0.25, sm: 1 }}
                    alignItems={{ sm: 'center' }}
                    sx={{ mb: 0.5 }}
                  >
                    <Typography
                      variant="body1"
                      fontWeight={700}
                      noWrap
                      sx={{ flex: 1, minWidth: 0 }}
                    >
                      {lead?.title || 'Untitled Position'}
                    </Typography>

                    {companyName && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        noWrap
                      >
                        {companyName}
                      </Typography>
                    )}
                  </Stack>

                  <Stack
                    direction="row"
                    spacing={0.75}
                    sx={{ flexWrap: 'wrap', gap: 0.5 }}
                  >
                    <StatusChip
                      label={column.label}
                      size="small"
                      tone={stageTone(column.key)}
                      sx={{
                        fontSize: '0.7rem',
                        height: 22,
                      }}
                    />
                    {lead?.location && (
                      <Chip
                        icon={<LocationIcon sx={{ fontSize: '0.75rem !important' }} />}
                        label={lead.location}
                        size="small"
                        variant="outlined"
                        sx={{
                          fontSize: '0.7rem',
                          height: 22,
                          '& .MuiChip-icon': { ml: 0.5, mr: -0.25 },
                        }}
                      />
                    )}
                    {lead?.salary && (
                      <Chip
                        icon={<SalaryIcon sx={{ fontSize: '0.75rem !important' }} />}
                        label={lead.salary}
                        size="small"
                        variant="outlined"
                        color="success"
                        sx={{
                          fontSize: '0.7rem',
                          height: 22,
                          '& .MuiChip-icon': { ml: 0.5, mr: -0.25 },
                        }}
                      />
                    )}
                    <Chip
                      icon={<DocIcon sx={{ fontSize: '0.75rem !important' }} />}
                      label={`${documentCount} doc${documentCount === 1 ? '' : 's'}`}
                      size="small"
                      variant={documentCount > 0 ? 'filled' : 'outlined'}
                      sx={{
                        fontSize: '0.7rem',
                        height: 22,
                        bgcolor: documentCount > 0 ? alpha(theme.palette.primary.main, 0.12) : undefined,
                        color: documentCount > 0 ? theme.palette.primary.main : theme.palette.text.secondary,
                        '& .MuiChip-icon': { ml: 0.5, mr: -0.25 },
                      }}
                    />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        fontSize: '0.7rem',
                        opacity: 0.7,
                      }}
                    >
                      {relativeDate(app.updated_at)}
                    </Typography>
                  </Stack>

                  {app.next_step && (
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                        {app.next_step_due && new Date(app.next_step_due) < new Date() && (
                          <WarningIcon sx={{ fontSize: '0.75rem', color: 'warning.main' }} />
                        )}
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1, minWidth: 0 }}>
                          {app.next_step}
                          {app.next_step_due && (
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{
                                ml: 0.5,
                                color: new Date(app.next_step_due) < new Date() ? 'warning.main' : 'text.secondary',
                              }}
                            >
                              · due {new Date(app.next_step_due).toLocaleDateString()}
                            </Typography>
                          )}
                        </Typography>
                      </Stack>
                  )}
                </Box>

                {/* Quick actions */}
                <Stack
                  className="queue-actions"
                  direction="row"
                  spacing={0}
                  sx={{
                    opacity: isMobile ? 1 : 0,
                    transition: 'opacity 0.15s ease',
                    flexShrink: 0,
                  }}
                >
                  {canAdvance && (
                    <Tooltip
                      title={`Move to ${ALL_STATUS_COLUMNS[ALL_STATUS_COLUMNS.findIndex((c) => c.key === stage) + 1]?.label}`}
                    >
                      <IconButton
                        size="small"
                        color="primary"
                        aria-label="Advance application"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAdvance(app);
                        }}
                      >
                        <ArrowIcon sx={{ fontSize: '1.1rem' }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      aria-label="Delete application"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(app);
                      }}
                      sx={{
                        color: theme.palette.text.secondary,
                        '&:hover': { color: theme.palette.error.main },
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: '1.1rem' }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </CardShell>
            );
          })}
        </Stack>
      )}

      {/* ── Delete confirmation ── */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Application"
        message={
          <>
            Remove{' '}
            <Typography component="span" fontWeight={600} color="text.primary">
              {deleteTarget?.lead?.title || 'this application'}
            </Typography>
            {deleteTarget?.lead?.companies?.[0]?.name
              ? ` at ${deleteTarget.lead.companies[0].name}`
              : ''}
            ? This action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Snackbar (for success auto-clear feedback) ── */}
      <Snackbar
        open={Boolean(success)}
        autoHideDuration={3000}
        onClose={() => setSuccess('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <InlineFeedback
          tone="success"
          onClose={() => setSuccess('')}
          variant="filled"
        >
          {success}
        </InlineFeedback>
      </Snackbar>
    </Box>
  );
};

export default ApplicationsQueuePage;
