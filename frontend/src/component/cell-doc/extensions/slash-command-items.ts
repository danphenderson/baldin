/**
 * Slash-command palette item definitions for cell-doc editors.
 *
 * Each entry maps a trigger keyword + aliases to a TipTap command.
 * The items cover the full cell-doc node contract:
 *   Text, H1–H3, Bullet, Numbered, Task, Blockquote, Code Block,
 *   Callout Info/Warning/Tip/Danger, Toggle, Divider, Table, Agent Task,
 *   Mention, Embed.
 */
import type { Editor } from '@tiptap/core';
import type { CalloutType } from './callout-types';

export interface SlashCommandItem {
  title: string;
  description?: string;
  aliases: string[];
  command: (editor: Editor) => void;
}

export const SLASH_COMMAND_ITEMS: SlashCommandItem[] = [
  {
    title: 'Text',
    description: 'Plain paragraph',
    aliases: ['paragraph', 'plain', 'p'],
    command: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    title: 'Heading 1',
    description: 'Large section heading',
    aliases: ['h1', 'heading1', 'title'],
    command: (editor) =>
      editor.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    aliases: ['h2', 'heading2', 'subtitle'],
    command: (editor) =>
      editor.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    aliases: ['h3', 'heading3'],
    command: (editor) =>
      editor.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    title: 'Bullet List',
    description: 'Unordered list',
    aliases: ['ul', 'unordered', 'bullets', 'list'],
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: 'Numbered List',
    description: 'Ordered list',
    aliases: ['ol', 'ordered', 'numbers', 'numbered'],
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: 'Task List',
    description: 'Checklist with checkboxes',
    aliases: ['todo', 'tasks', 'checklist', 'check'],
    command: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    title: 'Blockquote',
    description: 'Quoted text',
    aliases: ['quote', 'bq', '>'],
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: 'Code Block',
    description: 'Monospace code block',
    aliases: ['code', 'codeblock', 'pre', '```'],
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: 'Callout Info',
    description: 'Informational callout block',
    aliases: ['info', 'note', 'callout-info'],
    command: (editor) =>
      editor.chain().focus().setCallout({ callout_type: 'info' as CalloutType }).run(),
  },
  {
    title: 'Callout Warning',
    description: 'Warning callout block',
    aliases: ['warning', 'warn', 'callout-warning'],
    command: (editor) =>
      editor.chain().focus().setCallout({ callout_type: 'warning' as CalloutType }).run(),
  },
  {
    title: 'Callout Tip',
    description: 'Tip callout block',
    aliases: ['tip', 'hint', 'callout-tip'],
    command: (editor) =>
      editor.chain().focus().setCallout({ callout_type: 'tip' as CalloutType }).run(),
  },
  {
    title: 'Callout Danger',
    description: 'Danger callout block',
    aliases: ['danger', 'error', 'callout-danger'],
    command: (editor) =>
      editor.chain().focus().setCallout({ callout_type: 'danger' as CalloutType }).run(),
  },
  {
    title: 'Toggle',
    description: 'Collapsible section',
    aliases: ['details', 'collapse', 'disclosure', 'accordion'],
    command: (editor) => editor.chain().focus().setDetails().run(),
  },
  {
    title: 'Divider',
    description: 'Horizontal rule',
    aliases: ['hr', 'rule', 'separator', 'line'],
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    title: 'Table',
    description: '3×3 table',
    aliases: ['table', 'grid'],
    command: (editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run(),
  },
  {
    title: 'Agent Task',
    description: 'Document-surface agent task block',
    aliases: ['agent', 'ai', '@', 'assistant', 'task'],
    command: (editor) => editor.chain().focus().insertAgentTask().run(),
  },
  {
    title: 'Mention',
    description: 'Standalone user or document reference',
    aliases: ['mention', 'reference', 'user', 'document'],
    command: (editor) => editor.chain().focus().insertMentionBlock().run(),
  },
  {
    title: 'Embed',
    description: 'Live-linked block transclusion from another cell-doc',
    aliases: ['embed', 'transclusion', 'transclude', 'reference-block'],
    command: (editor) => editor.chain().focus().insertEmbedBlock().run(),
  },
];

export function filterSlashItems(
  items: SlashCommandItem[],
  query: string,
): SlashCommandItem[] {
  if (!query) return items;
  const q = query.toLowerCase();
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.aliases.some((alias) => alias.toLowerCase().includes(q)),
  );
}
