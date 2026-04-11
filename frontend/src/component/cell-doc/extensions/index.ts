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

export type { BaseExtensionOptions } from './base-extensions';
export { buildBaseDocumentExtensions } from './base-extensions';
export { buildTaskListExtensions } from './task-list-extensions';
export { Callout, type CalloutType, CALLOUT_TYPES } from './callout-extension';
export { Details, DetailsSummary } from './toggle-extension';
export { buildTableExtensions } from './table-extensions';

export interface CellDocExtensionOptions extends BaseExtensionOptions {}

export function buildCellDocExtensions(
  options?: CellDocExtensionOptions,
): Extensions {
  return [
    ...buildBaseDocumentExtensions(options),
    ...buildTaskListExtensions(),
    Callout,
    DetailsSummary,
    Details,
    ...buildTableExtensions(),
  ];
}
