/**
 * Cell-doc extension factory.
 *
 * Provides `buildCellDocExtensions()` which layers Story 5 block
 * extensions (task lists, callouts, toggles, tables) on top of the
 * shared base document extensions.
 */
import type { Extensions } from '@tiptap/core';

import { buildBaseDocumentExtensions, type BaseExtensionOptions } from './base-extensions';
import { buildTaskListExtensions } from './task-list-extensions';
import { Callout } from './callout-extension';
import { Details, DetailsSummary } from './toggle-extension';
import { buildTableExtensions } from './table-extensions';
import { BlockIdentity } from './block-identity-extension';
import { BlockLocking } from './block-locking-extension';
import {
  AgentTask,
  AgentTaskTrigger,
  type AgentTaskEvent,
  type AgentTaskEventHandler,
  type AgentTaskSurfaceKind,
  type AgentTaskStatus,
} from './agent-task-extension';
import { MentionBlock } from './mention-block-extension';
import { EmbedBlock } from './embed-block-extension';
import { SlashCommand } from './slash-command-extension';
import { BlockReorder } from './block-reorder-extension';
import type { DocumentShareRole } from '../../../service/documents';

export type { BaseExtensionOptions } from './base-extensions';
export { buildBaseDocumentExtensions } from './base-extensions';
export { buildTaskListExtensions } from './task-list-extensions';
export { Callout, type CalloutType, CALLOUT_TYPES } from './callout-extension';
export { Details, DetailsSummary } from './toggle-extension';
export { buildTableExtensions } from './table-extensions';
export { BlockIdentity } from './block-identity-extension';
export { BlockLocking } from './block-locking-extension';
export {
  AgentTask,
  AgentTaskTrigger,
  type AgentTaskEvent,
  type AgentTaskEventHandler,
  type AgentTaskSurfaceKind,
  type AgentTaskStatus,
} from './agent-task-extension';
export { MentionBlock } from './mention-block-extension';
export { EmbedBlock } from './embed-block-extension';
export { SlashCommand } from './slash-command-extension';
export { SLASH_COMMAND_ITEMS, type SlashCommandItem } from './slash-command-items';
export { BlockReorder, moveBlockUp, moveBlockDown } from './block-reorder-extension';

export interface CellDocExtensionOptions extends BaseExtensionOptions {
  token?: string;
  documentId?: string;
  viewerRole?: DocumentShareRole | null;
}

export function buildCellDocExtensions(
  options?: CellDocExtensionOptions,
): Extensions {
  const canBypassLocks = options?.viewerRole !== 'editor';

  return [
    ...buildBaseDocumentExtensions(options),
    ...buildTaskListExtensions(),
    Callout,
    DetailsSummary,
    Details,
    ...buildTableExtensions(),
    MentionBlock.configure({
      token: options?.token,
      documentId: options?.documentId,
    }),
    EmbedBlock.configure({
      token: options?.token,
      documentId: options?.documentId,
    }),
    BlockIdentity,
    BlockLocking.configure({
      canBypassLocks,
    }),
    SlashCommand,
    BlockReorder,
  ];
}
