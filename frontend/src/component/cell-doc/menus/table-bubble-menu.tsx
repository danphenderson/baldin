/**
 * Contextual table controls for cell-doc.
 *
 * Renders a BubbleMenu that appears when a table cell/header is selected,
 * providing add/delete row and column controls.
 */
import React from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import {
  Paper, IconButton, Tooltip, Divider,
} from '@mui/material';
import {
  TableRowsOutlined,
  ViewColumnOutlined,
  AddOutlined,
  RemoveOutlined,
} from '@mui/icons-material';
import type { Editor } from '@tiptap/core';

interface TableBubbleMenuProps {
  editor: Editor;
}

export const TableBubbleMenu: React.FC<TableBubbleMenuProps> = ({ editor }) => {
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tableBubbleMenu"
      shouldShow={({ editor: e }) => e.isEditable && e.isActive('table')}
      options={{ placement: 'top' }}
    >
      <Paper
        elevation={4}
        sx={{ display: 'flex', alignItems: 'center', gap: 0.25, px: 0.5, py: 0.25 }}
        data-testid="table-bubble-menu"
      >
        {/* Column controls */}
        <Tooltip title="Add column before" arrow>
          <span>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              disabled={!editor.can().addColumnBefore()}
              aria-label="Add column before"
            >
              <ViewColumnOutlined fontSize="small" sx={{ transform: 'scaleX(-1)' }} />
              <AddOutlined sx={{ fontSize: 10, position: 'absolute', bottom: 2, right: 2 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Add column after" arrow>
          <span>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              disabled={!editor.can().addColumnAfter()}
              aria-label="Add column after"
            >
              <ViewColumnOutlined fontSize="small" />
              <AddOutlined sx={{ fontSize: 10, position: 'absolute', bottom: 2, right: 2 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Delete column" arrow>
          <span>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().deleteColumn().run()}
              disabled={!editor.can().deleteColumn()}
              aria-label="Delete column"
            >
              <ViewColumnOutlined fontSize="small" />
              <RemoveOutlined sx={{ fontSize: 10, position: 'absolute', bottom: 2, right: 2, color: 'error.main' }} />
            </IconButton>
          </span>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

        {/* Row controls */}
        <Tooltip title="Add row before" arrow>
          <span>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().addRowBefore().run()}
              disabled={!editor.can().addRowBefore()}
              aria-label="Add row before"
            >
              <TableRowsOutlined fontSize="small" sx={{ transform: 'scaleY(-1)' }} />
              <AddOutlined sx={{ fontSize: 10, position: 'absolute', bottom: 2, right: 2 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Add row after" arrow>
          <span>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              disabled={!editor.can().addRowAfter()}
              aria-label="Add row after"
            >
              <TableRowsOutlined fontSize="small" />
              <AddOutlined sx={{ fontSize: 10, position: 'absolute', bottom: 2, right: 2 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Delete row" arrow>
          <span>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().deleteRow().run()}
              disabled={!editor.can().deleteRow()}
              aria-label="Delete row"
            >
              <TableRowsOutlined fontSize="small" />
              <RemoveOutlined sx={{ fontSize: 10, position: 'absolute', bottom: 2, right: 2, color: 'error.main' }} />
            </IconButton>
          </span>
        </Tooltip>
      </Paper>
    </BubbleMenu>
  );
};
