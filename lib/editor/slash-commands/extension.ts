/**
 * Slash Command Extension
 * TipTap extension for slash commands
 */

import { Extension, type Editor } from '@tiptap/core';
import type { Range } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
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
          const stateObj = state as {
            doc: {
              resolve: (pos: number) => { depth: number; parent: { type: { name: string } } };
              textBetween: (from: number, to: number) => string;
            }
          };
          const $from = stateObj.doc.resolve(range.from);
          const isRootDepth = $from.depth === 1;
          const isParagraph = $from.parent.type.name === 'paragraph';

          // Check if there's a space immediately after the slash
          // If range.from is the slash position, range.to is the current cursor position
          const textAfterSlash = stateObj.doc.textBetween(range.from + 1, range.to);

          // Don't trigger if the first character after slash is a space
          if (textAfterSlash.startsWith(' ')) {
            return false;
          }

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
          let popupElement: HTMLElement | null = null;

          return {
            onStart: (props: OnStartProps) => {
              component = new ReactRenderer(SlashCommandMenu, {
                props: {
                  items: props.items,
                  onSelect: (item: SlashCommandItem) => {
                    props.command(item);
                  },
                  query: props.query,
                  getReferenceClientRect: props.clientRect,
                },
                editor: props.editor,
              });

              if (!props.clientRect) {
                return;
              }

              // Append to document body (positioning now handled by component)
              popupElement = component.element;
              document.body.appendChild(popupElement);
            },

            onUpdate: (props: OnUpdateProps) => {
              if (component) {
                component.updateProps({
                  items: props.items,
                  query: props.query,
                  getReferenceClientRect: props.clientRect,
                });
              }
            },

            onKeyDown: (props: OnKeyDownProps) => {
              if (!popupElement || !component || !props.items || props.items.length === 0) {
                return false;
              }

              // Escape key closes the menu
              if (props.event.key === 'Escape') {
                return true;
              }

              // Arrow keys and Enter are handled by FloatingFocusManager + useListNavigation
              // Return false to let the events pass through to the menu
              if (props.event.key === 'ArrowUp' || props.event.key === 'ArrowDown' || props.event.key === 'Enter') {
                return false;
              }

              return false;
            },

            onExit: () => {
              // Remove popup element
              if (popupElement && popupElement.parentNode) {
                popupElement.parentNode.removeChild(popupElement);
              }
              popupElement = null;

              // Destroy React component
              if (component) {
                component.destroy();
                component = null;
              }
            },
          };
        },
      }),
    ];
  },
});
