import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Chip, Stack, Button, useTheme, alpha, TextField,
  Alert, Paper, Divider, List, ListItemButton, ListItemText, MenuItem,
  Select, FormControl, InputLabel, type SelectChangeEvent,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ArrowBack as BackIcon, Save as SaveIcon,
  Article as ResumeIcon, Mail as LetterIcon, Replay as FollowUpIcon,
  MenuBook as RefSheetIcon, TextSnippet as FreeformIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { UserContext } from '../../context/user-context';
import { usePageToolbarHeader } from '../../layout/toolbar-header-context';
import RichTextEditor, { type ContentFormat } from '../../component/rich-text-editor';
import { normalizeDocumentContent } from '../../component/document-content';
import {
  getDocument, createDocument, createVersion, getVersions,
  type DocumentDetailRead, type DocumentVersionRead, type DocumentKind,
  type DocumentCreate, type DocumentVersionCreate,
} from '../../service/documents';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const KIND_OPTIONS: { value: DocumentKind; label: string; icon: React.ReactElement }[] = [
  { value: 'resume',          label: 'Resume',          icon: <ResumeIcon fontSize="small" /> },
  { value: 'cover_letter',    label: 'Cover Letter',    icon: <LetterIcon fontSize="small" /> },
  { value: 'follow_up',       label: 'Follow-up',       icon: <FollowUpIcon fontSize="small" /> },
  { value: 'reference_sheet', label: 'Reference Sheet', icon: <RefSheetIcon fontSize="small" /> },
  { value: 'freeform',        label: 'Freeform',        icon: <FreeformIcon fontSize="small" /> },
];

const CONTENT_TYPE_OPTIONS = [
  { value: 'custom', label: 'Custom' },
  { value: 'generated', label: 'AI Generated' },
  { value: 'template', label: 'Template' },
];

const KIND_HINTS: Record<string, { placeholder: string; defaultContentType: string }> = {
  resume:          { placeholder: 'Paste or write your resume content…\n\nTip: Focus on quantifiable achievements and tailor to the target role.', defaultContentType: 'custom' },
  cover_letter:    { placeholder: 'Write your cover letter…\n\nDear Hiring Manager,\n\n', defaultContentType: 'custom' },
  follow_up:       { placeholder: 'Draft your follow-up message…\n\nHi [Name],\n\nI wanted to follow up on…', defaultContentType: 'custom' },
  reference_sheet: { placeholder: 'List your references…\n\nName | Title | Company | Email | Phone | Relationship', defaultContentType: 'custom' },
  freeform:        { placeholder: 'Start writing…', defaultContentType: 'custom' },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function wordCount(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatPersonLabel(fullName?: string | null, email?: string | null, fallback = 'Unknown user'): string {
  return fullName?.trim() || email?.trim() || fallback;
}

function formatCurrentUserName(user: { first_name?: string | null; last_name?: string | null; email?: string | null }): string {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return fullName || user.email || 'User';
}

function getSourceFileName(sourceFile?: string | null): string | null {
  if (!sourceFile) return null;
  const parts = sourceFile.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? sourceFile;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const DocumentEditorPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { token, user } = useContext(UserContext);

  const isCreate = !id;

  /* state ---------------------------------------------------------- */
  const [doc, setDoc] = useState<DocumentDetailRead | null>(null);
  const [versions, setVersions] = useState<DocumentVersionRead[]>([]);
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  /* form state ----------------------------------------------------- */
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<DocumentKind>('resume');
  const [content, setContent] = useState('');
  const [plainText, setPlainText] = useState('');
  const [contentType, setContentType] = useState('custom');
  const [contentFormat, setContentFormat] = useState<ContentFormat>('tiptap_json');
  const [changeSummary, setChangeSummary] = useState('');
  const [externalContentKey, setExternalContentKey] = useState(0);

  const headVersionNumber = doc?.head_version?.version_number ?? 0;
  const viewerRole = doc?.viewer_role;
  const isReadOnly = viewerRole === 'viewer';
  const isSharedEditor = viewerRole === 'editor';
  const collaborative = !isCreate && contentFormat === 'tiptap_json' && viewerRole !== 'viewer';
  const currentUserName = user ? formatCurrentUserName(user) : 'User';
  const ownerLabel = formatPersonLabel(doc?.owner_full_name, doc?.owner_email, 'Document owner');
  const sharedByLabel = formatPersonLabel(doc?.shared_by_full_name, doc?.shared_by_email, 'Unknown sharer');
  const sourceFileName = getSourceFileName(doc?.head_version?.source_file);

  usePageToolbarHeader(
    isCreate ? 'New Document' : `Editing: ${doc?.title ?? '…'}`,
    isCreate ? 'Create a new document' : `Editing v${headVersionNumber + 1} based on v${headVersionNumber}`,
  );

  const applyExternalContent = useCallback((nextContent: string | null | undefined, nextFormat: ContentFormat) => {
    const normalized = normalizeDocumentContent(nextContent, nextFormat);
    setContent(normalized.storedContent);
    setPlainText(normalized.plainText);
    setContentFormat(nextFormat);
    setExternalContentKey(currentKey => currentKey + 1);
  }, []);

  /* fetch for edit mode -------------------------------------------- */
  const loadDocument = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const [docData, versionsData] = await Promise.all([
        getDocument(token, id),
        getVersions(token, id),
      ]);
      setDoc(docData);
      setTitle(docData.title);
      setKind(docData.kind);
      setContentType(docData.head_version?.content_type ?? 'custom');
      applyExternalContent(
        docData.head_version?.content,
        docData.head_version?.content_format === 'tiptap_json' ? 'tiptap_json' : 'plain_text',
      );
      setVersions(versionsData.sort((a, b) => b.version_number - a.version_number));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load document');
    }
    setLoading(false);
  }, [token, id, applyExternalContent]);

  useEffect(() => {
    if (!isCreate) loadDocument();
  }, [isCreate, loadDocument]);

  /* handlers ------------------------------------------------------- */
  const handleSave = async () => {
    if (!token) return;
    if (!title.trim()) { setError('Title is required'); return; }

    setSaving(true);
    setError('');
    try {
      const persistedContent = contentFormat === 'plain_text' ? plainText : content;

      if (isCreate) {
        const payload: DocumentCreate & { content_format?: string } = {
          kind,
          title: title.trim(),
          content: persistedContent || undefined,
          content_type: contentType as DocumentCreate['content_type'],
          content_format: contentFormat,
        };
        const created = await createDocument(token, payload);
        navigate(`/me/documents/${created.id}`);
      } else {
        const payload: DocumentVersionCreate & { content_format?: string } = {
          content: persistedContent || undefined,
          content_type: contentType as DocumentVersionCreate['content_type'],
          change_summary: changeSummary.trim() || undefined,
          content_format: contentFormat,
        };
        await createVersion(token, id!, payload);
        navigate(`/me/documents/${id}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
    setSaving(false);
  };

  const handleLoadVersion = (v: DocumentVersionRead) => {
    setContentType(v.content_type ?? 'custom');
    applyExternalContent(v.content, v.content_format === 'tiptap_json' ? 'tiptap_json' : 'plain_text');
    setChangeSummary(`Reverted to v${v.version_number}`);
  };

  /* stats ---------------------------------------------------------- */
  const editorContent = contentFormat === 'plain_text' ? plainText : content;
  const words = useMemo(() => wordCount(plainText), [plainText]);
  const chars = plainText.length;

  /* loading state -------------------------------------------------- */
  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">Loading…</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 200px)' }}>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {!isCreate && sourceFileName && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This document was imported from the PDF {sourceFileName}. The original upload is available from the document detail page.
        </Alert>
      )}

      {isReadOnly && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have view-only access to this document.
        </Alert>
      )}

      {!isCreate && viewerRole && (
        <Paper
          variant="outlined"
          sx={{
            mb: 2,
            p: 2,
            background: alpha(theme.palette.info.main, 0.04),
            borderColor: alpha(theme.palette.info.main, 0.18),
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' }, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              color="info"
              variant="outlined"
              label={`Shared access · ${viewerRole === 'viewer' ? 'Viewer' : 'Editor'}`}
              sx={{ fontWeight: 700 }}
            />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Owner: {ownerLabel}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Shared by {sharedByLabel}
            </Typography>
            {doc?.shared_at && (
              <Typography variant="caption" color="text.secondary">
                Granted {formatDate(doc.shared_at)}
              </Typography>
            )}
            {doc?.share_updated_at && doc.share_updated_at !== doc.shared_at && (
              <Typography variant="caption" color="text.secondary">
                Access updated {formatDate(doc.share_updated_at)}
              </Typography>
            )}
          </Stack>
        </Paper>
      )}

      {collaborative && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Collaborative editing active — changes sync in real-time as {currentUserName}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ flex: 1 }}>
        {/* ── Main editor area ──────────────────────────────────── */}
        <Grid size={{ xs: 12, md: versions.length > 0 ? 9 : 12 }}>
          {/* Header */}
          <Paper sx={{ p: 2.5, mb: 2 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  fullWidth label="Title" value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Document title"
                  variant="outlined" size="small"
                  disabled={isReadOnly || isSharedEditor}
                  slotProps={{ input: { 'aria-label': 'Document title' } }}
                  sx={{ flex: 1, minWidth: 200 }}
                />
                {isCreate ? (
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel id="kind-label">Kind</InputLabel>
                    <Select
                      labelId="kind-label" label="Kind"
                      value={kind}
                      onChange={(e: SelectChangeEvent) => {
                        const newKind = e.target.value as DocumentKind;
                        setKind(newKind);
                        setContentType(KIND_HINTS[newKind]?.defaultContentType ?? 'custom');
                      }}
                      aria-label="Document kind"
                    >
                      {KIND_OPTIONS.map(opt => (
                        <MenuItem key={opt.value} value={opt.value}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            {opt.icon}
                            <span>{opt.label}</span>
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Chip
                    label={KIND_OPTIONS.find(k => k.value === kind)?.label ?? kind}
                    size="small" variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                )}
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel id="content-type-label">Content Type</InputLabel>
                  <Select
                    labelId="content-type-label" label="Content Type"
                    value={contentType}
                    onChange={(e: SelectChangeEvent) => setContentType(e.target.value)}
                    aria-label="Content type"
                  >
                    {CONTENT_TYPE_OPTIONS.map(opt => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              {isCreate && (
                  <ToggleButtonGroup
                    size="small" exclusive
                    value={contentFormat}
                    onChange={(_, val: ContentFormat | null) => { if (val) setContentFormat(val); }}
                    aria-label="Content format"
                  >
                    <ToggleButton value="tiptap_json" aria-label="Rich Text">Rich Text</ToggleButton>
                    <ToggleButton value="plain_text" aria-label="Plain Text">Plain Text</ToggleButton>
                  </ToggleButtonGroup>
                )}
                {!isCreate && (
                  <Chip
                    label={`Editing v${headVersionNumber + 1}`}
                    size="small" color="primary" variant="outlined"
                    sx={{ fontWeight: 700 }}
                  />
                )}
              </Box>
            </Stack>
          </Paper>

          {/* Content editor */}
          <RichTextEditor
            content={editorContent}
            contentFormat={contentFormat}
            externalContentKey={externalContentKey}
            readOnly={isReadOnly}
            onChange={(json, text) => {
              if (contentFormat === 'tiptap_json') {
                setContent(json);
                setPlainText(text);
              } else {
                setContent(text);
                setPlainText(text);
              }
            }}
            placeholder={KIND_HINTS[kind]?.placeholder ?? 'Start writing…'}
            minHeight="400px"
            collaborative={collaborative}
            documentId={id}
            token={token ?? undefined}
            collaborationUserName={currentUserName}
          />
        </Grid>

        {/* ── Sidebar: version history (edit mode only) ─────────── */}
        {!isCreate && versions.length > 0 && (
          <Grid size={{ xs: 12, md: 3 }}>
            <Paper sx={{ p: 2, position: 'sticky', top: 16 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Version History
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <List dense sx={{ maxHeight: 500, overflow: 'auto' }}>
                {versions.map(v => (
                  <ListItemButton
                    key={v.id}
                    onClick={() => handleLoadVersion(v)}
                    sx={{
                      borderRadius: 1, mb: 0.5,
                      border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                      '&:hover': { background: alpha(theme.palette.primary.main, 0.04) },
                    }}
                    aria-label={`Load version ${v.version_number}`}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          <Chip label={`v${v.version_number}`} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                          <Typography variant="caption" noWrap sx={{ flex: 1 }}>
                            {v.change_summary || v.name || ''}
                          </Typography>
                        </Stack>
                      }
                      secondary={formatDate(v.created_at)}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* ── Footer bar ──────────────────────────────────────────── */}
      <Paper
        sx={{
          mt: 3, p: 2,
          display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
          borderTop: `1px solid ${theme.palette.divider}`,
          position: 'sticky', bottom: 0,
          background: theme.palette.background.paper,
          zIndex: 10,
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 120 }}>
          {words.toLocaleString()} words · {chars.toLocaleString()} chars
        </Typography>

        {!isCreate && (
          <TextField
            size="small" placeholder="Change summary (optional)"
            value={changeSummary}
            onChange={e => setChangeSummary(e.target.value)}
            slotProps={{ input: { 'aria-label': 'Change summary' } }}
            sx={{ flex: 1, minWidth: 200, maxWidth: 400 }}
          />
        )}

        <Box sx={{ flex: 1 }} />

        <Button
          variant="outlined" onClick={() => navigate(isCreate ? '/me/documents' : `/me/documents/${id}`)}
          disabled={saving}
          startIcon={<BackIcon />}
          aria-label="Cancel editing"
        >
          Cancel
        </Button>
        <Button
          variant="contained" onClick={handleSave}
          disabled={saving || !title.trim() || isReadOnly}
          startIcon={<SaveIcon />}
          aria-label={isCreate ? 'Create document' : 'Save new version'}
        >
          {saving ? 'Saving…' : isCreate ? 'Create' : 'Save Version'}
        </Button>
      </Paper>
    </Box>
  );
};

export default DocumentEditorPage;
