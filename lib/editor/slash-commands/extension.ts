/**
 * Slash Command Extension
 * TipTap extension for slash commands
 */

import { Extension, type Editor } from '@tiptap/core';
import type { Range } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import { computePosition, flip, shift, offset, autoUpdate, type Placement } from '@floating-ui/dom';
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

interface CleanupFunction {
  (): void;
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
          let popupElement: HTMLElement | null = null;
          let selectedIndex = 0;
          let cleanup: CleanupFunction | null = null;

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

              // Create popup element
              popupElement = component.element;
              document.body.appendChild(popupElement);

              // Set initial styles
              Object.assign(popupElement.style, {
                position: 'fixed',
                top: '0',
                left: '0',
              });

              // Get reference rect
              const getReferenceRect = props.clientRect as () => DOMRect;
              const referenceElement = {
                getBoundingClientRect: getReferenceRect,
              };

              // Determine optimal placement based on viewport space
              const rect = getReferenceRect();
              const viewportHeight = window.innerHeight;
              const spaceBelow = viewportHeight - rect.bottom;
              const menuHeight = window.innerWidth < 640 ? viewportHeight * 0.6 : 384;

              // Choose placement: if in bottom half OR insufficient space below, show above
              const initialPlacement: Placement =
                (rect.bottom > viewportHeight * 0.5 || spaceBelow < menuHeight)
                  ? 'top-start'
                  : 'bottom-start';

              // Update position function
              const updatePosition = async () => {
                if (!popupElement) return;

                const { x, y, placement } = await computePosition(
                  referenceElement,
                  popupElement,
                  {
                    placement: initialPlacement,
                    strategy: 'fixed',
                    middleware: [
                      offset(8), // 8px gap between cursor and menu
                      flip({
                        fallbackPlacements: ['top-start', 'bottom-start', 'top', 'bottom'],
                        padding: 8,
                      }),
                      shift({
                        padding: 8,
                      }),
                    ],
                  }
                );

                Object.assign(popupElement.style, {
                  left: `${x}px`,
                  top: `${y}px`,
                });
              };

              // Initial position update
              updatePosition();

              // Auto-update on scroll/resize
              cleanup = autoUpdate(
                referenceElement,
                popupElement,
                updatePosition,
                {
                  animationFrame: true,
                }
              );
            },

            onUpdate: (props: OnUpdateProps) => {
              if (component) {
                component.updateProps({
                  items: props.items,
                  selectedIndex,
                  query: props.query,
                });
              }

              if (!props.clientRect || !popupElement) {
                return;
              }

              // Recalculate position on update
              const getReferenceRect = props.clientRect as () => DOMRect;
              const referenceElement = {
                getBoundingClientRect: getReferenceRect,
              };

              const updatePosition = async () => {
                if (!popupElement) return;

                // Recalculate optimal placement
                const rect = getReferenceRect();
                const viewportHeight = window.innerHeight;
                const spaceBelow = viewportHeight - rect.bottom;
                const menuHeight = window.innerWidth < 640 ? viewportHeight * 0.6 : 384;

                const newPlacement: Placement =
                  (rect.bottom > viewportHeight * 0.5 || spaceBelow < menuHeight)
                    ? 'top-start'
                    : 'bottom-start';

                const { x, y } = await computePosition(
                  referenceElement,
                  popupElement,
                  {
                    placement: newPlacement,
                    strategy: 'fixed',
                    middleware: [
                      offset(8),
                      flip({
                        fallbackPlacements: ['top-start', 'bottom-start', 'top', 'bottom'],
                        padding: 8,
                      }),
                      shift({
                        padding: 8,
                      }),
                    ],
                  }
                );

                Object.assign(popupElement.style, {
                  left: `${x}px`,
                  top: `${y}px`,
                });
              };

              updatePosition();
            },

            onKeyDown: (props: OnKeyDownProps) => {
              if (!popupElement || !component || !props.items || props.items.length === 0) {
                return false;
              }

              if (props.event.key === 'Escape') {
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
              // Cleanup auto-update
              if (cleanup) {
                cleanup();
                cleanup = null;
              }

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
