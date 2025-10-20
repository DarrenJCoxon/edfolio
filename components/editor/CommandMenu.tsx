'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';
import type { CommandMenuProps } from '@/types';

/**
 * Command menu component for slash commands in the editor.
 * Displays a list of formatting commands with keyboard navigation support.
 *
 * Features:
 * - Arrow key navigation (ArrowUp/ArrowDown)
 * - Enter to execute command
 * - Visual feedback for selected item
 * - Hover states
 * - Accessibility attributes (ARIA)
 */
export const CommandMenu = forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent }) => boolean },
  CommandMenuProps
>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((prev) =>
      prev === 0 ? props.items.length - 1 : prev - 1
    );
  };

  const downHandler = () => {
    setSelectedIndex((prev) =>
      prev === props.items.length - 1 ? 0 : prev + 1
    );
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <div
      className={cn(
        'slash-command-menu',
        'bg-[var(--card)] border border-[var(--border)]',
        'rounded-lg shadow-lg',
        'p-[var(--spacing-xs)]',
        'max-h-80 overflow-y-auto',
        'min-w-[200px]'
      )}
      role="listbox"
      aria-label="Formatting commands"
    >
      {props.items.length > 0 ? (
        props.items.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              onClick={() => selectItem(index)}
              className={cn(
                'flex items-center gap-[var(--spacing-sm)]',
                'w-full p-[var(--spacing-sm)]',
                'rounded text-left',
                'text-[var(--foreground)]',
                'transition-colors duration-150',
                'hover:bg-[var(--muted)]/10',
                index === selectedIndex && 'bg-[var(--accent)]/10 text-[var(--accent)]'
              )}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{item.title}</span>
            </button>
          );
        })
      ) : (
        <div className="p-[var(--spacing-md)] text-center text-sm text-[var(--muted)]">
          No commands found
        </div>
      )}
    </div>
  );
});

CommandMenu.displayName = 'CommandMenu';
