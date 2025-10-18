'use client';

import { Folder, File, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileNavigatorProps } from '@/types';
import { cn } from '@/lib/utils';

export function FileNavigator({ className }: FileNavigatorProps) {
  return (
    <div
      className={cn(
        'flex flex-col',
        'w-[var(--sidebar-default-width)] h-screen',
        'bg-[var(--card)] border-r border-[var(--border)]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-[var(--spacing-md)] border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">
          Files
        </h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label="New Note"
          className="h-8 w-8"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* File Tree */}
      <ScrollArea className="flex-1">
        <div className="p-[var(--spacing-sm)]">
          <ul className="space-y-1">
            {/* Placeholder items */}
            <li className="flex items-center gap-2 p-[var(--spacing-xs)] rounded hover:bg-[var(--muted)]/10 cursor-pointer">
              <Folder className="h-4 w-4 text-[var(--muted)]" />
              <span className="text-sm text-[var(--foreground)]">
                Getting Started
              </span>
            </li>
            <li className="flex items-center gap-2 p-[var(--spacing-xs)] pl-[var(--spacing-md)] rounded hover:bg-[var(--muted)]/10 cursor-pointer">
              <File className="h-4 w-4 text-[var(--muted)]" />
              <span className="text-sm text-[var(--foreground)]">
                Welcome.md
              </span>
            </li>
            <li className="flex items-center gap-2 p-[var(--spacing-xs)] rounded hover:bg-[var(--muted)]/10 cursor-pointer">
              <Folder className="h-4 w-4 text-[var(--muted)]" />
              <span className="text-sm text-[var(--foreground)]">
                My Notes
              </span>
            </li>
          </ul>
        </div>
      </ScrollArea>

      {/* Vault Switcher */}
      <div className="p-[var(--spacing-md)] border-t border-[var(--border)]">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--muted)]">My Vault</span>
        </div>
      </div>
    </div>
  );
}
