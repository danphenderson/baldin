import React, { useCallback, useEffect, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import {
  Box, Paper, IconButton, Divider, TextField, Tooltip, useTheme, alpha, Typography,
} from '@mui/material';
import {
  FormatBold, FormatItalic, FormatUnderlined, StrikethroughS,
  FormatListBulleted, FormatListNumbered, FormatQuote, Code,
  HorizontalRule, FormatAlignLeft, FormatAlignCenter, FormatAlignRight,
  Link as LinkIcon, Undo, Redo, Title,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { useCollaborativeEditor } from './use-collaborative-editor';
import ConnectionStatusBanner from './connection-status-banner';
import { getTiptapEditorContent } from './document-content';
import type { DocumentContentFormat } from '../service/documents';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ContentFormat = DocumentContentFormat;

interface RichTextEditorProps {
  content: string;
  contentFormat: ContentFormat;
  onChange: (json: string, text: string) => void;
  externalContentKey?: number | string;
  readOnly?: boolean;
  placeholder?: string;
  minHeight?: string;
  collaborative?: boolean;
  documentId?: string;
  token?: string;
  collaborationUserName?: string;
}

/* ------------------------------------------------------------------ */
/*  Toolbar button                                                     */
/* ------------------------------------------------------------------ */

interface ToolbarBtnProps {
  icon: React.ReactElement;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const ToolbarBtn: React.FC<ToolbarBtnProps> = ({ icon, label, active, disabled, onClick }) => {
  const theme = useTheme();
  return (
    <Tooltip title={label} arrow>
      <span>
        <IconButton
          size="small"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          sx={{
            borderRadius: 1,
            width: 32, height: 32,
            ...(active && {
              background: alpha(theme.palette.primary.main, 0.12),
              color: theme.palette.primary.main,
            }),
          }}
        >
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );
};

/* ------------------------------------------------------------------ */
/*  Tiptap editor wrapper                                              */
/* ------------------------------------------------------------------ */

const TiptapEditorInner: React.FC<Omit<RichTextEditorProps, 'contentFormat'>> = ({
  content, onChange, readOnly, placeholder: placeholderText, minHeight = '400px',
  collaborative, documentId, token, collaborationUserName, externalContentKey,
}) => {
  const theme = useTheme();

  const editorContent = useMemo(() => getTiptapEditorContent(content), [content]);

  const collab = useCollaborativeEditor({
    documentId: documentId ?? '',
    token: token ?? '',
    enabled: !!collaborative && !!documentId && !!token,
    userName: collaborationUserName,
  });

  const extensions = useMemo(() => {
    const exts = [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
        ...(collaborative && collab.ydoc ? { undoRedo: false } : {}),
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholderText ?? 'Start writing…' }),
    ];

    if (collaborative && collab.ydoc) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      exts.push(Collaboration.configure({ document: collab.ydoc }) as any);
    }
    if (collaborative && collab.provider) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      exts.push(
        CollaborationCursor.configure({
          provider: collab.provider,
          user: collab.localUser,
        }) as any,
      );
    }

    return exts;
  }, [collaborative, collab.localUser, collab.provider, collab.ydoc, placeholderText]);

  const editor = useEditor({
    extensions,
    content: collaborative && collab.ydoc ? undefined : editorContent,
    editable: !readOnly,
    onUpdate: ({ editor: e }) => {
      onChange(JSON.stringify(e.getJSON()), e.getText());
    },
  }, [extensions]);

  /* sync readOnly changes ---------------------------------------- */
  useEffect(() => {
    if (editor) editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor || externalContentKey === undefined || externalContentKey === null) return;

    const nextContent = JSON.stringify(editorContent);
    const currentContent = JSON.stringify(editor.getJSON());
    if (currentContent === nextContent) return;

    editor.commands.setContent(editorContent, { emitUpdate: false });
  }, [editor, editorContent, externalContentKey]);

  /* link prompt --------------------------------------------------- */
  const handleSetLink = useCallback(() => {
    if (!editor) return;
    const currentHref = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enter URL:', currentHref ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  /* toolbar ------------------------------------------------------- */
  const toolbar = !readOnly && (
    <Paper
      variant="outlined"
      sx={{
        borderBottom: 'none',
        borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
        p: 0.5,
      }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
        {/* Text formatting */}
        <ToolbarBtn icon={<FormatBold fontSize="small" />} label="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()} />
        <ToolbarBtn icon={<FormatItalic fontSize="small" />} label="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()} />
        <ToolbarBtn icon={<FormatUnderlined fontSize="small" />} label="Underline"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()} />
        <ToolbarBtn icon={<StrikethroughS fontSize="small" />} label="Strikethrough"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()} />

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Headings */}
        <ToolbarBtn icon={<Title fontSize="small" />} label="Heading 1"
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
        <ToolbarBtn icon={<Title sx={{ fontSize: '1rem' }} />} label="Heading 2"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
        <ToolbarBtn icon={<Title sx={{ fontSize: '0.85rem' }} />} label="Heading 3"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Lists */}
        <ToolbarBtn icon={<FormatListBulleted fontSize="small" />} label="Bullet List"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <ToolbarBtn icon={<FormatListNumbered fontSize="small" />} label="Ordered List"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()} />

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Block formatting */}
        <ToolbarBtn icon={<FormatQuote fontSize="small" />} label="Blockquote"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()} />
        <ToolbarBtn icon={<Code fontSize="small" />} label="Code Block"
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
        <ToolbarBtn icon={<HorizontalRule fontSize="small" />} label="Horizontal Rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()} />

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Alignment */}
        <ToolbarBtn icon={<FormatAlignLeft fontSize="small" />} label="Align Left"
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()} />
        <ToolbarBtn icon={<FormatAlignCenter fontSize="small" />} label="Align Center"
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()} />
        <ToolbarBtn icon={<FormatAlignRight fontSize="small" />} label="Align Right"
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()} />

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Link */}
        <ToolbarBtn icon={<LinkIcon fontSize="small" />} label="Insert Link"
          active={editor.isActive('link')}
          onClick={handleSetLink} />

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Undo / Redo */}
        <ToolbarBtn icon={<Undo fontSize="small" />} label="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()} />
        <ToolbarBtn icon={<Redo fontSize="small" />} label="Redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()} />

        {/* Collaboration status */}
        {collaborative && (
          <>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
              <CircleIcon
                sx={{
                  fontSize: 10,
                  color: collab.connectionStatus === 'connected'
                    ? 'success.main'
                    : collab.connectionStatus === 'connecting'
                      ? 'warning.main'
                      : 'error.main',
                }}
              />
              <Typography
                variant="caption"
                color={collab.connectionStatus === 'disconnected' ? 'error' : 'text.secondary'}
                sx={{ whiteSpace: 'nowrap', fontWeight: collab.connectionStatus !== 'connected' ? 600 : 400 }}
              >
                {collab.connectionStatus === 'connected'
                  ? `Connected (${collab.connectedUsers.length} user${collab.connectedUsers.length !== 1 ? 's' : ''})`
                  : collab.connectionStatus === 'connecting'
                    ? 'Reconnecting…'
                    : 'Offline'}
              </Typography>
              {collab.connectedUsers.filter(u => u.color).map(u => (
                <Tooltip key={u.clientId} title={u.name ?? 'User'} arrow>
                  <CircleIcon sx={{ fontSize: 10, color: u.color }} />
                </Tooltip>
              ))}
            </Box>
          </>
        )}
      </Box>
    </Paper>
  );

  return (
    <Box>
      {collaborative && <ConnectionStatusBanner status={collab.connectionStatus} />}
      {toolbar}
      <Box
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: readOnly ? `${theme.shape.borderRadius}px` : undefined,
          borderTopLeftRadius: readOnly ? undefined : 0,
          borderTopRightRadius: readOnly ? undefined : 0,
          '& .tiptap': {
            minHeight,
            padding: theme.spacing(2),
            outline: 'none',
            '&:focus': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: -2,
            },
            '& p': { margin: '0.5em 0' },
            '& h1': { ...theme.typography.h4, mt: '0.8em', mb: '0.4em' },
            '& h2': { ...theme.typography.h5, mt: '0.7em', mb: '0.35em' },
            '& h3': { ...theme.typography.h6, mt: '0.6em', mb: '0.3em' },
            '& ul, & ol': { paddingLeft: '1.5em' },
            '& blockquote': {
              borderLeft: `3px solid ${theme.palette.divider}`,
              paddingLeft: theme.spacing(2),
              fontStyle: 'italic',
              color: theme.palette.text.secondary,
              margin: '0.5em 0',
            },
            '& code': {
              background: theme.palette.action.hover,
              borderRadius: '4px',
              padding: '2px 4px',
              fontSize: '0.875em',
              fontFamily: 'monospace',
            },
            '& pre': {
              background: theme.palette.action.hover,
              borderRadius: `${theme.shape.borderRadius}px`,
              padding: theme.spacing(2),
              overflow: 'auto',
              '& code': {
                background: 'none',
                padding: 0,
                borderRadius: 0,
              },
            },
            '& hr': {
              border: 'none',
              borderTop: `1px solid ${theme.palette.divider}`,
              margin: '1em 0',
            },
            '& a': {
              color: theme.palette.primary.main,
              textDecoration: 'underline',
            },
            '& .is-editor-empty:first-of-type::before': {
              content: 'attr(data-placeholder)',
              float: 'left',
              color: theme.palette.text.disabled,
              pointerEvents: 'none',
              height: 0,
            },
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
};

/* ------------------------------------------------------------------ */
/*  Main component — switches between plain text and rich editor       */
/* ------------------------------------------------------------------ */

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content, contentFormat, onChange, externalContentKey, readOnly, placeholder: placeholderText,
  minHeight, collaborative, documentId, token, collaborationUserName,
}) => {
  if (contentFormat === 'plain_text') {
    return (
      <TextField
        fullWidth multiline minRows={20} maxRows={60}
        value={content}
        onChange={e => onChange(e.target.value, e.target.value)}
        placeholder={placeholderText ?? 'Start writing…'}
        variant="outlined"
        disabled={readOnly}
        slotProps={{ input: { 'aria-label': 'Document content' } }}
        sx={{
          '& .MuiOutlinedInput-root': {
            fontFamily: 'monospace', fontSize: '0.875rem', lineHeight: 1.6,
          },
        }}
      />
    );
  }

  return (
    <TiptapEditorInner
      content={content}
      onChange={onChange}
      externalContentKey={externalContentKey}
      readOnly={readOnly}
      placeholder={placeholderText}
      minHeight={minHeight}
      collaborative={collaborative}
      documentId={documentId}
      token={token}
      collaborationUserName={collaborationUserName}
    />
  );
};

export default RichTextEditor;
