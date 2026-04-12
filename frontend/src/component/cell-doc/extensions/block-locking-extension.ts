import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Transaction } from '@tiptap/pm/state';

import {
  CELL_DOC_BLOCK_NODE_NAMES,
  isCellDocBlockNodeName,
  isLockedNode,
} from './block-node-utils';

const blockLockingPluginKey = new PluginKey('cellDocBlockLocking');

type ChangedRange = {
  oldFrom: number;
  oldTo: number;
  newFrom: number;
  newTo: number;
};

function collectChangedRanges(transaction: Transaction): ChangedRange[] {
  const ranges: ChangedRange[] = [];

  transaction.mapping.maps.forEach((map) => {
    map.forEach((oldStart, oldEnd, newStart, newEnd) => {
      ranges.push({ oldFrom: oldStart, oldTo: oldEnd, newFrom: newStart, newTo: newEnd });
    });
  });

  return ranges;
}

function rangeTouchesLockedBlocks(
  doc: ProseMirrorNode,
  from: number,
  to: number,
): boolean {
  let touched = false;

  doc.nodesBetween(from, to, (node) => {
    if (!isCellDocBlockNodeName(node.type.name)) return true;
    if (!isLockedNode(node)) return true;
    touched = true;
    return false;
  });

  return touched;
}

export interface BlockLockingOptions {
  canBypassLocks?: boolean;
}

export const BlockLocking = Extension.create<BlockLockingOptions>({
  name: 'cellDocBlockLocking',

  addOptions() {
    return {
      canBypassLocks: true,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: [...CELL_DOC_BLOCK_NODE_NAMES],
        attributes: {
          locked: {
            default: false,
            parseHTML: (element) => element.getAttribute('data-block-locked') === 'true',
            renderHTML: (attributes) => (
              attributes.locked ? { 'data-block-locked': 'true' } : {}
            ),
          },
          lockedByUserId: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-block-locked-by'),
            renderHTML: (attributes) => (
              attributes.lockedByUserId
                ? { 'data-block-locked-by': String(attributes.lockedByUserId) }
                : {}
            ),
          },
          lockedAt: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-block-locked-at'),
            renderHTML: (attributes) => (
              attributes.lockedAt
                ? { 'data-block-locked-at': String(attributes.lockedAt) }
                : {}
            ),
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    if (this.options.canBypassLocks) return [];

    return [
      new Plugin({
        key: blockLockingPluginKey,
        filterTransaction: (transaction, state) => {
          if (!transaction.docChanged) return true;

          const changedRanges = collectChangedRanges(transaction);
          if (changedRanges.length === 0) return true;

          return !changedRanges.some((range) => (
            rangeTouchesLockedBlocks(state.doc, range.oldFrom, range.oldTo)
            || rangeTouchesLockedBlocks(transaction.doc, range.newFrom, range.newTo)
          ));
        },
      }),
    ];
  },
});
