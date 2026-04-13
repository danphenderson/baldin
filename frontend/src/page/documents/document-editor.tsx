import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  useTheme,
  alpha,
  TextField,
  Alert,
  Paper,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  type SelectChangeEvent,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { StatusChip as Chip } from '../../design-system';
import Grid from '@mui/material/Grid';
import type { Editor } from '@tiptap/core';
import {
  ArrowBack as BackIcon, Save as SaveIcon,
  Article as ResumeIcon, Mail as LetterIcon, Replay as FollowUpIcon,
  MenuBook as RefSheetIcon, TextSnippet as FreeformIcon,
  Description as CellDocIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { UserContext } from '../../context/user-context';
import { usePageToolbarHeader } from '../../layout/toolbar-header-context';
import RichTextEditor, {
  type ContentFormat,
  type RichTextEditorPlainTextSurfaceConfig,
} from '../../component/rich-text-editor';
import CellDocEditor from '../../component/cell-doc/cell-doc-editor';
import RerunAgentButton from '../../component/rerun-agent-button';
import {
  normalizeDocumentContent,
  plainTextToTiptapDocument,
} from '../../component/document-content';
import {
  AgentTaskComposer,
  createAgentTaskComposerDraft,
  type AgentSurfaceRunRecord,
  type AgentTaskComposerDraft,
  type AgentTaskComposerPendingAction,
  type AgentSurfaceApplyResult,
} from '../../component/agent-surface';
import type { AgentTaskEvent } from '../../component/cell-doc/extensions';
import {
  getDocument, createDocument, createVersion, getVersions,
  type DocumentDetailRead, type DocumentVersionRead, type DocumentKind,
  type DocumentCreate, type DocumentVersionCreate,
} from '../../service/documents';
import {
  applyAgentSurfaceRun,
  createAgentSurfaceRun,
  dismissAgentSurfaceRun,
  getFilteredAgentRuns,
} from '../../service/agents';

type DocumentTaskState = {
  taskId: string;
  surfaceKind: AgentTaskEvent['surfaceKind'];
  draft: AgentTaskComposerDraft;
  run: AgentSurfaceRunRecord | null;
  pendingAction: AgentTaskComposerPendingAction | null;
  errorMessage: string | null;
};

type LocatedAgentTaskNode = {
  nodeSize: number;
  pos: number;
};

function findAgentTaskNode(editor: Editor, taskId: string): LocatedAgentTaskNode | null {
  let match: LocatedAgentTaskNode | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'agentTask') return true;
    if (node.attrs.taskId !== taskId) return true;
    match = {
      nodeSize: node.nodeSize,
      pos,
    };
    return false;
  });

  return match;
}

function mapRunToTaskStatus(run: AgentSurfaceRunRecord): 'running' | 'completed' | 'failed' | 'applied' | 'dismissed' {
  if (run.apply_status === 'applied') return 'applied';
  if (run.apply_status === 'dismissed') return 'dismissed';
  if (run.status === 'failed') return 'failed';
  if (run.status === 'pending' || run.status === 'running') return 'running';
  return 'completed';
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const KIND_OPTIONS: { value: DocumentKind; label: string; icon: React.ReactElement }[] = [
  { value: 'resume',          label: 'Resume',          icon: <ResumeIcon fontSize="small" /> },
  { value: 'cover_letter',    label: 'Cover Letter',    icon: <LetterIcon fontSize="small" /> },
  { value: 'follow_up',       label: 'Follow-up',       icon: <FollowUpIcon fontSize="small" /> },
  { value: 'reference_sheet', label: 'Reference Sheet', icon: <RefSheetIcon fontSize="small" /> },
  { value: 'freeform',        label: 'Freeform',        icon: <FreeformIcon fontSize="small" /> },
  { value: 'cell_doc',        label: 'Cell Doc',        icon: <CellDocIcon fontSize="small" /> },
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
  cell_doc:        { placeholder: "Type '/' for commands", defaultContentType: 'custom' },
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
  const location = useLocation();
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
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [taskStates, setTaskStates] = useState<Record<string, DocumentTaskState>>({});

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

  const updateTaskState = useCallback((taskId: string, updater: (current: DocumentTaskState | undefined) => DocumentTaskState) => {
    setTaskStates((current) => ({
      ...current,
      [taskId]: updater(current[taskId]),
    }));
  }, []);

  const updateAgentTaskNode = useCallback((editor: Editor, taskId: string, attrs: Record<string, unknown>) => {
    const located = findAgentTaskNode(editor, taskId);
    if (!located) return;

    const node = editor.state.doc.nodeAt(located.pos);
    if (!node) return;

    const tr = editor.state.tr.setNodeMarkup(
      located.pos,
      undefined,
      {
        ...node.attrs,
        ...attrs,
      },
      node.marks,
    );
    editor.view.dispatch(tr);
  }, []);

  const loadLatestTaskRun = useCallback(async (editor: Editor, taskId: string) => {
    if (!token || !id) return;

    try {
      const response = await getFilteredAgentRuns(token, {
        source_document_id: id,
        source_route: location.pathname,
        source_anchor_id: taskId,
        page: 1,
        page_size: 1,
      });
      const latestRun = response.items[0] ?? null;
      if (!latestRun) return;

      updateTaskState(taskId, (current) => ({
        taskId,
        surfaceKind: current?.surfaceKind ?? 'rich_text_editor',
        draft: current?.draft ?? createAgentTaskComposerDraft(),
        run: latestRun,
        pendingAction: null,
        errorMessage: null,
      }));
      updateAgentTaskNode(editor, taskId, {
        status: mapRunToTaskStatus(latestRun),
        summary: latestRun.suggested_edit?.summary ?? latestRun.error_summary ?? null,
      });
    } catch {
      // Ignore best-effort recovery failures and keep the local task state.
    }
  }, [id, location.pathname, token, updateAgentTaskNode, updateTaskState]);

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

  const persistAppliedSuggestion = useCallback(async (
    editor: Editor,
    run: AgentSurfaceRunRecord,
  ): Promise<AgentSurfaceApplyResult> => {
    if (!token || !id) {
      throw new Error('Save the document before applying agent suggestions.');
    }

    const nextJson = JSON.stringify(editor.getJSON());
    const nextText = editor.getText();
    setContent(nextJson);
    setPlainText(nextText);

    const version = await createVersion(token, id, {
      content: nextJson || undefined,
      content_type: contentType as DocumentVersionCreate['content_type'],
      change_summary: changeSummary.trim() || run.suggested_edit?.summary || 'Applied agent task suggestion',
      content_format: 'tiptap_json',
    });

    setDoc((current) => (current ? { ...current, head_version: version } : current));
    setVersions((current) => [version, ...current.filter((item) => item.id !== version.id)]
      .sort((left, right) => right.version_number - left.version_number));

    return {
      sessionDocumentId: id,
      sessionVersionId: version.id,
    };
  }, [changeSummary, contentType, id, token]);

  const runDocumentTask = useCallback(async (
    taskId: string,
    surfaceKind: AgentTaskEvent['surfaceKind'],
    editor: Editor,
    payload: { agentId: string; agentName: string; promptText: string },
  ) => {
    if (!token || !id) {
      updateTaskState(taskId, (current) => ({
        taskId,
        surfaceKind,
        draft: current?.draft ?? createAgentTaskComposerDraft({ agentId: payload.agentId, promptText: payload.promptText }),
        run: current?.run ?? null,
        pendingAction: null,
        errorMessage: 'Save the document before running agent tasks.',
      }));
      return;
    }

    updateTaskState(taskId, (current) => ({
      taskId,
      surfaceKind,
      draft: {
        agentId: payload.agentId,
        promptText: payload.promptText,
      },
      run: current?.run ?? null,
      pendingAction: 'run',
      errorMessage: null,
    }));
    updateAgentTaskNode(editor, taskId, {
      agentId: payload.agentId,
      agentLabel: payload.agentName,
      promptText: payload.promptText,
      status: 'running',
      summary: null,
    });

    try {
      const createdRun = await createAgentSurfaceRun(token, payload.agentId, {
        surface_kind: surfaceKind,
        source_route: location.pathname,
        source_document_id: id,
        source_field_key: 'document_content',
        anchor_id: taskId,
        content_format: 'tiptap_json',
        surface_content: JSON.stringify(editor.getJSON()),
        entity_refs: [{
          kind: 'document',
          id,
          label: title.trim() || 'Document',
        }],
        prompt_text: payload.promptText.trim(),
        requested_apply_mode: 'insert_after_anchor',
      });

      updateTaskState(taskId, (current) => ({
        taskId,
        surfaceKind,
        draft: current?.draft ?? createAgentTaskComposerDraft({ agentId: payload.agentId, promptText: payload.promptText }),
        run: createdRun,
        pendingAction: null,
        errorMessage: null,
      }));
      updateAgentTaskNode(editor, taskId, {
        agentId: payload.agentId,
        agentLabel: payload.agentName,
        promptText: payload.promptText,
        status: mapRunToTaskStatus(createdRun),
        summary: createdRun.suggested_edit?.summary ?? createdRun.error_summary ?? null,
      });
    } catch (taskError) {
      const message = taskError instanceof Error ? taskError.message : 'Failed to run agent task.';
      updateTaskState(taskId, (current) => ({
        taskId,
        surfaceKind,
        draft: current?.draft ?? createAgentTaskComposerDraft({ agentId: payload.agentId, promptText: payload.promptText }),
        run: current?.run ?? null,
        pendingAction: null,
        errorMessage: message,
      }));
      updateAgentTaskNode(editor, taskId, {
        status: 'failed',
        summary: message,
      });
    }
  }, [id, location.pathname, title, token, updateAgentTaskNode, updateTaskState]);

  const applyDocumentTask = useCallback(async (
    taskId: string,
    surfaceKind: AgentTaskEvent['surfaceKind'],
    editor: Editor,
  ) => {
    const taskState = taskStates[taskId];
    const taskRun = taskState?.run;
    const suggestion = taskRun?.suggested_edit;

    if (!taskRun || !suggestion?.content || !token || !id) {
      updateTaskState(taskId, (current) => ({
        taskId,
        surfaceKind,
        draft: current?.draft ?? createAgentTaskComposerDraft(),
        run: current?.run ?? null,
        pendingAction: null,
        errorMessage: 'No suggested edit is available to apply.',
      }));
      return;
    }

    updateTaskState(taskId, (current) => ({
      taskId,
      surfaceKind,
      draft: current?.draft ?? createAgentTaskComposerDraft(),
      run: current?.run ?? null,
      pendingAction: 'apply',
      errorMessage: null,
    }));

    try {
      const located = findAgentTaskNode(editor, taskId);
      if (!located) {
        throw new Error('Unable to locate this agent task in the editor.');
      }

      const nextDoc = plainTextToTiptapDocument(suggestion.content);
      const nextContent = Array.isArray(nextDoc.content) ? nextDoc.content : [];
      editor.chain().focus().insertContentAt(located.pos + located.nodeSize, nextContent).run();

      const persisted = await persistAppliedSuggestion(editor, taskRun);
      const appliedRun = await applyAgentSurfaceRun(token, taskRun.id, {
        session_document_id: persisted.sessionDocumentId ?? undefined,
        session_version_id: persisted.sessionVersionId ?? undefined,
      });

      updateTaskState(taskId, (current) => ({
        taskId,
        surfaceKind,
        draft: current?.draft ?? createAgentTaskComposerDraft(),
        run: appliedRun,
        pendingAction: null,
        errorMessage: null,
      }));
      updateAgentTaskNode(editor, taskId, {
        status: 'applied',
        summary: appliedRun.suggested_edit?.summary ?? suggestion.summary ?? null,
      });
    } catch (taskError) {
      const message = taskError instanceof Error ? taskError.message : 'Failed to apply suggestion.';
      updateTaskState(taskId, (current) => ({
        taskId,
        surfaceKind,
        draft: current?.draft ?? createAgentTaskComposerDraft(),
        run: current?.run ?? null,
        pendingAction: null,
        errorMessage: message,
      }));
    }
  }, [id, persistAppliedSuggestion, taskStates, token, updateAgentTaskNode, updateTaskState]);

  const dismissDocumentTask = useCallback(async (
    taskId: string,
    surfaceKind: AgentTaskEvent['surfaceKind'],
    editor: Editor,
  ) => {
    const taskRun = taskStates[taskId]?.run;
    if (!taskRun || !token) {
      return;
    }

    updateTaskState(taskId, (current) => ({
      taskId,
      surfaceKind,
      draft: current?.draft ?? createAgentTaskComposerDraft(),
      run: current?.run ?? null,
      pendingAction: 'dismiss',
      errorMessage: null,
    }));

    try {
      const dismissedRun = await dismissAgentSurfaceRun(token, taskRun.id);
      updateTaskState(taskId, (current) => ({
        taskId,
        surfaceKind,
        draft: current?.draft ?? createAgentTaskComposerDraft(),
        run: dismissedRun,
        pendingAction: null,
        errorMessage: null,
      }));
      updateAgentTaskNode(editor, taskId, {
        status: 'dismissed',
        summary: dismissedRun.suggested_edit?.summary ?? taskRun.suggested_edit?.summary ?? null,
      });
    } catch (taskError) {
      const message = taskError instanceof Error ? taskError.message : 'Failed to dismiss suggestion.';
      updateTaskState(taskId, (current) => ({
        taskId,
        surfaceKind,
        draft: current?.draft ?? createAgentTaskComposerDraft(),
        run: current?.run ?? null,
        pendingAction: null,
        errorMessage: message,
      }));
    }
  }, [taskStates, token, updateAgentTaskNode, updateTaskState]);

  const handleAgentTaskEvent = useCallback((event: AgentTaskEvent) => {
    setActiveEditor(event.editor);
    setActiveTaskId(event.taskId);
    updateTaskState(event.taskId, (current) => ({
      taskId: event.taskId,
      surfaceKind: event.surfaceKind,
      draft: {
        agentId: event.task.agentId,
        promptText: event.task.promptText ?? '',
      },
      run: current?.run ?? null,
      pendingAction: current?.pendingAction ?? null,
      errorMessage: current?.errorMessage ?? null,
    }));

    if (!taskStates[event.taskId]?.run) {
      void loadLatestTaskRun(event.editor, event.taskId);
    }

    if (event.type === 'run_requested' && event.task.agentId && event.task.agentLabel) {
      void runDocumentTask(event.taskId, event.surfaceKind, event.editor, {
        agentId: event.task.agentId,
        agentName: event.task.agentLabel,
        promptText: event.task.promptText ?? '',
      });
    }

    if (event.type === 'apply_requested') {
      void applyDocumentTask(event.taskId, event.surfaceKind, event.editor);
    }

    if (event.type === 'dismiss_requested') {
      void dismissDocumentTask(event.taskId, event.surfaceKind, event.editor);
    }
  }, [applyDocumentTask, dismissDocumentTask, loadLatestTaskRun, runDocumentTask, taskStates, updateTaskState]);

  const activeTask = activeTaskId ? taskStates[activeTaskId] ?? null : null;
  const plainTextSurface = useMemo<RichTextEditorPlainTextSurfaceConfig | null>(() => {
    if (!id) return null;
    return {
      surfaceId: id,
      fieldKey: 'document_content',
      entityRefs: [{
        kind: 'document',
        id,
        label: title.trim() || 'Document',
      }],
      sourceRoute: location.pathname,
    };
  }, [id, location.pathname, title]);

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
        navigate(`/workspace/${created.id}`);
      } else {
        const payload: DocumentVersionCreate & { content_format?: string } = {
          content: persistedContent || undefined,
          content_type: contentType as DocumentVersionCreate['content_type'],
          change_summary: changeSummary.trim() || undefined,
          content_format: contentFormat,
        };
        await createVersion(token, id!, payload);
        navigate(`/workspace/${id}`);
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

      {/* ── Back link ── */}
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate(isCreate ? '/workspace' : `/workspace/${id}`)}
        sx={{ mb: 2, alignSelf: 'flex-start' }}
        aria-label={isCreate ? 'Back to workspace' : 'Back to document'}
      >
        {isCreate ? 'Back to Workspace' : 'Back to Document'}
      </Button>

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
                        if (newKind === 'cell_doc') setContentFormat('tiptap_json');
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
              {isCreate && kind !== 'cell_doc' && (
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
          {kind === 'cell_doc' ? (
            <Box>
              {/* Inline title — Notion-like heading-style title input */}
              <Box
                component="input"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                placeholder="Untitled"
                disabled={isReadOnly || isSharedEditor}
                aria-label="Document title"
                sx={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  ...theme.typography.h4,
                  fontWeight: 700,
                  mb: 1,
                  p: 0,
                  pl: '40px',
                  color: theme.palette.text.primary,
                  '&::placeholder': { color: theme.palette.text.disabled },
                  '&:disabled': { color: theme.palette.text.primary },
                }}
              />
              <CellDocEditor
                content={editorContent}
                onChange={(json, text) => { setContent(json); setPlainText(text); }}
                externalContentKey={externalContentKey}
                readOnly={isReadOnly}
                placeholder={KIND_HINTS[kind]?.placeholder}
                minHeight="400px"
                collaborative={collaborative}
                documentId={id}
                token={token ?? undefined}
                collaborationUserName={currentUserName}
                viewerRole={viewerRole}
                onEditorReady={setActiveEditor}
                onAgentTaskEvent={handleAgentTaskEvent}
              />
            </Box>
          ) : (
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
              onEditorReady={setActiveEditor}
              onAgentTaskEvent={handleAgentTaskEvent}
              plainTextSurface={plainTextSurface}
            />
          )}
          {activeTask && activeTaskId && activeEditor && (
            <Box sx={{ mt: 2 }}>
              <AgentTaskComposer
                draft={activeTask.draft}
                onDraftChange={(nextDraft) => {
                  updateTaskState(activeTaskId, (current) => ({
                    taskId: activeTaskId,
                    surfaceKind: current?.surfaceKind ?? 'rich_text_editor',
                    draft: nextDraft,
                    run: current?.run ?? null,
                    pendingAction: current?.pendingAction ?? null,
                    errorMessage: current?.errorMessage ?? null,
                  }));
                  updateAgentTaskNode(activeEditor, activeTaskId, {
                    agentId: nextDraft.agentId,
                    promptText: nextDraft.promptText,
                  });
                }}
                onRun={({ agent, draft }) => runDocumentTask(activeTaskId, activeTask.surfaceKind, activeEditor, {
                  agentId: agent.id,
                  agentName: agent.name,
                  promptText: draft.promptText,
                })}
                onApply={(_run) => applyDocumentTask(activeTaskId, activeTask.surfaceKind, activeEditor)}
                onDismiss={(_run) => dismissDocumentTask(activeTaskId, activeTask.surfaceKind, activeEditor)}
                run={activeTask.run}
                pendingAction={activeTask.pendingAction}
                errorMessage={activeTask.errorMessage}
              />
            </Box>
          )}
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
                      borderRadius: '4px', mb: 0.5,
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

        {!isCreate && kind === 'cell_doc' && id && (
          <RerunAgentButton
            documentId={id}
            onRerunComplete={() => loadDocument()}
          />
        )}

        <Button
          variant="outlined" onClick={() => navigate(isCreate ? '/workspace' : `/workspace/${id}`)}
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
