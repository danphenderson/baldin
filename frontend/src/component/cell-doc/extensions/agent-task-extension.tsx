import React from 'react';
import { Extension, Node, mergeAttributes } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import type { EditorState } from '@tiptap/pm/state';
import { NodeSelection, Plugin, PluginKey } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';

import { AgentTaskNodeView } from '../node-views/agent-task-node-view';

export type AgentTaskSurfaceKind = 'rich_text_editor' | 'cell_doc_editor';
export type AgentTaskStatus =
  | 'draft'
  | 'running'
  | 'completed'
  | 'failed'
  | 'applied'
  | 'dismissed';

export interface AgentTaskAttrs {
  taskId: string | null;
  agentId: string | null;
  agentLabel: string | null;
  promptText: string | null;
  status: AgentTaskStatus;
  summary: string | null;
}

export type AgentTaskEventType =
  | 'inserted'
  | 'picker_requested'
  | 'run_requested'
  | 'apply_requested'
  | 'dismiss_requested';

export interface AgentTaskEvent {
  type: AgentTaskEventType;
  taskId: string;
  position: number | null;
  surfaceKind: AgentTaskSurfaceKind;
  task: AgentTaskAttrs;
  editor: Editor;
}

export type AgentTaskEventHandler = (event: AgentTaskEvent) => void;

export interface AgentTaskOptions {
  surfaceKind: AgentTaskSurfaceKind;
  onAgentTaskEvent?: AgentTaskEventHandler;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    agentTask: {
      insertAgentTask: (attrs?: Partial<AgentTaskAttrs>) => ReturnType;
    };
  }
}

const agentTaskIdentityPluginKey = new PluginKey('agentTaskIdentity');
const agentTaskSuggestionPluginKey = new PluginKey('agentTaskSuggestion');
const AGENT_TASK_TRIGGER_ITEM = { id: 'agent-task-trigger' } as const;

function createAgentTaskId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `agent-task-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function isAgentTaskStatus(value: unknown): value is AgentTaskStatus {
  return value === 'draft'
    || value === 'running'
    || value === 'completed'
    || value === 'failed'
    || value === 'applied'
    || value === 'dismissed';
}

function normalizeAgentTaskAttrs(attrs?: Partial<AgentTaskAttrs>): AgentTaskAttrs {
  return {
    taskId: typeof attrs?.taskId === 'string' && attrs.taskId ? attrs.taskId : createAgentTaskId(),
    agentId: typeof attrs?.agentId === 'string' && attrs.agentId ? attrs.agentId : null,
    agentLabel: typeof attrs?.agentLabel === 'string' && attrs.agentLabel ? attrs.agentLabel : null,
    promptText: typeof attrs?.promptText === 'string' ? attrs.promptText : null,
    status: isAgentTaskStatus(attrs?.status) ? attrs.status : 'draft',
    summary: typeof attrs?.summary === 'string' && attrs.summary ? attrs.summary : null,
  };
}

function getTopLevelBlockSelection(state: Pick<EditorState, 'selection'>) {
  const { $from } = state.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth - 1).type.name === 'doc') {
      return {
        depth,
        node: $from.node(depth),
        pos: $from.before(depth),
      };
    }
  }

  return null;
}

function emitAgentTaskEvent(
  editor: Editor,
  options: AgentTaskOptions,
  type: AgentTaskEventType,
  task: AgentTaskAttrs,
  position: number | null,
) {
  if (!task.taskId) return;

  options.onAgentTaskEvent?.({
    type,
    taskId: task.taskId,
    position,
    surfaceKind: options.surfaceKind,
    task,
    editor,
  });
}

export const AgentTask = Node.create<AgentTaskOptions>({
  name: 'agentTask',
  group: 'block',
  atom: true,
  selectable: true,

  addOptions() {
    return {
      surfaceKind: 'rich_text_editor',
      onAgentTaskEvent: undefined,
    };
  },

  addAttributes() {
    return {
      taskId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-task-id'),
        renderHTML: (attributes) => (
          attributes.taskId ? { 'data-task-id': String(attributes.taskId) } : {}
        ),
      },
      agentId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-agent-id'),
        renderHTML: (attributes) => (
          attributes.agentId ? { 'data-agent-id': String(attributes.agentId) } : {}
        ),
      },
      agentLabel: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-agent-label'),
        renderHTML: (attributes) => (
          attributes.agentLabel ? { 'data-agent-label': String(attributes.agentLabel) } : {}
        ),
      },
      promptText: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-prompt-text'),
        renderHTML: (attributes) => (
          typeof attributes.promptText === 'string'
            ? { 'data-prompt-text': String(attributes.promptText) }
            : {}
        ),
      },
      status: {
        default: 'draft',
        parseHTML: (element) => element.getAttribute('data-agent-task-status') ?? 'draft',
        renderHTML: (attributes) => (
          attributes.status ? { 'data-agent-task-status': String(attributes.status) } : {}
        ),
      },
      summary: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-agent-task-summary'),
        renderHTML: (attributes) => (
          attributes.summary ? { 'data-agent-task-summary': String(attributes.summary) } : {}
        ),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-agent-task]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-agent-task': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer((props) => (
      <AgentTaskNodeView
        {...props}
        surfaceKind={this.options.surfaceKind}
        onAgentTaskEvent={this.options.onAgentTaskEvent}
      />
    ));
  },

  addCommands() {
    return {
      insertAgentTask:
        (attrs = {}) =>
        ({ editor, tr, dispatch }) => {
          const blockSelection = getTopLevelBlockSelection(editor.state);
          const nextAttrs = normalizeAgentTaskAttrs(attrs);
          const node = editor.schema.nodes[this.name]?.create(nextAttrs);

          if (!node) return false;
          let insertPos = 0;

          if (
            blockSelection
            && blockSelection.node.type.name === 'paragraph'
            && blockSelection.node.content.size === 0
          ) {
            tr.replaceWith(
              blockSelection.pos,
              blockSelection.pos + blockSelection.node.nodeSize,
              node,
            );
            insertPos = blockSelection.pos;
          } else if (blockSelection) {
            insertPos = blockSelection.pos + blockSelection.node.nodeSize;
            tr.insert(insertPos, node);
          } else {
            insertPos = tr.doc.content.size;
            tr.insert(insertPos, node);
          }

          tr.setSelection(NodeSelection.create(tr.doc, insertPos));
          dispatch?.(tr.scrollIntoView());
          emitAgentTaskEvent(editor, this.options, 'inserted', nextAttrs, insertPos);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: agentTaskIdentityPluginKey,
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((transaction) => transaction.docChanged)) return null;

          const seenIds = new Set<string>();
          const tr = newState.tr;
          let mutated = false;

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== this.name) return true;

            const taskId = typeof node.attrs.taskId === 'string' ? node.attrs.taskId : '';
            if (taskId && !seenIds.has(taskId)) {
              seenIds.add(taskId);
              return true;
            }

            const nextTaskId = createAgentTaskId();
            seenIds.add(nextTaskId);
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              taskId: nextTaskId,
            }, node.marks);
            mutated = true;
            return true;
          });

          return mutated ? tr : null;
        },
      }),
    ];
  },

  onCreate() {
    const tr = this.editor.state.tr;
    const seenIds = new Set<string>();
    let mutated = false;

    this.editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== this.name) return true;

      const taskId = typeof node.attrs.taskId === 'string' ? node.attrs.taskId : '';
      if (taskId && !seenIds.has(taskId)) {
        seenIds.add(taskId);
        return true;
      }

      const nextTaskId = createAgentTaskId();
      seenIds.add(nextTaskId);
      tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        taskId: nextTaskId,
      }, node.marks);
      mutated = true;
      return true;
    });

    if (mutated) {
      this.editor.view.dispatch(tr);
    }
  },
});

export const AgentTaskTrigger = Extension.create({
  name: 'agentTaskTrigger',

  addProseMirrorPlugins() {
    return [
      Suggestion({
        pluginKey: agentTaskSuggestionPluginKey,
        editor: this.editor,
        char: '@',
        allowSpaces: false,

        allow: ({ state, range }) => {
          if (!this.editor.isEditable || !state.selection.empty) return false;

          const { $from } = state.selection;
          if ($from.parent.type.spec.code) return false;

          const textBefore = state.doc.textBetween(
            $from.start(),
            range.from,
            undefined,
            '\0',
          );
          const textAfter = state.doc.textBetween(
            range.to,
            $from.end(),
            undefined,
            '\0',
          );
          const emptyBlock = $from.parent.textContent.trim() === '';
          const boundaryBefore = textBefore.trim() === '' || /\s$/.test(textBefore);
          const boundaryAfter = textAfter.trim() === '';

          return emptyBlock || (boundaryBefore && boundaryAfter);
        },

        items: () => [AGENT_TASK_TRIGGER_ITEM],

        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).insertAgentTask().run();
        },

        render: () => ({
          onStart: (props) => {
            props.command(AGENT_TASK_TRIGGER_ITEM);
          },
        }),
      }),
    ];
  },
});
