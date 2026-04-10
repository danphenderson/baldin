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
  NoteAdd as NoteAddIcon,
  OpenInNew as OpenIcon,
  Warning as WarningIcon,
  PlaylistAdd as PlaylistAddIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/user-context';
import { usePageToolbarHeader } from '../../layout/toolbar-header-context';
import {
  getApplication, updateApplication, deleteApplication,
  getApplicationDocuments, addApplicationDocument, detachApplicationDocument,
  type ApplicationRead,
} from '../../service/applications';
import {
  getDocuments, downloadDocument, generateDocument,
  type DocumentRead, type DocumentGenerateRequest,
} from '../../service/documents';
import { ALL_STATUS_COLUMNS, relativeDate } from './use-applications';
import CreateActionItemDialog from '../../component/create-action-item-dialog';
import type { ActionItemRead, ActionItemCreate } from '../../service/action-items';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface StatusHistoryEntry {
  from?: ApplicationRead['status'] | null;
  to: NonNullable<ApplicationRead['status']>;
  changed_at: string;
}

type ApplicationDetailRecord = ApplicationRead & {
  outcome_reason?: string | null;
  status_history?: StatusHistoryEntry[] | null;
};

type ApplicationUpdatePayload = Parameters<typeof updateApplication>[2] & {
  reopen?: boolean;
  outcome_reason?: string | null;
};

const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function isTerminalStatus(status: string | null | undefined): boolean {
  return status === 'rejected' || status === 'withdrawn';
}

function statusLabel(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return ALL_STATUS_COLUMNS.find((column) => column.key === status)?.label ?? status.replace(/_/g, ' ');
}

function formatTimelineTimestamp(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return TIMESTAMP_FORMATTER.format(parsed);
}

function formatTimelineDuration(startIso: string, endIso?: string): string {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'unknown duration';

  const diff = Math.max(0, end - start);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'under a minute';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'}`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;

  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'}`;
}

function buildTimelineEntries(history: StatusHistoryEntry[] | null | undefined) {
  const entries = (history ?? [])
    .filter((entry): entry is StatusHistoryEntry => Boolean(entry?.to && entry?.changed_at))
    .slice()
    .sort((left, right) => new Date(left.changed_at).getTime() - new Date(right.changed_at).getTime());

  return entries.map((entry, index) => {
    const nextEntry = entries[index + 1];
    return {
      key: `${entry.changed_at}-${entry.to}-${index}`,
      from: entry.from ?? null,
      to: entry.to,
      changedAt: entry.changed_at,
      durationLabel: formatTimelineDuration(entry.changed_at, nextEntry?.changed_at),
      isCurrent: index === entries.length - 1,
    };
  });
}

const ApplicationDetailPage: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const { token } = useContext(UserContext);

  /* application state */
  const [app, setApp] = useState<ApplicationDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /* document state (unified) */
  const [appDocuments, setAppDocuments] = useState<DocumentRead[]>([]);
  const [allDocuments, setAllDocuments] = useState<DocumentRead[]>([]);
  const [templates, setTemplates] = useState<DocumentRead[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [generating, setGenerating] = useState(false);

  /* delete confirmation */
  const [deleteOpen, setDeleteOpen] = useState(false);

  /* action item dialog */
  const [actionDialogOpen, setActionDialogOpen] = useState(false);

  /* inline-edit state for new metadata fields */
  const [localNotes, setLocalNotes] = useState('');
  const [localNextStep, setLocalNextStep] = useState('');
  const [localNextStepDue, setLocalNextStepDue] = useState('');
  const [localOutcomeReason, setLocalOutcomeReason] = useState('');

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
        const match = await getApplication(token, applicationId);
        if (cancelled) return;
        setApp(match as ApplicationDetailRecord);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load application');
        if (!cancelled) setApp(null);
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
        const [appDocs, allDocs] = await Promise.all([
          getApplicationDocuments(token, app.id),
          getDocuments(token),
        ]);
        if (cancelled) return;
        setAppDocuments(appDocs || []);
        setAllDocuments(allDocs || []);
        setTemplates((allDocs || []).filter((d) => d.kind === 'cover_letter' && d.status !== 'archived'));
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
    setLocalOutcomeReason(app.outcome_reason ?? '');
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
  const handleStatusChange = async (newStatus: ApplicationRead['status']) => {
    if (!token || !app) return;
    const prev = app.status;
    const shouldReopen = isTerminalStatus(app.outcome ?? app.status) && !isTerminalStatus(newStatus);
    setApp((a) => a ? { ...a, status: newStatus } : a);
    try {
      const updated = await updateApplication(token, app.id, {
        status: newStatus,
        ...(shouldReopen ? { reopen: true } : {}),
      } as ApplicationUpdatePayload);
      setApp(updated as ApplicationDetailRecord);
      setLocalOutcomeReason((updated as ApplicationDetailRecord).outcome_reason ?? '');
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

  const handleOutcomeReasonSave = async () => {
    if (!token || !app || !isTerminalStatus(app.outcome ?? app.status)) return;
    const nextValue = localOutcomeReason.trim() || null;
    const currentValue = (app.outcome_reason ?? '').trim() || null;
    if (nextValue === currentValue) return;

    showSuccess('Saving\u2026');
    try {
      const updated = await updateApplication(token, app.id, {
        outcome_reason: nextValue,
      } as ApplicationUpdatePayload);
      setApp(updated as ApplicationDetailRecord);
      setLocalOutcomeReason((updated as ApplicationDetailRecord).outcome_reason ?? '');
      showSuccess('Saved');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save outcome reason');
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

  /* attach resume (via unified documents) */
  const handleAttachResume = async (docId: string) => {
    if (!token || !app) return;
    try {
      await addApplicationDocument(token, app.id, docId);
      const docs = await getApplicationDocuments(token, app.id);
      setAppDocuments(docs || []);
      showSuccess('Resume attached');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to attach resume');
    }
  };

  /* attach cover letter (via unified documents) */
  const handleAttachCoverLetter = async (docId: string) => {
    if (!token || !app) return;
    try {
      await addApplicationDocument(token, app.id, docId);
      const docs = await getApplicationDocuments(token, app.id);
      setAppDocuments(docs || []);
      showSuccess('Cover letter attached');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to attach cover letter');
    }
  };

  /* generate cover letter via unified document API */
  const handleGenerate = async () => {
    if (!token || !app) return;
    const leadId = lead?.id;
    if (!leadId) {
      setError('No lead associated with this application.');
      return;
    }
    const templateDoc = selectedTemplate
      ? templates.find((t) => t.id === selectedTemplate)
      : templates[0];
    if (!templateDoc) {
      setError('No cover letter template available. Create one in Documents first.');
      return;
    }
    setGenerating(true);
    try {
      const payload: DocumentGenerateRequest = {
        kind: 'cover_letter',
        lead_id: leadId,
        template_version_id: templateDoc.head_version?.id ?? null,
      };
      const generated = await generateDocument(token, payload);
      // Attach the newly generated document to this application
      await addApplicationDocument(token, app.id, generated.id);
      const docs = await getApplicationDocuments(token, app.id);
      setAppDocuments(docs || []);
      showSuccess('Cover letter generated');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    }
    setGenerating(false);
  };

  const appResumes = appDocuments.filter((d) => d.kind === 'resume');
  const appCoverLetters = appDocuments.filter((d) => d.kind === 'cover_letter');
  const availableResumes = allDocuments.filter(
    (d) => d.kind === 'resume' && !appDocuments.some((attached) => attached.id === d.id),
  );
  const availableCoverLetters = allDocuments.filter(
    (d) => d.kind === 'cover_letter' && !appDocuments.some((attached) => attached.id === d.id),
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
  const column = ALL_STATUS_COLUMNS.find((c) => c.key === (app.status || 'applied').toLowerCase()) ?? ALL_STATUS_COLUMNS[0];
  const isClosedApplication = isTerminalStatus(app.outcome ?? app.status);
  const currentOutcomeLabel = statusLabel(app.outcome ?? app.status);
  const timelineEntries = buildTimelineEntries(app.status_history);

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
                {ALL_STATUS_COLUMNS.map((c) => (
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

        {/* -------- Outcome Details -------- */}
        {isClosedApplication && (
          <Box sx={{ px: 3, py: 3 }}>
            <Stack direction={isNarrow ? 'column' : 'row'} spacing={1.5} sx={{ mb: 1.5 }} alignItems={isNarrow ? 'flex-start' : 'center'}>
              <Typography variant="subtitle1" fontWeight={700}>
                Outcome Details
              </Typography>
              <Chip
                label={currentOutcomeLabel}
                size="small"
                sx={{
                  fontWeight: 600,
                  bgcolor: alpha(column.color, 0.12),
                  color: column.color,
                }}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, maxWidth: 640 }}>
              Capture why this application ended so the closure is still understandable when you review the history later.
            </Typography>
            <TextField
              multiline
              minRows={2}
              fullWidth
              label="Outcome reason"
              placeholder={app.outcome === 'withdrawn'
                ? 'e.g. Accepted another offer before the final round'
                : 'e.g. Team closed the role after the onsite'
              }
              value={localOutcomeReason}
              onChange={(e) => setLocalOutcomeReason(e.target.value)}
              onBlur={handleOutcomeReasonSave}
              variant="outlined"
              size="small"
            />
          </Box>
        )}

        {/* -------- Status History -------- */}
        <Box sx={{ px: 3, py: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Status History
          </Typography>
          {timelineEntries.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.6 }}>
              No status history recorded
            </Typography>
          ) : (
            <Stack spacing={0}>
              {timelineEntries.map((entry, idx) => {
                const col = ALL_STATUS_COLUMNS.find((c) => c.key === entry.to) ?? ALL_STATUS_COLUMNS[0];
                return (
                  <Box key={entry.key} sx={{ position: 'relative', pl: 4, pb: idx === timelineEntries.length - 1 ? 0 : 2.5 }}>
                    {idx < timelineEntries.length - 1 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 11,
                          top: 24,
                          bottom: -10,
                          width: 2,
                          bgcolor: alpha(col.color, 0.18),
                        }}
                      />
                    )}
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        top: 2,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: alpha(col.color, 0.14),
                        border: `2px solid ${col.color}`,
                        boxShadow: `0 0 0 4px ${alpha(col.color, 0.08)}`,
                      }}
                    />
                    <Box
                      sx={{
                        border: `1px solid ${alpha(col.color, 0.16)}`,
                        borderRadius: 2.5,
                        px: 2,
                        py: 1.5,
                        bgcolor: alpha(col.color, theme.palette.mode === 'dark' ? 0.08 : 0.04),
                      }}
                    >
                      <Stack direction={isNarrow ? 'column' : 'row'} justifyContent="space-between" alignItems={isNarrow ? 'flex-start' : 'center'} gap={1}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {entry.from ? `${statusLabel(entry.from)} → ${statusLabel(entry.to)}` : `Created in ${statusLabel(entry.to)}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatTimelineTimestamp(entry.changedAt)} · {relativeDate(entry.changedAt)}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={entry.isCurrent
                            ? `In ${statusLabel(entry.to)} for ${entry.durationLabel}`
                            : `Stayed in ${statusLabel(entry.to)} for ${entry.durationLabel}`
                          }
                          sx={{
                            alignSelf: isNarrow ? 'flex-start' : 'center',
                            fontWeight: 600,
                            bgcolor: alpha(col.color, 0.12),
                            color: col.color,
                          }}
                        />
                      </Stack>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>

        {/* -------- Documents (Unified) -------- */}
        <Box sx={{ px: 3, py: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Documents
            </Typography>
            <Button
              variant="text"
              size="small"
              startIcon={<NoteAddIcon />}
              onClick={() => navigate('/documents/new')}
              sx={{ textTransform: 'none' }}
            >
              New Document
            </Button>
          </Stack>

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
                  <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }} noWrap>{r.title || 'Untitled'}</Typography>
                  <Chip label={r.status || 'draft'} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 22 }} />
                  <Tooltip title="Download">
                    <IconButton size="small" onClick={() => token && downloadDocument(token, r.id)} aria-label="Download resume">
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
                  <MenuItem key={r.id} value={r.id}>{r.title || 'Untitled'} ({r.status || 'draft'})</MenuItem>
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
                  <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }} noWrap>{cl.title || 'Untitled'}</Typography>
                  <Chip label={cl.status || 'draft'} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 22 }} />
                  <Tooltip title="Download">
                    <IconButton size="small" onClick={() => token && downloadDocument(token, cl.id)} aria-label="Download cover letter">
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
                      <MenuItem key={t.id} value={t.id}>{t.title || 'Untitled'}</MenuItem>
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
                        {letter.title || 'Untitled'} ({letter.status || 'draft'})
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
