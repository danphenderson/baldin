import React, { useCallback } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Box, IconButton, useTheme } from '@mui/material';
import { ExpandMore, ChevronRight } from '@mui/icons-material';
import type { NodeViewProps } from '@tiptap/react';

export const ToggleNodeView: React.FC<NodeViewProps> = ({ node, updateAttributes, editor }) => {
  const theme = useTheme();
  const isOpen = node.attrs.open !== false;
  const summaryText = node.firstChild?.textContent?.trim() || 'Toggle heading';
  const isLocked = node.attrs.locked === true;

  const toggle = useCallback(() => {
    if (!editor.isEditable) return;
    updateAttributes({ open: !isOpen });
  }, [editor.isEditable, isOpen, updateAttributes]);

  return (
    <NodeViewWrapper
      data-block-id={node.attrs.blockId}
      data-block-locked={isLocked ? 'true' : undefined}
    >
      <Box
        data-testid="toggle-node-view"
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: '4px',
          my: 1,
          p: 1,
          opacity: isLocked ? 0.78 : 1,
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            alignItems: 'start',
            gap: 1,
          }}
        >
          <IconButton
            size="small"
            onClick={toggle}
            disabled={!editor.isEditable}
            aria-expanded={isOpen}
            aria-label={isOpen ? 'Collapse toggle' : 'Expand toggle'}
            data-testid="toggle-disclosure"
            sx={{ p: 0.25, mt: 0.25 }}
          >
            {isOpen ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
          </IconButton>
          <Box
            data-testid="toggle-content"
            sx={{
              minWidth: 0,
              '& .toggle-content-dom > [data-details-summary], & .toggle-content-dom > summary': {
                display: 'block',
                margin: 0,
                padding: theme.spacing(0.5, 0),
                fontWeight: 600,
              },
            }}
          >
            {!isOpen && (
              <Box
                data-testid="toggle-summary-preview"
                sx={{
                  display: 'block',
                  margin: 0,
                  padding: theme.spacing(0.5, 0),
                  fontWeight: 600,
                }}
              >
                {summaryText}
              </Box>
            )}
            <Box sx={{ display: isOpen ? 'block' : 'none' }}>
              <NodeViewContent className="toggle-content-dom" />
            </Box>
          </Box>
        </Box>
      </Box>
    </NodeViewWrapper>
  );
};
