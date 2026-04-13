import React, { useEffect, useMemo, useState } from 'react';
import {
  NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import {
  Alert,
  Box,
  Button,
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
import { StatusChip as Chip } from '../../../design-system';
import {
  AccountTree as EmbedIcon,
  ArrowBack as BackIcon,
  Link as LinkIcon,
} from '@mui/icons-material';

import {
  getDocumentEmbedCandidates,
  resolveDocumentReferences,
  type DocumentEmbedCandidateRead,
  type DocumentReferenceResolvedRead,
} from '../../../service/documents';

interface EmbedBlockNodeViewProps extends NodeViewProps {
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

export const EmbedBlockNodeView: React.FC<EmbedBlockNodeViewProps> = ({
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
  const [documentCandidates, setDocumentCandidates] = useState<DocumentEmbedCandidateRead[]>([]);
  const [blockCandidates, setBlockCandidates] = useState<DocumentEmbedCandidateRead[]>([]);
  const [selectedSourceDocumentId, setSelectedSourceDocumentId] = useState<string | null>(
    typeof node.attrs.sourceDocumentId === 'string' ? node.attrs.sourceDocumentId : null,
  );
  const [selectedSourceDocumentTitle, setSelectedSourceDocumentTitle] = useState<string | null>(null);
  const [resolved, setResolved] = useState<DocumentReferenceResolvedRead | null>(null);

  const isLocked = node.attrs.locked === true;
  const sourceDocumentId = typeof node.attrs.sourceDocumentId === 'string' ? node.attrs.sourceDocumentId : null;
  const sourceBlockId = typeof node.attrs.sourceBlockId === 'string' ? node.attrs.sourceBlockId : null;
  const savedLabel = typeof node.attrs.label === 'string' ? node.attrs.label : null;
  const savedPreviewText = typeof node.attrs.previewText === 'string' ? node.attrs.previewText : null;
  const blockId = typeof node.attrs.blockId === 'string' ? node.attrs.blockId : undefined;
  const canEditReference = editor.isEditable && !isLocked && !!token && !!documentId;
  const showPicker = pickerOpen || (!resolved && !savedLabel && canEditReference);

  useEffect(() => {
    let cancelled = false;

    if (!token || !documentId || !sourceDocumentId || !sourceBlockId) {
      setResolved((current) => (current === null ? current : null));
      return () => {
        cancelled = true;
      };
    }

    setLoadingResolution(true);
    resolveDocumentReferences(token, documentId, [
      {
        kind: 'embed',
        block_id: blockId,
        source_document_id: sourceDocumentId,
        source_block_id: sourceBlockId,
        saved_label: savedLabel,
        saved_preview_text: savedPreviewText,
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
            kind: 'embed',
            status: 'unavailable',
            block_id: blockId ?? null,
            label: savedLabel,
            preview_text: savedPreviewText,
            unavailable_reason: 'Embedded block is unavailable',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingResolution(false);
      });

    return () => {
      cancelled = true;
    };
  }, [blockId, documentId, savedLabel, savedPreviewText, sourceBlockId, sourceDocumentId, token]);

  useEffect(() => {
    if (!showPicker) return;
    setSelectedSourceDocumentId(sourceDocumentId);
  }, [showPicker, sourceDocumentId]);

  useEffect(() => {
    let cancelled = false;

    if (!showPicker || !token || !documentId || selectedSourceDocumentId) {
      setDocumentCandidates([]);
      return () => {
        cancelled = true;
      };
    }

    setLoadingCandidates(true);
    getDocumentEmbedCandidates(token, documentId, {
      q: query,
      limit: 8,
    })
      .then((results) => {
        if (!cancelled) {
          setDocumentCandidates(results.filter((candidate) => candidate.candidate_kind === 'document'));
        }
      })
      .catch(() => {
        if (!cancelled) setDocumentCandidates([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCandidates(false);
      });

    return () => {
      cancelled = true;
    };
  }, [documentId, query, selectedSourceDocumentId, showPicker, token]);

  useEffect(() => {
    let cancelled = false;

    if (!showPicker || !token || !documentId || !selectedSourceDocumentId) {
      setBlockCandidates([]);
      return () => {
        cancelled = true;
      };
    }

    setLoadingCandidates(true);
    getDocumentEmbedCandidates(token, documentId, {
      source_document_id: selectedSourceDocumentId,
      q: query,
      limit: 8,
    })
      .then((results) => {
        if (!cancelled) {
          setBlockCandidates(results.filter((candidate) => candidate.candidate_kind === 'block'));
        }
      })
      .catch(() => {
        if (!cancelled) setBlockCandidates([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCandidates(false);
      });

    return () => {
      cancelled = true;
    };
  }, [documentId, query, selectedSourceDocumentId, showPicker, token]);

  const statusColor = useMemo(() => {
    if (resolved?.status === 'resolved') return theme.palette.success.main;
    if (resolved?.status === 'invalid') return theme.palette.warning.main;
    return theme.palette.divider;
  }, [resolved?.status, theme.palette.divider, theme.palette.success.main, theme.palette.warning.main]);

  const handleDocumentSelect = (candidate: DocumentEmbedCandidateRead) => {
    setSelectedSourceDocumentId(candidate.document_id);
    setSelectedSourceDocumentTitle(candidate.document_title);
    setQuery('');
  };

  const handleBlockSelect = (candidate: DocumentEmbedCandidateRead) => {
    updateAttributes({
      sourceDocumentId: candidate.document_id,
      sourceBlockId: candidate.block_id,
      sourceVersionIdAtSave: candidate.source_version_id,
      label: candidate.label,
      previewText: candidate.preview_text,
    });
    setPickerOpen(false);
    setQuery('');
  };

  const headingText = resolved?.label || savedLabel || 'Unresolved embed';
  const previewText = resolved?.preview_text || savedPreviewText || 'Select a source block to embed it here.';
  const href = resolved?.status === 'resolved' ? resolved.href : null;

  return (
    <NodeViewWrapper
      data-block-id={node.attrs.blockId}
      data-block-locked={isLocked ? 'true' : undefined}
      contentEditable={false}
    >
      <Paper
        data-testid="embed-block-node-view"
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
          <EmbedIcon fontSize="small" sx={{ mt: 0.25, color: statusColor }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {headingText}
              </Typography>
              {resolved?.subtitle && (
                <Chip label={resolved.subtitle} size="small" variant="outlined" />
              )}
              {resolved?.status === 'resolved' && href && (
                <Chip
                  component="a"
                  href={href}
                  clickable
                  icon={<LinkIcon />}
                  label="Open source"
                  size="small"
                  variant="outlined"
                />
              )}
              {isLocked && <Chip label="Locked" size="small" />}
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
              {previewText}
            </Typography>

            {resolved?.status === 'unavailable' && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                {resolved.unavailable_reason ?? 'Embedded block is unavailable.'}
              </Alert>
            )}

            {resolved?.status === 'invalid' && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {resolved.unavailable_reason ?? 'Embedded block is invalid.'}
              </Alert>
            )}

            {loadingResolution && (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                <CircularProgress size={14} />
                <Typography variant="caption" color="text.secondary">
                  Resolving embedded block…
                </Typography>
              </Stack>
            )}

            {canEditReference && (
              <Stack direction="row" spacing={1} sx={{ mb: showPicker ? 1 : 0 }}>
                <Button size="small" variant="outlined" onClick={() => setPickerOpen((open) => !open)}>
                  {showPicker ? 'Close picker' : resolved ? 'Change embed' : 'Pick embed'}
                </Button>
              </Stack>
            )}

            {showPicker && (
              <Box sx={{ mt: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label={selectedSourceDocumentId ? 'Find a source block' : 'Find a source document'}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />

                {selectedSourceDocumentId && (
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1 }}>
                    <Button
                      size="small"
                      startIcon={<BackIcon fontSize="small" />}
                      onClick={() => {
                        setSelectedSourceDocumentId(null);
                        setSelectedSourceDocumentTitle(null);
                        setQuery('');
                      }}
                    >
                      Change source document
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      {selectedSourceDocumentTitle ?? selectedSourceDocumentId}
                    </Typography>
                  </Stack>
                )}

                {loadingCandidates ? (
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1 }}>
                    <CircularProgress size={14} />
                    <Typography variant="caption" color="text.secondary">
                      Loading embed candidates…
                    </Typography>
                  </Stack>
                ) : (
                  <List dense sx={{ py: 0.5 }}>
                    {(selectedSourceDocumentId ? blockCandidates : documentCandidates).map((candidate) => (
                      <ListItemButton
                        key={candidate.block_id ?? candidate.document_id}
                        onClick={() => (
                          selectedSourceDocumentId
                            ? handleBlockSelect(candidate)
                            : handleDocumentSelect(candidate)
                        )}
                      >
                        <ListItemText
                          primary={candidate.label}
                          secondary={candidate.preview_text ?? candidate.document_title}
                        />
                      </ListItemButton>
                    ))}
                    {(selectedSourceDocumentId ? blockCandidates : documentCandidates).length === 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1.5, py: 1 }}>
                        {selectedSourceDocumentId
                          ? 'No source blocks matched this search.'
                          : 'No source documents matched this search.'}
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
