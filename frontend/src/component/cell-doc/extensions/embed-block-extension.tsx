import React from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

import { EmbedBlockNodeView } from '../node-views/embed-block-node-view';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embedBlock: {
      insertEmbedBlock: () => ReturnType;
    };
  }
}

export interface EmbedBlockOptions {
  token?: string;
  documentId?: string;
}

export const EmbedBlock = Node.create<EmbedBlockOptions>({
  name: 'embedBlock',
  group: 'block',
  atom: true,
  selectable: true,

  addOptions() {
    return {
      token: undefined,
      documentId: undefined,
    };
  },

  addAttributes() {
    return {
      sourceDocumentId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-source-document-id'),
        renderHTML: (attributes) => (
          attributes.sourceDocumentId
            ? { 'data-source-document-id': String(attributes.sourceDocumentId) }
            : {}
        ),
      },
      sourceBlockId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-source-block-id'),
        renderHTML: (attributes) => (
          attributes.sourceBlockId
            ? { 'data-source-block-id': String(attributes.sourceBlockId) }
            : {}
        ),
      },
      sourceVersionIdAtSave: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-source-version-id'),
        renderHTML: (attributes) => (
          attributes.sourceVersionIdAtSave
            ? { 'data-source-version-id': String(attributes.sourceVersionIdAtSave) }
            : {}
        ),
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-label'),
        renderHTML: (attributes) => (
          attributes.label ? { 'data-label': String(attributes.label) } : {}
        ),
      },
      previewText: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-preview-text'),
        renderHTML: (attributes) => (
          attributes.previewText
            ? { 'data-preview-text': String(attributes.previewText) }
            : {}
        ),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-embed-block]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-embed-block': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer((props) => (
      <EmbedBlockNodeView
        {...props}
        token={this.options.token}
        documentId={this.options.documentId}
      />
    ));
  },

  addCommands() {
    return {
      insertEmbedBlock:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
          }),
    };
  },
});
