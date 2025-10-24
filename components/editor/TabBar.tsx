'use client';

import { X, MoreHorizontal, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tab {
  noteId: string;
  title: string;
  isShared?: boolean;
}

interface TabBarProps {
  openTabs: Tab[];
  activeNoteId: string | null;
  onTabClick: (noteId: string) => void;
  onTabClose: (noteId: string) => void;
  onShowOverflowMenu: () => void;
  hasOverflow: boolean;
  rightControls?: React.ReactNode;
}

interface TabItemProps {
  title: string;
  isActive: boolean;
  isShared?: boolean;
  onTabClick: () => void;
  onTabClose: (e: React.MouseEvent) => void;
}

function TabItem({
  title,
  isActive,
  isShared,
  onTabClick,
  onTabClose,
}: TabItemProps) {
  const truncatedTitle = title.length > 20 ? title.slice(0, 20) + '...' : title;

  return (
    <div
      className={cn(
        'tab-item group flex items-center',
        'gap-[var(--spacing-xs)]',
        'px-[var(--tab-padding-x)] py-[var(--tab-padding-y)]',
        'rounded-t-md transition-all duration-150',
        'border-b-2',
        'cursor-pointer',
        isActive
          ? [
              'bg-[var(--tab-bg-active)]',
              'text-[var(--tab-text-active)]',
              'border-[var(--tab-border-active)]',
              'font-medium',
            ]
          : [
              'bg-[var(--tab-bg)]',
              'text-[var(--tab-text)]',
              'border-transparent',
              'hover:bg-[var(--tab-hover-bg)]',
              'hover:text-[var(--foreground)]',
            ],
        // Visual indicator for shared tabs: subtle left border
        isShared && 'border-l-2 border-l-accent'
      )}
      role="tab"
      aria-label={`Switch to ${title}${isShared ? ' (shared)' : ''}`}
      aria-selected={isActive}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTabClick();
        }
      }}
    >
      {isShared && (
        <Users className="h-3 w-3 text-accent shrink-0" aria-label="Shared document" />
      )}
      <span className="text-sm whitespace-nowrap" onClick={onTabClick}>
        {truncatedTitle}
      </span>

      <button
        onClick={onTabClose}
        className={cn(
          'tab-close-button rounded-sm p-0.5',
          'hover:bg-[var(--muted)] transition-colors',
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
        aria-label={`Close ${title}`}
        tabIndex={-1}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function TabBar({
  openTabs,
  activeNoteId,
  onTabClick,
  onTabClose,
  onShowOverflowMenu,
  hasOverflow,
  rightControls,
}: TabBarProps) {
  return (
    <div
      className={cn(
        'tab-bar flex items-center',
        'gap-[var(--tab-gap)]',
        'px-[var(--spacing-md)] py-[var(--spacing-sm)]',
        'bg-[var(--tab-bg)]',
        'border-b border-[var(--tab-border)]',
        'hidden md:flex'
      )}
    >
      <div className="flex items-center gap-[var(--tab-gap)] flex-1 overflow-x-auto scrollbar-hide">
        {openTabs.map((tab) => (
          <TabItem
            key={tab.noteId}
            title={tab.title}
            isActive={tab.noteId === activeNoteId}
            isShared={tab.isShared}
            onTabClick={() => onTabClick(tab.noteId)}
            onTabClose={(e) => {
              e.stopPropagation();
              onTabClose(tab.noteId);
            }}
          />
        ))}
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-[var(--spacing-sm)] flex-shrink-0 ml-auto">
        {rightControls}

        {hasOverflow && (
          <button
            onClick={onShowOverflowMenu}
            className={cn(
              'p-[var(--spacing-xs)]',
              'hover:bg-[var(--muted)] rounded transition-colors'
            )}
            aria-label="Show all tabs"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
