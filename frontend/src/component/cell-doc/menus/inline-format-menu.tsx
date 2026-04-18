/**
 * Inline floating format menu for cell-doc editors.
 *
 * Appears on text selection and provides bold, italic, underline,
 * strikethrough, code, and link controls. Uses BubbleMenu from
 * @tiptap/react/menus — only renders when the editor is editable
 * and has a non-empty text selection outside of a code block.
 */
import React, { useCallback } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Paper, IconButton, Tooltip, Divider } from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  StrikethroughS,
  Code,
  Link as LinkIcon,
} from '@mui/icons-material';
import type { Editor } from '@tiptap/core';

interface InlineFormatMenuProps {
  editor: Editor;
}

export const InlineFormatMenu: React.FC<InlineFormatMenuProps> = ({ editor }) => {
  const handleSetLink = useCallback(() => {
    const currentHref = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter URL:', currentHref ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="inlineFormatMenu"
      shouldShow={({ editor: e, state }) => {
        if (!e.isEditable) return false;
        if (state.selection.empty) return false;
        if (e.isActive('codeBlock')) return false;
        return true;
      }}
    >
      <Paper
        elevation={8}
        sx={{ display: 'flex', alignItems: 'center', gap: 0.25, px: 0.5, py: 0.25, zIndex: 1400 }}
        data-testid="inline-format-menu"
      >
        <Tooltip title="Bold" arrow>
          <span>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleBold().run()}
              color={editor.isActive('bold') ? 'primary' : 'default'}
              aria-label="Bold"
            >
              <FormatBold fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Italic" arrow>
          <span>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              color={editor.isActive('italic') ? 'primary' : 'default'}
              aria-label="Italic"
            >
              <FormatItalic fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Underline" arrow>
          <span>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              color={editor.isActive('underline') ? 'primary' : 'default'}
              aria-label="Underline"
            >
              <FormatUnderlined fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Strikethrough" arrow>
          <span>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              color={editor.isActive('strike') ? 'primary' : 'default'}
              aria-label="Strikethrough"
            >
              <StrikethroughS fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

        <Tooltip title="Code" arrow>
          <span>
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleCode().run()}
              color={editor.isActive('code') ? 'primary' : 'default'}
              aria-label="Code"
            >
              <Code fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Link" arrow>
          <span>
            <IconButton
              size="small"
              onClick={handleSetLink}
              color={editor.isActive('link') ? 'primary' : 'default'}
              aria-label="Link"
            >
              <LinkIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Paper>
    </BubbleMenu>
  );
};
