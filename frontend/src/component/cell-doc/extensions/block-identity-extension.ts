import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

import {
  CELL_DOC_BLOCK_NODE_NAMES,
  createBlockId,
  isCellDocBlockNodeName,
} from './block-node-utils';

const blockIdentityPluginKey = new PluginKey('cellDocBlockIdentity');

export const BlockIdentity = Extension.create({
  name: 'cellDocBlockIdentity',

  addGlobalAttributes() {
    return [
      {
        types: [...CELL_DOC_BLOCK_NODE_NAMES],
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) =>
              element.getAttribute('data-block-id') ?? element.getAttribute('blockId'),
            renderHTML: (attributes) =>
              attributes.blockId
                ? {
                  'data-block-id': String(attributes.blockId),
                  blockId: String(attributes.blockId),
                }
                : {},
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: blockIdentityPluginKey,
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((transaction) => transaction.docChanged)) return null;

          const seenIds = new Set<string>();
          const tr = newState.tr;
          let mutated = false;

          newState.doc.descendants((node, pos) => {
            if (!isCellDocBlockNodeName(node.type.name)) return true;

            const blockId = typeof node.attrs.blockId === 'string' ? node.attrs.blockId : '';
            if (blockId && !seenIds.has(blockId)) {
              seenIds.add(blockId);
              return true;
            }

            const nextBlockId = createBlockId();
            seenIds.add(nextBlockId);
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              blockId: nextBlockId,
            }, node.marks);
            mutated = true;
            return true;
          });

          return mutated ? tr : null;
        },
      }),
    ];
  },
});
