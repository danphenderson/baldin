import type { DocumentContentFormat } from '../service/documents';

type TiptapNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
};

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
  if (!Array.isArray(node.content)) return '';

  switch (node.type) {
    case 'doc':
    case 'bulletList':
    case 'orderedList':
    case 'taskList':
    case 'details':
    case 'table':
      return joinNodeText(node.content, '\n');
    case 'tableRow':
      return joinNodeText(node.content, ' | ');
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
