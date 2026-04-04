import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Stack, Button, useTheme, alpha,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Tooltip, Skeleton, Alert, InputAdornment, Menu, MenuItem, Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Description as DocIcon, Download as DownloadIcon, Delete as DeleteIcon,
  Edit as EditIcon, Add as AddIcon, Refresh as RefreshIcon, Article as ResumeIcon,
  Mail as LetterIcon, Search as SearchIcon, Visibility as ViewIcon,
  AutoAwesome as AIIcon, ContentCopy as CopyIcon, Warning as WarningIcon,
  NoteAdd as NoteAddIcon, SortByAlpha as SortIcon,
} from '@mui/icons-material';
import { UserContext } from '../context/user-context';
import {
  getResumes, createResume, updateResume, deleteResume, downloadResume,
  type ResumeRead, type ResumeCreate, type ResumeUpdate,
} from '../service/resumes';
import {
  getCoverLetters, createCoverLetter, updateCoverLetter, deleteCoverLetter,
  downloadCoverLetter, type CoverLetterRead, type CoverLetterCreate, type CoverLetterUpdate,
} from '../service/cover-letters';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type DocType = 'resume' | 'cover_letter';
type CategoryFilter = 'all' | 'resumes' | 'cover_letters';
type SortOption = 'newest' | 'oldest' | 'name_asc' | 'name_desc';

interface DocumentItem {
  id: string;
  name?: string | null;
  content?: string | null;
  content_type?: string | null;
  created_at: string;
  updated_at: string;
  docType: DocType;
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
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

function wordCount(text: string | null | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const CONTENT_TYPE_META: Record<string, { label: string; color: 'default' | 'primary' | 'secondary' }> = {
  custom:    { label: 'Custom',    color: 'default' },
  generated: { label: 'AI Generated', color: 'secondary' },
  template:  { label: 'Template',  color: 'primary' },
};

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest first', oldest: 'Oldest first', name_asc: 'Name A–Z', name_desc: 'Name Z–A',
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

const DocumentsPage: React.FC = () => {
  const theme = useTheme();
  const { token } = useContext(UserContext);

  /* ---- data state ------------------------------------------------ */
  const [resumes, setResumes] = useState<ResumeRead[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetterRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* ---- filter / sort state --------------------------------------- */
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);

  /* ---- create menu state ----------------------------------------- */
  const [createAnchor, setCreateAnchor] = useState<null | HTMLElement>(null);

  /* ---- editor state ---------------------------------------------- */
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorDocType, setEditorDocType] = useState<DocType>('resume');
  const [editorData, setEditorData] = useState<{ id?: string; name: string; content: string; content_type: string }>({
    name: '', content: '', content_type: 'custom',
  });

  /* ---- viewer state ---------------------------------------------- */
  const [viewerDoc, setViewerDoc] = useState<DocumentItem | null>(null);

  /* ---- delete confirmation state --------------------------------- */
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);

  /* ---- data fetching --------------------------------------------- */
  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [r, cl] = await Promise.all([getResumes(token), getCoverLetters(token)]);
      setResumes(r ?? []);
      setCoverLetters(cl ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load documents');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  /* ---- derived list ---------------------------------------------- */
  const documents: DocumentItem[] = useMemo(() => {
    const mapped: DocumentItem[] = [
      ...resumes.map((r): DocumentItem => ({ ...r, docType: 'resume' })),
      ...coverLetters.map((c): DocumentItem => ({ ...c, docType: 'cover_letter' })),
    ];

    let filtered = mapped;
    if (category === 'resumes') filtered = filtered.filter(d => d.docType === 'resume');
    if (category === 'cover_letters') filtered = filtered.filter(d => d.docType === 'cover_letter');

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(d =>
        (d.name ?? '').toLowerCase().includes(q) || (d.content ?? '').toLowerCase().includes(q),
      );
    }

    filtered.sort((a, b) => {
      switch (sort) {
        case 'newest':   return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'oldest':   return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case 'name_asc': return (a.name ?? '').localeCompare(b.name ?? '');
        case 'name_desc': return (b.name ?? '').localeCompare(a.name ?? '');
      }
    });
    return filtered;
  }, [resumes, coverLetters, category, search, sort]);

  /* ---- handlers -------------------------------------------------- */
  const handleSave = async () => {
    if (!token) return;
    const payload = { name: editorData.name, content: editorData.content, content_type: editorData.content_type };
    try {
      if (editorDocType === 'resume') {
        if (editorData.id) await updateResume(token, editorData.id, payload as ResumeUpdate);
        else await createResume(token, payload as ResumeCreate);
      } else {
        if (editorData.id) await updateCoverLetter(token, editorData.id, payload as CoverLetterUpdate);
        else await createCoverLetter(token, payload as CoverLetterCreate);
      }
      setEditorOpen(false);
      refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteTarget) return;
    try {
      if (deleteTarget.docType === 'resume') await deleteResume(token, deleteTarget.id);
      else await deleteCoverLetter(token, deleteTarget.id);
      setDeleteTarget(null);
      refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const handleDownload = async (doc: DocumentItem) => {
    if (!token) return;
    try {
      if (doc.docType === 'resume') await downloadResume(token, doc.id);
      else await downloadCoverLetter(token, doc.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Download failed');
    }
  };

  const openEditor = (docType: DocType, doc?: DocumentItem) => {
    setEditorDocType(docType);
    setEditorData(doc
      ? { id: doc.id, name: doc.name ?? '', content: doc.content ?? '', content_type: doc.content_type ?? 'custom' }
      : { name: '', content: '', content_type: 'custom' },
    );
    setEditorOpen(true);
  };

  /* ---- accent helpers -------------------------------------------- */
  const accentColor = (docType: DocType) =>
    docType === 'resume' ? theme.palette.primary.main : theme.palette.secondary.main;

  const typeLabel = (docType: DocType) =>
    docType === 'resume' ? 'Resume' : 'Cover Letter';

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <Box>
      {/* ── Page header ─────────────────────────────────────────── */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
              Documents Studio
              <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', display: 'inline-block' }} />
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {resumes.length} resume{resumes.length !== 1 ? 's' : ''} · {coverLetters.length} cover letter{coverLetters.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Tooltip title="Refresh">
              <IconButton onClick={refresh} size="small" sx={{ border: `1px solid ${theme.palette.divider}` }}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained" startIcon={<AddIcon />}
              onClick={e => setCreateAnchor(e.currentTarget)}
            >
              New document
            </Button>
            <Menu
              anchorEl={createAnchor} open={Boolean(createAnchor)}
              onClose={() => setCreateAnchor(null)}
              slotProps={{ paper: { sx: { mt: 1, minWidth: 180 } } }}
            >
              <MenuItem onClick={() => { setCreateAnchor(null); openEditor('resume'); }}>
                <ResumeIcon fontSize="small" sx={{ mr: 1.5, color: 'primary.main' }} /> New Resume
              </MenuItem>
              <MenuItem onClick={() => { setCreateAnchor(null); openEditor('cover_letter'); }}>
                <LetterIcon fontSize="small" sx={{ mr: 1.5, color: 'secondary.main' }} /> New Cover Letter
              </MenuItem>
            </Menu>
          </Stack>
        </Box>

        {error && <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>{error}</Alert>}

        {/* ── Toolbar ───────────────────────────────────────────── */}
        <Stack direction="row" spacing={1.5} sx={{ mt: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small" placeholder="Search documents…" value={search}
            onChange={e => setSearch(e.target.value)}
            slotProps={{ input: {
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment>,
            } }}
            sx={{ minWidth: 220, flex: { xs: '1 1 100%', sm: '0 1 280px' } }}
          />

          <Stack direction="row" spacing={0.5}>
            {(['all', 'resumes', 'cover_letters'] as CategoryFilter[]).map(cat => (
              <Chip
                key={cat} size="small"
                label={cat === 'all' ? 'All' : cat === 'resumes' ? 'Resumes' : 'Cover Letters'}
                variant={category === cat ? 'filled' : 'outlined'}
                color={category === cat ? 'primary' : 'default'}
                onClick={() => setCategory(cat)}
                sx={{ fontWeight: 600, cursor: 'pointer' }}
              />
            ))}
          </Stack>

          <Box sx={{ flex: 1 }} />

          <Tooltip title="Sort">
            <Chip
              icon={<SortIcon sx={{ fontSize: 16 }} />} size="small" variant="outlined"
              label={SORT_LABELS[sort]}
              onClick={e => setSortAnchor(e.currentTarget)}
              sx={{ cursor: 'pointer', fontWeight: 500 }}
            />
          </Tooltip>
          <Menu anchorEl={sortAnchor} open={Boolean(sortAnchor)} onClose={() => setSortAnchor(null)}
            slotProps={{ paper: { sx: { mt: 1 } } }}
          >
            {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([key, label]) => (
              <MenuItem key={key} selected={sort === key} onClick={() => { setSort(key); setSortAnchor(null); }}>
                {label}
              </MenuItem>
            ))}
          </Menu>
        </Stack>
      </Box>

      {/* ── Document grid ───────────────────────────────────────── */}
      {loading ? (
        <Grid container spacing={2.5}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={i}>
              <Skeleton variant="rounded" height={190} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : documents.length === 0 ? (
        /* ── Empty state ────────────────────────────────────────── */
        <Box sx={{
          textAlign: 'center', py: 10,
          border: `1.5px dashed ${alpha(theme.palette.divider, 0.4)}`,
          borderRadius: 4,
        }}>
          <Box sx={{
            width: 72, height: 72, mx: 'auto', mb: 2.5, borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.15)}, ${alpha(theme.palette.secondary.main, 0.15)})`,
          }}>
            <NoteAddIcon sx={{ fontSize: 36, color: 'primary.main' }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {search ? 'No matching documents' : category === 'resumes' ? 'No resumes yet' : category === 'cover_letters' ? 'No cover letters yet' : 'No documents yet'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 360, mx: 'auto' }}>
            {search
              ? 'Try a different search term or create a new document.'
              : 'Create your first document to start building your professional profile with Baldin.'}
          </Typography>
          {!search && (
            <Stack direction="row" spacing={1} sx={{ mt: 3, justifyContent: 'center' }}>
              <Button variant="contained" size="small" startIcon={<ResumeIcon />} onClick={() => openEditor('resume')}>
                New Resume
              </Button>
              <Button variant="outlined" size="small" startIcon={<LetterIcon />} onClick={() => openEditor('cover_letter')}>
                New Cover Letter
              </Button>
            </Stack>
          )}
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {documents.map(doc => {
            const accent = accentColor(doc.docType);
            const ctMeta = CONTENT_TYPE_META[doc.content_type ?? 'custom'] ?? CONTENT_TYPE_META.custom;
            const words = wordCount(doc.content);

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
                    '& .doc-actions': { opacity: { xs: 1, sm: 0.4 }, transition: 'opacity 0.15s ease' },
                    '&:hover .doc-actions': { opacity: 1 },
                  }}
                  onClick={() => setViewerDoc(doc)}
                >
                  <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* card header */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                      <Box sx={{
                        width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: alpha(accent, 0.1),
                      }}>
                        {doc.docType === 'resume'
                          ? <ResumeIcon sx={{ color: accent, fontSize: 22 }} />
                          : <LetterIcon sx={{ color: accent, fontSize: 22 }} />}
                      </Box>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.3 }} noWrap>
                          {doc.name || 'Untitled'}
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                          <Chip
                            size="small" variant="outlined"
                            label={typeLabel(doc.docType)}
                            sx={{
                              height: 20, fontSize: '0.68rem', fontWeight: 600,
                              borderColor: alpha(accent, 0.3), color: accent,
                            }}
                          />
                          <Chip
                            size="small" color={ctMeta.color}
                            label={ctMeta.label}
                            icon={doc.content_type === 'generated' ? <AIIcon sx={{ fontSize: '14px !important' }} /> : undefined}
                            sx={{ height: 20, fontSize: '0.68rem' }}
                          />
                        </Stack>
                      </Box>
                    </Box>

                    {/* content preview */}
                    <Typography
                      variant="body2" color="text.secondary"
                      sx={{
                        flex: 1, lineHeight: 1.6, fontSize: '0.82rem',
                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                        overflow: 'hidden', mb: 2,
                      }}
                    >
                      {doc.content ? doc.content.substring(0, 200) : 'No content'}
                    </Typography>

                    {/* card footer */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 'auto' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {relativeTime(doc.updated_at)}
                        {words > 0 && <>&nbsp;·&nbsp;{words} word{words !== 1 ? 's' : ''}</>}
                      </Typography>
                      <Stack direction="row" spacing={0} className="doc-actions">
                        <Tooltip title="Download PDF">
                          <IconButton size="small" onClick={e => { e.stopPropagation(); handleDownload(doc); }}>
                            <DownloadIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={e => { e.stopPropagation(); openEditor(doc.docType, doc); }}>
                            <EditIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={e => { e.stopPropagation(); setDeleteTarget(doc); }}>
                            <DeleteIcon sx={{ fontSize: 18, color: theme.palette.error.main }} />
                          </IconButton>
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

      {/* ── Viewer dialog ───────────────────────────────────────── */}
      <Dialog
        open={Boolean(viewerDoc)} onClose={() => setViewerDoc(null)}
        maxWidth="md" fullWidth
        slotProps={{ paper: { sx: { maxHeight: '85vh' } } }}
      >
        {viewerDoc && (() => {
          const accent = accentColor(viewerDoc.docType);
          const ctMeta = CONTENT_TYPE_META[viewerDoc.content_type ?? 'custom'] ?? CONTENT_TYPE_META.custom;
          const words = wordCount(viewerDoc.content);

          return (
            <>
              <DialogTitle sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box sx={{
                    width: 48, height: 48, borderRadius: '14px', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: alpha(accent, 0.1),
                  }}>
                    {viewerDoc.docType === 'resume'
                      ? <ResumeIcon sx={{ color: accent }} />
                      : <LetterIcon sx={{ color: accent }} />}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                      {viewerDoc.name || 'Untitled'}
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                      <Chip size="small" variant="outlined" label={typeLabel(viewerDoc.docType)}
                        sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600, borderColor: alpha(accent, 0.3), color: accent }}
                      />
                      <Chip size="small" color={ctMeta.color} label={ctMeta.label}
                        icon={viewerDoc.content_type === 'generated' ? <AIIcon sx={{ fontSize: '14px !important' }} /> : undefined}
                        sx={{ height: 22, fontSize: '0.72rem' }}
                      />
                      <Chip size="small" variant="outlined" label={`${words} word${words !== 1 ? 's' : ''}`}
                        sx={{ height: 22, fontSize: '0.72rem' }}
                      />
                    </Stack>
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                  Created {relativeTime(viewerDoc.created_at)}
                  {viewerDoc.updated_at !== viewerDoc.created_at && <> · Updated {relativeTime(viewerDoc.updated_at)}</>}
                </Typography>
              </DialogTitle>
              <Divider />
              <DialogContent>
                <Typography
                  variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: '0.95rem', py: 1 }}
                >
                  {viewerDoc.content || 'This document has no content yet.'}
                </Typography>
              </DialogContent>
              <Divider />
              <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
                <Tooltip title="Copy to clipboard">
                  <IconButton size="small" onClick={() => { navigator.clipboard.writeText(viewerDoc.content ?? ''); }}>
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Stack direction="row" spacing={1}>
                  <Button size="small" startIcon={<DownloadIcon />} onClick={() => handleDownload(viewerDoc)}>
                    Download
                  </Button>
                  <Button size="small" startIcon={<EditIcon />}
                    onClick={() => { setViewerDoc(null); openEditor(viewerDoc.docType, viewerDoc); }}
                  >
                    Edit
                  </Button>
                  <Button variant="contained" size="small" onClick={() => setViewerDoc(null)}>
                    Close
                  </Button>
                </Stack>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>

      {/* ── Editor dialog ───────────────────────────────────────── */}
      <Dialog
        open={editorOpen} onClose={() => setEditorOpen(false)}
        maxWidth="md" fullWidth
        slotProps={{ paper: { sx: { maxHeight: '90vh' } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editorData.id ? 'Edit' : 'Create'} {typeLabel(editorDocType)}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              fullWidth label="Document name" autoFocus
              placeholder={editorDocType === 'resume' ? 'e.g. Software Engineer Resume v2' : 'e.g. Google Cover Letter — SWE'}
              value={editorData.name}
              onChange={e => setEditorData(prev => ({ ...prev, name: e.target.value }))}
            />
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Content type
              </Typography>
              <Stack direction="row" spacing={0.75}>
                {(['custom', 'template', 'generated'] as const).map(ct => {
                  const meta = CONTENT_TYPE_META[ct];
                  return (
                    <Chip
                      key={ct} label={meta.label} size="small"
                      variant={editorData.content_type === ct ? 'filled' : 'outlined'}
                      color={editorData.content_type === ct ? meta.color : 'default'}
                      icon={ct === 'generated' ? <AIIcon sx={{ fontSize: '16px !important' }} /> : undefined}
                      onClick={() => setEditorData(prev => ({ ...prev, content_type: ct }))}
                      sx={{ cursor: 'pointer', fontWeight: 600 }}
                    />
                  );
                })}
              </Stack>
            </Box>
            <TextField
              fullWidth label="Content" multiline minRows={14} maxRows={24}
              placeholder="Paste or write your document content here…"
              value={editorData.content}
              onChange={e => setEditorData(prev => ({ ...prev, content: e.target.value }))}
              sx={{ '& .MuiInputBase-input': { lineHeight: 1.7, fontSize: '0.93rem' } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">
            {wordCount(editorData.content)} words · {editorData.content.length} characters
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleSave} disabled={!editorData.name.trim()}>
              {editorData.id ? 'Save changes' : 'Create'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* ── Delete confirmation ─────────────────────────────────── */}
      <Dialog
        open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}
        maxWidth="xs" fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <WarningIcon color="error" /> Delete document
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete <strong>{deleteTarget?.name || 'Untitled'}</strong>?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentsPage;
