/**
 * Callout node extension for cell-doc.
 *
 * Node contract:
 *   callout -> backend callout
 *   attrs.callout_type: 'info' | 'warning' | 'tip' | 'danger'
 *   content: paragraph block*
 */
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CalloutNodeView } from '../node-views/callout-node-view';
import type { CalloutType } from './callout-types';

export type { CalloutType } from './callout-types';
export { CALLOUT_TYPES } from './callout-types';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { callout_type?: CalloutType }) => ReturnType;
      toggleCallout: (attrs?: { callout_type?: CalloutType }) => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'paragraph block*',
  defining: true,

  addAttributes() {
    return {
      callout_type: {
        default: 'info' as CalloutType,
        parseHTML: (element) => element.getAttribute('data-callout-type') ?? 'info',
        renderHTML: (attributes) => ({ 'data-callout-type': attributes.callout_type }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-callout': '' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView);
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }) =>
          commands.wrapIn(this.name, attrs),
      toggleCallout:
        (attrs) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, attrs),
    };
  },
});
