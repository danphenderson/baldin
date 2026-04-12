import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Stack, Button, useTheme, alpha,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Tooltip, Skeleton, Alert, InputAdornment, Menu, MenuItem, Fab, Tabs, Tab,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Description as DocIcon, Download as DownloadIcon, Delete as DeleteIcon,
  Edit as EditIcon, Search as SearchIcon, Visibility as ViewIcon,
  NoteAdd as NoteAddIcon, SortByAlpha as SortIcon, PushPin as PushPinIcon,
  Add as AddIcon, Article as ResumeIcon, Mail as LetterIcon,
  Replay as FollowUpIcon, MenuBook as RefSheetIcon, TextSnippet as FreeformIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../../context/user-context';
import { usePageToolbarHeader } from '../../layout/toolbar-header-context';
import {
  getDocuments, deleteDocument, downloadDocument, pinDocument, getSharedWithMe,
  type DocumentRead, type DocumentKind, type DocumentStatus,
} from '../../service/documents';
import UploadDocumentDialog from '../../component/upload-document-dialog';
import { softBrandGradient } from '../../theme/effects';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type SortOption = 'newest' | 'oldest' | 'title_asc' | 'title_desc';

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  title_asc: 'Title A–Z',
  title_desc: 'Title Z–A',
};

const KIND_META: Record<DocumentKind, { label: string; icon: React.ReactElement; colorKey: string }> = {
  resume:          { label: 'Resume',          icon: <ResumeIcon fontSize="small" />,   colorKey: 'primary' },
  cover_letter:    { label: 'Cover Letter',    icon: <LetterIcon fontSize="small" />,   colorKey: 'secondary' },
  follow_up:       { label: 'Follow-up',       icon: <FollowUpIcon fontSize="small" />, colorKey: 'info' },
  reference_sheet: { label: 'Reference Sheet', icon: <RefSheetIcon fontSize="small" />, colorKey: 'warning' },
  freeform:        { label: 'Freeform',        icon: <FreeformIcon fontSize="small" />, colorKey: 'success' },
  cell_doc:        { label: 'Cell Doc',        icon: <DocIcon fontSize="small" />,      colorKey: 'info' },
};

const STATUS_META: Record<DocumentStatus, { label: string; color: 'default' | 'success' | 'warning' }> = {
  draft:    { label: 'Draft',    color: 'default' },
  active:   { label: 'Active',   color: 'success' },
  archived: { label: 'Archived', color: 'warning' },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

function extractPlainTextFromTiptapJson(content: string): string {
  try {
    const doc = JSON.parse(content);
    const walk = (node: Record<string, unknown>): string => {
      if (node.type === 'text' && typeof node.text === 'string') return node.text;
      if (!Array.isArray(node.content)) return '';
      return (node.content as Record<string, unknown>[])
        .map(child => walk(child))
        .join(node.type === 'doc' || node.type === 'bulletList' || node.type === 'orderedList' ? '\n' : '');
    };
    return Array.isArray(doc?.content)
      ? (doc.content as Record<string, unknown>[]).map(node => walk(node)).join('\n')
      : content;
  } catch {
    return content;
  }
}

function getDocumentPreview(doc: DocumentRead): string {
  const raw = doc.head_version?.content ?? '';
  return doc.head_version?.content_format === 'tiptap_json'
    ? extractPlainTextFromTiptapJson(raw)
    : raw;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const DocumentListPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { token } = useContext(UserContext);

  /* state ---------------------------------------------------------- */
  const [docs, setDocs] = useState<DocumentRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<DocumentKind | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');
  const [sort, setSort] = useState<SortOption>('newest');
  const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentRead | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [tab, setTab] = useState<'my' | 'shared'>('my');
  const [sharedDocs, setSharedDocs] = useState<DocumentRead[]>([]);
  const [sharedLoading, setSharedLoading] = useState(false);

  /* toolbar header ------------------------------------------------- */
  const activeDocs = tab === 'my' ? docs : sharedDocs;
  const summary = useMemo(() => {
    const count = tab === 'shared' ? sharedDocs.length : docs.length;
    return `${count} documents`;
  }, [docs, sharedDocs, tab]);

  usePageToolbarHeader('Workspace', summary);

  /* fetch ---------------------------------------------------------- */
  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getDocuments(token);
      setDocs(data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load documents');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  /* fetch shared with me ------------------------------------------- */
  const refreshShared = useCallback(async () => {
    if (!token) return;
    setSharedLoading(true);
    try {
      const data = await getSharedWithMe(token);
      setSharedDocs(data ?? []);
    } catch {
      /* silently fail — tab will show empty */
    }
    setSharedLoading(false);
  }, [token]);

  useEffect(() => {
    if (tab === 'shared') refreshShared();
  }, [tab, refreshShared]);

  /* available kind chips (only kinds with ≥1 doc) ------------------ */
  const availableKinds = useMemo(() => {
    const counts = new Map<DocumentKind, number>();
    for (const d of activeDocs) counts.set(d.kind, (counts.get(d.kind) ?? 0) + 1);
    return (Object.keys(KIND_META) as DocumentKind[]).filter(k => (counts.get(k) ?? 0) > 0);
  }, [activeDocs]);

  /* derived filtered / sorted list --------------------------------- */
  const filtered = useMemo(() => {
    let list = [...docs];

    if (kindFilter !== 'all') list = list.filter(d => d.kind === kindFilter);
    if (statusFilter !== 'all') list = list.filter(d => d.status === statusFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.title.toLowerCase().includes(q) ||
        getDocumentPreview(d).toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      switch (sort) {
        case 'newest':    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'oldest':    return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case 'title_asc': return a.title.localeCompare(b.title);
        case 'title_desc': return b.title.localeCompare(a.title);
      }
    });

    return list;
  }, [docs, kindFilter, statusFilter, search, sort]);

  /* derived filtered / sorted shared list -------------------------- */
  const filteredShared = useMemo(() => {
    let list = [...sharedDocs];

    if (kindFilter !== 'all') list = list.filter(d => d.kind === kindFilter);
    if (statusFilter !== 'all') list = list.filter(d => d.status === statusFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.title.toLowerCase().includes(q) ||
        getDocumentPreview(d).toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      switch (sort) {
        case 'newest':    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'oldest':    return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case 'title_asc': return a.title.localeCompare(b.title);
        case 'title_desc': return b.title.localeCompare(a.title);
      }
    });

    return list;
  }, [sharedDocs, kindFilter, statusFilter, search, sort]);

  /* handlers ------------------------------------------------------- */
  const handleDelete = async () => {
    if (!token || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDocument(token, deleteTarget.id);
      setDeleteTarget(null);
      refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
    setDeleting(false);
  };

  const handleDownload = async (doc: DocumentRead) => {
    if (!token) return;
    try {
      await downloadDocument(token, doc.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Download failed');
    }
  };

  const handleTogglePin = async (doc: DocumentRead) => {
    if (!token) return;
    try {
      await pinDocument(token, doc.id, !doc.is_pinned);
      refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Pin update failed');
    }
  };

  /* empty-state label ---------------------------------------------- */
  const emptyLabel = useMemo(() => {
    if (search) return 'No matching documents';
    if (kindFilter !== 'all') return `No ${KIND_META[kindFilter].label.toLowerCase()} documents`;
    if (statusFilter !== 'all') return `No ${STATUS_META[statusFilter].label.toLowerCase()} documents`;
    return 'No documents yet';
  }, [search, kindFilter, statusFilter]);

  /* palette ref for accent helper ---------------------------------- */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pal = theme.palette as any;

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */
  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')} role="alert">{error}</Alert>
      )}

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <Tabs
        value={tab}
        onChange={(_, v: 'my' | 'shared') => setTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        aria-label="Document tabs"
      >
        <Tab label="My Documents" value="my" />
        <Tab label="Shared with Me" value="shared" />
      </Tabs>

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small" placeholder="Search documents…" value={search}
          onChange={e => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              'aria-label': 'Search documents',
            },
          }}
          sx={{ minWidth: 220, flex: { xs: '1 1 100%', sm: '0 1 280px' } }}
        />

        {/* Kind chips */}
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
          <Chip
            size="small" label="All"
            variant={kindFilter === 'all' ? 'filled' : 'outlined'}
            color={kindFilter === 'all' ? 'primary' : 'default'}
            onClick={() => setKindFilter('all')}
            sx={{ fontWeight: kindFilter === 'all' ? 600 : 400, cursor: 'pointer' }}
          />
          {availableKinds.map(k => (
            <Chip
              key={k} size="small" label={KIND_META[k].label}
              variant={kindFilter === k ? 'filled' : 'outlined'}
              color={kindFilter === k ? 'primary' : 'default'}
              onClick={() => setKindFilter(k)}
              sx={{ fontWeight: kindFilter === k ? 600 : 400, cursor: 'pointer' }}
            />
          ))}
        </Stack>

        {/* Status chips */}
        <Stack direction="row" spacing={0.5}>
          <Chip
            size="small" label="All"
            variant={statusFilter === 'all' ? 'filled' : 'outlined'}
            color={statusFilter === 'all' ? 'primary' : 'default'}
            onClick={() => setStatusFilter('all')}
            sx={{ fontWeight: statusFilter === 'all' ? 600 : 400, cursor: 'pointer' }}
          />
          {(Object.keys(STATUS_META) as DocumentStatus[]).map(s => (
            <Chip
              key={s} size="small" label={STATUS_META[s].label}
              variant={statusFilter === s ? 'filled' : 'outlined'}
              color={statusFilter === s ? 'primary' : 'default'}
              onClick={() => setStatusFilter(s)}
              sx={{ fontWeight: statusFilter === s ? 600 : 400, cursor: 'pointer' }}
            />
          ))}
        </Stack>

        <Box sx={{ flex: 1 }} />

        {/* Upload PDF */}
        <Button
          size="small" variant="outlined" startIcon={<CloudUploadIcon />}
          onClick={() => setUploadOpen(true)}
          aria-label="Upload PDF"
        >
          Upload PDF
        </Button>

        {/* Sort */}
        <Tooltip title="Sort">
          <Chip
            icon={<SortIcon sx={{ fontSize: 16 }} />} size="small" variant="outlined"
            label={SORT_LABELS[sort]}
            onClick={e => setSortAnchor(e.currentTarget)}
            sx={{ cursor: 'pointer', fontWeight: 500 }}
            aria-label="Sort documents"
          />
        </Tooltip>
        <Menu
          anchorEl={sortAnchor} open={Boolean(sortAnchor)}
          onClose={() => setSortAnchor(null)}
          slotProps={{ paper: { sx: { mt: 1 } } }}
        >
          {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([key, label]) => (
            <MenuItem key={key} selected={sort === key} onClick={() => { setSort(key); setSortAnchor(null); }}>
              {label}
            </MenuItem>
          ))}
        </Menu>
      </Stack>

      {/* ── Grid ────────────────────────────────────────────────── */}
      {(tab === 'my' ? loading : sharedLoading) ? (
        <Grid container spacing={2.5} aria-busy="true" aria-label="Loading documents">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={i}>
              <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : (tab === 'my' ? filtered : filteredShared).length === 0 ? (
        <Box sx={{
          textAlign: 'center', py: 10,
          border: `1.5px dashed ${alpha(theme.palette.divider, 0.4)}`,
          borderRadius: 4,
        }}>
          <Box sx={{
            width: 72, height: 72, mx: 'auto', mb: 2.5, borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: softBrandGradient(theme, {
              startTone: 'main',
              endTone: 'main',
              startOpacity: 0.15,
              endOpacity: 0.15,
            }),
          }}>
            <NoteAddIcon sx={{ fontSize: 36, color: 'primary.main' }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{tab === 'shared' ? 'No shared documents' : emptyLabel}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 360, mx: 'auto' }}>
            {tab === 'shared'
              ? 'Documents shared with you will appear here.'
              : search
                ? 'Try a different search term or create a new document.'
                : 'Create your first document to start building your professional profile with Baldin.'}
          </Typography>
          {tab === 'my' && !search && kindFilter === 'all' && statusFilter === 'all' && (
            <Button
              variant="contained" size="small" startIcon={<AddIcon />}
              onClick={() => navigate('/workspace/new')}
              sx={{ mt: 3 }}
              aria-label="Create new document"
            >
              New Document
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {(tab === 'my' ? filtered : filteredShared).map(doc => {
            const accent = accentForKind(doc.kind, pal);
            const meta = KIND_META[doc.kind] ?? KIND_META.freeform;
            const statusMeta = STATUS_META[doc.status] ?? STATUS_META.draft;
            const preview = getDocumentPreview(doc).slice(0, 200);
            const isShared = tab === 'shared';
            const viewerRole = (doc as DocumentRead).viewer_role;
            const ownerLabel = formatPersonLabel(doc.owner_full_name, doc.owner_email, 'Document owner');
            const ownerSecondary = formatPersonSecondary(doc.owner_full_name, doc.owner_email);
            const sharedByLabel = formatPersonLabel(doc.shared_by_full_name, doc.shared_by_email, 'Unknown sharer');
            const hasSourceFile = Boolean(doc.head_version?.source_file);

            return (
              <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={doc.id}>
                <Card
                  sx={{
                    position: 'relative', height: '100%', display: 'flex', flexDirection: 'column',
                    borderLeft: `3px solid ${alpha(accent, 0.5)}`,
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      borderLeftColor: accent,
                      boxShadow: `0 8px 24px ${alpha(accent, 0.12)}`,
                    },
                    '& .doc-actions': { opacity: { xs: 1, md: 0 }, transition: 'opacity 0.15s ease' },
                    '@media (hover: hover)': { '&:hover .doc-actions': { opacity: 1 } },
                  }}
                  onClick={() => navigate(`/workspace/${doc.id}`)}
                  role="article"
                  aria-label={`Document: ${doc.title}`}
                >
                  <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* header */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                      <Box sx={{
                        width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: alpha(accent, 0.1),
                        color: accent,
                      }}>
                        {meta.icon}
                      </Box>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.3 }} noWrap>
                            {doc.title || 'Untitled'}
                          </Typography>
                          {doc.is_pinned && (
                            <PushPinIcon sx={{ fontSize: 14, color: accent, transform: 'rotate(45deg)' }} />
                          )}
                        </Box>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                          <Chip
                            size="small" variant="outlined" label={meta.label}
                            sx={{
                              height: 20, fontSize: '0.68rem', fontWeight: 600,
                              borderColor: alpha(accent, 0.3), color: accent,
                            }}
                          />
                          <Chip
                            size="small" label={statusMeta.label} color={statusMeta.color}
                            sx={{ height: 20, fontSize: '0.68rem' }}
                          />
                          {hasSourceFile && (
                            <Chip
                              size="small"
                              label="PDF Import"
                              variant="outlined"
                              color="info"
                              sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                            />
                          )}
                          {isShared && viewerRole && (
                            <Chip
                              size="small" label={`Shared · ${viewerRole.charAt(0).toUpperCase() + viewerRole.slice(1)}`}
                              color="info" variant="outlined"
                              sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                            />
                          )}
                        </Stack>
                      </Box>
                    </Box>

                    {/* preview */}
                    {preview && (
                      <Typography
                        variant="body2" color="text.secondary" sx={{
                          mb: 1.5, flex: 1, overflow: 'hidden', display: '-webkit-box',
                          WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                          fontSize: '0.8rem', lineHeight: 1.5,
                        }}
                      >
                        {preview}{getDocumentPreview(doc).length > 200 ? '…' : ''}
                      </Typography>
                    )}

                    {isShared && (
                      <Box
                        sx={{
                          mb: 1.5,
                          p: 1.25,
                          borderRadius: 2,
                          background: alpha(theme.palette.info.main, 0.05),
                          border: `1px solid ${alpha(theme.palette.info.main, 0.14)}`,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Owner
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                          {ownerLabel}
                        </Typography>
                        {ownerSecondary && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                            {ownerSecondary}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }} noWrap>
                          Shared by {sharedByLabel}
                          {doc.shared_at ? ` · ${relativeTime(doc.shared_at)}` : ''}
                        </Typography>
                        {doc.share_updated_at && doc.share_updated_at !== doc.shared_at && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                            Access updated {relativeTime(doc.share_updated_at)}
                          </Typography>
                        )}
                      </Box>
                    )}

                    {/* footer */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto', pt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        v{doc.version_count ?? 0} · {relativeTime(doc.updated_at)}
                      </Typography>

                      <Stack direction="row" spacing={0.25} className="doc-actions">
                        <Tooltip title="View">
                          <IconButton
                            size="small" aria-label="View document"
                            onClick={e => { e.stopPropagation(); navigate(`/workspace/${doc.id}`); }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={viewerRole === 'viewer' ? 'View-only access' : 'Edit'}>
                          <span>
                            <IconButton
                              size="small" aria-label="Edit document"
                              disabled={viewerRole === 'viewer'}
                              onClick={e => { e.stopPropagation(); navigate(`/workspace/${doc.id}/edit`); }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Download">
                          <IconButton
                            size="small" aria-label="Download document"
                            onClick={e => { e.stopPropagation(); handleDownload(doc); }}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <span>
                          <IconButton
                            size="small" aria-label="Delete document"
                            disabled={isShared}
                            onClick={e => { e.stopPropagation(); setDeleteTarget(doc); }}
                            sx={{ '&:hover': { color: 'error.main' } }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* ── FAB ─────────────────────────────────────────────────── */}
      {(loading || docs.length > 0) && (
        <Fab
          color="primary"
          onClick={() => navigate('/workspace/new')}
          aria-label="Create new document"
          sx={{ position: 'fixed', bottom: 32, right: 32 }}
        >
          <AddIcon />
        </Fab>
      )}

      {/* ── Upload dialog ──────────────────────────────────────── */}
      <UploadDocumentDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={(doc) => { setUploadOpen(false); navigate(`/workspace/${doc.id}`); }}
      />

      {/* ── Delete dialog ───────────────────────────────────────── */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete document?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete <strong>{deleteTarget?.title || 'this document'}</strong>?
            This action cannot be undone and all versions will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting} aria-label="Cancel delete">
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting} aria-label="Confirm delete">
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentListPage;
