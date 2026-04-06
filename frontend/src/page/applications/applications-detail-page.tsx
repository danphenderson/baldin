import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Chip, Stack, Button, useTheme, alpha,
  Select, MenuItem, FormControl, InputLabel, IconButton, Tooltip,
  Skeleton, Alert, LinearProgress, Divider, useMediaQuery,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Delete as DeleteIcon,
  Description as DocIcon,
  Download as DownloadIcon,
  AutoAwesome as AIIcon,
  OpenInNew as OpenIcon,
  Warning as WarningIcon,
  PlaylistAdd as PlaylistAddIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/user-context';
import { usePageToolbarHeader } from '../../layout/toolbar-header-context';
import {
  getApplications, updateApplication, deleteApplication,
  getApplicationCoverLetters, generatecoverLetter, getApplicationResumes,
  createApplicationResume, createApplicationCoverLetter,
  getApplicationDocuments, addApplicationDocument, detachApplicationDocument,
  type ApplicationRead,
} from '../../service/applications';
import { getDocuments, downloadDocument } from '../../service/documents';
import { getCoverLetters, downloadCoverLetter, type CoverLetterRead } from '../../service/cover-letters';
import { getResumes, downloadResume, type ResumeRead } from '../../service/resumes';
import { COLUMNS, relativeDate } from './use-applications';
import CreateActionItemDialog from '../../component/create-action-item-dialog';
import type { ActionItemRead, ActionItemCreate } from '../../service/action-items';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ApplicationDetailPage: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const { token } = useContext(UserContext);

  /* application state */
  const [app, setApp] = useState<ApplicationRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /* document state */
  const [appResumes, setAppResumes] = useState<ResumeRead[]>([]);
  const [appCoverLetters, setAppCoverLetters] = useState<CoverLetterRead[]>([]);
  const [allResumes, setAllResumes] = useState<ResumeRead[]>([]);
  const [allCoverLetters, setAllCoverLetters] = useState<CoverLetterRead[]>([]);
  const [templates, setTemplates] = useState<CoverLetterRead[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [generating, setGenerating] = useState(false);

  /* unified document state */
  type DocumentRead = Awaited<ReturnType<typeof getApplicationDocuments>>[number];
  const [appDocuments, setAppDocuments] = useState<DocumentRead[]>([]);
  const [allDocuments, setAllDocuments] = useState<DocumentRead[]>([]);

  /* delete confirmation */
  const [deleteOpen, setDeleteOpen] = useState(false);

  /* action item dialog */
  const [actionDialogOpen, setActionDialogOpen] = useState(false);

  /* inline-edit state for new metadata fields */
  const [localNotes, setLocalNotes] = useState('');
  const [localNextStep, setLocalNextStep] = useState('');
  const [localNextStepDue, setLocalNextStepDue] = useState('');

  const lead = app?.lead;

  usePageToolbarHeader('Application', lead?.title || 'Loading\u2026');

  /* ---------------------------------------------------------------- */
  /*  Fetch application                                                */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!token || !applicationId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const all = await getApplications(token);
        if (cancelled) return;
        const match = (all || []).find((a) => a.id === applicationId);
        if (!match) {
          setError('Application not found');
          setApp(null);
        } else {
          setApp(match);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load application');
      }
      if (!cancelled) setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [token, applicationId]);

  /* ---------------------------------------------------------------- */
  /*  Fetch documents                                                  */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!token || !app) return;
    let cancelled = false;

    const loadDocs = async () => {
      setLoadingDocs(true);
      try {
        const [cls, resData, letters, res, appDocs, allDocs] = await Promise.all([
          getApplicationCoverLetters(token, app.id),
          getApplicationResumes(token, app.id),
          getCoverLetters(token),
          getResumes(token),
          getApplicationDocuments(token, app.id),
          getDocuments(token),
        ]);
        if (cancelled) return;
        setAppCoverLetters(cls || []);
        setAppResumes(Array.isArray(resData) ? resData : []);
        setAllCoverLetters(letters || []);
        setTemplates((letters || []).filter((t: CoverLetterRead) => t.content_type === 'template'));
        setAllResumes(res || []);
        setAppDocuments(appDocs || []);
        setAllDocuments(allDocs || []);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load documents');
      }
      if (!cancelled) setLoadingDocs(false);
    };

    loadDocs();
    return () => { cancelled = true; };
  }, [token, app?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------------------------------------------------------------- */
  /*  Sync local editable fields when app loads / changes              */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!app) return;
    setLocalNotes(app.notes ?? '');
    setLocalNextStep(app.next_step ?? '');
    setLocalNextStepDue(app.next_step_due ? app.next_step_due.slice(0, 10) : '');
  }, [app?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                          */
  /* ---------------------------------------------------------------- */

  const showSuccess = useCallback((msg: string) => {
    setSuccess(msg);
    const id = window.setTimeout(() => setSuccess(''), 3000);
    return () => clearTimeout(id);
  }, []);

  /* status change */
  const handleStatusChange = async (newStatus: string) => {
    if (!token || !app) return;
    const prev = app.status;
    setApp((a) => a ? { ...a, status: newStatus } : a);
    try {
      const updated = await updateApplication(token, app.id, { status: newStatus });
      setApp(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update status');
      setApp((a) => a ? { ...a, status: prev } : a);
    }
  };

  /* save notes on blur */
  const handleNotesSave = async () => {
    if (!token || !app || localNotes === (app.notes ?? '')) return;
    showSuccess('Saving\u2026');
    try {
      const updated = await updateApplication(token, app.id, { notes: localNotes });
      setApp(updated);
      showSuccess('Saved');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save notes');
    }
  };

  /* save next step on blur */
  const handleNextStepSave = async () => {
    if (!token || !app || localNextStep === (app.next_step ?? '')) return;
    showSuccess('Saving\u2026');
    try {
      const updated = await updateApplication(token, app.id, { next_step: localNextStep || null });
      setApp(updated);
      showSuccess('Saved');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save next step');
    }
  };

  /* save next step due on blur */
  const handleNextStepDueSave = async () => {
    if (!token || !app) return;
    const newVal = localNextStepDue || null;
    const curVal = app.next_step_due ? app.next_step_due.slice(0, 10) : null;
    if (newVal === curVal) return;
    showSuccess('Saving\u2026');
    try {
      const updated = await updateApplication(token, app.id, { next_step_due: newVal ? `${newVal}T00:00:00` : null });
      setApp(updated);
      showSuccess('Saved');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save due date');
    }
  };

  /* delete */
  const handleDeleteConfirm = async () => {
    if (!token || !app) return;
    try {
      await deleteApplication(token, app.id);
      navigate('/applications');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete application');
    }
    setDeleteOpen(false);
  };

  /* attach resume */
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

  /* attach cover letter */
  const handleAttachCoverLetter = async (clId: string) => {
    if (!token || !app) return;
    try {
      await createApplicationCoverLetter(token, app.id, clId);
      const cls = await getApplicationCoverLetters(token, app.id);
      setAppCoverLetters(cls || []);
      showSuccess('Cover letter attached');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to attach cover letter');
    }
  };

  /* generate cover letter */
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
      setAppCoverLetters(cls || []);
      showSuccess('Cover letter generated');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    }
    setGenerating(false);
  };

  const availableResumes = allResumes.filter(
    (r) => !appResumes.some((attached) => attached.id === r.id),
  );
  const availableCoverLetters = allCoverLetters.filter(
    (cl) => !appCoverLetters.some((attached) => attached.id === cl.id),
  );
  const availableDocuments = allDocuments.filter(
    (d) => !appDocuments.some((attached) => attached.id === d.id),
  );

  /* attach document (unified) */
  const handleAttachDocument = async (docId: string) => {
    if (!token || !app) return;
    try {
      await addApplicationDocument(token, app.id, docId);
      const docs = await getApplicationDocuments(token, app.id);
      setAppDocuments(docs || []);
      showSuccess('Document attached');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to attach document');
    }
  };

  /* detach document (unified) */
  const handleDetachDocument = async (docId: string) => {
    if (!token || !app) return;
    try {
      await detachApplicationDocument(token, app.id, docId);
      setAppDocuments((prev) => prev.filter((d) => d.id !== docId));
      showSuccess('Document detached');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to detach document');
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Loading state                                                    */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <Box sx={{ py: 2 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/applications')} sx={{ mb: 3, textTransform: 'none' }}>
          Back to Applications
        </Button>
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={40} width="60%" />
          <Skeleton variant="rounded" height={24} width="40%" />
          <Skeleton variant="rounded" height={200} />
          <Skeleton variant="rounded" height={200} />
        </Stack>
      </Box>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Error / not-found state                                          */
  /* ---------------------------------------------------------------- */

  if (error && !app) {
    return (
      <Box sx={{ py: 2 }}>
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        <Button variant="outlined" startIcon={<BackIcon />} onClick={() => navigate('/applications')}>
          Back to Applications
        </Button>
      </Box>
    );
  }

  if (!app) return null;

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const companyName = lead?.companies?.[0]?.name;
  const column = COLUMNS.find((c) => c.key === (app.status || 'applied').toLowerCase()) ?? COLUMNS[0];

  return (
    <Box sx={{ py: 2 }}>
      {/* Top bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/applications')} sx={{ textTransform: 'none' }}>
          Back to Applications
        </Button>
        <Button
          variant="outlined"
          color="error"
          size="small"
          startIcon={<DeleteIcon />}
          onClick={() => setDeleteOpen(true)}
          sx={{ textTransform: 'none' }}
        >
          Delete
        </Button>
      </Box>

      {/* Alerts */}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Main content */}
      <Stack spacing={0} divider={<Divider />} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, overflow: 'hidden', bgcolor: theme.palette.background.paper }}>
        {/* -------- Overview -------- */}
        <Box sx={{ px: 3, py: 3 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            {lead?.title || 'Untitled Position'}
          </Typography>
          {companyName && (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {companyName}
            </Typography>
          )}

          <Stack direction={isNarrow ? 'column' : 'row'} spacing={2} alignItems={isNarrow ? 'stretch' : 'center'} sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="detail-status-label">Stage</InputLabel>
              <Select
                labelId="detail-status-label"
                label="Stage"
                value={app.status || 'applied'}
                onChange={(e) => handleStatusChange(e.target.value)}
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

            <Chip
              label={column.label}
              size="small"
              sx={{
                fontWeight: 600,
                bgcolor: alpha(column.color, 0.12),
                color: column.color,
                alignSelf: 'center',
              }}
            />
          </Stack>

          <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
            {lead?.location && <Chip label={lead.location} size="small" variant="outlined" />}
            {lead?.salary && <Chip label={lead.salary} size="small" color="success" variant="outlined" />}
            {lead?.employment_type && <Chip label={lead.employment_type} size="small" variant="outlined" />}
            {lead?.seniority_level && <Chip label={lead.seniority_level} size="small" variant="outlined" />}
            {lead?.job_function && <Chip label={lead.job_function} size="small" variant="outlined" />}
          </Stack>

          {lead?.url && (
            <Button
              variant="text"
              size="small"
              startIcon={<OpenIcon />}
              href={lead.url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ textTransform: 'none', mb: 1 }}
            >
              View original posting
            </Button>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, opacity: 0.6 }}>
            Applied {relativeDate(app.created_at)} &middot; Last updated {relativeDate(app.updated_at)}
            {lead?.id && ` \u00b7 Lead ${lead.id.slice(0, 8)}`}
          </Typography>
        </Box>

        {/* -------- Notes -------- */}
        <Box sx={{ px: 3, py: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Notes
          </Typography>
          <TextField
            multiline
            minRows={3}
            fullWidth
            placeholder="Add notes about this application\u2026"
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            onBlur={handleNotesSave}
            variant="outlined"
            size="small"
          />
        </Box>

        {/* -------- Next Step -------- */}
        <Box sx={{ px: 3, py: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Next Step
          </Typography>
          <Stack direction={isNarrow ? 'column' : 'row'} spacing={2} alignItems={isNarrow ? 'stretch' : 'center'}>
            <TextField
              size="small"
              placeholder="e.g. Send follow-up email"
              value={localNextStep}
              onChange={(e) => setLocalNextStep(e.target.value)}
              onBlur={handleNextStepSave}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              type="date"
              label="Due date"
              value={localNextStepDue}
              onChange={(e) => setLocalNextStepDue(e.target.value)}
              onBlur={handleNextStepDueSave}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{
                minWidth: 160,
                ...(localNextStepDue && new Date(localNextStepDue) < new Date(new Date().toDateString()) && {
                  '& .MuiOutlinedInput-root': { borderColor: theme.palette.warning.main },
                  '& .MuiInputBase-input': { color: theme.palette.warning.main },
                }),
              }}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<PlaylistAddIcon />}
              onClick={() => setActionDialogOpen(true)}
              sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
            >
              Create Action
            </Button>
          </Stack>
        </Box>

        {/* -------- Status History -------- */}
        <Box sx={{ px: 3, py: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Status History
          </Typography>
          {!app.status_history || app.status_history.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.6 }}>
              No status history recorded
            </Typography>
          ) : (
            <Stack spacing={1.5}>
              {app.status_history.map((entry, idx) => {
                const from = entry.from as string | null;
                const to = entry.to as string;
                const changedAt = entry.changed_at as string;
                const col = COLUMNS.find((c) => c.key === to) ?? COLUMNS[0];
                return (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: col.color, mt: 0.5, flexShrink: 0 }} />
                    <Box>
                      <Typography variant="body2">
                        {from ? `${from} → ${to}` : `Created as ${to}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {relativeDate(changedAt)}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>

        {/* -------- Documents (Unified) -------- */}
        <Box sx={{ px: 3, py: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Documents
          </Typography>

          {loadingDocs ? (
            <Stack spacing={1}>{[0, 1].map((i) => <Skeleton key={i} variant="rounded" height={40} />)}</Stack>
          ) : appDocuments.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.6 }}>
              No documents attached yet
            </Typography>
          ) : (
            <Stack spacing={1}>
              {appDocuments.map((doc) => (
                <Box
                  key={doc.id}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1,
                    borderRadius: 2, border: `1px solid ${theme.palette.divider}`,
                    bgcolor: alpha(doc.kind === 'resume' ? theme.palette.primary.main : theme.palette.secondary.main, 0.03),
                  }}
                >
                  <DocIcon fontSize="small" color={doc.kind === 'resume' ? 'primary' : 'secondary'} />
                  <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }} noWrap>{doc.title || 'Untitled'}</Typography>
                  <Chip label={doc.kind} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 22, textTransform: 'capitalize' }} />
                  <Chip label={`v${doc.version_count}`} size="small" sx={{ fontSize: '0.65rem', height: 22 }} />
                  <Tooltip title="Download">
                    <IconButton size="small" onClick={() => token && downloadDocument(token, doc.id)} aria-label="Download document">
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Detach">
                    <IconButton size="small" onClick={() => handleDetachDocument(doc.id)} aria-label="Detach document">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Stack>
          )}

          {!loadingDocs && availableDocuments.length > 0 && (
            <FormControl size="small" sx={{ mt: 1.5, minWidth: 220 }}>
              <InputLabel id="detail-attach-doc">Attach a document</InputLabel>
              <Select
                labelId="detail-attach-doc"
                label="Attach a document"
                displayEmpty
                value=""
                onChange={(e) => handleAttachDocument(e.target.value)}
              >
                {availableDocuments.map((d) => (
                  <MenuItem key={d.id} value={d.id}>{d.title || 'Untitled'} ({d.kind})</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        {/* -------- Resumes -------- */}
        <Box sx={{ px: 3, py: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Resumes
          </Typography>

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
              <InputLabel id="detail-attach-resume">Attach a resume</InputLabel>
              <Select
                labelId="detail-attach-resume"
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

        {/* -------- Cover Letters -------- */}
        <Box sx={{ px: 3, py: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Cover Letters
          </Typography>

          {loadingDocs ? (
            <Stack spacing={1}>{[0, 1].map((i) => <Skeleton key={i} variant="rounded" height={40} />)}</Stack>
          ) : appCoverLetters.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.6 }}>
              No cover letters attached yet
            </Typography>
          ) : (
            <Stack spacing={1}>
              {appCoverLetters.map((cl) => (
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
                  <InputLabel id="detail-template-label">Template</InputLabel>
                  <Select
                    labelId="detail-template-label"
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
                  <InputLabel id="detail-attach-cl">Attach cover letter</InputLabel>
                  <Select
                    labelId="detail-attach-cl"
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

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
          <WarningIcon color="error" /> Delete Application
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Remove <strong>{lead?.title || 'this application'}</strong>
            {companyName ? ` at ${companyName}` : ''}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Create Action Item dialog */}
      <CreateActionItemDialog
        open={actionDialogOpen}
        onClose={() => setActionDialogOpen(false)}
        onCreated={(item: ActionItemRead) => {
          setActionDialogOpen(false);
          showSuccess('Action item created');
        }}
        defaults={{
          title: localNextStep,
          kind: 'follow_up' as ActionItemCreate['kind'],
          due_at: localNextStepDue || undefined,
          application_id: app.id,
        }}
      />
    </Box>
  );
};

export default ApplicationDetailPage;
