import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { CommandMenu } from '@/components/editor/CommandMenu';
import { SLASH_COMMANDS } from './slash-commands-data';

/**
 * Slash command extension for TipTap editor.
 * Triggers a command menu when user types "/" character.
 *
 * Features:
 * - Detects "/" trigger character
 * - Filters commands based on query text
 * - Renders CommandMenu React component in popup
 * - Uses Tippy.js for intelligent positioning
 * - Handles keyboard navigation (Escape, ArrowUp, ArrowDown, Enter)
 * - Cleans up popup and component on exit
 */
export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: { editor: unknown; range: unknown; props: { command: (args: unknown) => void } }) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          return SLASH_COMMANDS.filter((item) => {
            const searchQuery = query.toLowerCase();
            return (
              item.title.toLowerCase().includes(searchQuery) ||
              item.keywords.some((keyword) =>
                keyword.toLowerCase().includes(searchQuery)
              )
            );
          });
        },
        render: () => {
          let component: ReactRenderer | undefined;
          let popup: TippyInstance[] | undefined;

          return {
            onStart: (props: Record<string, unknown>) => {
              component = new ReactRenderer(CommandMenu, {
                props: props as Record<string, unknown>,
                editor: this.editor,
              });

              if (!props || typeof props !== 'object' || !('clientRect' in props)) {
                return;
              }

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              });
            },

            onUpdate(props: Record<string, unknown>) {
              if (!component) return;
              component.updateProps(props as Record<string, unknown>);

              if (!popup || !props || typeof props !== 'object' || !('clientRect' in props)) {
                return;
              }

              popup[0].setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect,
              });
            },

            onKeyDown(props: { event: KeyboardEvent }) {
              if (props.event.key === 'Escape') {
                if (popup) {
                  popup[0].hide();
                }
                return true;
              }

              const ref = component?.ref as { onKeyDown?: (props: { event: KeyboardEvent }) => boolean } | undefined;
              if (!ref || !ref.onKeyDown) {
                return false;
              }

              return ref.onKeyDown(props);
            },

            onExit() {
              if (popup) {
                popup[0].destroy();
              }
              if (component) {
                component.destroy();
              }
            },
          };
        },
      }),
    ];
  },
});
