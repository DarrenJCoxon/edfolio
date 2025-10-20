/**
 * Slash Command Extension
 * TipTap extension for slash commands
 */

import { Extension, type Editor } from '@tiptap/core';
import type { Range } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import { SlashCommandMenu } from '@/components/editor/SlashCommandMenu';
import { getCommandsForContext, filterCommands } from './registry';
import { detectContext } from './context';
import type { SlashCommandItem } from './types';

interface CommandProps {
  editor: Editor;
  range: Range;
  props: unknown;
}

interface AllowProps {
  state: unknown;
  range: Range;
}

interface OnStartProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
  clientRect?: () => DOMRect | null;
  query: string;
  editor: Editor;
}

interface OnUpdateProps {
  items: SlashCommandItem[];
  query: string;
  clientRect?: () => DOMRect | null;
}

interface OnKeyDownProps {
  event: KeyboardEvent;
  items: SlashCommandItem[];
  query: string;
  command: (item: SlashCommandItem) => void;
}

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        command: ({ editor, range, props }: CommandProps) => {
          const item = props as SlashCommandItem;

          // Execute the command action
          item.action({
            editor,
            range,
            query: '',
          });
        },
        allow: ({ state, range }: AllowProps) => {
          const stateObj = state as { doc: { resolve: (pos: number) => { depth: number; parent: { type: { name: string } } } } };
          const $from = stateObj.doc.resolve(range.from);
          const isRootDepth = $from.depth === 1;
          const isParagraph = $from.parent.type.name === 'paragraph';

          return isRootDepth || isParagraph;
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
          const context = detectContext();
          const contextCommands = getCommandsForContext(context);
          return filterCommands(contextCommands, query);
        },
        render: () => {
          let component: ReactRenderer | null = null;
          let popup: TippyInstance | null = null;
          let selectedIndex = 0;

          return {
            onStart: (props: OnStartProps) => {
              selectedIndex = 0;

              component = new ReactRenderer(SlashCommandMenu, {
                props: {
                  items: props.items,
                  selectedIndex,
                  onSelect: (item: SlashCommandItem) => {
                    props.command(item);
                  },
                  query: props.query,
                },
                editor: props.editor,
              });

              if (!props.clientRect) {
                return;
              }

              // Detect if on mobile
              const isMobile = window.innerWidth < 640;

              const body = document.querySelector('body');
              if (!body) return;

              const instances = tippy(body, {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: isMobile ? 'top-start' : 'bottom-start',
                offset: isMobile ? [0, 12] : [0, 8],
                animation: 'fade',
                duration: [200, 150],
                popperOptions: {
                  modifiers: [
                    {
                      name: 'preventOverflow',
                      options: {
                        boundary: 'viewport',
                        padding: isMobile ? 8 : 16,
                      },
                    },
                    {
                      name: 'flip',
                      options: {
                        boundary: 'viewport',
                        fallbackPlacements: isMobile
                          ? ['top-start', 'top', 'bottom-start', 'bottom']
                          : ['top-start', 'bottom-start', 'top', 'bottom'],
                      },
                    },
                  ],
                },
              });

              popup = Array.isArray(instances) ? instances[0] : instances;
            },

            onUpdate: (props: OnUpdateProps) => {
              if (component) {
                component.updateProps({
                  items: props.items,
                  selectedIndex,
                  query: props.query,
                });
              }

              if (!props.clientRect || !popup) {
                return;
              }

              popup.setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect,
              });
            },

            onKeyDown: (props: OnKeyDownProps) => {
              if (!popup || !component) {
                return false;
              }

              if (props.event.key === 'Escape') {
                popup.hide();
                return true;
              }

              if (props.event.key === 'ArrowUp') {
                selectedIndex = (selectedIndex - 1 + props.items.length) % props.items.length;
                component.updateProps({
                  items: props.items,
                  selectedIndex,
                  query: props.query,
                });
                return true;
              }

              if (props.event.key === 'ArrowDown') {
                selectedIndex = (selectedIndex + 1) % props.items.length;
                component.updateProps({
                  items: props.items,
                  selectedIndex,
                  query: props.query,
                });
                return true;
              }

              if (props.event.key === 'Enter') {
                if (props.items[selectedIndex]) {
                  props.command(props.items[selectedIndex]);
                }
                return true;
              }

              return false;
            },

            onExit: () => {
              if (popup) {
                popup.destroy();
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
