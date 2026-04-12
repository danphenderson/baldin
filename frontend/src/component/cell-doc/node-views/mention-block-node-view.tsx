import React, { useEffect, useMemo, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { AlternateEmail as MentionIcon, Link as LinkIcon } from '@mui/icons-material';

import {
  getDocumentMentionCandidates,
  resolveDocumentReferences,
  type DocumentMentionCandidateRead,
  type DocumentReferenceResolvedRead,
} from '../../../service/documents';

interface MentionBlockNodeViewProps extends NodeViewProps {
  token?: string;
  documentId?: string;
}

function sameResolvedValue(
  left: DocumentReferenceResolvedRead | null,
  right: DocumentReferenceResolvedRead | null,
): boolean {
  if (left === right) return true;
  if (!left || !right) return false;
  return JSON.stringify(left) === JSON.stringify(right);
}

export const MentionBlockNodeView: React.FC<MentionBlockNodeViewProps> = ({
  node,
  updateAttributes,
  editor,
  token,
  documentId,
}) => {
  const theme = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [loadingResolution, setLoadingResolution] = useState(false);
  const [candidates, setCandidates] = useState<DocumentMentionCandidateRead[]>([]);
  const [resolved, setResolved] = useState<DocumentReferenceResolvedRead | null>(null);

  const isLocked = node.attrs.locked === true;
  const targetKind = typeof node.attrs.targetKind === 'string' ? node.attrs.targetKind : null;
  const targetId = typeof node.attrs.targetId === 'string' ? node.attrs.targetId : null;
  const savedLabel = typeof node.attrs.label === 'string' ? node.attrs.label : null;
  const blockId = typeof node.attrs.blockId === 'string' ? node.attrs.blockId : undefined;
  const canEditReference = editor.isEditable && !isLocked && !!token && !!documentId;
  const showPicker = pickerOpen || (!resolved && !savedLabel && canEditReference);

  useEffect(() => {
    let cancelled = false;

    if (!token || !documentId || !targetKind || !targetId) {
      setResolved((current) => (current === null ? current : null));
      return () => {
        cancelled = true;
      };
    }

    setLoadingResolution(true);
    resolveDocumentReferences(token, documentId, [
      {
        kind: 'mention',
        block_id: blockId,
        target_kind: targetKind as 'user' | 'document' | 'agent',
        target_id: targetId,
        saved_label: savedLabel,
      },
    ])
      .then((results) => {
        if (cancelled) return;
        const nextResolved = results[0] ?? null;
        setResolved((current) => (sameResolvedValue(current, nextResolved) ? current : nextResolved));
      })
      .catch(() => {
        if (!cancelled) {
          setResolved({
            kind: 'mention',
            status: 'unavailable',
            block_id: blockId ?? null,
            label: savedLabel,
            unavailable_reason: 'Mention target is unavailable',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingResolution(false);
      });

    return () => {
      cancelled = true;
    };
  }, [blockId, documentId, savedLabel, targetId, targetKind, token]);

  useEffect(() => {
    let cancelled = false;

    if (!showPicker || !token || !documentId) {
      setCandidates([]);
      return () => {
        cancelled = true;
      };
    }

    setLoadingCandidates(true);
    getDocumentMentionCandidates(token, documentId, {
      q: query,
      limit: 8,
    })
      .then((results) => {
        if (!cancelled) setCandidates(results);
      })
      .catch(() => {
        if (!cancelled) setCandidates([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCandidates(false);
      });

    return () => {
      cancelled = true;
    };
  }, [documentId, query, showPicker, token]);

  const statusColor = useMemo(() => {
    if (resolved?.status === 'resolved') return theme.palette.info.main;
    if (resolved?.status === 'invalid') return theme.palette.warning.main;
    return theme.palette.divider;
  }, [resolved?.status, theme.palette.divider, theme.palette.info.main, theme.palette.warning.main]);

  const handleCandidateSelect = (candidate: DocumentMentionCandidateRead) => {
    updateAttributes({
      targetKind: candidate.target_kind,
      targetId: candidate.target_id,
      label: candidate.label,
    });
    setPickerOpen(false);
    setQuery('');
  };

  const headingText = resolved?.label || savedLabel || 'Unresolved mention';
  const subtitleText = resolved?.subtitle || (targetKind ? `${targetKind} reference` : 'Pick a user, document, or agent');
  const href = resolved?.status === 'resolved' ? resolved.href : null;

  return (
    <NodeViewWrapper
      data-block-id={node.attrs.blockId}
      data-block-locked={isLocked ? 'true' : undefined}
      contentEditable={false}
    >
      <Paper
        data-testid="mention-block-node-view"
        variant="outlined"
        sx={{
          my: 1,
          p: 1.5,
          borderColor: statusColor,
          background: alpha(statusColor, resolved?.status === 'resolved' ? 0.08 : 0.04),
          opacity: isLocked ? 0.78 : 1,
        }}
      >
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
          <MentionIcon fontSize="small" sx={{ mt: 0.25, color: statusColor }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {headingText}
              </Typography>
              {resolved?.status === 'resolved' && href && (
                <Chip
                  component="a"
                  href={href}
                  clickable
                  icon={<LinkIcon />}
                  label="Open"
                  size="small"
                  variant="outlined"
                />
              )}
              {isLocked && <Chip label="Locked" size="small" />}
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {subtitleText}
            </Typography>

            {resolved?.status === 'unavailable' && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                {resolved.unavailable_reason ?? 'Mention target is unavailable.'}
              </Alert>
            )}

            {resolved?.status === 'invalid' && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {resolved.unavailable_reason ?? 'Mention target is invalid.'}
              </Alert>
            )}

            {loadingResolution && (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                <CircularProgress size={14} />
                <Typography variant="caption" color="text.secondary">
                  Resolving mention…
                </Typography>
              </Stack>
            )}

            {canEditReference && (
              <Stack direction="row" spacing={1} sx={{ mb: showPicker ? 1 : 0 }}>
                <Button size="small" variant="outlined" onClick={() => setPickerOpen((open) => !open)}>
                  {showPicker ? 'Close picker' : resolved ? 'Change mention' : 'Pick mention'}
                </Button>
              </Stack>
            )}

            {showPicker && (
              <Box sx={{ mt: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Find a user, document, or agent"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {loadingCandidates ? (
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1 }}>
                    <CircularProgress size={14} />
                    <Typography variant="caption" color="text.secondary">
                      Loading mention candidates…
                    </Typography>
                  </Stack>
                ) : (
                  <List dense sx={{ py: 0.5 }}>
                    {candidates.map((candidate) => (
                      <ListItemButton
                        key={`${candidate.target_kind}:${candidate.target_id}`}
                        onClick={() => handleCandidateSelect(candidate)}
                      >
                        <ListItemText
                          primary={candidate.label}
                          secondary={candidate.subtitle ?? candidate.target_kind}
                        />
                      </ListItemButton>
                    ))}
                    {candidates.length === 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1.5, py: 1 }}>
                        No mention targets matched this search.
                      </Typography>
                    )}
                  </List>
                )}
              </Box>
            )}
          </Box>
        </Stack>
      </Paper>
    </NodeViewWrapper>
  );
};
