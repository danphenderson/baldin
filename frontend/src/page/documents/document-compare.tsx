import React, { useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box, Typography, Chip, Stack, Button, useTheme, alpha, Alert, Paper, Skeleton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ArrowBack as BackIcon, Restore as RestoreIcon,
} from '@mui/icons-material';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { UserContext } from '../../context/user-context';
import { usePageToolbarHeader } from '../../layout/toolbar-header-context';
import {
  getVersion, getDocument, createVersion,
  type DocumentVersionRead, type DocumentDetailRead, type DocumentVersionCreate,
} from '../../service/documents';

/* ------------------------------------------------------------------ */
/*  Diff algorithm — simple LCS-based line diff                        */
/* ------------------------------------------------------------------ */

type DiffLine = { type: 'added' | 'removed' | 'unchanged'; text: string };

function computeDiff(leftText: string, rightText: string): DiffLine[] {
  const leftLines = leftText.split('\n');
  const rightLines = rightText.split('\n');
  const m = leftLines.length;
  const n = rightLines.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (leftLines[i - 1] === rightLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to produce diff
  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      result.push({ type: 'unchanged', text: leftLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'added', text: rightLines[j - 1] });
      j--;
    } else if (i > 0) {
      result.push({ type: 'removed', text: leftLines[i - 1] });
      i--;
    }
  }

  return result.reverse();
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const CONTENT_TYPE_LABELS: Record<string, string> = {
  custom: 'Custom', generated: 'AI Generated', template: 'Template',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Recursively extract plain text from a Tiptap JSON node tree. */
function extractPlainTextFromTiptapJson(content: string): string {
  try {
    const doc = JSON.parse(content);
    if (!doc || typeof doc !== 'object') return content;
    const walk = (node: Record<string, unknown>): string => {
      if (node.type === 'text' && typeof node.text === 'string') return node.text;
      if (!Array.isArray(node.content)) return '';
      return (node.content as Record<string, unknown>[])
        .map(child => walk(child))
        .join(node.type === 'doc' || node.type === 'bulletList' || node.type === 'orderedList' ? '\n' : '');
    };
    const lines = ((doc.content ?? []) as Record<string, unknown>[])
      .map((block: Record<string, unknown>) => walk(block));
    return lines.join('\n');
  } catch {
    return content;
  }
}

function getVersionText(v: DocumentVersionRead): string {
  if (v.content_format === 'tiptap_json' && v.content) return extractPlainTextFromTiptapJson(v.content);
  return v.content ?? '';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const DocumentComparePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { token } = useContext(UserContext);

  const leftId = searchParams.get('left');
  const rightId = searchParams.get('right');

  const [doc, setDoc] = useState<DocumentDetailRead | null>(null);
  const [leftVersion, setLeftVersion] = useState<DocumentVersionRead | null>(null);
  const [rightVersion, setRightVersion] = useState<DocumentVersionRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restoring, setRestoring] = useState(false);

  usePageToolbarHeader(
    'Compare Versions',
    leftVersion && rightVersion
      ? `v${leftVersion.version_number} ↔ v${rightVersion.version_number}`
      : undefined,
  );

  /* fetch ---------------------------------------------------------- */
  const load = useCallback(async () => {
    if (!token || !id || !leftId || !rightId) {
      setError('Missing document or version IDs');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [docData, left, right] = await Promise.all([
        getDocument(token, id),
        getVersion(token, id, leftId),
        getVersion(token, id, rightId),
      ]);
      setDoc(docData);
      setLeftVersion(left);
      setRightVersion(right);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load versions');
    }
    setLoading(false);
  }, [token, id, leftId, rightId]);

  useEffect(() => { load(); }, [load]);

  /* diff ----------------------------------------------------------- */
  const hasRichContent = useMemo(() => {
    return leftVersion?.content_format === 'tiptap_json' || rightVersion?.content_format === 'tiptap_json';
  }, [leftVersion, rightVersion]);

  const diffLines = useMemo(() => {
    if (!leftVersion || !rightVersion) return [];
    return computeDiff(getVersionText(leftVersion), getVersionText(rightVersion));
  }, [leftVersion, rightVersion]);

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const line of diffLines) {
      if (line.type === 'added') added++;
      if (line.type === 'removed') removed++;
    }
    return { added, removed };
  }, [diffLines]);

  /* restore handler ------------------------------------------------ */
  const handleRestore = async (version: DocumentVersionRead) => {
    if (!token || !id) return;
    setRestoring(true);
    try {
      const payload: DocumentVersionCreate = {
        content: version.content,
        content_type: version.content_type,
        content_format: version.content_format === 'tiptap_json' ? 'tiptap_json' : 'plain_text',
        change_summary: `Restored from v${version.version_number}`,
      };
      await createVersion(token, id, payload);
      navigate(`/workspace/${id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Restore failed');
    }
    setRestoring(false);
  };

  /* loading / error ------------------------------------------------ */
  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width={300} height={40} />
        <Skeleton variant="rounded" height={400} sx={{ mt: 2, borderRadius: 3 }} />
      </Box>
    );
  }

  if (!leftVersion || !rightVersion) {
    return (
      <Box>
        <Button startIcon={<BackIcon />} onClick={() => navigate(`/workspace/${id}`)} aria-label="Back to document">
          Back
        </Button>
        <Alert severity="error" sx={{ mt: 2 }}>{error || 'Could not load versions for comparison'}</Alert>
      </Box>
    );
  }

  const isReadOnly = doc?.viewer_role === 'viewer';

  const bgColor = (type: DiffLine['type']) => {
    switch (type) {
      case 'added':   return alpha(theme.palette.success.main, 0.12);
      case 'removed': return alpha(theme.palette.error.main, 0.12);
      default:        return 'transparent';
    }
  };

  const prefixColor = (type: DiffLine['type']) => {
    switch (type) {
      case 'added':   return theme.palette.success.main;
      case 'removed': return theme.palette.error.main;
      default:        return theme.palette.text.disabled;
    }
  };

  const prefix = (type: DiffLine['type']) => {
    switch (type) {
      case 'added':   return '+';
      case 'removed': return '−';
      default:        return ' ';
    }
  };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {isReadOnly && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have view-only access to this document. Restoring versions is disabled.
        </Alert>
      )}

      {/* ── Back button ─────────────────────────────────────────── */}
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate(`/workspace/${id}`)}
        sx={{ mb: 2 }}
        aria-label="Back to document"
      >
        Back to {doc?.title ?? 'Document'}
      </Button>

      {/* ── Header: version info ────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{
            p: 2, borderLeft: `3px solid ${theme.palette.error.main}`,
          }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
              <Chip label={`v${leftVersion.version_number}`} size="small" color="error" sx={{ fontWeight: 700 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {leftVersion.change_summary || leftVersion.name || 'Left version'}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {leftVersion.content_type && (
                <Chip
                  label={CONTENT_TYPE_LABELS[leftVersion.content_type] ?? leftVersion.content_type}
                  size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }}
                />
              )}
              <Typography variant="caption" color="text.secondary">
                {formatDate(leftVersion.created_at)}
              </Typography>
            </Stack>
            <Button
              size="small" variant="outlined" startIcon={<RestoreIcon />}
              onClick={() => handleRestore(leftVersion)}
              disabled={restoring || isReadOnly}
              sx={{ mt: 1.5 }}
              aria-label={`Restore version ${leftVersion.version_number}`}
            >
              Restore v{leftVersion.version_number}
            </Button>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{
            p: 2, borderLeft: `3px solid ${theme.palette.success.main}`,
          }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
              <Chip label={`v${rightVersion.version_number}`} size="small" color="success" sx={{ fontWeight: 700 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {rightVersion.change_summary || rightVersion.name || 'Right version'}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {rightVersion.content_type && (
                <Chip
                  label={CONTENT_TYPE_LABELS[rightVersion.content_type] ?? rightVersion.content_type}
                  size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }}
                />
              )}
              <Typography variant="caption" color="text.secondary">
                {formatDate(rightVersion.created_at)}
              </Typography>
            </Stack>
            <Button
              size="small" variant="outlined" startIcon={<RestoreIcon />}
              onClick={() => handleRestore(rightVersion)}
              disabled={restoring || isReadOnly}
              sx={{ mt: 1.5 }}
              aria-label={`Restore version ${rightVersion.version_number}`}
            >
              Restore v{rightVersion.version_number}
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Rich-text note ─────────────────────────────────────── */}
      {hasRichContent && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Rich-text formatting is not shown in diff view. Comparing plain-text content only.
        </Alert>
      )}

      {/* ── Diff stats ──────────────────────────────────────────── */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Chip
          label={`+${stats.added} added`}
          size="small" variant="outlined"
          sx={{ color: theme.palette.success.main, borderColor: alpha(theme.palette.success.main, 0.4), fontWeight: 600 }}
        />
        <Chip
          label={`−${stats.removed} removed`}
          size="small" variant="outlined"
          sx={{ color: theme.palette.error.main, borderColor: alpha(theme.palette.error.main, 0.4), fontWeight: 600 }}
        />
        <Chip
          label={`${diffLines.length} total lines`}
          size="small" variant="outlined" sx={{ fontWeight: 500 }}
        />
      </Stack>

      {/* ── Diff view ───────────────────────────────────────────── */}
      <Paper
        sx={{
          overflow: 'auto', maxHeight: 'calc(100vh - 400px)',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
        }}
      >
        {diffLines.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Both versions are identical — no differences found.
            </Typography>
          </Box>
        ) : (
          <Box component="pre" sx={{ m: 0, p: 0, fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {diffLines.map((line, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  background: bgColor(line.type),
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                  '&:hover': { background: alpha(theme.palette.action.hover, 0.06) },
                  px: 1.5, py: 0.25,
                  minHeight: 22,
                }}
              >
                {/* Line number */}
                <Typography
                  component="span"
                  sx={{
                    width: 40, flexShrink: 0, textAlign: 'right', pr: 1.5, mr: 1.5,
                    borderRight: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                    color: 'text.disabled', fontSize: '0.75rem', lineHeight: '22px',
                    userSelect: 'none',
                  }}
                >
                  {idx + 1}
                </Typography>
                {/* Prefix */}
                <Typography
                  component="span"
                  sx={{
                    width: 16, flexShrink: 0, fontWeight: 700,
                    color: prefixColor(line.type), fontSize: '0.8rem', lineHeight: '22px',
                    userSelect: 'none',
                  }}
                >
                  {prefix(line.type)}
                </Typography>
                {/* Content */}
                <Typography
                  component="span"
                  sx={{
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all', flex: 1,
                    fontSize: '0.8rem', lineHeight: '22px',
                  }}
                >
                  {line.text}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default DocumentComparePage;
