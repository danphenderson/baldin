/**
 * Shared base document extensions used by both the live TipTap editor
 * and collaboration bootstrap seeding.
 *
 * Centralises the extension graph that was previously duplicated between
 * rich-text-editor.tsx and collaboration-bootstrap.ts.
 */
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';

import type { Extensions } from '@tiptap/core';
import {
  AgentTask,
  AgentTaskTrigger,
  type AgentTaskEventHandler,
  type AgentTaskSurfaceKind,
} from './agent-task-extension';

export interface BaseExtensionOptions {
  /** Disable undo/redo when collaboration owns history. */
  disableUndoRedo?: boolean;
  surfaceKind?: AgentTaskSurfaceKind;
  onAgentTaskEvent?: AgentTaskEventHandler;
}

export function buildBaseDocumentExtensions(
  options?: BaseExtensionOptions,
): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: false,
      underline: false,
      ...(options?.disableUndoRedo ? { undoRedo: false } : {}),
    }),
    Underline,
    Link.configure({ openOnClick: false, autolink: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    AgentTask.configure({
      surfaceKind: options?.surfaceKind ?? 'rich_text_editor',
      onAgentTaskEvent: options?.onAgentTaskEvent,
    }),
    AgentTaskTrigger,
  ];
}
