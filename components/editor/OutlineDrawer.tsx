'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileX } from 'lucide-react';
import { OutlineDrawerProps } from '@/types';
import { cn } from '@/lib/utils';

/**
 * OutlineDrawer component displays a hierarchical outline of document headings
 * Supports H1, H2, and H3 headings with proper indentation and active state
 */
export function OutlineDrawer({
  isOpen,
  onToggle,
  headings,
  activeHeadingId,
  onHeadingClick,
}: OutlineDrawerProps) {
  // Empty state: No headings in document
  if (headings.length === 0) {
    return (
      <Sheet open={isOpen} onOpenChange={onToggle}>
        <SheetContent
          side="right"
          className="outline-drawer w-[300px] hidden md:flex md:flex-col"
        >
          <SheetHeader>
            <SheetTitle>Outline</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <FileX className="h-12 w-12 text-[var(--muted)] mb-[var(--spacing-md)]" />
            <p className="text-sm text-[var(--muted)]">No headings in this note</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Normal state: Display headings list
  return (
    <Sheet open={isOpen} onOpenChange={onToggle}>
      <SheetContent
        side="right"
        className="outline-drawer w-[300px] hidden md:flex md:flex-col"
      >
        <SheetHeader>
          <SheetTitle>Outline</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 mt-[var(--spacing-md)]">
          <ul className="outline-heading-list">
            {headings.map((heading) => (
              <li
                key={heading.id}
                className={cn(
                  'outline-heading-item',
                  `outline-heading-h${heading.level}`,
                  {
                    'outline-heading-active': heading.id === activeHeadingId,
                  }
                )}
                onClick={() => onHeadingClick(heading.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onHeadingClick(heading.id);
                  }
                }}
                aria-current={heading.id === activeHeadingId ? 'true' : undefined}
              >
                {heading.text}
              </li>
            ))}
          </ul>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
