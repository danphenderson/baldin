import React, { useContext } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Stack, Button, useTheme, alpha,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Tooltip, Skeleton, Alert, Fade,
  useMediaQuery,
} from '@mui/material';
import {
  Delete as DeleteIcon, Refresh as RefreshIcon,
  ArrowForward as ArrowIcon,
  WorkOutline as WorkIcon, Assignment as AssignmentIcon,
  LocationOn as LocationIcon, AttachMoney as SalaryIcon,
  Warning as WarningIcon, Schedule as ScheduleIcon,
  Block as RejectIcon, Undo as WithdrawIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/user-context';
import { usePageToolbarHeader } from '../../layout/toolbar-header-context';
import type { ApplicationRead } from '../../service/applications';
import {
  useApplications, COLUMNS, COLUMN_EMPTY_HINTS, relativeDate, nextStage,
  type Column, type Outcome,
} from './use-applications';

/* ------------------------------------------------------------------ */
/*  ApplicationCard                                                    */
/* ------------------------------------------------------------------ */

interface AppCardProps {
  app: ApplicationRead;
  column: Column;
  onView: (app: ApplicationRead) => void;
  onAdvance: (app: ApplicationRead) => void;
  onClose: (app: ApplicationRead, outcome: Outcome) => void;
  onDelete: (app: ApplicationRead) => void;
}

const ApplicationCard: React.FC<AppCardProps> = ({ app, column, onView, onAdvance, onClose, onDelete }) => {
  const theme = useTheme();
  const lead = app.lead;
  const companyName = lead?.companies?.[0]?.name;
  const canAdvance = nextStage(column.key) !== null;
  const isOverdue = !!(app.next_step_due && new Date(app.next_step_due) < new Date());

  return (
    <Card
      onClick={() => onView(app)}
      sx={{
        cursor: 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 6px 20px ${alpha(column.color, 0.18)}`,
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2,
        },
      }}
      tabIndex={0}
      role="button"
      aria-label={`View ${lead?.title || 'application'} details`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onView(app); } }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="body2" fontWeight={700} noWrap sx={{ mb: 0.25 }}>
          {lead?.title || 'Untitled Position'}
        </Typography>

        {companyName && (
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mb: 0.75 }}>
            {companyName}
          </Typography>
        )}

        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {lead?.location && (
            <Chip
              icon={<LocationIcon sx={{ fontSize: '0.75rem !important' }} />}
              label={lead.location}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 22, '& .MuiChip-icon': { ml: 0.5, mr: -0.25 } }}
            />
          )}
          {lead?.salary && (
            <Chip
              icon={<SalaryIcon sx={{ fontSize: '0.75rem !important' }} />}
              label={lead.salary}
              size="small"
              variant="outlined"
              color="success"
              sx={{ fontSize: '0.65rem', height: 22, '& .MuiChip-icon': { ml: 0.5, mr: -0.25 } }}
            />
          )}
        </Stack>

        {isOverdue && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mb: 0.75,
              px: 1,
              py: 0.5,
              borderRadius: 1.5,
              bgcolor: alpha(theme.palette.warning.main, 0.12),
              border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
            }}
          >
            <WarningIcon sx={{ fontSize: '0.8rem', color: 'warning.main' }} />
            <Typography variant="caption" fontWeight={600} color="warning.main" noWrap sx={{ fontSize: '0.7rem' }}>
              Overdue{app.next_step ? ` · ${app.next_step}` : ''}
            </Typography>
          </Box>
        )}
        {!isOverdue && app.next_step && (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.75 }}>
            <ScheduleIcon sx={{ fontSize: '0.7rem', color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: '0.7rem' }}>
              {app.next_step}
            </Typography>
          </Stack>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
            {relativeDate(app.created_at)}
          </Typography>

          <Stack
            className="card-actions"
            direction="row"
            spacing={0}
          >
            {canAdvance && (
              <Tooltip title={`Move to ${COLUMNS[COLUMNS.findIndex((c) => c.key === column.key) + 1]?.label}`}>
                <IconButton
                  size="small"
                  color="primary"
                  aria-label="Advance application"
                  onClick={(e) => { e.stopPropagation(); onAdvance(app); }}
                  sx={{ p: 0.5 }}
                >
                  <ArrowIcon sx={{ fontSize: '0.875rem' }} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Reject">
              <IconButton
                size="small"
                aria-label="Reject application"
                onClick={(e) => { e.stopPropagation(); onClose(app, 'rejected'); }}
                sx={{
                  p: 0.5,
                  color: theme.palette.text.secondary,
                  opacity: 0,
                  transition: 'opacity 0.15s ease',
                  '.MuiCard-root:hover &, .MuiCard-root:focus-within &': { opacity: 1 },
                  '&:focus': { opacity: 1 },
                }}
              >
                <RejectIcon sx={{ fontSize: '0.875rem' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Withdraw">
              <IconButton
                size="small"
                aria-label="Withdraw application"
                onClick={(e) => { e.stopPropagation(); onClose(app, 'withdrawn'); }}
                sx={{
                  p: 0.5,
                  color: theme.palette.text.secondary,
                  opacity: 0,
                  transition: 'opacity 0.15s ease',
                  '.MuiCard-root:hover &, .MuiCard-root:focus-within &': { opacity: 1 },
                  '&:focus': { opacity: 1 },
                }}
              >
                <WithdrawIcon sx={{ fontSize: '0.875rem' }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                aria-label="Delete application"
                onClick={(e) => { e.stopPropagation(); onDelete(app); }}
                sx={{
                  p: 0.5,
                  color: theme.palette.text.secondary,
                  opacity: 0,
                  transition: 'opacity 0.15s ease',
                  '.MuiCard-root:hover &, .MuiCard-root:focus-within &': { opacity: 1 },
                  '&:focus': { opacity: 1 },
                }}
              >
                <DeleteIcon sx={{ fontSize: '0.875rem' }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/*  Delete confirmation                                                */
/* ------------------------------------------------------------------ */

interface DeleteConfirmProps {
  open: boolean;
  app: ApplicationRead | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmProps> = ({ open, app, onConfirm, onCancel }) => (
  <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
      <WarningIcon color="error" /> Delete Application
    </DialogTitle>
    <DialogContent>
      <Typography variant="body2" color="text.secondary">
        Remove <strong>{app?.lead?.title || 'this application'}</strong>
        {app?.lead?.companies?.[0]?.name ? ` at ${app.lead.companies[0].name}` : ''}? This action cannot be undone.
      </Typography>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2.5 }}>
      <Button onClick={onCancel}>Cancel</Button>
      <Button variant="contained" color="error" onClick={onConfirm}>Delete</Button>
    </DialogActions>
  </Dialog>
);

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

const EmptyState: React.FC = () => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 10,
        px: 3,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)}, ${alpha(theme.palette.secondary.main, 0.15)})`,
        }}
      >
        <AssignmentIcon sx={{ fontSize: 36, color: theme.palette.primary.main }} />
      </Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        No applications yet
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: 2 }}>
        When you apply to leads, they&apos;ll appear here as a pipeline board so you can track every stage of your job search.
      </Typography>
      <Button variant="outlined" href="/leads" startIcon={<WorkIcon />}>
        Browse Leads
      </Button>
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/*  Board page                                                         */
/* ------------------------------------------------------------------ */

const ApplicationsBoardPage: React.FC = () => {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { token } = useContext(UserContext);

  const {
    applications,
    loading,
    error,
    success,
    setError,
    setSuccess,
    refresh,
    handleAdvance,
    handleClose,
    handleDelete,
    confirmDelete,
    deleteTarget,
    setDeleteTarget,
    buckets,
    registeredApps,
    closedApps,
    overdueCount,
  } = useApplications(token);

  const activeCount = (buckets.get('applied')?.length ?? 0)
    + (buckets.get('screening')?.length ?? 0)
    + (buckets.get('interview')?.length ?? 0);
  const interviewCount = buckets.get('interview')?.length ?? 0;
  const offerCount = buckets.get('offer')?.length ?? 0;

  usePageToolbarHeader('Board', `${applications.length} total \u00b7 ${interviewCount} interviewing`);

  const viewApplication = (app: ApplicationRead) => {
    navigate(`/applications/${app.id}`);
  };

  return (
    <Box>
      {/* Header actions */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Tooltip title="Refresh">
          <IconButton
            onClick={refresh}
            aria-label="Refresh applications"
            sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Summary stats strip */}
      {!loading && applications.length > 0 && (
        <Stack
          direction="row"
          spacing={3}
          sx={{
            mb: 3,
            px: 2,
            py: 1.5,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.06 : 0.04),
            border: `1px solid ${theme.palette.divider}`,
            overflowX: 'auto',
            flexWrap: 'nowrap',
          }}
        >
          {[
            { label: 'Total', value: applications.length, color: theme.palette.text.primary },
            { label: 'Registered', value: registeredApps.length, color: '#94a3b8' },
            { label: 'Active', value: activeCount, color: '#06b6d4' },
            { label: 'Interviewing', value: interviewCount, color: '#f59e0b' },
            { label: 'Offers', value: offerCount, color: '#10b981' },
            { label: 'Closed', value: closedApps.length, color: '#f43f5e' },
            { label: 'Overdue', value: overdueCount, color: theme.palette.warning.main },
          ].map((stat) => (
            <Box key={stat.label} sx={{ textAlign: 'center', minWidth: 64, flexShrink: 0 }}>
              <Typography variant="h6" fontWeight={700} sx={{ color: stat.color, lineHeight: 1.2 }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stat.label}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}

      {/* Alerts */}
      <Fade in={!!error}><Box>{error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}</Box></Fade>
      <Fade in={!!success}><Box>{success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}</Box></Fade>

      {/* Content */}
      {loading ? (
        <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
          {COLUMNS.map((c) => (
            <Box key={c.key} sx={{ minWidth: 240, flexGrow: 1, flexShrink: 0 }}>
              <Skeleton variant="rounded" height={32} sx={{ mb: 1.5, borderRadius: 2 }} />
              <Stack spacing={1.5}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 2 }} />
                ))}
              </Stack>
            </Box>
          ))}
        </Box>
      ) : applications.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Registered intake container */}
          {registeredApps.length > 0 && (
            <Box
              sx={{
                mb: 3,
                p: 2,
                borderRadius: 3,
                bgcolor: alpha('#94a3b8', theme.palette.mode === 'dark' ? 0.06 : 0.04),
                border: `1px solid ${alpha('#94a3b8', 0.15)}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#94a3b8', flexShrink: 0 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ flexGrow: 1 }}>
                  Registered — not yet in the active pipeline
                </Typography>
                <Chip
                  label={registeredApps.length}
                  size="small"
                  sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600, bgcolor: alpha('#94a3b8', 0.12), color: '#94a3b8' }}
                />
              </Box>
              <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto', pb: 0.5 }}>
                {registeredApps.map((app) => (
                  <Box key={app.id} sx={{ minWidth: isNarrow ? 260 : 220, maxWidth: 280, flexShrink: 0 }}>
                    <ApplicationCard
                      app={app}
                      column={{ key: 'registered', label: 'Registered', color: '#94a3b8' }}
                      onView={viewApplication}
                      onAdvance={handleAdvance}
                      onClose={handleClose}
                      onDelete={handleDelete}
                    />
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {/* Active pipeline board */}
          <Box
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            pb: 2,
            minHeight: 420,
            ...(isNarrow && {
              scrollSnapType: 'x mandatory',
              '& > *': { scrollSnapAlign: 'start' },
            }),
          }}
        >
          {COLUMNS.map((col) => {
            const apps = buckets.get(col.key) || [];
            return (
              <Box
                key={col.key}
                sx={{
                  minWidth: isNarrow ? 280 : 240,
                  maxWidth: 320,
                  flexShrink: 0,
                  flexGrow: 1,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 1.5,
                    px: 1,
                    py: 1,
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    bgcolor: 'background.default',
                  }}
                >
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: col.color, flexShrink: 0 }} />
                  <Typography variant="subtitle2" color="text.secondary" sx={{ flexGrow: 1 }}>
                    {col.label}
                  </Typography>
                  <Chip
                    label={apps.length}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      bgcolor: alpha(col.color, 0.12),
                      color: col.color,
                    }}
                  />
                </Box>

                <Stack
                  spacing={1.5}
                  sx={{
                    p: 1,
                    borderRadius: 3,
                    minHeight: 380,
                    background: alpha(col.color, theme.palette.mode === 'dark' ? 0.03 : 0.025),
                    border: `1px solid ${alpha(col.color, theme.palette.mode === 'dark' ? 0.1 : 0.12)}`,
                    transition: 'background 0.2s ease',
                  }}
                >
                  {apps.length === 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1, minHeight: 120 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.6, fontStyle: 'italic' }}>
                        {COLUMN_EMPTY_HINTS[col.key] || 'No applications'}
                      </Typography>
                    </Box>
                  ) : (
                    apps.map((app) => (
                      <ApplicationCard
                        key={app.id}
                        app={app}
                        column={col}
                        onView={viewApplication}
                        onAdvance={handleAdvance}
                        onClose={handleClose}
                        onDelete={handleDelete}
                      />
                    ))
                  )}
                </Stack>
              </Box>
            );
          })}
        </Box>

          {/* Closed applications summary */}
          {closedApps.length > 0 && (
            <Box
              sx={{
                mt: 3,
                p: 2,
                borderRadius: 3,
                bgcolor: alpha('#f43f5e', theme.palette.mode === 'dark' ? 0.04 : 0.025),
                border: `1px solid ${alpha('#f43f5e', 0.12)}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <RejectIcon sx={{ fontSize: '1rem', color: '#f43f5e' }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ flexGrow: 1 }}>
                  Closed
                </Typography>
                <Chip
                  label={closedApps.length}
                  size="small"
                  sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600, bgcolor: alpha('#f43f5e', 0.12), color: '#f43f5e' }}
                />
              </Box>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                {closedApps.slice(0, 8).map((app) => (
                  <Chip
                    key={app.id}
                    label={`${app.lead?.title || 'Untitled'} · ${(app.outcome ?? app.status ?? '').toLowerCase()}`}
                    size="small"
                    variant="outlined"
                    onClick={() => viewApplication(app)}
                    sx={{ cursor: 'pointer', fontSize: '0.7rem', maxWidth: 240, textOverflow: 'ellipsis' }}
                  />
                ))}
                {closedApps.length > 8 && (
                  <Chip label={`+${closedApps.length - 8} more`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                )}
              </Stack>
            </Box>
          )}
        </>
      )}

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        app={deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
};

export default ApplicationsBoardPage;
