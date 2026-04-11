/**
 * Cell-doc editor — Notion-like block editor for the `cell_doc` document kind.
 *
 * Sibling of RichTextEditor. Uses cell-doc extensions (task list, callout,
 * toggle, table, slash command, block reorder) with an inline floating
 * format menu instead of a fixed toolbar.
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useEditor } from '@tiptap/react';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { Box, Typography, Tooltip, useTheme } from '@mui/material';
import { Circle as CircleIcon } from '@mui/icons-material';

import { buildCellDocExtensions } from './extensions';
import { CellDocEditorSurface } from './cell-doc-editor-surface';
import { InlineFormatMenu } from './menus/inline-format-menu';
import { BlockContextMenu } from './menus/block-context-menu';
import { useCollaborativeEditor, type ConnectionStatus } from '../use-collaborative-editor';
import ConnectionStatusBanner from '../connection-status-banner';
import { getTiptapEditorContent } from '../document-content';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CellDocEditorProps {
  content: string;
  onChange: (json: string, plainText: string) => void;
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
/*  Collab status indicator                                            */
/* ------------------------------------------------------------------ */

const CollabStatusBar: React.FC<{
  connectionStatus: ConnectionStatus;
  connectedUsers: { clientId: number; name?: string; color?: string }[];
}> = ({ connectionStatus, connectedUsers }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
    <CircleIcon
      sx={{
        fontSize: 10,
        color: connectionStatus === 'connected'
          ? 'success.main'
          : connectionStatus === 'connecting'
            ? 'warning.main'
            : 'error.main',
      }}
    />
    <Typography
      variant="caption"
      color={connectionStatus === 'disconnected' ? 'error' : 'text.secondary'}
      sx={{ whiteSpace: 'nowrap', fontWeight: connectionStatus !== 'connected' ? 600 : 400 }}
    >
      {connectionStatus === 'connected'
        ? `Connected (${connectedUsers.length} user${connectedUsers.length !== 1 ? 's' : ''})`
        : connectionStatus === 'connecting'
          ? 'Reconnecting…'
          : 'Offline'}
    </Typography>
    {connectedUsers.filter(u => u.color).map(u => (
      <Tooltip key={u.clientId} title={u.name ?? 'User'} arrow>
        <CircleIcon sx={{ fontSize: 10, color: u.color }} />
      </Tooltip>
    ))}
  </Box>
);

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

const CellDocEditor: React.FC<CellDocEditorProps> = ({
  content,
  onChange,
  externalContentKey,
  readOnly = false,
  placeholder: placeholderText = "Type '/' for commands",
  minHeight = '400px',
  collaborative,
  documentId,
  token,
  collaborationUserName,
}) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  const editorContent = useMemo(() => getTiptapEditorContent(content), [content]);

  /* Seed extensions for collaboration — cell-doc needs the full extension set */
  const cellDocSeedExtensions = useMemo(
    () => buildCellDocExtensions({ disableUndoRedo: true }),
    [],
  );

  const collab = useCollaborativeEditor({
    documentId: documentId ?? '',
    token: token ?? '',
    enabled: !!collaborative && !!documentId && !!token,
    userName: collaborationUserName,
    seedExtensions: cellDocSeedExtensions,
  });

  const extensions = useMemo(() => {
    const isCollaborative = !!collaborative && !!collab.ydoc;
    const exts = [
      ...buildCellDocExtensions({ disableUndoRedo: isCollaborative }),
      Placeholder.configure({ placeholder: placeholderText }),
    ];

    if (isCollaborative) {
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

  /* Sync readOnly changes */
  useEffect(() => {
    if (editor) editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  /* Sync external content changes (version revert, etc.) */
  const syncExternalContent = useCallback(() => {
    if (!editor || externalContentKey === undefined || externalContentKey === null) return;
    if (collaborative && collab.ydoc) return; /* Yjs owns content in collab mode */

    const nextContent = JSON.stringify(editorContent);
    const currentContent = JSON.stringify(editor.getJSON());
    if (currentContent === nextContent) return;

    editor.commands.setContent(editorContent, { emitUpdate: false });
  }, [editor, editorContent, externalContentKey, collaborative, collab.ydoc]);

  useEffect(() => {
    syncExternalContent();
  }, [syncExternalContent]);

  if (!editor) return null;

  return (
    <Box>
      {collaborative && <ConnectionStatusBanner status={collab.connectionStatus} />}
      {collaborative && (
        <CollabStatusBar
          connectionStatus={collab.connectionStatus}
          connectedUsers={collab.connectedUsers}
        />
      )}
      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          /* Leave space for the gutter ⋮ button */
          pl: readOnly ? 0 : '40px',
        }}
      >
        <CellDocEditorSurface
          editor={editor}
          minHeight={minHeight}
          readOnly={readOnly}
        />
        {!readOnly && <InlineFormatMenu editor={editor} />}
        {!readOnly && <BlockContextMenu editor={editor} editorContainerRef={containerRef} />}
      </Box>
    </Box>
  );
};

export default CellDocEditor;
