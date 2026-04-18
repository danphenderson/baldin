/**
 * Mounted editor test harness for cell-doc extensions.
 *
 * Mounts a real TipTap editor with EditorContent so that node views,
 * commands, and the full extension graph are exercised the same way
 * as in production.
 */
import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import { useEditor } from '@tiptap/react';
import Collaboration from '@tiptap/extension-collaboration';
import type { Editor, JSONContent, Extensions } from '@tiptap/core';
import type * as Y from 'yjs';

import { CellDocEditorSurface } from '@/component/cell-doc/cell-doc-editor-surface';

export interface EditorHarnessHandle {
  editor: Editor | null;
  getJSON: () => JSONContent | undefined;
}

interface EditorHarnessProps {
  extensions: Extensions;
  content?: JSONContent;
  editable?: boolean;
  collaborationDocument?: Y.Doc;
  minHeight?: string;
}

export const EditorHarness = forwardRef<EditorHarnessHandle, EditorHarnessProps>(
  ({
    extensions,
    content,
    editable = true,
    collaborationDocument,
    minHeight,
  }, ref) => {
    const editor = useEditor({
      extensions: [
        ...extensions,
        ...(collaborationDocument
          ? [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Collaboration.configure({ document: collaborationDocument }) as any,
          ]
          : []),
      ],
      content: collaborationDocument ? undefined : (content ?? { type: 'doc', content: [{ type: 'paragraph' }] }),
      editable,
    });

    useEffect(() => {
      if (editor) editor.setEditable(editable);
    }, [editor, editable]);

    useEffect(() => {
      if (!editor || !collaborationDocument || !content) return;

      editor.commands.setContent(content, { emitUpdate: false });
    }, [collaborationDocument, content, editor]);

    useImperativeHandle(ref, () => ({
      editor,
      getJSON: () => editor?.getJSON(),
    }), [editor]);

    if (!editor) return null;

    return <CellDocEditorSurface editor={editor} minHeight={minHeight} readOnly={!editable} />;
  },
);

EditorHarness.displayName = 'EditorHarness';
