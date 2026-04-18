import React from 'react';
import type { Editor } from '@tiptap/core';
import { EditorContent } from '@tiptap/react';
import { Box, useTheme, alpha } from '@mui/material';

import { TableBubbleMenu } from './menus/table-bubble-menu';

interface CellDocEditorSurfaceProps {
  editor: Editor;
  minHeight?: string;
  readOnly?: boolean;
}

export const CellDocEditorSurface: React.FC<CellDocEditorSurfaceProps> = ({
  editor,
  minHeight = '240px',
  readOnly = false,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: 'relative',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.shape.borderRadius}px`,
        '& .tiptap': {
          minHeight,
          padding: theme.spacing(2),
          outline: 'none',
          '&:focus': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: -2,
          },
          '& p': { margin: '0.5em 0' },
          '& [data-block-locked="true"]': {
            boxShadow: `inset 3px 0 0 ${theme.palette.warning.main}`,
            backgroundColor: alpha(theme.palette.warning.main, 0.06),
          },
          '& ul[data-type="taskList"]': {
            listStyle: 'none',
            paddingLeft: 0,
            margin: '0.75em 0',
          },
          '& li[data-type="taskItem"]': {
            display: 'flex',
            alignItems: 'flex-start',
            gap: theme.spacing(1),
            '& > label': {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: theme.spacing(0.5),
            },
            '& > div': {
              flex: 1,
              minWidth: 0,
            },
          },
          '& table': {
            borderCollapse: 'collapse',
            width: '100%',
            margin: `${theme.spacing(1)} 0`,
          },
          '& th, & td': {
            border: `1px solid ${theme.palette.divider}`,
            padding: theme.spacing(0.75),
            verticalAlign: 'top',
          },
          '& th': {
            backgroundColor: theme.palette.action.hover,
            fontWeight: 600,
          },
        },
      }}
    >
      <EditorContent editor={editor} />
      {!readOnly && <TableBubbleMenu editor={editor} />}
    </Box>
  );
};
