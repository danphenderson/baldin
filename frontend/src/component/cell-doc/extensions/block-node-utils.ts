import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export const CELL_DOC_BLOCK_NODE_NAMES = [
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'taskList',
  'taskItem',
  'blockquote',
  'codeBlock',
  'callout',
  'details',
  'table',
  'tableRow',
  'tableCell',
  'tableHeader',
  'horizontalRule',
  'mentionBlock',
  'embedBlock',
] as const;

export type CellDocBlockNodeName = (typeof CELL_DOC_BLOCK_NODE_NAMES)[number];

const CELL_DOC_BLOCK_NODE_NAME_SET = new Set<string>(CELL_DOC_BLOCK_NODE_NAMES);

export function isCellDocBlockNodeName(name: string): name is CellDocBlockNodeName {
  return CELL_DOC_BLOCK_NODE_NAME_SET.has(name);
}

export function createBlockId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `block-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export interface LocatedBlockNode {
  node: ProseMirrorNode;
  pos: number;
}

export function findBlockNodeById(
  doc: ProseMirrorNode,
  blockId: string,
): LocatedBlockNode | null {
  let match: LocatedBlockNode | null = null;

  doc.descendants((node, pos) => {
    if (!isCellDocBlockNodeName(node.type.name)) return true;
    if (node.attrs.blockId !== blockId) return true;
    match = { node, pos };
    return false;
  });

  return match;
}

export function isLockedNode(node: ProseMirrorNode): boolean {
  return node.attrs.locked === true;
}
