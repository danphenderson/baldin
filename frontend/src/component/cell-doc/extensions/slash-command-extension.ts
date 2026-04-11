/**
 * Slash-command palette extension for cell-doc.
 *
 * Triggers on '/' at the start of an empty block and renders a floating
 * command menu via ReactRenderer (position: fixed from clientRect).
 *
 * Uses @tiptap/suggestion for trigger/filter/keyboard management.
 * Menu is intentionally NOT wrapped in a ThemeProvider at this stage
 * (acceptable for dev-preview; Story 8 can reassess).
 */
import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';

import {
  SLASH_COMMAND_ITEMS,
  filterSlashItems,
  type SlashCommandItem,
} from './slash-command-items';
import {
  SlashCommandMenu,
  type SlashCommandMenuHandle,
} from '../menus/slash-command-menu';

const pluginKey = new PluginKey('slashCommand');

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  /**
   * Dismiss the suggestion when the editor loses focus.
   * Without this, the menu would stay open after a click-away event.
   */
  onBlur() {
    this.editor.view.dispatch(
      this.editor.view.state.tr.setMeta(pluginKey, { exit: true }),
    );
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        pluginKey,
        editor: this.editor,
        char: '/',
        allowSpaces: false,

        allow: ({ state, range }) => {
          const $from = state.selection.$from;
          const textBefore = state.doc.textBetween(
            $from.start(),
            range.from,
            undefined,
            '\0',
          );
          return textBefore.trim() === '';
        },

        items: ({ query }) => filterSlashItems(SLASH_COMMAND_ITEMS, query),

        command: ({ editor, range, props }) => {
          const item = props as SlashCommandItem;
          // Delete the slash trigger text then run the block command
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .run();

          item.command(editor);
        },

        render: () => {
          let component: ReactRenderer<SlashCommandMenuHandle> | null = null;
          let element: HTMLElement | null = null;

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashCommandMenu, {
                props: {
                  items: props.items as SlashCommandItem[],
                  command: (item: SlashCommandItem) => props.command(item),
                  clientRect: props.clientRect,
                },
                editor: props.editor,
              });

              element = component.element;
              document.body.appendChild(element);
            },

            onUpdate: (props) => {
              component?.updateProps({
                items: props.items as SlashCommandItem[],
                command: (item: SlashCommandItem) => props.command(item),
                clientRect: props.clientRect,
              });
            },

            onKeyDown: ({ event }) => {
              if (!component?.ref) return false;
              return component.ref.onKeyDown(event);
            },

            onExit: () => {
              element?.remove();
              component?.destroy();
              component = null;
              element = null;
            },
          };
        },
      }),
    ];
  },
});
