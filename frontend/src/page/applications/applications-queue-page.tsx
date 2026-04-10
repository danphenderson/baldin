import React, { useContext, useState, useMemo, useDeferredValue, useCallback } from 'react';
import {
  Box, Typography, TextField, InputAdornment, Stack, Chip, Card, CardContent,
  IconButton, Tooltip, Skeleton, Snackbar, Alert, Fade, FormControl, InputLabel,
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
  COLUMNS,
  ALL_STATUS_COLUMNS,
  relativeDate,
  nextStatus,
  effectiveStage,
  isClosed,
  applicationDocumentCount,
  applicationHasResume,
  applicationHasCoverLetter,
} from './use-applications';
import type { ApplicationRead } from '../../service/applications';
import ConfirmDialog from '../../component/common/confirm-dialog';
import EmptyState from '../../component/common/empty-state';

/* ------------------------------------------------------------------ */
/*  Sort options                                                       */
/* ------------------------------------------------------------------ */

type SortKey = 'updated' | 'company' | 'stage' | 'due';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'updated', label: 'Recently Updated' },
  { value: 'company', label: 'Company A–Z' },
  { value: 'stage', label: 'Pipeline Stage' },
  { value: 'due', label: 'Due Date' },
];

const STAGE_ORDER = Object.fromEntries(ALL_STATUS_COLUMNS.map((c, i) => [c.key, i]));

function stageOf(app: ApplicationRead): string {
  return effectiveStage(app);
}

function columnFor(status: string) {
  return ALL_STATUS_COLUMNS.find((c) => c.key === status) ?? ALL_STATUS_COLUMNS[0];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ApplicationsQueuePage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { token } = useContext(UserContext);

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
    `${totalCount} total · ${activeCount} active · ${offerCount} offers`,
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
        <Fade in>
          <Alert
            severity="error"
            onClose={() => setError('')}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        </Fade>
      )}
      {success && (
        <Fade in>
          <Alert
            severity="success"
            onClose={() => setSuccess('')}
            sx={{ mb: 2 }}
          >
            {success}
          </Alert>
        </Fade>
      )}

      {/* ── Summary strip ── */}
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}
      >
        <Chip
          label={`${totalCount} total`}
          size="small"
          variant="outlined"
        />
        <Chip
          label={`${activeCount} active`}
          size="small"
          variant={activeCount ? 'filled' : 'outlined'}
          sx={activeCount ? {
            bgcolor: alpha(COLUMNS[0].color, 0.12),
            color: COLUMNS[0].color,
            fontWeight: 600,
          } : undefined}
        />
        <Chip
          label={`${interviewCount} interviewing`}
          size="small"
          variant={interviewCount ? 'filled' : 'outlined'}
          sx={interviewCount ? {
            bgcolor: alpha(COLUMNS[2].color, 0.12),
            color: COLUMNS[2].color,
            fontWeight: 600,
          } : undefined}
        />
        <Chip
          label={`${offerCount} offers`}
          size="small"
          variant={offerCount ? 'filled' : 'outlined'}
          sx={offerCount ? {
            bgcolor: alpha(COLUMNS[3].color, 0.12),
            color: COLUMNS[3].color,
            fontWeight: 600,
          } : undefined}
        />
        <Chip
          label={`${rejectedCount} closed`}
          size="small"
          variant={rejectedCount ? 'filled' : 'outlined'}
          sx={rejectedCount ? {
            bgcolor: alpha(ALL_STATUS_COLUMNS.find((c) => c.key === 'rejected')!.color, 0.12),
            color: ALL_STATUS_COLUMNS.find((c) => c.key === 'rejected')!.color,
            fontWeight: 600,
          } : undefined}
        />
      </Stack>

      {/* ── Search + filters + sort ── */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 2 }}
        alignItems={{ sm: 'center' }}
      >
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
      </Stack>

      {/* ── Stage filter chips ── */}
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1 }}
      >
        <Chip
          label="All Stages"
          size="small"
          variant={stageFilter === 'all' ? 'filled' : 'outlined'}
          color={stageFilter === 'all' ? 'primary' : 'default'}
          onClick={() => setStageFilter('all')}
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
                ? { bgcolor: col.color, color: '#fff', fontWeight: 600 }
                : { borderColor: alpha(col.color, 0.4), color: col.color }
            }
          />
        ))}
      </Stack>

      {/* ── Active / Closed filter ── */}
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}
      >
        {(['all', 'active', 'closed'] as const).map((key) => (
          <Chip
            key={key}
            label={key === 'all' ? 'All' : key === 'active' ? 'Active' : 'Closed'}
            size="small"
            variant={activeFilter === key ? 'filled' : 'outlined'}
            color={activeFilter === key ? 'primary' : 'default'}
            onClick={() => setActiveFilter(key)}
          />
        ))}
        <Chip
          icon={<DocIcon sx={{ fontSize: '0.85rem !important' }} />}
          label="Has Resume"
          size="small"
          variant={resumeFilter === 'yes' ? 'filled' : 'outlined'}
          color={resumeFilter === 'yes' ? 'success' : 'default'}
          onClick={() => setResumeFilter(resumeFilter === 'yes' ? 'all' : 'yes')}
        />
        <Chip
          icon={<DocIcon sx={{ fontSize: '0.85rem !important' }} />}
          label="Has Cover Letter"
          size="small"
          variant={coverLetterFilter === 'yes' ? 'filled' : 'outlined'}
          color={coverLetterFilter === 'yes' ? 'success' : 'default'}
          onClick={() => setCoverLetterFilter(coverLetterFilter === 'yes' ? 'all' : 'yes')}
        />
      </Stack>

      {/* ── Application list ── */}
      {loading ? (
        <Stack spacing={2}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={96}
              sx={{ borderRadius: 3 }}
            />
          ))}
        </Stack>
      ) : sorted.length === 0 ? (
        applications.length === 0 ? (
          <EmptyState
            icon={<WorkIcon />}
            title="No applications tracked"
            description="Apply to a lead to start tracking your application progress."
            action={{
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
            const canAdvance = nextStatus(stage) !== null;
            const documentCount = applicationDocumentCount(app);

            return (
              <Card
                key={app.id}
                onClick={() => handleCardClick(app)}
                sx={{
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s ease, transform 0.15s ease',
                  '&:hover': {
                    boxShadow: `0 4px 16px ${alpha(column.color, 0.15)}`,
                    transform: 'translateY(-1px)',
                    '& .queue-actions': { opacity: 1 },
                  },
                  '&:focus-visible': {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: 2,
                  },
                }}
                tabIndex={0}
                role="button"
                aria-label={`View ${lead?.title || 'application'} details`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick(app);
                  }
                }}
              >
                <CardContent
                  sx={{
                    p: 2,
                    '&:last-child': { pb: 2 },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  {/* Stage indicator */}
                  <Box
                    sx={{
                      width: 4,
                      alignSelf: 'stretch',
                      borderRadius: 2,
                      bgcolor: column.color,
                      flexShrink: 0,
                    }}
                  />

                  {/* Main content */}
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
                      <Chip
                        label={column.label}
                        size="small"
                        sx={{
                          bgcolor: alpha(column.color, 0.12),
                          color: column.color,
                          fontWeight: 600,
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
                </CardContent>
              </Card>
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
        <Alert
          onClose={() => setSuccess('')}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ApplicationsQueuePage;
