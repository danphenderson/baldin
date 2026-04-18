import React from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

import { MentionBlockNodeView } from '../node-views/mention-block-node-view';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mentionBlock: {
      insertMentionBlock: () => ReturnType;
    };
  }
}

export interface MentionBlockOptions {
  token?: string;
  documentId?: string;
}

export const MentionBlock = Node.create<MentionBlockOptions>({
  name: 'mentionBlock',
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
      targetKind: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-target-kind'),
        renderHTML: (attributes) => (
          attributes.targetKind ? { 'data-target-kind': String(attributes.targetKind) } : {}
        ),
      },
      targetId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-target-id'),
        renderHTML: (attributes) => (
          attributes.targetId ? { 'data-target-id': String(attributes.targetId) } : {}
        ),
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-label'),
        renderHTML: (attributes) => (
          attributes.label ? { 'data-label': String(attributes.label) } : {}
        ),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-mention-block]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-mention-block': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer((props) => (
      <MentionBlockNodeView
        {...props}
        token={this.options.token}
        documentId={this.options.documentId}
      />
    ));
  },

  addCommands() {
    return {
      insertMentionBlock:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
          }),
    };
  },
});
