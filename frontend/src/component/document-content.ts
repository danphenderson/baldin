import type { DocumentContentFormat } from '../service/documents';

type TiptapNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
};

export type DocumentBlockSnapshotNode = {
  id?: string | null;
  block_type?: string;
  content?: unknown;
  properties?: Record<string, unknown> | null;
  children?: DocumentBlockSnapshotNode[] | null;
};

export type FlattenedDocumentBlockSnapshot = {
  blockId: string;
  blockType: string;
  path: string;
  text: string;
};

const STRUCTURAL_BLOCK_TYPES = new Set([
  'bullet_list',
  'ordered_list',
  'task_list',
  'table',
  'table_row',
]);

function looksLikeSerializedJson(content: string): boolean {
  return /^[\s]*[{[]/.test(content);
}

export function parseTiptapDocument(content: string): TiptapNode | null {
  if (!content.trim()) return null;

  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && (parsed as TiptapNode).type === 'doc') {
      return parsed as TiptapNode;
    }
  } catch {
    return null;
  }

  return null;
}

function joinNodeText(content: TiptapNode[] | undefined, separator = ''): string {
  return (content ?? []).map(extractNodeText).join(separator);
}

function extractNodeText(node: TiptapNode): string {
  if (node.type === 'text' && typeof node.text === 'string') return node.text;
  if (node.type === 'hardBreak') return '\n';

  switch (node.type) {
    case 'mentionBlock':
      return typeof node.attrs?.label === 'string' ? node.attrs.label : '';
    case 'embedBlock':
      return typeof node.attrs?.previewText === 'string'
        ? node.attrs.previewText
        : typeof node.attrs?.label === 'string'
          ? node.attrs.label
          : '';
    case 'doc':
    case 'bulletList':
    case 'orderedList':
    case 'taskList':
    case 'details':
    case 'table':
      return joinNodeText(node.content, '\n');
    case 'tableRow':
      return joinNodeText(node.content, ' | ');
    case 'detailsSummary':
      return joinNodeText(node.content);
    case 'taskItem': {
      const checked = node.attrs?.checked === true;
      return `${checked ? '[x]' : '[ ]'} ${joinNodeText(node.content)}`.trimEnd();
    }
    case 'callout': {
      const calloutType = typeof node.attrs?.callout_type === 'string'
        ? node.attrs.callout_type
        : null;
      const body = joinNodeText(node.content, '\n');
      return calloutType ? `[${calloutType}] ${body}` : body;
    }
    default:
      if (!Array.isArray(node.content)) return '';
      return joinNodeText(node.content);
  }
}

export function extractPlainTextFromTiptapJson(content: string): string {
  const parsed = parseTiptapDocument(content);
  if (!parsed) {
    if (!content) return '';
    return looksLikeSerializedJson(content) ? '' : content;
  }

  return extractNodeText(parsed).replace(/\u00a0/g, ' ');
}

export function extractPlainTextFromDocumentContent(
  content: string | null | undefined,
  contentFormat: DocumentContentFormat,
): string {
  const safeContent = content ?? '';
  return contentFormat === 'tiptap_json'
    ? extractPlainTextFromTiptapJson(safeContent)
    : safeContent;
}

export function normalizeDocumentContent(
  content: string | null | undefined,
  contentFormat: DocumentContentFormat,
): { storedContent: string; plainText: string } {
  const storedContent = content ?? '';
  return {
    storedContent,
    plainText: extractPlainTextFromDocumentContent(storedContent, contentFormat),
  };
}

export function plainTextToTiptapDocument(text: string): Record<string, unknown> {
  const paragraphs = (text || '').split('\n').map(line => ({
    type: 'paragraph' as const,
    ...(line ? { content: [{ type: 'text' as const, text: line }] } : {}),
  }));

  return { type: 'doc', content: paragraphs };
}

export function getTiptapEditorContent(content: string): Record<string, unknown> {
  return parseTiptapDocument(content) ?? plainTextToTiptapDocument(content);
}

function snapshotNodeText(node: DocumentBlockSnapshotNode): string {
  const properties = node.properties ?? {};
  if (node.block_type === 'mention') {
    return typeof properties.label === 'string' ? properties.label.trim() : '';
  }
  if (node.block_type === 'embed') {
    if (typeof properties.previewText === 'string') return properties.previewText.trim();
    return typeof properties.label === 'string' ? properties.label.trim() : '';
  }

  const inlineText = Array.isArray(node.content)
    ? extractNodeText({ type: 'doc', content: node.content as TiptapNode[] })
    : '';

  if (node.block_type === 'task_item') {
    const prefix = properties.checked === true ? '[x] ' : '[ ] ';
    return `${prefix}${inlineText}`.trim();
  }

  return inlineText.trim();
}

export function flattenDocumentBlockSnapshot(
  snapshot: DocumentBlockSnapshotNode[] | null | undefined,
): FlattenedDocumentBlockSnapshot[] {
  if (!Array.isArray(snapshot)) return [];

  const flattened: FlattenedDocumentBlockSnapshot[] = [];

  const visit = (nodes: DocumentBlockSnapshotNode[], parentPath: string) => {
    nodes.forEach((node, index) => {
      const path = parentPath ? `${parentPath}.${index}` : String(index);
      const blockType = typeof node.block_type === 'string' ? node.block_type : 'unknown';
      const text = snapshotNodeText(node).replace(/\u00a0/g, ' ');

      if (text || !STRUCTURAL_BLOCK_TYPES.has(blockType)) {
        flattened.push({
          blockId: typeof node.id === 'string' && node.id ? node.id : path,
          blockType,
          path,
          text,
        });
      }

      if (Array.isArray(node.children) && node.children.length > 0) {
        visit(node.children, path);
      }
    });
  };

  visit(snapshot, '');
  return flattened;
}

export function extractPlainTextFromBlockSnapshot(
  snapshot: DocumentBlockSnapshotNode[] | null | undefined,
): string {
  return flattenDocumentBlockSnapshot(snapshot)
    .map((block) => block.text)
    .filter((text) => text.length > 0)
    .join('\n');
}
