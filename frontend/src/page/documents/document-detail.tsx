import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Chip, Stack, Button, useTheme, alpha, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, Skeleton,
  Alert, Collapse, Divider, Paper,
} from '@mui/material';
import {
  Edit as EditIcon, Download as DownloadIcon, Delete as DeleteIcon,
  ArrowBack as BackIcon, PushPin as PushPinIcon, Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon, CompareArrows as CompareIcon,
  ExpandMore as ExpandIcon, ExpandLess as CollapseIcon,
  Article as ResumeIcon, Mail as LetterIcon, Replay as FollowUpIcon,
  MenuBook as RefSheetIcon, TextSnippet as FreeformIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { UserContext } from '../../context/user-context';
import { usePageToolbarHeader } from '../../layout/toolbar-header-context';
import {
  getDocument, updateDocument, deleteDocument, downloadDocument, pinDocument,
  type DocumentDetailRead, type DocumentVersionRead, type DocumentKind, type DocumentStatus,
} from '../../service/documents';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const KIND_META: Record<DocumentKind, { label: string; icon: React.ReactElement; colorKey: string }> = {
  resume:          { label: 'Resume',          icon: <ResumeIcon fontSize="small" />,   colorKey: 'primary' },
  cover_letter:    { label: 'Cover Letter',    icon: <LetterIcon fontSize="small" />,   colorKey: 'secondary' },
  follow_up:       { label: 'Follow-up',       icon: <FollowUpIcon fontSize="small" />, colorKey: 'info' },
  reference_sheet: { label: 'Reference Sheet', icon: <RefSheetIcon fontSize="small" />, colorKey: 'warning' },
  freeform:        { label: 'Freeform',        icon: <FreeformIcon fontSize="small" />, colorKey: 'success' },
};

const STATUS_META: Record<DocumentStatus, { label: string; color: 'default' | 'success' | 'warning' }> = {
  draft:    { label: 'Draft',    color: 'default' },
  active:   { label: 'Active',   color: 'success' },
  archived: { label: 'Archived', color: 'warning' },
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  custom: 'Custom', generated: 'AI Generated', template: 'Template',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function accentForKind(kind: DocumentKind, palette: Record<string, { main: string }>): string {
  const key = KIND_META[kind]?.colorKey ?? 'primary';
  return (palette as Record<string, { main: string }>)[key]?.main ?? palette.primary.main;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const DocumentDetailPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { token } = useContext(UserContext);

  const [doc, setDoc] = useState<DocumentDetailRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);

  usePageToolbarHeader(
    doc?.title ?? 'Document Detail',
    doc ? `${KIND_META[doc.kind]?.label ?? doc.kind} · v${doc.version_count ?? 0}` : undefined,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pal = theme.palette as any;

  /* fetch ---------------------------------------------------------- */
  const refresh = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const data = await getDocument(token, id);
      setDoc(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load document');
    }
    setLoading(false);
  }, [token, id]);

  useEffect(() => { refresh(); }, [refresh]);

  /* handlers ------------------------------------------------------- */
  const handleDelete = async () => {
    if (!token || !id) return;
    setDeleting(true);
    try {
      await deleteDocument(token, id);
      navigate('/me/documents');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
    setDeleting(false);
  };

  const handleDownload = async () => {
    if (!token || !id) return;
    try { await downloadDocument(token, id); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Download failed'); }
  };

  const handleTogglePin = async () => {
    if (!token || !doc) return;
    try {
      await pinDocument(token, doc.id, !doc.is_pinned);
      refresh();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Pin update failed'); }
  };

  const handleArchiveToggle = async () => {
    if (!token || !doc) return;
    const newStatus: DocumentStatus = doc.status === 'archived' ? 'draft' : 'archived';
    try {
      await updateDocument(token, doc.id, { status: newStatus });
      refresh();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Status update failed'); }
  };

  const handleCompareToggle = (versionId: string) => {
    setCompareSelection(prev => {
      if (prev.includes(versionId)) return prev.filter(v => v !== versionId);
      if (prev.length >= 2) return [prev[1], versionId];
      return [...prev, versionId];
    });
  };

  const handleNavigateCompare = () => {
    if (compareSelection.length === 2 && id) {
      navigate(`/me/documents/${id}/compare?left=${compareSelection[0]}&right=${compareSelection[1]}`);
    }
  };

  /* loading / error ------------------------------------------------ */
  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={40} />
        <Skeleton variant="rounded" height={200} sx={{ mt: 2, borderRadius: 3 }} />
        <Skeleton variant="rounded" height={300} sx={{ mt: 3, borderRadius: 3 }} />
      </Box>
    );
  }

  if (!doc) {
    return (
      <Box>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/me/documents')} aria-label="Back to documents">
          Back
        </Button>
        <Alert severity="error" sx={{ mt: 2 }}>{error || 'Document not found'}</Alert>
      </Box>
    );
  }

  const accent = accentForKind(doc.kind, pal);
  const meta = KIND_META[doc.kind] ?? KIND_META.freeform;
  const statusMeta = STATUS_META[doc.status] ?? STATUS_META.draft;
  const versions = [...(doc.versions ?? [])].sort((a, b) => b.version_number - a.version_number);

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* ── Back button ─────────────────────────────────────────── */}
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate('/me/documents')}
        sx={{ mb: 2 }}
        aria-label="Back to documents"
      >
        Back to Documents
      </Button>

      {/* ── Header ──────────────────────────────────────────────── */}
      <Paper sx={{ p: 3, mb: 3, borderLeft: `4px solid ${accent}` }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>{doc.title}</Typography>
              {doc.is_pinned && (
                <PushPinIcon sx={{ fontSize: 18, color: accent, transform: 'rotate(45deg)' }} />
              )}
            </Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Chip
                icon={meta.icon} label={meta.label} size="small" variant="outlined"
                sx={{ borderColor: alpha(accent, 0.3), color: accent, fontWeight: 600 }}
              />
              <Chip label={statusMeta.label} size="small" color={statusMeta.color} />
              <Chip
                label={`v${doc.version_count ?? 0}`} size="small" variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Created {formatDate(doc.created_at)} · Updated {formatDate(doc.updated_at)}
            </Typography>
          </Box>

          {/* Actions */}
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Tooltip title={doc.is_pinned ? 'Unpin' : 'Pin as active'}>
              <IconButton
                onClick={handleTogglePin}
                aria-label={doc.is_pinned ? 'Unpin document' : 'Pin document'}
                sx={{ color: doc.is_pinned ? accent : 'text.secondary' }}
              >
                <PushPinIcon sx={{ transform: doc.is_pinned ? 'rotate(45deg)' : 'none' }} />
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined" size="small" startIcon={<EditIcon />}
              onClick={() => navigate(`/me/documents/${id}/edit`)}
              aria-label="Edit document"
            >
              Edit
            </Button>
            <Button
              variant="outlined" size="small" startIcon={<CompareIcon />}
              disabled={compareSelection.length !== 2}
              onClick={handleNavigateCompare}
              aria-label="Compare selected versions"
            >
              Compare
            </Button>
            <Button
              variant="outlined" size="small" startIcon={<DownloadIcon />}
              onClick={handleDownload}
              aria-label="Download document"
            >
              Download
            </Button>
            <Button
              variant="outlined" size="small"
              startIcon={doc.status === 'archived' ? <UnarchiveIcon /> : <ArchiveIcon />}
              onClick={handleArchiveToggle}
              aria-label={doc.status === 'archived' ? 'Restore document' : 'Archive document'}
            >
              {doc.status === 'archived' ? 'Restore' : 'Archive'}
            </Button>
            <Button
              variant="outlined" size="small" color="error" startIcon={<DeleteIcon />}
              onClick={() => setDeleteOpen(true)}
              aria-label="Delete document"
            >
              Delete
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* ── Version timeline ────────────────────────────────────── */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Version History ({versions.length})
      </Typography>

      {compareSelection.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {compareSelection.length === 1
            ? 'Select one more version to compare.'
            : 'Two versions selected — click Compare above.'}
        </Alert>
      )}

      {versions.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No versions recorded yet.</Typography>
      ) : (
        <Stack spacing={0}>
          {versions.map((v, idx) => {
            const isExpanded = expandedVersion === v.id;
            const isSelected = compareSelection.includes(v.id);

            return (
              <Box key={v.id}>
                {idx > 0 && <Divider />}
                <Box
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 2, py: 1.5, px: 2,
                    borderRadius: 2,
                    background: isSelected ? alpha(accent, 0.06) : 'transparent',
                    '&:hover': { background: alpha(theme.palette.action.hover, 0.04) },
                  }}
                >
                  {/* Timeline dot */}
                  <Box sx={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    background: idx === 0 ? accent : alpha(accent, 0.3),
                  }} />

                  {/* Version badge */}
                  <Chip
                    label={`v${v.version_number}`} size="small" variant={idx === 0 ? 'filled' : 'outlined'}
                    color={idx === 0 ? 'primary' : 'default'}
                    sx={{ fontWeight: 700, minWidth: 44 }}
                  />

                  {/* Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {v.change_summary || v.name || `Version ${v.version_number}`}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 0.25 }}>
                      {v.content_type && (
                        <Chip
                          label={CONTENT_TYPE_LABELS[v.content_type] ?? v.content_type}
                          size="small" variant="outlined"
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(v.created_at)}
                      </Typography>
                    </Stack>
                  </Box>

                  {/* Actions */}
                  <Tooltip title={isSelected ? 'Deselect for compare' : 'Select for compare'}>
                    <IconButton
                      size="small"
                      onClick={() => handleCompareToggle(v.id)}
                      aria-label={`${isSelected ? 'Deselect' : 'Select'} version ${v.version_number} for compare`}
                      sx={{ color: isSelected ? accent : 'text.secondary' }}
                    >
                      <CompareIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={isExpanded ? 'Collapse' : 'Preview content'}>
                    <IconButton
                      size="small"
                      onClick={() => setExpandedVersion(isExpanded ? null : v.id)}
                      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} version ${v.version_number}`}
                    >
                      {isExpanded ? <CollapseIcon fontSize="small" /> : <ExpandIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* Expanded content preview */}
                <Collapse in={isExpanded}>
                  <Box sx={{
                    ml: 7, mr: 2, mb: 2, p: 2,
                    borderRadius: 2,
                    background: alpha(theme.palette.background.default, 0.6),
                    border: `1px solid ${theme.palette.divider}`,
                    maxHeight: 400, overflow: 'auto',
                  }}>
                    <Typography
                      variant="body2" component="pre"
                      sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.8rem', m: 0 }}
                    >
                      {v.content || '(empty)'}
                    </Typography>
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Stack>
      )}

      {/* ── Delete dialog ───────────────────────────────────────── */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Delete document?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete <strong>{doc.title}</strong>?
            This action cannot be undone and all versions will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting} aria-label="Cancel delete">Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting} aria-label="Confirm delete">
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentDetailPage;
