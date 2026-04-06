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
  PictureAsPdf as PdfIcon, Share as ShareIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { UserContext } from '../../context/user-context';
import { usePageToolbarHeader } from '../../layout/toolbar-header-context';
import RichTextEditor from '../../component/rich-text-editor';
import {
  getDocument, updateDocument, deleteDocument, downloadDocument, pinDocument, downloadOriginal,
  getDocumentActivity,
  type DocumentActivityRead, type DocumentActivityType, type DocumentDetailRead, type DocumentVersionRead, type DocumentKind, type DocumentStatus,
} from '../../service/documents';
import ShareDocumentDialog from '../../component/share-document-dialog';

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

function formatPersonLabel(fullName?: string | null, email?: string | null, fallback = 'Unknown user'): string {
  return fullName?.trim() || email?.trim() || fallback;
}

function formatPersonSecondary(fullName?: string | null, email?: string | null): string | null {
  if (email?.trim() && email !== fullName) return email;
  return null;
}

function getSourceFileName(sourceFile?: string | null): string | null {
  if (!sourceFile) return null;
  const segments = sourceFile.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? sourceFile;
}

function getActivityBadgeLabels(activity: DocumentActivityRead): string[] {
  const details = activity.details as Record<string, unknown> | undefined;
  const labels: string[] = [];
  const versionNumber = details?.version_number;
  if (typeof versionNumber === 'number' || typeof versionNumber === 'string') {
    labels.push(`v${versionNumber}`);
  }
  const sharedWith =
    (typeof details?.shared_with_full_name === 'string' && details.shared_with_full_name)
    || (typeof details?.shared_with_email === 'string' && details.shared_with_email)
    || null;
  if (sharedWith) labels.push(sharedWith);
  if (typeof details?.role === 'string') {
    labels.push(`${details.role.charAt(0).toUpperCase() + details.role.slice(1)} access`);
  }
  return labels.slice(0, 3);
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
  const [shareOpen, setShareOpen] = useState(false);
  const [activity, setActivity] = useState<DocumentActivityRead[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState('');

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
    setActivityLoading(true);
    setActivityError('');
    setError('');
    const [documentResult, activityResult] = await Promise.allSettled([
      getDocument(token, id),
      getDocumentActivity(token, id, { limit: 20 }),
    ]);

    if (documentResult.status === 'fulfilled') {
      setDoc(documentResult.value);
    } else {
      const reason = documentResult.reason;
      setError(reason instanceof Error ? reason.message : 'Failed to load document');
    }

    if (activityResult.status === 'fulfilled') {
      setActivity(activityResult.value ?? []);
    } else {
      setActivity([]);
      const reason = activityResult.reason;
      setActivityError(reason instanceof Error ? reason.message : 'Failed to load activity');
    }

    setLoading(false);
    setActivityLoading(false);
  }, [token, id]);

  useEffect(() => { refresh(); }, [refresh]);

  /* handlers ------------------------------------------------------- */
  const handleDelete = async () => {
    if (!token || !id) return;
    setDeleting(true);
    try {
      await deleteDocument(token, id);
      navigate('/documents');
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

  const handleDownloadOriginal = async () => {
    if (!token || !id) return;
    try { await downloadOriginal(token, id); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Download original failed'); }
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
      navigate(`/documents/${id}/compare?left=${compareSelection[0]}&right=${compareSelection[1]}`);
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
        <Button startIcon={<BackIcon />} onClick={() => navigate('/documents')} aria-label="Back to documents">
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
  const viewerRole = doc.viewer_role;
  const isOwner = !viewerRole;
  const ownerLabel = formatPersonLabel(doc.owner_full_name, doc.owner_email, 'Document owner');
  const ownerSecondary = formatPersonSecondary(doc.owner_full_name, doc.owner_email);
  const sharedByLabel = formatPersonLabel(doc.shared_by_full_name, doc.shared_by_email, 'Unknown sharer');
  const sharedBySecondary = formatPersonSecondary(doc.shared_by_full_name, doc.shared_by_email);
  const sourceFileName = getSourceFileName(doc.head_version?.source_file);

  const activityColor = (activityType: DocumentActivityType): string => {
    switch (activityType) {
      case 'document_created':
      case 'version_saved':
        return theme.palette.primary.main;
      case 'document_uploaded':
        return theme.palette.info.main;
      case 'share_created':
      case 'share_updated':
      case 'share_revoked':
        return theme.palette.secondary.main;
      case 'document_archived':
      case 'document_unarchived':
        return theme.palette.warning.main;
      case 'document_pinned':
      case 'document_unpinned':
        return accent;
    }
  };

  const activityIcon = (activityType: DocumentActivityType): React.ReactElement => {
    switch (activityType) {
      case 'document_uploaded':
        return <PdfIcon fontSize="small" />;
      case 'share_created':
      case 'share_updated':
      case 'share_revoked':
        return <ShareIcon fontSize="small" />;
      case 'document_archived':
        return <ArchiveIcon fontSize="small" />;
      case 'document_unarchived':
        return <UnarchiveIcon fontSize="small" />;
      case 'document_pinned':
      case 'document_unpinned':
        return <PushPinIcon fontSize="small" />;
      default:
        return <EditIcon fontSize="small" />;
    }
  };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* ── Back button ─────────────────────────────────────────── */}
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate('/documents')}
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
              {Boolean((doc.head_version as Record<string, unknown> | undefined)?.source_file) && (
                <Chip
                  icon={<PdfIcon sx={{ fontSize: 16 }} />}
                  label="PDF Import"
                  size="small"
                  variant="outlined"
                  color="info"
                  sx={{ fontWeight: 600 }}
                />
              )}
              {!isOwner && viewerRole && (
                <Chip
                  label={`Shared · ${viewerRole.charAt(0).toUpperCase() + viewerRole.slice(1)}`}
                  size="small"
                  color="info"
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Created {formatDate(doc.created_at)} · Updated {formatDate(doc.updated_at)}
              {!isOwner && doc.shared_at ? ` · Shared ${formatDate(doc.shared_at)}` : ''}
            </Typography>
          </Box>

          {/* Actions */}
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {isOwner && (
              <Tooltip title="Share">
                <IconButton
                  onClick={() => setShareOpen(true)}
                  aria-label="Share document"
                  sx={{ color: 'text.secondary' }}
                >
                  <ShareIcon />
                </IconButton>
              </Tooltip>
            )}
            {isOwner && (
              <Tooltip title={doc.is_pinned ? 'Unpin' : 'Pin as active'}>
                <IconButton
                  onClick={handleTogglePin}
                  aria-label={doc.is_pinned ? 'Unpin document' : 'Pin document'}
                  sx={{ color: doc.is_pinned ? accent : 'text.secondary' }}
                >
                  <PushPinIcon sx={{ transform: doc.is_pinned ? 'rotate(45deg)' : 'none' }} />
                </IconButton>
              </Tooltip>
            )}
            <Button
              variant="outlined" size="small" startIcon={<EditIcon />}
              onClick={() => navigate(`/documents/${id}/edit`)}
              disabled={viewerRole === 'viewer'}
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
            {Boolean((doc.head_version as Record<string, unknown> | undefined)?.source_file) && (
              <Button
                variant="outlined" size="small" startIcon={<PdfIcon />}
                onClick={handleDownloadOriginal}
                aria-label="Download original PDF"
              >
                Original PDF
              </Button>
            )}
            {isOwner && (
              <Button
                variant="outlined" size="small"
                startIcon={doc.status === 'archived' ? <UnarchiveIcon /> : <ArchiveIcon />}
                onClick={handleArchiveToggle}
                aria-label={doc.status === 'archived' ? 'Restore document' : 'Archive document'}
              >
                {doc.status === 'archived' ? 'Restore' : 'Archive'}
              </Button>
            )}
            {isOwner && (
              <Button
                variant="outlined" size="small" color="error" startIcon={<DeleteIcon />}
                onClick={() => setDeleteOpen(true)}
                aria-label="Delete document"
              >
                Delete
              </Button>
            )}
          </Stack>
        </Box>
      </Paper>

      {!isOwner && (
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            mb: 3,
            background: alpha(theme.palette.info.main, 0.04),
            borderColor: alpha(theme.palette.info.main, 0.16),
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Shared context
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} sx={{ flexWrap: 'wrap' }}>
            <Box sx={{ minWidth: 180 }}>
              <Typography variant="caption" color="text.secondary">Owner</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{ownerLabel}</Typography>
              {ownerSecondary && <Typography variant="caption" color="text.secondary">{ownerSecondary}</Typography>}
            </Box>
            <Box sx={{ minWidth: 180 }}>
              <Typography variant="caption" color="text.secondary">Shared by</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{sharedByLabel}</Typography>
              {sharedBySecondary && <Typography variant="caption" color="text.secondary">{sharedBySecondary}</Typography>}
            </Box>
            <Box sx={{ minWidth: 180 }}>
              <Typography variant="caption" color="text.secondary">Access granted</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {doc.shared_at ? formatDate(doc.shared_at) : 'Unknown'}
              </Typography>
            </Box>
            <Box sx={{ minWidth: 180 }}>
              <Typography variant="caption" color="text.secondary">Access updated</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {doc.share_updated_at ? formatDate(doc.share_updated_at) : 'Never'}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      )}

      {sourceFileName && (
        <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
            Imported source
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Imported from PDF: {sourceFileName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            The original upload remains available from this document for local-first review and export.
          </Typography>
        </Paper>
      )}

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Activity History
      </Typography>
      <Paper sx={{ mb: 3, overflow: 'hidden' }}>
        {activityLoading ? (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="80%" height={24} />
            <Skeleton variant="text" width="70%" height={24} />
          </Box>
        ) : activityError ? (
          <Alert severity="warning" sx={{ m: 2 }}>{activityError}</Alert>
        ) : activity.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              No document activity recorded yet.
            </Typography>
          </Box>
        ) : (
          <Stack divider={<Divider />}>
            {activity.map(item => {
              const actorLabel = formatPersonLabel(item.actor_full_name, item.actor_email, 'Baldin');
              const badges = getActivityBadgeLabels(item);
              const tone = activityColor(item.activity_type);

              return (
                <Box key={item.id} sx={{ px: 2.5, py: 1.75, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '12px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: tone,
                      background: alpha(tone, 0.1),
                    }}
                  >
                    {activityIcon(item.activity_type)}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.message}
                    </Typography>
                    <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', mt: 0.75 }}>
                      <Typography variant="caption" color="text.secondary">
                        {actorLabel}
                      </Typography>
                      {badges.map(badge => (
                        <Chip key={`${item.id}-${badge}`} size="small" label={badge} variant="outlined" sx={{ height: 20, fontSize: '0.68rem' }} />
                      ))}
                    </Stack>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    {formatDate(item.created_at)}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        )}
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
                    {v.content_format === 'tiptap_json' ? (
                      <RichTextEditor
                        content={v.content || ''}
                        contentFormat="tiptap_json"
                        readOnly
                        onChange={() => {}}
                        minHeight="100px"
                      />
                    ) : (
                      <Typography
                        variant="body2" component="pre"
                        sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.8rem', m: 0 }}
                      >
                        {v.content || '(empty)'}
                      </Typography>
                    )}
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Stack>
      )}

      {/* ── Share dialog ──────────────────────────────────────── */}
      <ShareDocumentDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        documentId={doc.id}
        onSharesChanged={refresh}
      />

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
