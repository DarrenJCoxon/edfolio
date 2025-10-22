/**
 * SlashCommandMenu
 * Floating menu component for slash commands with Floating UI keyboard navigation
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  useListNavigation,
  useInteractions,
  FloatingFocusManager,
  FloatingPortal,
} from '@floating-ui/react';
import type { SlashCommandItem } from '@/lib/editor/slash-commands/types';
import { cn } from '@/lib/utils';

interface SlashCommandMenuProps {
  items: SlashCommandItem[];
  onSelect: (item: SlashCommandItem) => void;
  query?: string;
  getReferenceClientRect?: () => DOMRect | null;
}

export function SlashCommandMenu({
  items,
  onSelect,
  query = '',
  getReferenceClientRect,
}: SlashCommandMenuProps) {
  const [mounted, setMounted] = useState(false);
  const [maxHeight, setMaxHeight] = useState<string>('60vh');
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const listRef = useRef<Array<HTMLElement | null>>([]);

  // Determine optimal placement based on viewport space
  const getOptimalPlacement = () => {
    if (!getReferenceClientRect) return 'bottom-start';
    const rect = getReferenceClientRect();
    if (!rect) return 'bottom-start';

    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const menuHeight = window.innerWidth < 640 ? viewportHeight * 0.6 : 384;

    return rect.bottom > viewportHeight * 0.5 || spaceBelow < menuHeight
      ? 'top-start'
      : 'bottom-start';
  };

  const { refs, floatingStyles, context } = useFloating({
    open: true,
    placement: getOptimalPlacement() as any,
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
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
  });

  // Set virtual reference element for positioning
  useEffect(() => {
    if (getReferenceClientRect) {
      refs.setPositionReference({
        getBoundingClientRect: getReferenceClientRect,
      });
    }
  }, [refs, getReferenceClientRect]);

  // Setup list navigation
  const listNavigation = useListNavigation(context, {
    listRef,
    activeIndex,
    onNavigate: setActiveIndex,
    loop: true,
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    listNavigation,
  ]);

  // Handle mounting animation and calculate max height
  useEffect(() => {
    setMounted(true);

    // Calculate available space for the menu
    const calculateMaxHeight = () => {
      const viewportHeight = window.innerHeight;
      const isMobile = window.innerWidth < 640;

      // Reserve space for padding and positioning
      const reservedSpace = isMobile ? 100 : 120;
      const calculatedHeight = Math.min(
        isMobile ? viewportHeight * 0.6 : 384, // 60vh on mobile, 384px (24rem) on desktop
        viewportHeight - reservedSpace
      );

      setMaxHeight(`${calculatedHeight}px`);
    };

    calculateMaxHeight();
    window.addEventListener('resize', calculateMaxHeight);

    return () => {
      setMounted(false);
      window.removeEventListener('resize', calculateMaxHeight);
    };
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex !== null && listRef.current[activeIndex]) {
      const element = listRef.current[activeIndex];
      if (element) {
        element.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [activeIndex]);

  if (items.length === 0) {
    return null;
  }

  // Group items by category
  const groupedItems = items.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, SlashCommandItem[]>
  );

  return (
    <FloatingPortal>
      <FloatingFocusManager context={context} modal={false}>
        <div
          ref={refs.setFloating}
          style={{ ...floatingStyles, maxHeight }}
          className={cn(
            'slash-command-menu',
            'z-50 overflow-y-auto',
            'w-[calc(100vw-2rem)] max-w-xs sm:w-80',
            'bg-[var(--card)] rounded-lg border border-[var(--border)] shadow-lg',
            'p-[var(--spacing-xs)]',
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2',
            'transition-all duration-200'
          )}
          {...getFloatingProps()}
        >
      {Object.entries(groupedItems).map(([category, categoryItems]) => (
        <div key={category} className="p-[var(--spacing-xs)]">
          <div
            className={cn(
              'text-xs font-medium text-[var(--muted)] uppercase tracking-wider',
              'p-[var(--spacing-xs)]',
              'pb-1'
            )}
          >
            {category}
          </div>
          {categoryItems.map((item) => {
            const globalIndex = items.findIndex((i) => i.id === item.id);
            const isActive = globalIndex === activeIndex;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                ref={(node) => {
                  listRef.current[globalIndex] = node;
                }}
                role="menuitem"
                tabIndex={isActive ? 0 : -1}
                data-selected={isActive}
                className={cn(
                  'w-full flex items-start',
                  'p-[var(--spacing-sm)]',
                  'rounded-md transition-colors duration-150',
                  'hover:bg-[var(--muted)]/10',
                  isActive && 'bg-[var(--accent)]/10 text-[var(--accent)]'
                )}
                {...getItemProps({
                  onClick() {
                    onSelect(item);
                  },
                })}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 mr-[var(--spacing-sm)] flex-shrink-0',
                    'text-[var(--muted)]'
                  )}
                />
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      {item.title}
                      {query && item.title.toLowerCase().includes(query.toLowerCase()) && (
                        <span className="ml-[var(--spacing-xs)] text-xs text-[var(--accent)]">
                          (match)
                        </span>
                      )}
                    </span>
                    {item.shortcut && (
                      <span className="hidden sm:inline text-xs text-[var(--muted)]/60 ml-[var(--spacing-xs)]">
                        {item.shortcut}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--muted)]">{item.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      ))}

      {items.length === 0 && query && (
        <div className="text-sm text-[var(--muted)] text-center p-[var(--spacing-md)]">
          No commands found for &ldquo;{query}&rdquo;
        </div>
      )}
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  );
}
