import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Stack, Button, useTheme, alpha,
  Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, FormControl,
  IconButton, Tooltip, Skeleton, Alert, LinearProgress, InputLabel, Fade,
  useMediaQuery, Divider,
} from '@mui/material';
import {
  Delete as DeleteIcon, Description as DocIcon,
  Download as DownloadIcon, AutoAwesome as AIIcon, Refresh as RefreshIcon,
  OpenInNew as OpenIcon, ArrowForward as ArrowIcon,
  WorkOutline as WorkIcon, Assignment as AssignmentIcon,
  LocationOn as LocationIcon, AttachMoney as SalaryIcon,
  Warning as WarningIcon, Close as CloseIcon,
} from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import { usePageToolbarHeader } from '../layout/toolbar-header-context';
import {
  getApplications, updateApplication, deleteApplication,
  getApplicationCoverLetters, generatecoverLetter, getApplicationResumes,
  createApplicationResume, createApplicationCoverLetter,
  type ApplicationRead,
} from '../service/applications';
import { getCoverLetters, downloadCoverLetter, type CoverLetterRead } from '../service/cover-letters';
import { getResumes, downloadResume, type ResumeRead } from '../service/resumes';

/* ------------------------------------------------------------------ */
/*  Pipeline columns                                                   */
/* ------------------------------------------------------------------ */

interface Column {
  key: string;
  label: string;
  color: string;
}

const COLUMNS: Column[] = [
  { key: 'applied', label: 'Applied', color: '#06b6d4' },
  { key: 'screening', label: 'Screening', color: '#8b5cf6' },
  { key: 'interview', label: 'Interview', color: '#f59e0b' },
  { key: 'offer', label: 'Offer', color: '#10b981' },
  { key: 'rejected', label: 'Rejected', color: '#f43f5e' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function relativeDate(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function nextStatus(current: string): string | null {
  const idx = COLUMNS.findIndex((c) => c.key === current);
  if (idx < 0 || idx >= COLUMNS.length - 2) return null;
  return COLUMNS[idx + 1].key;
}

/* ------------------------------------------------------------------ */
/*  ApplicationCard                                                    */
/* ------------------------------------------------------------------ */

interface AppCardProps {
  app: ApplicationRead;
  column: Column;
  onView: (app: ApplicationRead) => void;
  onAdvance: (app: ApplicationRead) => void;
  onDelete: (app: ApplicationRead) => void;
}

const ApplicationCard: React.FC<AppCardProps> = ({ app, column, onView, onAdvance, onDelete }) => {
  const theme = useTheme();
  const lead = app.lead;
  const companyName = lead?.companies?.[0]?.name;
  const canAdvance = nextStatus(column.key) !== null;

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

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
            {relativeDate(app.created_at)}
          </Typography>

          <Stack direction="row" spacing={0}>
            {canAdvance && (
              <Tooltip title={`Move to ${COLUMNS[COLUMNS.findIndex((c) => c.key === column.key) + 1]?.label}`}>
                <IconButton
                  size="small"
                  color="primary"
                  aria-label="Advance application"
                  onClick={(e) => { e.stopPropagation(); onAdvance(app); }}
                >
                  <ArrowIcon sx={{ fontSize: '1rem' }} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Delete">
              <IconButton
                size="small"
                aria-label="Delete application"
                onClick={(e) => { e.stopPropagation(); onDelete(app); }}
                sx={{ color: theme.palette.text.secondary, '&:hover': { color: theme.palette.error.main } }}
              >
                <DeleteIcon sx={{ fontSize: '1rem' }} />
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
/*  Detail dialog                                                      */
/* ------------------------------------------------------------------ */

interface DetailDialogProps {
  open: boolean;
  app: ApplicationRead | null;
  token: string | null;
  onClose: () => void;
  onStatusChange: (appId: string, status: string) => void;
}

const ApplicationDetailDialog: React.FC<DetailDialogProps> = ({ open, app, token, onClose, onStatusChange }) => {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('sm'));

  const [coverLetters, setCoverLetters] = useState<CoverLetterRead[]>([]);
  const [appResumes, setAppResumes] = useState<ResumeRead[]>([]);
  const [allResumes, setAllResumes] = useState<ResumeRead[]>([]);
  const [allCoverLetters, setAllCoverLetters] = useState<CoverLetterRead[]>([]);
  const [templates, setTemplates] = useState<CoverLetterRead[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!open || !app || !token) return;
    let cancelled = false;

    const load = async () => {
      setLoadingDocs(true);
      setError('');
      try {
        const [cls, resData, letters, res] = await Promise.all([
          getApplicationCoverLetters(token, app.id),
          getApplicationResumes(token, app.id),
          getCoverLetters(token),
          getResumes(token),
        ]);
        if (cancelled) return;
        setCoverLetters(cls || []);
        const resArr = Array.isArray(resData) ? resData : [];
        setAppResumes(resArr);
        setAllCoverLetters(letters || []);
        setTemplates((letters || []).filter((t) => t.content_type === 'template'));
        setAllResumes(res || []);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load documents');
      }
      if (!cancelled) setLoadingDocs(false);
    };

    load();
    return () => { cancelled = true; };
  }, [open, app, token]);

  useEffect(() => {
    if (!open) {
      setCoverLetters([]);
      setAppResumes([]);
      setAllResumes([]);
      setAllCoverLetters([]);
      setTemplates([]);
      setSelectedTemplate('');
      setError('');
      setSuccess('');
    }
  }, [open]);

  const handleGenerate = async () => {
    if (!token || !app) return;
    const templateId = selectedTemplate || (templates.length > 0 ? templates[0].id : null);
    if (!templateId) {
      setError('No cover letter template available. Create one in Documents first.');
      return;
    }
    setGenerating(true);
    try {
      await generatecoverLetter(token, app.id, templateId);
      const cls = await getApplicationCoverLetters(token, app.id);
      setCoverLetters(cls || []);
      showSuccess('Cover letter generated');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    }
    setGenerating(false);
  };

  const handleAttachResume = async (resumeId: string) => {
    if (!token || !app) return;
    try {
      await createApplicationResume(token, app.id, resumeId);
      const resData = await getApplicationResumes(token, app.id);
      setAppResumes(Array.isArray(resData) ? resData : []);
      showSuccess('Resume attached');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to attach resume');
    }
  };

  const handleAttachCoverLetter = async (clId: string) => {
    if (!token || !app) return;
    try {
      await createApplicationCoverLetter(token, app.id, clId);
      const cls = await getApplicationCoverLetters(token, app.id);
      setCoverLetters(cls || []);
      showSuccess('Cover letter attached');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to attach cover letter');
    }
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    const id = window.setTimeout(() => setSuccess(''), 3000);
    return () => clearTimeout(id);
  };

  const availableResumes = allResumes.filter(
    (r) => !appResumes.some((attached) => attached.id === r.id),
  );
  const availableCoverLetters = allCoverLetters.filter(
    (cl) => !coverLetters.some((attached) => attached.id === cl.id),
  );

  if (!app) return null;

  const lead = app.lead;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" fontWeight={700} noWrap>
            {lead?.title || 'Application Details'}
          </Typography>
          {lead?.companies?.[0]?.name && (
            <Typography variant="body2" color="text.secondary">{lead.companies[0].name}</Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Close" sx={{ ml: 1, mt: 0.5 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <Box sx={{ px: 3, pt: error || success ? 2 : 0 }}>
          {error && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 1 }} onClose={() => setSuccess('')}>{success}</Alert>}
        </Box>

        <Stack spacing={0} divider={<Divider />}>
          {/* Status + Job details */}
          <Box sx={{ px: 3, py: 2.5 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Status &amp; Details</Typography>
            <Stack direction={isNarrow ? 'column' : 'row'} spacing={2} alignItems={isNarrow ? 'stretch' : 'center'}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="status-select-label">Stage</InputLabel>
                <Select
                  labelId="status-select-label"
                  label="Stage"
                  value={app.status || 'applied'}
                  onChange={(e) => onStatusChange(app.id, e.target.value)}
                >
                  {COLUMNS.map((c) => (
                    <MenuItem key={c.key} value={c.key}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c.color, flexShrink: 0 }} />
                        {c.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                {lead?.location && <Chip label={lead.location} size="small" variant="outlined" />}
                {lead?.salary && <Chip label={lead.salary} size="small" color="success" variant="outlined" />}
                {lead?.employment_type && <Chip label={lead.employment_type} size="small" variant="outlined" />}
                {lead?.seniority_level && <Chip label={lead.seniority_level} size="small" variant="outlined" />}
                {lead?.job_function && <Chip label={lead.job_function} size="small" variant="outlined" />}
              </Stack>
            </Stack>

            {lead?.url && (
              <Button
                variant="text"
                size="small"
                startIcon={<OpenIcon />}
                href={lead.url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ mt: 1.5, textTransform: 'none' }}
              >
                View original posting
              </Button>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, opacity: 0.6 }}>
              Applied {relativeDate(app.created_at)} &middot; Last updated {relativeDate(app.updated_at)}
            </Typography>
          </Box>

          {/* Resumes */}
          <Box sx={{ px: 3, py: 2.5 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Resumes</Typography>
            {loadingDocs ? (
              <Stack spacing={1}>{[0, 1].map((i) => <Skeleton key={i} variant="rounded" height={40} />)}</Stack>
            ) : appResumes.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.6 }}>
                No resumes attached yet
              </Typography>
            ) : (
              <Stack spacing={1}>
                {appResumes.map((r) => (
                  <Box
                    key={r.id}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1,
                      borderRadius: 2, border: `1px solid ${theme.palette.divider}`,
                      bgcolor: alpha(theme.palette.primary.main, 0.03),
                    }}
                  >
                    <DocIcon fontSize="small" color="primary" />
                    <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }} noWrap>{r.name || 'Untitled'}</Typography>
                    <Chip label={r.content_type || 'custom'} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 22 }} />
                    <Tooltip title="Download">
                      <IconButton size="small" onClick={() => token && downloadResume(token, r.id)} aria-label="Download resume">
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Stack>
            )}

            {!loadingDocs && availableResumes.length > 0 && (
              <FormControl size="small" sx={{ mt: 1.5, minWidth: 220 }}>
                <InputLabel id="attach-resume-label">Attach a resume</InputLabel>
                <Select
                  labelId="attach-resume-label"
                  label="Attach a resume"
                  displayEmpty
                  value=""
                  onChange={(e) => handleAttachResume(e.target.value)}
                >
                  {availableResumes.map((r) => (
                    <MenuItem key={r.id} value={r.id}>{r.name || 'Untitled'} ({r.content_type || 'custom'})</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>

          {/* Cover Letters */}
          <Box sx={{ px: 3, py: 2.5 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Cover Letters</Typography>
            {loadingDocs ? (
              <Stack spacing={1}>{[0, 1].map((i) => <Skeleton key={i} variant="rounded" height={40} />)}</Stack>
            ) : coverLetters.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.6 }}>
                No cover letters attached yet
              </Typography>
            ) : (
              <Stack spacing={1}>
                {coverLetters.map((cl) => (
                  <Box
                    key={cl.id}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1,
                      borderRadius: 2, border: `1px solid ${theme.palette.divider}`,
                      bgcolor: alpha(theme.palette.secondary.main, 0.03),
                    }}
                  >
                    <DocIcon fontSize="small" color="secondary" />
                    <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }} noWrap>{cl.name || 'Untitled'}</Typography>
                    <Chip label={cl.content_type || 'generated'} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 22 }} />
                    <Tooltip title="Download">
                      <IconButton size="small" onClick={() => token && downloadCoverLetter(token, cl.id)} aria-label="Download cover letter">
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Stack>
            )}

            {!loadingDocs && (
              <Stack direction={isNarrow ? 'column' : 'row'} spacing={1} sx={{ mt: 1.5 }} alignItems={isNarrow ? 'stretch' : 'center'}>
                {templates.length > 0 && (
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel id="template-select-label">Template</InputLabel>
                    <Select
                      labelId="template-select-label"
                      label="Template"
                      value={selectedTemplate || (templates[0]?.id ?? '')}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                    >
                      {templates.map((t) => (
                        <MenuItem key={t.id} value={t.id}>{t.name || 'Untitled'}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={generating ? undefined : <AIIcon />}
                  onClick={handleGenerate}
                  disabled={generating || templates.length === 0}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {generating ? 'Generating\u2026' : 'AI Generate'}
                </Button>
                {availableCoverLetters.length > 0 && (
                  <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel id="attach-cl-label">Attach cover letter</InputLabel>
                    <Select
                      labelId="attach-cl-label"
                      label="Attach cover letter"
                      displayEmpty
                      value=""
                      onChange={(e) => handleAttachCoverLetter(e.target.value)}
                    >
                      {availableCoverLetters.map((letter) => (
                        <MenuItem key={letter.id} value={letter.id}>
                          {letter.name || 'Untitled'} ({letter.content_type || 'custom'})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Stack>
            )}
            {generating && <LinearProgress sx={{ mt: 1.5, borderRadius: 1 }} />}
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

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
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

const ApplicationsPage: React.FC = () => {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const { token } = useContext(UserContext);

  const [applications, setApplications] = useState<ApplicationRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [detailApp, setDetailApp] = useState<ApplicationRead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ApplicationRead | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const apps = await getApplications(token);
      setApplications(apps || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load applications');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  const buckets = useMemo(() => {
    const map = new Map<string, ApplicationRead[]>();
    for (const col of COLUMNS) map.set(col.key, []);
    for (const app of applications) {
      const status = (app.status || 'applied').toLowerCase();
      const bucket = map.get(status);
      if (bucket) bucket.push(app);
      else map.get('applied')!.push(app);
    }
    return map;
  }, [applications]);

  const handleStatusChange = async (appId: string, newStatus: string) => {
    if (!token) return;
    const previousStatus = applications.find((app) => app.id === appId)?.status ?? null;
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a)),
    );
    setDetailApp((prev) => (prev?.id === appId ? { ...prev, status: newStatus } : prev));
    try {
      const updatedApp = await updateApplication(token, appId, { status: newStatus });
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? updatedApp : a)),
      );
      setDetailApp((prev) => (prev?.id === appId ? updatedApp : prev));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update status');
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: previousStatus } : a)),
      );
      setDetailApp((prev) => (prev?.id === appId ? { ...prev, status: previousStatus } : prev));
      refresh();
    }
  };

  const handleAdvance = (app: ApplicationRead) => {
    const next = nextStatus((app.status || 'applied').toLowerCase());
    if (next) handleStatusChange(app.id, next);
  };

  const confirmDelete = async () => {
    if (!token || !deleteTarget) return;
    try {
      await deleteApplication(token, deleteTarget.id);
      setApplications((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      showSuccess('Application deleted');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete application');
    }
    setDeleteTarget(null);
  };

  const openDetail = (app: ApplicationRead) => {
    setDetailApp(app);
    setDetailOpen(true);
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    const id = window.setTimeout(() => setSuccess(''), 3000);
    return () => clearTimeout(id);
  };

  const interviewCount = buckets.get('interview')?.length ?? 0;

  usePageToolbarHeader('Applications', `${applications.length} total · ${interviewCount} interviewing`);

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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, px: 1 }}>
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
                      <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.4 }}>
                        No applications
                      </Typography>
                    </Box>
                  ) : (
                    apps.map((app) => (
                      <ApplicationCard
                        key={app.id}
                        app={app}
                        column={col}
                        onView={openDetail}
                        onAdvance={handleAdvance}
                        onDelete={setDeleteTarget}
                      />
                    ))
                  )}
                </Stack>
              </Box>
            );
          })}
        </Box>
      )}

      <ApplicationDetailDialog
        open={detailOpen}
        app={detailApp}
        token={token}
        onClose={() => setDetailOpen(false)}
        onStatusChange={handleStatusChange}
      />

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        app={deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
};

export default ApplicationsPage;
