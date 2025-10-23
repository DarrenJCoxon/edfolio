'use client';

import { Check, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Tab {
  noteId: string;
  title: string;
}

interface TabOverflowMenuProps {
  openTabs: Tab[];
  activeNoteId: string | null;
  onTabClick: (noteId: string) => void;
  onCloseAll: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
}

export function TabOverflowMenu({
  openTabs,
  activeNoteId,
  onTabClick,
  onCloseAll,
  isOpen,
  onOpenChange,
  trigger,
}: TabOverflowMenuProps) {
  return (
    <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {openTabs.map((tab) => (
          <DropdownMenuItem
            key={tab.noteId}
            onClick={() => onTabClick(tab.noteId)}
            className="flex items-center justify-between gap-[var(--spacing-sm)] cursor-pointer"
          >
            <span className="truncate flex-1">{tab.title}</span>
            {tab.noteId === activeNoteId && (
              <Check className="h-4 w-4 text-[var(--accent)]" />
            )}
          </DropdownMenuItem>
        ))}

        {openTabs.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onCloseAll}
              className="flex items-center gap-[var(--spacing-sm)] text-[var(--destructive)] cursor-pointer"
            >
              <X className="h-4 w-4" />
              <span>Close all tabs</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
